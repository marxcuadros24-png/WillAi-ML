"""
Motor de Simulación de Propagación de Incendios Forestales Estilo Cell2Fire en Python.
SimuladorElipticoAndino:
- Modelo físico de propagación elíptica andina (Rothermel / FBP modificado).
- Cálculo de tiempo mínimo de arribo con Dijkstra en vecindad de 8 celdas.
- Aceleración por viento meteorológico andino y pendiente (DEM).
- Proyección métrica UTM 18S (EPSG:32718) y salida en WGS84 (EPSG:4326).
"""
import math
import os
import heapq
import numpy as np
import rasterio.features
from affine import Affine
from rasterio.warp import transform, transform_geom
import shapely
from shapely.geometry import shape, box, Polygon as SPolygon, MultiPolygon as SMultiPolygon
from shapely.ops import unary_union
from django.contrib.gis.geos import MultiPolygon as DjangoMultiPolygon, GEOSGeometry


class SimuladorElipticoAndino:
    """
    Simulador de propagación bidimensional elíptica para incendios forestales en la sierra andina.
    Implementa el balance de Rothermel / FBP canadienses en grilla celular.
    """

    def __init__(
        self,
        lat: float = None,
        lon: float = None,
        viento_kmh: float = 15.0,
        dir_viento_grados: float = 270.0,
        ffmc: float = 85.0,
        dem_array: np.ndarray = None,
        combustible_array: np.ndarray = None,
        resolucion_m: float = 30.0,
        grid_size: int = 300,
        dem_path: str = None,
        ruta_dem: str = None,
        combustible_path: str = None,
        ruta_combustible: str = None,
        puntos_ignicion: list = None,
        alfa_r0: float = 0.495,
        alfa_viento: float = 0.762,
        alfa_pendiente: float = 1.0,
        ensamble_viento: bool = False,
        delta_viento_grados: float = 15.0,
    ):
        self.viento_kmh = max(0.0, float(viento_kmh))
        self.dir_viento_grados = float(dir_viento_grados) % 360.0
        self.ffmc = max(10.0, min(101.0, float(ffmc)))
        self.resolucion_m = float(resolucion_m)
        self.grid_size = int(grid_size)
        self.alfa_r0 = float(alfa_r0)
        self.alfa_viento = float(alfa_viento)
        self.alfa_pendiente = float(alfa_pendiente)
        self.ensamble_viento = bool(ensamble_viento)
        self.delta_viento_grados = float(delta_viento_grados)

        # Manejo de multi-ignición por cluster FIRMS o punto individual
        if puntos_ignicion and len(puntos_ignicion) > 0:
            self.puntos_ignicion = [(float(p[0]), float(p[1])) for p in puntos_ignicion]
            if lat is None or lon is None:
                self.lat = sum(p[0] for p in self.puntos_ignicion) / len(self.puntos_ignicion)
                self.lon = sum(p[1] for p in self.puntos_ignicion) / len(self.puntos_ignicion)
            else:
                self.lat = float(lat)
                self.lon = float(lon)
        else:
            self.lat = float(lat) if lat is not None else -15.0189
            self.lon = float(lon) if lon is not None else -73.7806
            self.puntos_ignicion = [(self.lat, self.lon)]

        # Proyectar centro geográfico a UTM 18S (EPSG:32718)
        xs, ys = transform('EPSG:4326', 'EPSG:32718', [self.lon], [self.lat])
        self.x0 = xs[0]
        self.y0 = ys[0]

        # Celda central de la grilla
        self.r0 = self.grid_size // 2
        self.c0 = self.grid_size // 2

        # Transformación afín para rasterio (esquina superior izquierda a resolucion_m)
        self.x_min = self.x0 - self.c0 * self.resolucion_m
        self.y_max = self.y0 + self.r0 * self.resolucion_m
        self.affine_transform = Affine.translation(self.x_min, self.y_max) * Affine.scale(
            self.resolucion_m, -self.resolucion_m
        )

        # Cargar o generar grilla de elevación (DEM)
        path_dem_efectivo = dem_path or ruta_dem
        self.dem = self._obtener_grilla_dem(dem_array, path_dem_efectivo)

        # Cargar o generar grilla de tasa de propagación base (R0)
        path_combustible_efectivo = combustible_path or ruta_combustible
        self.combustible = self._obtener_grilla_combustible(combustible_array, path_combustible_efectivo)

        # Aplicar cortafuegos físicos y naturales (carreteras, trochas carrozables y ríos)
        self._aplicar_cortafuegos_en_combustible()

        # Mapear todos los focos de ignición a coordenadas de celda (fila, columna)
        lons_pts = [p[1] for p in self.puntos_ignicion]
        lats_pts = [p[0] for p in self.puntos_ignicion]
        xs_pts, ys_pts = transform('EPSG:4326', 'EPSG:32718', lons_pts, lats_pts)

        self.focos = []
        for px, py in zip(xs_pts, ys_pts):
            c_idx = int(round((px - self.x_min) / self.resolucion_m))
            r_idx = int(round((self.y_max - py) / self.resolucion_m))
            if 0 <= r_idx < self.grid_size and 0 <= c_idx < self.grid_size:
                self.focos.append((r_idx, c_idx))

        if not self.focos:
            self.focos = [(self.r0, self.c0)]

        # Garantizar que todos los puntos de ignición posean material combustible para iniciar el frente
        for rf, cf in self.focos:
            if self.combustible[rf, cf] < 0.2:
                self.combustible[rf, cf] = 0.65

    def _obtener_grilla_dem(self, dem_array, dem_path):
        """
        Carga el GeoTIFF del DEM si existe en disco o utiliza la grilla provista.
        Fallback seguro: genera grilla plana (pendiente = 0) de 300x300 celdas en memoria.
        """
        if dem_array is not None and dem_array.shape == (self.grid_size, self.grid_size):
            return dem_array.astype(np.float32)

        # Auto-buscar GeoTIFF DEM si no fue provisto
        if not dem_path:
            posibles = ["data/coracora_dem_utm18s.tif", "../data/coracora_dem_utm18s.tif"]
            for p in posibles:
                if os.path.exists(p):
                    dem_path = p
                    break

        if dem_path and os.path.exists(dem_path):
            try:
                import rasterio
                import rasterio.windows
                with rasterio.open(dem_path) as src:
                    py, px = src.index(self.x0, self.y0)
                    half = self.grid_size // 2
                    window = rasterio.windows.Window(
                        px - half, py - half, self.grid_size, self.grid_size
                    )
                    data = src.read(1, window=window, boundless=True, fill_value=3180.0)
                    if data.shape == (self.grid_size, self.grid_size):
                        return data.astype(np.float32)
            except Exception:
                pass

        # Fallback plano: 300x300 celdas a 30m (9km x 9km) con elevación media de Coracora (3,180 msnm)
        return np.full((self.grid_size, self.grid_size), 3180.0, dtype=np.float32)

    def _obtener_grilla_combustible(self, combustible_array, combustible_path):
        """
        Carga el GeoTIFF de combustibles (Sentinel-2 L2A) si existe en disco o utiliza la grilla provista.
        Fallback seguro: pajonal de ichu andino uniforme (GR2 / O-1b) -> R0 = 1.8 m/min.
        """
        if combustible_array is not None and combustible_array.shape == (self.grid_size, self.grid_size):
            return combustible_array.astype(np.float32)

        # Auto-buscar GeoTIFF de combustible si no fue provisto
        if not combustible_path:
            posibles = ["data/coracora_combustible_utm18s.tif", "../data/coracora_combustible_utm18s.tif"]
            for p in posibles:
                if os.path.exists(p):
                    combustible_path = p
                    break

        if combustible_path and os.path.exists(combustible_path):
            try:
                import rasterio
                import rasterio.windows
                with rasterio.open(combustible_path) as src:
                    py, px = src.index(self.x0, self.y0)
                    half = self.grid_size // 2
                    window = rasterio.windows.Window(
                        px - half, py - half, self.grid_size, self.grid_size
                    )
                    data = src.read(1, window=window, boundless=True, fill_value=0.65)
                    if data.shape == (self.grid_size, self.grid_size):
                        return data.astype(np.float32)
            except Exception:
                pass

        # Fallback andino realista: mosaico de pastizal mixto, tolares y suelo pedregoso (0.65 m/min)
        return np.full((self.grid_size, self.grid_size), 0.65, dtype=np.float32)

    def _aplicar_cortafuegos_en_combustible(self):
        """
        Aplica cortafuegos físicos y naturales (carreteras, trochas carrozables y ríos)
        sobre la grilla de combustible andino (self.combustible).
        
        Efecto físico:
        - Vías Nacionales y Departamentales (asfaltado/afirmado ancho): R0 = 0.01 m/min (freno 99%).
        - Trochas carrozables y caminos vecinales (suelo mineral compactado): R0 = 0.04 m/min (cortafuego).
        - Ríos principales y secundarios (agua/lecho rocoso): R0 = 0.005 m/min (barrera total).
        - Quebradas andinas: R0 = 0.04 m/min.
        """
        try:
            import json
            from rasterio.features import rasterize

            x_min = self.x_min
            y_max = self.y_max
            x_max = x_min + self.grid_size * self.resolucion_m
            y_min = y_max - self.grid_size * self.resolucion_m
            bbox_utm = box(x_min, y_min, x_max, y_max)

            lons_c, lats_c = transform('EPSG:32718', 'EPSG:4326', [x_min, x_max], [y_min, y_max])
            bbox_wgs = box(min(lons_c), min(lats_c), max(lons_c), max(lats_c))

            shapes_to_burn = []

            # 1. Carreteras y Trochas Carrozables
            posibles_vias = [
                "data/carreteras_parinacochas.geojson",
                "../data/carreteras_parinacochas.geojson",
                "../../data/carreteras_parinacochas.geojson",
                "../frontend/public/data/carreteras_parinacochas.geojson",
                "../../frontend/public/data/carreteras_parinacochas.geojson",
            ]
            for p in posibles_vias:
                if os.path.exists(p):
                    with open(p, "r", encoding="utf-8") as f:
                        vias_data = json.load(f)
                    for feat in vias_data.get("features", []):
                        g_wgs = shape(feat["geometry"])
                        if not bbox_wgs.intersects(g_wgs):
                            continue
                        try:
                            geom_utm_dict = transform_geom('EPSG:4326', 'EPSG:32718', feat["geometry"])
                            g_utm = shape(geom_utm_dict)
                            if not bbox_utm.intersects(g_utm):
                                continue
                            cat = feat.get("properties", {}).get("categoria", "")
                            # Nacional / Departamental: vía ancha
                            if cat in ["Nacional", "Departamental"]:
                                r0_val = 0.01
                            # Trochas carrozables o caminos vecinales: cortafuego en suelo mineral
                            else:
                                r0_val = 0.04
                            shapes_to_burn.append((g_utm, r0_val))
                        except Exception:
                            continue
                    break

            # 2. Red Hidrográfica (Ríos y Quebradas)
            posibles_rios = [
                "data/rios_parinacochas.geojson",
                "../data/rios_parinacochas.geojson",
                "../../data/rios_parinacochas.geojson",
                "../frontend/public/data/rios_parinacochas.geojson",
                "../../frontend/public/data/rios_parinacochas.geojson",
            ]
            for p in posibles_rios:
                if os.path.exists(p):
                    with open(p, "r", encoding="utf-8") as f:
                        rios_data = json.load(f)
                    for feat in rios_data.get("features", []):
                        g_wgs = shape(feat["geometry"])
                        if not bbox_wgs.intersects(g_wgs):
                            continue
                        try:
                            geom_utm_dict = transform_geom('EPSG:4326', 'EPSG:32718', feat["geometry"])
                            g_utm = shape(geom_utm_dict)
                            if not bbox_utm.intersects(g_utm):
                                continue
                            tipo = feat.get("properties", {}).get("tipo", "")
                            r0_val = 0.005 if tipo == "Río" else 0.04
                            shapes_to_burn.append((g_utm, r0_val))
                        except Exception:
                            continue
                    break

            if shapes_to_burn:
                burned = rasterize(
                    shapes_to_burn,
                    out_shape=(self.grid_size, self.grid_size),
                    transform=self.affine_transform,
                    all_touched=True,
                    fill=0.0,
                    dtype=np.float32
                )
                mask = (burned > 0.0)
                self.combustible[mask] = np.minimum(self.combustible[mask], burned[mask])

        except Exception:
            pass

    def _calcular_tiempo_arribo_dijkstra(self, dir_viento_grados: float, max_horizonte_min: float):
        """
        Calcula la grilla de tiempo mínimo de arribo (minutos) con Dijkstra en 8-vecindad
        para una dirección de viento específica.
        """
        tiempo_arribo = np.full((self.grid_size, self.grid_size), np.inf, dtype=np.float64)
        pq = []
        for rf, cf in self.focos:
            tiempo_arribo[rf, cf] = 0.0
            heapq.heappush(pq, (0.0, rf, cf))

        # Factor de humedad fina FFMC canadienses modulado para altitud andina
        f_ffmc = math.exp(0.040 * (self.ffmc - 82.0))

        # Dirección de avance del fuego (rumbo hacia donde el viento empuja las llamas)
        theta_prop = (dir_viento_grados + 180.0) % 360.0

        # Relación largo/ancho de la elipse y excentricidad amortiguada por menor densidad de aire andino (>3000 msnm)
        lb = 1.0 + 0.085 * self.viento_kmh
        ecc = math.sqrt(max(0.0, 1.0 - (1.0 / (lb * lb))))

        # Vecindad de 8 celdas (Moore)
        vecinos = [
            (-1, 0), (1, 0), (0, -1), (0, 1),
            (-1, -1), (-1, 1), (1, -1), (1, 1)
        ]

        velocidad_maxima_observada = 0.0

        while pq:
            t, r, c = heapq.heappop(pq)

            if t > tiempo_arribo[r, c]:
                continue
            if t > max_horizonte_min + 30.0:
                continue

            for dr, dc in vecinos:
                nr, nc = r + dr, c + dc
                if 0 <= nr < self.grid_size and 0 <= nc < self.grid_size:
                    dx = dc * self.resolucion_m
                    dy = -dr * self.resolucion_m  # r crece hacia el sur (coordenada raster)
                    dist = math.hypot(dx, dy)

                    # Azimut de la dirección de avance local
                    alpha = (90.0 - math.degrees(math.atan2(dy, dx))) % 360.0
                    ang_diff = abs((alpha - theta_prop + 180.0) % 360.0 - 180.0)
                    psi = math.radians(ang_diff)

                    # Factor elíptico de viento
                    phi_viento = (self.viento_kmh / 15.0) * ((math.cos(psi) + ecc) / (1.0 + ecc))

                    # Factor de pendiente andina
                    dz = float(self.dem[nr, nc] - self.dem[r, c])
                    tan_theta = dz / dist
                    phi_pendiente = 3.5 * (max(0.0, tan_theta) ** 1.8)

                    # Tasa de propagación del frente (ROS en m/min)
                    r0_comb = float(self.combustible[nr, nc])
                    if r0_comb <= 0.05:
                        continue  # Incombustible (roquedales, canchales pedregosos, cauces secos o agua)
                    ros = max(0.05, (r0_comb * self.alfa_r0) * f_ffmc * (1.0 + (phi_viento * self.alfa_viento) + (phi_pendiente * self.alfa_pendiente)))

                    if ros > velocidad_maxima_observada:
                        velocidad_maxima_observada = ros

                    dt = dist / ros

                    if t + dt < tiempo_arribo[nr, nc]:
                        tiempo_arribo[nr, nc] = t + dt
                        heapq.heappush(pq, (t + dt, nr, nc))

        return tiempo_arribo, velocidad_maxima_observada

    def simular(self, horizontes_horas=(1, 3, 6), ensamble_viento: bool = None):
        """
        Ejecuta el algoritmo de propagación del frente.
        Soporta Ensamble de Perturbaciones de Viento (theta - 15° y theta + 15°)
        para formar la banda de incertidumbre y mitigar omisiones topográficas en quebradas.
        """
        usar_ensamble = self.ensamble_viento if ensamble_viento is None else bool(ensamble_viento)
        max_horizonte_min = max(horizontes_horas) * 60.0

        if not usar_ensamble or self.viento_kmh < 2.0:
            tiempo_arribo, velocidad_maxima_observada = self._calcular_tiempo_arribo_dijkstra(
                self.dir_viento_grados, max_horizonte_min
            )
            miembros_ensamble = [round(self.dir_viento_grados, 1)]
        else:
            # Ensamble de viento de 3 miembros: central, -delta, +delta
            theta_0 = self.dir_viento_grados
            theta_minus = (theta_0 - self.delta_viento_grados) % 360.0
            theta_plus = (theta_0 + self.delta_viento_grados) % 360.0
            miembros_ensamble = [round(theta_minus, 1), round(theta_0, 1), round(theta_plus, 1)]

            t_0, v_0 = self._calcular_tiempo_arribo_dijkstra(theta_0, max_horizonte_min)
            t_minus, v_minus = self._calcular_tiempo_arribo_dijkstra(theta_minus, max_horizonte_min)
            t_plus, v_plus = self._calcular_tiempo_arribo_dijkstra(theta_plus, max_horizonte_min)

            tiempo_arribo = np.minimum(t_0, np.minimum(t_minus, t_plus))
            velocidad_maxima_observada = max(v_0, v_minus, v_plus)

        # Extracción y reproyección de isócronas para cada paso temporal
        resultados = {}
        for h in sorted(horizontes_horas):
            limite_min = h * 60.0
            mask = (tiempo_arribo <= limite_min).astype(np.uint8)
            celdas_quemadas = int(np.sum(mask))

            perimetro_wgs84, area_ha, union_poly = self._extraer_perimetro_wgs84(mask)

            resultados[h] = {
                "hora_paso": h,
                "perimetro": perimetro_wgs84,
                "poligono_utm": union_poly,
                "area_hectareas": round(area_ha, 2),
                "metadatos": {
                    "velocidad_maxima_m_min": round(velocidad_maxima_observada, 2),
                    "celdas_quemadas": celdas_quemadas,
                    "resolucion_m": self.resolucion_m,
                    "ffmc": self.ffmc,
                    "viento_kmh": self.viento_kmh,
                    "dir_viento_grados": self.dir_viento_grados,
                    "alfa_r0": self.alfa_r0,
                    "alfa_viento": self.alfa_viento,
                    "alfa_pendiente": self.alfa_pendiente,
                    "focos_ignicion_count": len(self.focos),
                    "ensamble_viento": bool(usar_ensamble),
                    "delta_viento_grados": self.delta_viento_grados if usar_ensamble else 0.0,
                    "miembros_ensamble": miembros_ensamble,
                }
            }

        return resultados

    def _extraer_perimetro_wgs84(self, mask: np.ndarray):
        """
        Vectoriza la máscara binaria en UTM 18S, calcula su área métrica real en hectáreas
        y la reproyecta a MultiPolygon WGS84 (EPSG:4326).
        """
        if np.sum(mask) == 0:
            # Fallback de seguridad: crear un pequeño círculo mínimo alrededor del punto de ignición
            p = SPolygon([
                (self.x0 - 15, self.y0 - 15),
                (self.x0 + 15, self.y0 - 15),
                (self.x0 + 15, self.y0 + 15),
                (self.x0 - 15, self.y0 + 15)
            ])
            union_poly = p
        else:
            poligonos = []
            for geom, val in rasterio.features.shapes(
                mask, mask=(mask == 1), transform=self.affine_transform
            ):
                s = shape(geom)
                if s.is_valid and not s.is_empty:
                    poligonos.append(s)

            if poligonos:
                union_poly = unary_union(poligonos)
                if not union_poly.is_valid:
                    union_poly = union_poly.buffer(0)
            else:
                union_poly = SPolygon([
                    (self.x0 - 15, self.y0 - 15),
                    (self.x0 + 15, self.y0 - 15),
                    (self.x0 + 15, self.y0 + 15),
                    (self.x0 - 15, self.y0 + 15)
                ])

        # Área en hectáreas calculada en UTM métrico
        area_ha = float(union_poly.area) / 10000.0

        # Función de reproyección de UTM 18S a WGS84
        def to_wgs84_coords(coords):
            xs = coords[:, 0]
            ys = coords[:, 1]
            lons, lats = transform('EPSG:32718', 'EPSG:4326', xs, ys)
            return np.column_stack([lons, lats])

        geom_wgs = shapely.transform(union_poly, to_wgs84_coords)

        # Convertir a Django MultiPolygon SRID=4326
        geos_geom = GEOSGeometry(geom_wgs.wkt, srid=4326)
        if geos_geom.geom_type == 'Polygon':
            django_mp = DjangoMultiPolygon([geos_geom], srid=4326)
        elif geos_geom.geom_type == 'MultiPolygon':
            django_mp = geos_geom
        else:
            django_mp = DjangoMultiPolygon([geos_geom.convex_hull], srid=4326)

        return django_mp, area_ha, union_poly
