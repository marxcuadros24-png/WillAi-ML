"""
Módulo de cálculo geoespacial de huellas físicas (Footprints) de píxeles satelitales
y reconstrucción de isócronas y cicatrices de áreas quemadas para NASA FIRMS (VIIRS y MODIS).

Fundamento físico-matemático:
-----------------------------
Los focos de calor satelitales no son puntos abstractos sin dimensión, sino la proyección
geométrica sobre el terreno del campo de visión instantáneo (IFOV) del sensor óptico.
- VIIRS (Suomi-NPP, NOAA-20, NOAA-21):
  Banda I (375 m en nadir). A lo largo de la exploración (scan), el tamaño aumenta hasta
  aprox. 800 m en el borde gracias a la agregación 3:1 de detectores.
- MODIS (Terra, Aqua):
  Banda 1 km en nadir. En los bordes del escaneo, el efecto bowtie amplía el píxel
  hasta aprox. 4.8 km en scan x 2.0 km en track.
- Inclinación orbital y azimut:
  Satélites en órbita heliosincrónica (inclinación orbital ~98.2°).
  Paso diurno ('D'): órbita descendente (norte a sur), azimut de traza ~189.5° (-9.5° de rotación).
  Paso nocturno ('N'): órbita ascendente (sur a norte), azimut de traza ~9.5° (+9.5° de rotación).
"""
import math
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from shapely.geometry import Polygon, MultiPolygon, mapping, shape
from shapely.ops import unary_union
from rasterio.warp import transform


# Inclinación orbital heliosincrónica aproximada en radianes (~9.5 grados)
ANGULO_ORBITAL_RAD = math.radians(9.5)


def calcular_footprint_pixel(
    lon: float,
    lat: float,
    scan_km: Optional[float] = None,
    track_km: Optional[float] = None,
    dia_noche: str = 'D',
    epsg_origen: str = 'epsg:4326',
    epsg_proyeccion_local: str = 'epsg:32718'
) -> Tuple[Polygon, float]:
    """
    Calcula el polígono real del píxel satelital (footprint) en coordenadas geográficas WGS84 (EPSG:4326)
    y retorna la tupla (poligono_shapely, area_hectareas).

    Args:
        lon: Longitud central del píxel (WGS84).
        lat: Latitud central del píxel (WGS84).
        scan_km: Resolución a lo largo del barrido en km (cross-track). Si es None, usa 0.375 para VIIRS o 1.0 para MODIS.
        track_km: Resolución a lo largo de la órbita en km (along-track). Si es None, usa 0.375.
        dia_noche: 'D' (paso diurno) o 'N' (paso nocturno).
        epsg_origen: Sistema geográfico de entrada (default EPSG:4326).
        epsg_proyeccion_local: Sistema métrico proyectado (default EPSG:32718 / UTM Zona 18S para Perú).

    Returns:
        (Polygon en EPSG:4326 con 4 esquinas rotadas, area_ha calculada en plano métrico)
    """
    scan = float(scan_km) if scan_km and float(scan_km) > 0 else 0.375
    track = float(track_km) if track_km and float(track_km) > 0 else 0.375

    # Semi-ejes en metros
    dx = (scan * 1000.0) / 2.0
    dy = (track * 1000.0) / 2.0
    area_ha = (scan * 1000.0 * track * 1000.0) / 10000.0

    # 1. Proyectar centro a UTM 18S
    xs, ys = transform({'init': epsg_origen}, {'init': epsg_proyeccion_local}, [lon], [lat])
    x0, y0 = xs[0], ys[0]

    # 2. Rotación orbital según paso diurno / nocturno
    # Diurno (D): satélite desciende hacia el sur-suroeste (-9.5°)
    # Nocturno (N): satélite asciende hacia el norte-noreste (+9.5°)
    theta = -ANGULO_ORBITAL_RAD if str(dia_noche).upper() == 'D' else ANGULO_ORBITAL_RAD
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)

    # 4 esquinas locales centradas en (0, 0): [-dx, -dy], [dx, -dy], [dx, dy], [-dx, dy]
    local_corners = [(-dx, -dy), (dx, -dy), (dx, dy), (-dx, dy)]
    utm_x = []
    utm_y = []
    for lx, ly in local_corners:
        rx = lx * cos_t - ly * sin_t + x0
        ry = lx * sin_t + ly * cos_t + y0
        utm_x.append(rx)
        utm_y.append(ry)

    # 3. Reproyectar las 4 esquinas a WGS84 (EPSG:4326)
    lons_v, lats_v = transform({'init': epsg_proyeccion_local}, {'init': epsg_origen}, utm_x, utm_y)
    poly_coords = list(zip(lons_v, lats_v))
    poly_coords.append(poly_coords[0])  # Cerrar anillo

    poly_wgs84 = Polygon(poly_coords)
    return poly_wgs84, area_ha


