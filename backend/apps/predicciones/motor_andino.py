"""
Motor de Simulación de Propagación de Incendios Forestales Estilo Cell2Fire en Python.
SimuladorElipticoAndino:
- Modelo físico de propagación elíptica andina (Rothermel / FBP modificado).
- Cálculo de tiempo mínimo de arribo con Dijkstra en vecindad de 8 celdas.
- Aceleración por viento (WindProphet) y pendiente (DEM).
- Proyección métrica UTM 18S (EPSG:32718) y salida en WGS84 (EPSG:4326).
"""
import math
import os
import heapq
import numpy as np
import rasterio.features
from affine import Affine
from rasterio.warp import transform
import shapely
from shapely.geometry import shape, Polygon as SPolygon, MultiPolygon as SMultiPolygon
from shapely.ops import unary_union
from django.contrib.gis.geos import MultiPolygon as DjangoMultiPolygon, GEOSGeometry


class SimuladorElipticoAndino:
    """
    Simulador de propagación bidimensional elíptica para incendios forestales en la sierra andina.
    Implementa el balance de Rothermel / FBP canadienses en grilla celular.
    """

    def __init__(
        self,
        lat: float,
        lon: float,
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
    ):
        self.lat = float(lat)
        self.lon = float(lon)
        self.viento_kmh = max(0.0, float(viento_kmh))
        self.dir_viento_grados = float(dir_viento_grados) % 360.0
        self.ffmc = max(10.0, min(101.0, float(ffmc)))
        self.resolucion_m = float(resolucion_m)
        self.grid_size = int(grid_size)

        # Proyectar coordenadas de ignición a UTM 18S (EPSG:32718)
        xs, ys = transform('EPSG:4326', 'EPSG:32718', [self.lon], [self.lat])
        self.x0 = xs[0]
        self.y0 = ys[0]

        # Celda central de ignición en la grilla
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

        # Garantizar que el punto de ignición posea material combustible para iniciar el frente
        if self.combustible[self.r0, self.c0] < 0.5:
            self.combustible[self.r0, self.c0] = 1.20

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
                    data = src.read(1, window=window, boundless=True, fill_value=1.8)
                    if data.shape == (self.grid_size, self.grid_size):
                        return data.astype(np.float32)
            except Exception:
                pass

        return np.full((self.grid_size, self.grid_size), 1.8, dtype=np.float32)

    def simular(self, horizontes_horas=(1, 3, 6)):
        """
        Ejecuta el algoritmo de Dijkstra para calcular el tiempo mínimo de arribo
        y extrae los perímetros poligonales MultiPolygon WGS84 para cada horizonte.
        """
        tiempo_arribo = np.full((self.grid_size, self.grid_size), np.inf, dtype=np.float64)
        tiempo_arribo[self.r0, self.c0] = 0.0

        pq = [(0.0, self.r0, self.c0)]

        # Factor de humedad fina FFMC canadienses
        f_ffmc = math.exp(0.05039 * (self.ffmc - 80.0))

        # Dirección de avance del fuego (rumbo hacia donde el viento empuja las llamas)
        # Si el viento viene del Este (90°), empuja hacia el Oeste (270°)
        theta_prop = (self.dir_viento_grados + 180.0) % 360.0

        # Relación largo/ancho de la elipse y excentricidad
        # L/B = 1 + 0.125 * U
        lb = 1.0 + 0.125 * self.viento_kmh
        ecc = math.sqrt(max(0.0, 1.0 - (1.0 / (lb * lb))))

        # Máximo horizonte en minutos
        max_horizonte_min = max(horizontes_horas) * 60.0

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

                    # Azimut de la dirección de avance local (0° Norte, 90° Este, 180° Sur, 270° Oeste)
                    alpha = (90.0 - math.degrees(math.atan2(dy, dx))) % 360.0
                    ang_diff = abs((alpha - theta_prop + 180.0) % 360.0 - 180.0)
                    psi = math.radians(ang_diff)

                    # Factor elíptico de viento
                    phi_viento = (self.viento_kmh / 12.0) * ((math.cos(psi) + ecc) / (1.0 + ecc))

                    # Factor de pendiente andina: phi_pendiente = 5.275 * max(0, tan(theta))^2
                    dz = float(self.dem[nr, nc] - self.dem[r, c])
                    tan_theta = dz / dist
                    phi_pendiente = 5.275 * (max(0.0, tan_theta) ** 2)

                    # Tasa de propagación del frente (ROS en m/min) hacia la celda vecina
                    r0_comb = float(self.combustible[nr, nc])
                    if r0_comb <= 0.01:
                        continue  # Cuerpos de agua o roca estéril incombustible no transmiten fuego
                    ros = max(0.1, r0_comb * f_ffmc * (1.0 + phi_viento + phi_pendiente))

                    if ros > velocidad_maxima_observada:
                        velocidad_maxima_observada = ros

                    dt = dist / ros  # Minutos para propagarse entre centros de celda

                    if t + dt < tiempo_arribo[nr, nc]:
                        tiempo_arribo[nr, nc] = t + dt
                        heapq.heappush(pq, (t + dt, nr, nc))

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