def construir_geojson_pixeles(detecciones) -> Dict[str, Any]:
    """
    Convierte un QuerySet o lista de DeteccionSatelital en una FeatureCollection GeoJSON
    donde cada detección es un polígono de píxel orientado con atributos completos.
    """
    features = []

    for det in detecciones:
        try:
            lat = float(det.latitud)
            lon = float(det.longitud)
            scan = float(det.scan_km) if det.scan_km else 0.375
            track = float(det.track_km) if det.track_km else 0.375
            dia_noche = det.dia_noche or 'D'

            poly, area_ha = calcular_footprint_pixel(lon, lat, scan, track, dia_noche)

            fecha_utc_iso = det.fecha_observacion.strftime('%Y-%m-%dT%H:%M:%SZ')
            fecha_dia = det.fecha_observacion.strftime('%Y-%m-%d')
            hora_str = det.fecha_observacion.strftime('%H:%M')

            # Nombre de satélite amigable
            sat_nombre = det.codigo_satelite or ''
            if not sat_nombre:
                if 'NOAA20' in (det.fuente.codigo_producto or ''):
                    sat_nombre = 'NOAA-20'
                elif 'NOAA21' in (det.fuente.codigo_producto or ''):
                    sat_nombre = 'NOAA-21'
                elif 'SNPP' in (det.fuente.codigo_producto or ''):
                    sat_nombre = 'Suomi-NPP'
                elif 'MODIS' in (det.fuente.codigo_producto or ''):
                    sat_nombre = 'Terra/Aqua'
                else:
                    sat_nombre = det.fuente.sensor

            feature = {
                'type': 'Feature',
                'geometry': mapping(poly),
                'properties': {
                    'id': det.id_deteccion,
                    'sensor': det.fuente.sensor,
                    'satelite': sat_nombre,
                    'producto': det.fuente.codigo_producto,
                    'frp_mw': float(det.frp_mw) if det.frp_mw is not None else 0.0,
                    'temperatura_brillo_k': float(det.brillo_kelvin) if det.brillo_kelvin is not None else None,
                    'confianza': det.confianza or 'nominal',
                    'confianza_pct': float(det.confianza_numerica) if det.confianza_numerica is not None else None,
                    'fecha_hora_utc': fecha_utc_iso,
                    'fecha_dia': fecha_dia,
                    'hora_utc': hora_str,
                    'dia_noche': 'Día' if dia_noche == 'D' else 'Noche',
                    'scan_km': scan,
                    'track_km': track,
                    'area_ha': round(area_ha, 2),
                    'latitud': lat,
                    'longitud': lon,
                }
            }
            features.append(feature)
        except Exception:
            continue

    return {
        'type': 'FeatureCollection',
        'name': 'focos_calor_pixeles_satelitales',
        'crs': {
            'type': 'name',
            'properties': {'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'}
        },
        'features': features
    }


def agrupar_en_eventos_incendio(
    detecciones,
    distancia_max_m: float = 1500.0,
    tiempo_max_horas: float = 48.0
) -> List[List[Any]]:
    """
    Agrupa detecciones espacio-temporalmente en 'eventos de incendio'.
    Dos detecciones pertenecen al mismo evento si su distancia espacial <= distancia_max_m
    y la diferencia de tiempo <= tiempo_max_horas con al menos otro foco del cluster (conexidad).
    """
    dets = list(detecciones)
    if not dets:
        return []

    # Precalcular coords y tiempos
    n = len(dets)
    coords = []
    tiempos = []
    for d in dets:
        coords.append((float(d.latitud), float(d.longitud)))
        tiempos.append(d.fecha_observacion.timestamp())

    # Aproximación métrica rápida: 1 grado lat ~ 111,000m, 1 grado lon ~ 111,000m * cos(lat)
    cos_lat = math.cos(math.radians(-15.0))
    dist_sq_max = (distancia_max_m / 111000.0) ** 2

    tiempo_max_seg = tiempo_max_horas * 3600.0

    visitados = [False] * n
    clusters = []

    for i in range(n):
        if visitados[i]:
            continue

        cluster = [dets[i]]
        visitados[i] = True
        cola = [i]

        while cola:
            curr = cola.pop(0)
            lat_c, lon_c = coords[curr]
            t_c = tiempos[curr]

            for j in range(n):
                if not visitados[j]:
                    # Chequeo de tiempo primero (rápido)
                    if abs(t_c - tiempos[j]) <= tiempo_max_seg:
                        # Chequeo de distancia espacial euclidiana aproximada
                        d_lat = lat_c - coords[j][0]
                        d_lon = (lon_c - coords[j][1]) * cos_lat
                        if (d_lat * d_lat + d_lon * d_lon) <= dist_sq_max:
                            visitados[j] = True
                            cola.append(j)
                            cluster.append(dets[j])

        clusters.append(cluster)

    return clusters


def reconstruir_isocronas_y_cicatrices(
    detecciones,
    distancia_cluster_m: float = 1500.0,
    tiempo_cluster_horas: float = 48.0
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Genera dos FeatureCollections GeoJSON:
    1. isocronas_avance: Polígonos disueltos acumulativos por día para cada evento de incendio.
    2. cicatrices_totales: Polígonos de cicatriz total quemada por evento con métricas consolidadas.

    Returns:
        (geojson_isocronas, geojson_cicatrices)
    """
    clusters = agrupar_en_eventos_incendio(
        detecciones,
        distancia_max_m=distancia_cluster_m,
        tiempo_max_horas=tiempo_cluster_horas
    )

    isocronas_features = []
    cicatrices_features = []

    evento_idx = 1

    for cluster in clusters:
        if not cluster:
            continue

        # Ordenar por fecha cronológica ascendente
        cluster.sort(key=lambda d: d.fecha_observacion)

        # Precalcular footprints individuales
        footprints_info = []
        for det in cluster:
            try:
                lat = float(det.latitud)
                lon = float(det.longitud)
                scan = float(det.scan_km) if det.scan_km else 0.375
                track = float(det.track_km) if det.track_km else 0.375
                dia_noche = det.dia_noche or 'D'
                poly, ha = calcular_footprint_pixel(lon, lat, scan, track, dia_noche)
                footprints_info.append({
                    'det': det,
                    'poly': poly,
                    'ha': ha,
                    'fecha_dia': det.fecha_observacion.strftime('%Y-%m-%d'),
                    'fecha_dt': det.fecha_observacion
                })
            except Exception:
                continue

        if not footprints_info:
            continue

        # Agrupar por días
        dias_unicos = sorted(list(set(info['fecha_dia'] for info in footprints_info)))
        poligonos_acumulados = []
        dia_num = 1

        frp_total_evento = sum(float(info['det'].frp_mw or 0.0) for info in footprints_info)
        frp_max_evento = max(float(info['det'].frp_mw or 0.0) for info in footprints_info)
        fecha_inicio_evento = footprints_info[0]['fecha_dt'].strftime('%Y-%m-%dT%H:%M:%SZ')
        fecha_fin_evento = footprints_info[-1]['fecha_dt'].strftime('%Y-%m-%dT%H:%M:%SZ')

        for dia_str in dias_unicos:
            focos_dia = [info for info in footprints_info if info['fecha_dia'] == dia_str]
            polys_dia = [info['poly'] for info in focos_dia]
            poligonos_acumulados.extend(polys_dia)

            # Polígono disuelto del día (isócrona diaria)
            try:
                union_dia = unary_union(polys_dia)
                union_acumulada = unary_union(poligonos_acumulados)

                # Calcular área en hectáreas proyectada a UTM 18S
                # Simplificamos transformando coordenadas a EPSG:32718
                xs, ys = union_acumulada.exterior.coords.xy if hasattr(union_acumulada, 'exterior') else ([], [])
                if xs and ys:
                    ux, uy = transform({'init': 'epsg:4326'}, {'init': 'epsg:32718'}, list(xs), list(ys))
                    area_acum_ha = Polygon(zip(ux, uy)).area / 10000.0
                else:
                    # Para MultiPolygons sumar áreas individuales
                    area_acum_ha = sum(info['ha'] for info in focos_dia)

                isocronas_features.append({
                    'type': 'Feature',
                    'geometry': mapping(union_dia),
                    'properties': {
                        'id_evento': f"INC-{evento_idx:04d}",
                        'dia_evento': dia_num,
                        'fecha_dia': dia_str,
                        'fecha_inicio_utc': f"{dia_str}T00:00:00Z",
                        'fecha_fin_utc': f"{dia_str}T23:59:59Z",
                        'focos_dia': len(focos_dia),
                        'frp_acum_dia': round(sum(float(info['det'].frp_mw or 0.0) for info in focos_dia), 2),
                        'area_acumulada_ha': round(area_acum_ha, 2)
                    }
                })
                dia_num += 1
            except Exception:
                continue

        # Cicatriz total consolidada (disolución de todos los footprints del evento)
        try:
            todos_polys = [info['poly'] for info in footprints_info]
            cicatriz_union = unary_union(todos_polys)

            # Calcular área total en UTM 18S
            area_total_ha = 0.0
            partes = [cicatriz_union] if isinstance(cicatriz_union, Polygon) else list(cicatriz_union.geoms)
            for part in partes:
                pxs, pys = part.exterior.coords.xy
                p_ux, p_uy = transform({'init': 'epsg:4326'}, {'init': 'epsg:32718'}, list(pxs), list(pys))
                area_total_ha += Polygon(zip(p_ux, p_uy)).area / 10000.0

            cicatrices_features.append({
                'type': 'Feature',
                'geometry': mapping(cicatriz_union),
                'properties': {
                    'id_evento': f"INC-{evento_idx:04d}",
                    'total_focos_satelitales': len(footprints_info),
                    'area_total_quemada_ha': round(area_total_ha, 2),
                    'fecha_primer_foco_utc': fecha_inicio_evento,
                    'fecha_ultimo_foco_utc': fecha_fin_evento,
                    'duracion_dias': len(dias_unicos),
                    'frp_acumulado_mw': round(frp_total_evento, 2),
                    'frp_pico_mw': round(frp_max_evento, 2)
                }
            })
            evento_idx += 1
        except Exception:
            continue

    geojson_isocronas = {
        'type': 'FeatureCollection',
        'name': 'isocronas_avance_fuego_diario',
        'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'}},
        'features': isocronas_features
    }

    geojson_cicatrices = {
        'type': 'FeatureCollection',
        'name': 'cicatrices_totales_incendios_historicos',
        'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'}},
        'features': cicatrices_features
    }

    return geojson_isocronas, geojson_cicatrices


def fusionar_rastros_por_dia_y_proximidad(
    detecciones,
    distancia_rastro_m: float = 1200.0
) -> Dict[str, Any]:
    """
    Fusiona focos satelitales (VIIRS y MODIS) que pertenecen al mismo día de incidente
    y se encuentran en la misma proximidad de rastro (distancia entre polígonos <= distancia_rastro_m).

    Elimina la redundancia visual de rectángulos MODIS y VIIRS solapados o contiguos,
    disuelve las geometrías en un único polígono limpio de frente de fuego y calcula
    las hectáreas reales sin doble conteo de área.
    """
    dets = list(detecciones)
    if not dets:
        return {
            'type': 'FeatureCollection',
            'name': 'rastros_fuego_fusionados_dia',
            'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'}},
            'features': []
        }

    # 1. Agrupar por día calendario (YYYY-MM-DD)
    por_dia = {}
    for det in dets:
        dia_key = det.fecha_observacion.strftime('%Y-%m-%d')
        if dia_key not in por_dia:
            por_dia[dia_key] = []
        por_dia[dia_key].append(det)

    features_rastros = []

    # 2. Procesar cada día de forma independiente
    for dia_str, dets_dia in sorted(por_dia.items()):
        items = []
        for d in dets_dia:
            try:
                lat = float(d.latitud)
                lon = float(d.longitud)
                scan = float(d.scan_km) if d.scan_km else (0.375 if 'VIIRS' in d.fuente.sensor.upper() else 1.0)
                track = float(d.track_km) if d.track_km else (0.375 if 'VIIRS' in d.fuente.sensor.upper() else 1.0)
                dia_noche = d.dia_noche or 'D'

                poly_wgs, ha = calcular_footprint_pixel(lon, lat, scan, track, dia_noche)

                # Polígono métrico en UTM 18S para cálculo preciso de distancias y uniones
                pxs, pys = poly_wgs.exterior.coords.xy
                ux, uy = transform({'init': 'epsg:4326'}, {'init': 'epsg:32718'}, list(pxs), list(pys))
                poly_utm = Polygon(zip(ux, uy))

                sat_nombre = d.codigo_satelite or ''
                if not sat_nombre:
                    if 'NOAA20' in (d.fuente.codigo_producto or ''):
                        sat_nombre = 'NOAA-20'
                    elif 'NOAA21' in (d.fuente.codigo_producto or ''):
                        sat_nombre = 'NOAA-21'
                    elif 'SNPP' in (d.fuente.codigo_producto or ''):
                        sat_nombre = 'Suomi-NPP'
                    elif 'MODIS' in (d.fuente.codigo_producto or ''):
                        sat_nombre = 'Terra/Aqua'
                    else:
                        sat_nombre = d.fuente.sensor

                items.append({
                    'det': d,
                    'poly_wgs': poly_wgs,
                    'poly_utm': poly_utm,
                    'sensor': d.fuente.sensor,
                    'satelite': sat_nombre,
                    'frp': float(d.frp_mw) if d.frp_mw is not None else 0.0,
                    'brillo_k': float(d.brillo_kelvin) if d.brillo_kelvin is not None else None,
                    'confianza': d.confianza or 'nominal',
                    'fecha_dt': d.fecha_observacion
                })
            except Exception:
                continue

        if not items:
            continue

        n = len(items)
        # Construir matriz de adyacencia por proximidad de rastro
        adj = [[] for _ in range(n)]
        for i in range(n):
            for j in range(i + 1, n):
                try:
                    # Distancia entre los polígonos métricos
                    dist_m = items[i]['poly_utm'].distance(items[j]['poly_utm'])
                    if dist_m <= distancia_rastro_m:
                        adj[i].append(j)
                        adj[j].append(i)
                except Exception:
                    pass

        # Componentes conexas del día
        visitados = [False] * n
        rastro_num = 1

        for i in range(n):
            if visitados[i]:
                continue

            comp = []
            cola = [i]
            visitados[i] = True

            while cola:
                curr = cola.pop(0)
                comp.append(items[curr])
                for vecino in adj[curr]:
                    if not visitados[vecino]:
                        visitados[vecino] = True
                        cola.append(vecino)

            # Consolidar el rastro fusionado
            sensores_set = sorted(list(set(x['sensor'] for x in comp)))
            satelites_set = sorted(list(set(x['satelite'] for x in comp if x['satelite'])))
            focos_viirs = sum(1 for x in comp if 'VIIRS' in x['sensor'].upper())
            focos_modis = sum(1 for x in comp if 'MODIS' in x['sensor'].upper())

            if len(sensores_set) > 1:
                sensor_label = f"Fusión Multi-Sensor ({' + '.join(sensores_set)})"
                es_multisensor = True
            else:
                sensor_label = sensores_set[0]
                es_multisensor = False

            frp_total = sum(x['frp'] for x in comp)
            frp_max = max(x['frp'] for x in comp)
            frp_prom = frp_total / len(comp)

            brillos = [x['brillo_k'] for x in comp if x['brillo_k'] is not None]
            brillo_max_c = round(max(brillos) - 273.15, 1) if brillos else None
            brillo_prom_c = round((sum(brillos) / len(brillos)) - 273.15, 1) if brillos else None

            # Rango temporal del día
            tiempos_dt = [x['fecha_dt'] for x in comp]
            t_min = min(tiempos_dt).strftime('%Y-%m-%dT%H:%M:%SZ')
            t_max = max(tiempos_dt).strftime('%Y-%m-%dT%H:%M:%SZ')
            t_min_hora = min(tiempos_dt).strftime('%H:%M')
            t_max_hora = max(tiempos_dt).strftime('%H:%M')

            # Disolver geometrías UTM
            polys_utm = [x['poly_utm'] for x in comp]
            union_utm = unary_union(polys_utm)

            # Calcular área real en hectáreas del rastro disuelto
            area_real_ha = union_utm.area / 10000.0

            # Reproyectar geometría disuelta a WGS84 para GeoJSON
            def reproject_to_wgs84(geom_utm):
                if isinstance(geom_utm, Polygon):
                    gx, gy = geom_utm.exterior.coords.xy
                    wx, wy = transform({'init': 'epsg:32718'}, {'init': 'epsg:4326'}, list(gx), list(gy))
                    exterior_wgs = list(zip(wx, wy))
                    interiors_wgs = []
                    for interior in geom_utm.interiors:
                        ix, iy = interior.coords.xy
                        iwx, iwy = transform({'init': 'epsg:32718'}, {'init': 'epsg:4326'}, list(ix), list(iy))
                        interiors_wgs.append(list(zip(iwx, iwy)))
                    return Polygon(exterior_wgs, interiors_wgs)
                elif isinstance(geom_utm, MultiPolygon):
                    return MultiPolygon([reproject_to_wgs84(p) for p in geom_utm.geoms])
                return geom_utm

            geom_wgs84 = reproject_to_wgs84(union_utm)

            # Nivel de confianza máximo
            confianzas = [x['confianza'].lower() for x in comp]
            if 'high' in confianzas:
                conf_max = 'high'
            elif 'nominal' in confianzas:
                conf_max = 'nominal'
            else:
                conf_max = 'low'

            id_rastro_str = f"RASTRO-{dia_str.replace('-', '')}-{rastro_num:02d}"

            features_rastros.append({
                'type': 'Feature',
                'geometry': mapping(geom_wgs84),
                'properties': {
                    'id_rastro': id_rastro_str,
                    'fecha_dia': dia_str,
                    'fecha_inicio_utc': t_min,
                    'fecha_fin_utc': t_max,
                    'hora_ventana_utc': f"{t_min_hora} - {t_max_hora} UTC",
                    'sensores_fusionados': sensor_label,
                    'satelites_involucrados': ", ".join(satelites_set) if satelites_set else "N/A",
                    'es_multisensor': es_multisensor,
                    'focos_totales_fusionados': len(comp),
                    'focos_viirs': focos_viirs,
                    'focos_modis': focos_modis,
                    'frp_total_mw': round(frp_total, 2),
                    'frp_maximo_mw': round(frp_max, 2),
                    'frp_promedio_mw': round(frp_prom, 2),
                    'temperatura_brillo_max_c': brillo_max_c,
                    'temperatura_brillo_prom_c': brillo_prom_c,
                    'area_quemada_ha': round(area_real_ha, 2),
                    'confianza_maxima': conf_max,
                    'estado_frente': 'Activo en fecha'
                }
            })
            rastro_num += 1

    return {
        'type': 'FeatureCollection',
        'name': 'rastros_fuego_fusionados_dia',
        'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'}},
        'features': features_rastros
    }


