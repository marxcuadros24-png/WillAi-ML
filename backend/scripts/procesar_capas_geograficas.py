"""
Script de Procesamiento y Extracción Geoespacial de Carreteras, Trochas y Ríos para la Provincia de Parinacochas.
Fuentes Oficiales:
- MTC / IGN / INGEMMET: Red Vial Nacional, Departamental y Vecinal (Sistema SINAC / Cartografía Base Oficial WGS84).
- OpenStreetMap (OSM) / Cartografía Rural Andina: Trochas Carrozables, Cortafuegos y Caminos de Penetración Comunal.
- ANA / IGN: Red Hidrográfica Oficial de Ríos y Quebradas (Carta Nacional IGN / SNIRH).
- IGN / INEI: Límite Provincial Oficial de Parinacochas (UBIGEO 0507).
"""
import json
import math
import os
import re
import ssl
import sys
import urllib.request
import urllib.parse
from pathlib import Path
from shapely.geometry import shape, mapping, MultiLineString, LineString, Polygon, MultiPolygon
from shapely.prepared import prep

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
PUBLIC_DATA_DIR = ROOT_DIR / "frontend" / "public" / "data"
ROOT_DATA_DIR = ROOT_DIR / "data"

PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
ROOT_DATA_DIR.mkdir(parents=True, exist_ok=True)

SSL_UNVERIFIED_CTX = ssl._create_unverified_context()


def to_3857(lon, lat):
    """Convierte coordenadas geográficas WGS84 a Web Mercator (EPSG:3857)."""
    x = lon * 20037508.34 / 180.0
    y = math.log(math.tan((90.0 + lat) * math.pi / 360.0)) / (math.pi / 180.0)
    y = y * 20037508.34 / 180.0
    return x, y


def obtener_poligono_parinacochas():
    """Carga y valida el polígono oficial de Parinacochas desde el repositorio."""
    demarcacion_file = ROOT_DIR / "frontend" / "src" / "data" / "demarcacionParinacochas.ts"
    with open(demarcacion_file, "r", encoding="utf-8") as f:
        content = f.read()

    match = re.search(r"export const LIMITE_PROVINCIAL_PARINACOCHAS\s*=\s*(\{[\s\S]*?\n\};)", content)
    if not match:
        raise ValueError("No se pudo extraer LIMITE_PROVINCIAL_PARINACOCHAS de demarcacionParinacochas.ts")

    json_str = match.group(1).rstrip(";")
    geo_dict = json.loads(json_str)

    out_file = PUBLIC_DATA_DIR / "limite_parinacochas.geojson"
    out_root = ROOT_DATA_DIR / "limite_parinacochas.geojson"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(geo_dict, f, ensure_ascii=False, indent=2)
    with open(out_root, "w", encoding="utf-8") as f:
        json.dump(geo_dict, f, ensure_ascii=False, indent=2)

    poly = shape(geo_dict["features"][0]["geometry"])
    if not poly.is_valid:
        poly = poly.buffer(0)
    return poly, geo_dict


def consultar_arcgis_geojson(url, params):
    """Consulta endpoints ArcGIS Server con paginación y formato GeoJSON."""
    req_params = dict(params)
    req_params["f"] = "geojson"
    req_params["returnGeometry"] = "true"
    req_params["outSR"] = "4326"

    full_url = f"{url}?{urllib.parse.urlencode(req_params)}"
    req = urllib.request.Request(full_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WillAI/1.0"})
    with urllib.request.urlopen(req, context=SSL_UNVERIFIED_CTX, timeout=30) as res:
        data = json.loads(res.read().decode("utf-8"))
        return data


def consultar_arcgis_esrijson(url, params):
    """Consulta endpoints ArcGIS Server en formato EsriJSON nativo y convierte a GeoJSON."""
    req_params = dict(params)
    req_params["f"] = "json"
    req_params["returnGeometry"] = "true"
    req_params["outSR"] = "4326"

    full_url = f"{url}?{urllib.parse.urlencode(req_params)}"
    req = urllib.request.Request(full_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WillAI/1.0"})
    with urllib.request.urlopen(req, context=SSL_UNVERIFIED_CTX, timeout=30) as res:
        data = json.loads(res.read().decode("utf-8"))
        return data


def procesar_rios_ana(poly_provincia):
    """
    Descarga y recorta la Red Hidrográfica oficial de ANA (Carta Nacional IGN).
    Endpoint: geosnirh.ana.gob.pe/server/rest/services/ONRH/Rios_Quebradas_Carta_Nacional_IGN/MapServer/0
    """
    print("\n[1/2] Consultando Red Hidrográfica Oficial ANA (Carta Nacional IGN)...")
    base_url = "https://geosnirh.ana.gob.pe/server/rest/services/ONRH/Rios_Quebradas_Carta_Nacional_IGN/MapServer/0/query"
    
    bounds = poly_provincia.bounds
    geom_env = f"{bounds[0]},{bounds[1]},{bounds[2]},{bounds[3]}"

    prep_poly = prep(poly_provincia)
    features_recortadas = []
    offset = 0
    page_size = 1000

    while True:
        params = {
            "where": "1=1",
            "geometry": geom_env,
            "geometryType": "esriGeometryEnvelope",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "NOMBRE_COMPLETO,TEXT_NOMBRE_CUERPO_AGUA,TIPO_CUERPO_AGUA,jerarquia,NOM_CUENCA,NUM_LONGITUD",
            "resultOffset": str(offset),
            "resultRecordCount": str(page_size),
        }

        try:
            data = consultar_arcgis_geojson(base_url, params)
        except Exception as e:
            print(f"  [Aviso ANA offset {offset}]: {e}")
            break

        raw_features = data.get("features", [])
        if not raw_features:
            break

        print(f"  - Descargados {len(raw_features)} tramos fluviales desde offset {offset}...")

        for feat in raw_features:
            props = feat.get("properties", {})
            geom = shape(feat["geometry"])
            if not geom.is_valid:
                geom = geom.buffer(0)

            if not prep_poly.intersects(geom):
                continue

            try:
                geom_clip = geom.intersection(poly_provincia)
            except Exception:
                continue

            if geom_clip.is_empty:
                continue

            nombre = (props.get("NOMBRE_COMPLETO") or props.get("TEXT_NOMBRE_CUERPO_AGUA") or "").strip()
            tipo_raw = (props.get("TIPO_CUERPO_AGUA") or "").strip()
            if not nombre:
                nombre = "Quebrada sin nombre"

            if "río" in nombre.lower() or "rio" in nombre.lower() or "río" in tipo_raw.lower() or "rio" in tipo_raw.lower():
                tipo = "Río"
            else:
                tipo = "Quebrada"

            jerarquia = props.get("jerarquia") or ("Principal" if tipo == "Río" else "Secundario")
            cuenca = props.get("NOM_CUENCA") or "Cuenca Parinacochas"

            def clean_coords(coords):
                if isinstance(coords[0], (int, float)):
                    return [round(coords[0], 5), round(coords[1], 5)]
                return [clean_coords(c) for c in coords]

            geo_clean = mapping(geom_clip)
            geo_clean["coordinates"] = clean_coords(geo_clean["coordinates"])

            features_recortadas.append({
                "type": "Feature",
                "geometry": geo_clean,
                "properties": {
                    "id": f"ANA-HIDRO-{len(features_recortadas) + 1}",
                    "nombre": nombre,
                    "tipo": tipo,
                    "jerarquia": jerarquia,
                    "cuenca": cuenca,
                    "es_cortafuego": True,
                    "fuente": "ANA - Carta Nacional IGN (SNIRH)",
                }
            })

        offset += len(raw_features)
        if len(raw_features) < page_size:
            break

    print(f"  [+] Total ríos y quebradas oficiales recortados en Parinacochas: {len(features_recortadas)}")

    geojson_final = {
        "type": "FeatureCollection",
        "metadata": {
            "titulo": "Red Hidrográfica Oficial de la Provincia de Parinacochas",
            "fuente_oficial": "Autoridad Nacional del Agua (ANA) / Instituto Geográfico Nacional (IGN)",
            "servicio": "ONRH/Rios_Quebradas_Carta_Nacional_IGN/MapServer",
            "srid": "EPSG:4326",
            "total_elementos": len(features_recortadas)
        },
        "features": features_recortadas
    }

    out_file = PUBLIC_DATA_DIR / "rios_parinacochas.geojson"
    out_root = ROOT_DATA_DIR / "rios_parinacochas.geojson"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(geojson_final, f, ensure_ascii=False, separators=(',', ':'))
    with open(out_root, "w", encoding="utf-8") as f:
        json.dump(geojson_final, f, ensure_ascii=False, indent=2)

    return geojson_final


def procesar_trochas_osm(poly_provincia, features_recortadas, seen_geoms, clean_coords):
    """
    Descarga o carga trochas carrozables, caminos rurales, accesos vecinales y senderos
    de la Provincia de Parinacochas mediante Overpass API (OSM / Cartografía Rural).
    """
    print("\n  - [2.3] Consultando Trochas Carrozables y Caminos Rurales (OSM / Cartografía Rural)...")
    cache_file = ROOT_DATA_DIR / "trochas_osm_parinacochas.geojson"
    prep_poly = prep(poly_provincia)

    if cache_file.exists():
        print(f"    [+] Cargando trochas desde archivo persistente: {cache_file}")
        with open(cache_file, "r", encoding="utf-8") as f:
            cached_data = json.load(f)
        trochas_agregadas = 0
        for feat in cached_data.get("features", []):
            geom = shape(feat["geometry"])
            geom_key = round(geom.length * 10000)
            coords_sample = geom.wkt[:60]
            unique_key = f"TR-{geom_key}-{coords_sample}"
            if unique_key in seen_geoms:
                continue
            seen_geoms.add(unique_key)
            props = dict(feat.get("properties", {}))
            props["id"] = f"TR-{len(features_recortadas) + 1}"

            # Identificar corredor Huayllani - Umacunsiri - Occoruro - Negromayo (Ruta AY-688 real)
            pts = list(geom.coords) if geom.geom_type == 'LineString' else [p for line in geom.geoms for p in line.coords]
            lats = [p[1] for p in pts]
            in_corredor_ay688 = all(-73.88 <= p[0] <= -73.74 and -14.98 <= p[1] <= -14.64 for p in pts)
            span_y = (max(lats) - min(lats)) * 111.0 if lats else 0

            if in_corredor_ay688 and len(pts) >= 30 and span_y >= 0.4:
                props["codigo"] = "AY-688"
                props["nombre"] = "Camino Vecinal Huayllani - Umacunsiri - Negromayo"
                props["categoria"] = "Vecinal"
                props["tipo_red"] = "Red Vial Vecinal (AY-688)"
                props["superficie"] = "Afirmado / Trocha"
                props["fuente"] = "MTC / Cartografía Rural Andina (Trazo Topográfico Real)"

            features_recortadas.append({
                "type": "Feature",
                "geometry": feat["geometry"],
                "properties": props
            })
            trochas_agregadas += 1
        print(f"    [+] Total trochas y caminos rurales agregados: {trochas_agregadas}")
        return

    bounds = poly_provincia.bounds
    bbox_str = f"{bounds[1]},{bounds[0]},{bounds[3]},{bounds[2]}"

    overpass_query = f"""
    [out:json][timeout:90];
    (
      way["highway"~"track|unclassified|path|road|service"]({bbox_str});
    );
    out body;
    >;
    out skel qt;
    """

    mirrors = [
        "https://lz4.overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass-api.de/api/interpreter",
    ]

    data = None
    for url in mirrors:
        try:
            req = urllib.request.Request(
                url,
                data=urllib.parse.urlencode({"data": overpass_query}).encode("utf-8"),
                headers={"User-Agent": "WillAI-Peru-Trochas/1.0"}
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data and "elements" in data:
                    print(f"    [+] Datos de trochas obtenidos exitosamente desde {url}")
                    break
        except Exception as e:
            print(f"    [Aviso mirror {url}]: {e}")

    if not data:
        print("    [Aviso]: No se pudo descargar datos de trochas de los mirrors Overpass.")
        return

    nodes = {}
    ways = []
    for el in data.get("elements", []):
        if el.get("type") == "node":
            nodes[el["id"]] = (round(el["lon"], 5), round(el["lat"], 5))
        elif el.get("type") == "way":
            ways.append(el)

    trochas_agregadas = 0
    for w in ways:
        pts = [nodes[nid] for nid in w.get("nodes", []) if nid in nodes]
        if len(pts) < 2:
            continue
        line = LineString(pts)
        if not prep_poly.intersects(line):
            continue
        try:
            clipped = line.intersection(poly_provincia)
        except Exception:
            continue
        if clipped.is_empty:
            continue

        geom_key = round(clipped.length * 10000)
        coords_sample = clipped.wkt[:60]
        unique_key = f"TR-{geom_key}-{coords_sample}"
        if unique_key in seen_geoms:
            continue
        seen_geoms.add(unique_key)

        tags = w.get("tags", {})
        highway = tags.get("highway", "track")
        surface = tags.get("surface") or ("Tierra" if highway == "track" else "Afirmado")
        name = tags.get("name") or ("Trocha Carrozable" if highway == "track" else "Camino Rural")
        ref = tags.get("ref") or ""

        if highway == "track":
            categoria = "Trocha"
            tipo_red = "Trocha Carrozable / Cortafuego"
        elif highway == "path":
            categoria = "Sendero"
            tipo_red = "Sendero / Camino Herradura"
        else:
            categoria = "Vecinal"
            tipo_red = "Camino Vecinal / Rural"

        geo_clean = mapping(clipped)
        geo_clean["coordinates"] = clean_coords(geo_clean["coordinates"])

        features_recortadas.append({
            "type": "Feature",
            "geometry": geo_clean,
            "properties": {
                "id": f"OSM-TR-{len(features_recortadas) + 1}",
                "codigo": ref or f"TR-{len(features_recortadas) + 1}",
                "nombre": name,
                "categoria": categoria,
                "tipo_red": tipo_red,
                "superficie": surface.capitalize(),
                "es_cortafuego": True,
                "fuente": "OpenStreetMap / Cartografía Rural Andina",
            }
        })
        trochas_agregadas += 1

    print(f"    [+] Total trochas y caminos rurales agregados: {trochas_agregadas}")


def procesar_carreteras_mtc(poly_provincia):
    """
    Descarga y recorta la Red Vial Nacional, Departamental, Vecinal y Trochas Carrozables.
    Fuentes oficiales combinadas:
    1. Cartografía Oficial Base WGS84 (IGN / MTC): Vías Nacionales, Departamentales, Vecinales.
    2. Provías Nacional Infraestructura Vial (SINAC): Corredores PE-32, PE-30A, Solución Básica.
    3. OpenStreetMap / Cartografía Rural Andina: Trochas Carrozables, Cortafuegos y Caminos Vecinales.
    """
    print("\n[2/2] Consultando Red Vial Oficial MTC / IGN / OSM (Nacional, Departamental, Vecinal, Trochas)...")
    
    bounds = poly_provincia.bounds
    bbox_4326 = f"{bounds[0]},{bounds[1]},{bounds[2]},{bounds[3]}"
    x1, y1 = to_3857(bounds[0], bounds[1])
    x2, y2 = to_3857(bounds[2], bounds[3])
    bbox_3857 = f"{x1},{y1},{x2},{y2}"

    prep_poly = prep(poly_provincia)
    features_recortadas = []
    seen_geoms = set()

    def clean_coords(coords):
        if isinstance(coords[0], (int, float)):
            return [round(coords[0], 5), round(coords[1], 5)]
        return [clean_coords(c) for c in coords]

    # 1. Base Cartográfica Oficial MTC / IGN (Vía Nacional, Departamental, Vecinal)
    base_ign_url = "https://geocatmin.ingemmet.gob.pe/arcgis/rest/services/SERV_CARTOGRAFIA_BASE_WGS84/MapServer"
    ign_layers = [
        (1, "Nacional", "Red Vial Nacional"),
        (2, "Departamental", "Red Vial Departamental"),
        (3, "Vecinal", "Red Vial Vecinal"),
    ]

    for lid, cat, tipo_red in ign_layers:
        url = f"{base_ign_url}/{lid}/query"
        params = {
            "where": "1=1",
            "geometry": bbox_4326,
            "geometryType": "esriGeometryEnvelope",
            "inSR": "4326",
            "outSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "*",
            "returnGeometry": "true",
        }
        try:
            data = consultar_arcgis_esrijson(url, params)
            feats = data.get("features", [])
            print(f"  - MTC/IGN Capa {lid} ({cat}): {len(feats)} segmentos encontrados...")
            for ef in feats:
                attr = ef.get("attributes", {})
                paths = ef.get("geometry", {}).get("paths", [])
                lines = []
                for p in paths:
                    if len(p) >= 2:
                        lines.append(LineString([[round(pt[0], 5), round(pt[1], 5)] for pt in p]))
                if not lines:
                    continue
                geom = lines[0] if len(lines) == 1 else MultiLineString(lines)
                if not prep_poly.intersects(geom):
                    continue
                try:
                    geom_clip = geom.intersection(poly_provincia)
                except Exception:
                    continue
                if geom_clip.is_empty:
                    continue

                geom_key = round(geom_clip.length * 10000)
                coords_sample = geom_clip.wkt[:60]
                unique_key = f"{cat}-{geom_key}-{coords_sample}"
                if unique_key in seen_geoms:
                    continue
                seen_geoms.add(unique_key)

                cod = (
                    attr.get("RUTA") or
                    attr.get("CCODRUTA_4") or
                    attr.get("CCOD_RUTA") or
                    attr.get("COD_RUTA") or
                    attr.get("CODIGO") or
                    "S/C"
                ).strip()

                nom = (
                    attr.get("TRAMOS") or
                    attr.get("CNOMRUTA") or
                    attr.get("NOM_RUTA") or
                    attr.get("DESCRIPCIO") or
                    f"Ruta {cat} {cod}"
                ).strip()

                sup = (
                    attr.get("SUPERFICIE") or
                    attr.get("SUP_VIA") or
                    attr.get("CESTADOD_3") or
                    ("Asfaltado" if cat == "Nacional" else "Afirmado")
                ).strip()

                # Criterio estricto de calidad geográfica:
                # Filtrar líneas rectas espurias o proyectos esquemáticos (como AY-688 preliminar que tenía solo 5 vértices en 37 km)
                sup_lower = sup.lower()
                num_coords = len(geom_clip.coords) if geom_clip.geom_type == 'LineString' else sum(len(c.coords) for c in geom_clip.geoms)
                longitud_km = geom_clip.length * 111.0

                if "proyecto" in sup_lower:
                    print(f"    [Filtrado proyecto esquemático descartado]: {cat} {cod} ({num_coords} pts, {longitud_km:.1f} km) - {nom}")
                    continue

                if num_coords <= 10 and longitud_km > 2.0:
                    print(f"    [Filtrado trazo recto espurio descartado]: {cat} {cod} ({num_coords} pts, {longitud_km:.1f} km) - {nom}")
                    continue

                geo_clean = mapping(geom_clip)
                geo_clean["coordinates"] = clean_coords(geo_clean["coordinates"])

                features_recortadas.append({
                    "type": "Feature",
                    "geometry": geo_clean,
                    "properties": {
                        "id": f"MTC-{cat[:3].upper()}-{len(features_recortadas) + 1}",
                        "codigo": cod,
                        "nombre": nom,
                        "categoria": cat,
                        "tipo_red": tipo_red,
                        "superficie": sup,
                        "es_cortafuego": True,
                        "fuente": "MTC / IGN - Cartografía Base Oficial WGS84",
                    }
                })
        except Exception as e:
            print(f"  [Aviso MTC/IGN Capa {lid}]: {e}")

    # 2. Provías Nacional Infraestructura Vial (SINAC - Capas 2, 3, 5, 7)
    base_pvn_url = "https://giserver.proviasnac.gob.pe/arcgis/rest/services/MTC__InfraestructuraVial/MapServer"
    pvn_layers = [
        (2, "Asfaltado"),
        (3, "Afirmado"),
        (5, "Trocha"),
        (7, "Solución Básica"),
    ]

    for lid, sup_label in pvn_layers:
        url = f"{base_pvn_url}/{lid}/query"
        params = {
            "where": "1=1",
            "geometry": bbox_3857,
            "geometryType": "esriGeometryEnvelope",
            "inSR": "102100",
            "outSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "cCodRuta,cNomRuta,cTipRed,cSuperficie",
            "returnGeometry": "true",
        }
        try:
            data = consultar_arcgis_esrijson(url, params)
            feats = data.get("features", [])
            for ef in feats:
                attr = ef.get("attributes", {})
                paths = ef.get("geometry", {}).get("paths", [])
                lines = []
                for p in paths:
                    if len(p) >= 2:
                        lines.append(LineString([[round(pt[0], 5), round(pt[1], 5)] for pt in p]))
                if not lines:
                    continue
                geom = lines[0] if len(lines) == 1 else MultiLineString(lines)
                if not prep_poly.intersects(geom):
                    continue
                try:
                    geom_clip = geom.intersection(poly_provincia)
                except Exception:
                    continue
                if geom_clip.is_empty:
                    continue

                # Filtrar tramos rectos residuales sin resolución topográfica
                num_pts = len(geom_clip.coords) if geom_clip.geom_type == 'LineString' else sum(len(c.coords) for c in geom_clip.geoms)
                km_len = geom_clip.length * 111.0
                if num_pts <= 4 and km_len > 2.0:
                    continue

                geom_key = round(geom_clip.length * 10000)
                coords_sample = geom_clip.wkt[:60]
                unique_key = f"PVN-{geom_key}-{coords_sample}"
                if unique_key in seen_geoms:
                    continue
                seen_geoms.add(unique_key)

                cod = (attr.get("cCodRuta") or "PE-32").strip()
                nom = (attr.get("cNomRuta") or f"Carretera {cod}").strip()
                tip_red = (attr.get("cTipRed") or "").strip()

                if tip_red == "RD" or "AY-" in cod or "AR-" in cod:
                    categoria = "Departamental"
                    tipo_red = "Red Vial Departamental"
                elif tip_red == "RV" or len(cod) > 6:
                    categoria = "Vecinal"
                    tipo_red = "Red Vial Vecinal / Trocha"
                else:
                    categoria = "Nacional"
                    tipo_red = "Red Vial Nacional"

                geo_clean = mapping(geom_clip)
                geo_clean["coordinates"] = clean_coords(geo_clean["coordinates"])

                features_recortadas.append({
                    "type": "Feature",
                    "geometry": geo_clean,
                    "properties": {
                        "id": f"MTC-{categoria[:3].upper()}-{len(features_recortadas) + 1}",
                        "codigo": cod,
                        "nombre": nom,
                        "categoria": categoria,
                        "tipo_red": tipo_red,
                        "superficie": sup_label,
                        "es_cortafuego": True,
                        "fuente": "MTC - Provías Nacional (SINAC)",
                    }
                })
        except Exception as e:
            print(f"  [Aviso PVN Capa {lid}]: {e}")

    # 3. Trochas carrozables y caminos rurales (OSM / Cartografía Rural Andina)
    procesar_trochas_osm(poly_provincia, features_recortadas, seen_geoms, clean_coords)

    print(f"  [+] Total vías y trochas oficiales recortadas en Parinacochas: {len(features_recortadas)}")

    geojson_final = {
        "type": "FeatureCollection",
        "metadata": {
            "titulo": "Red Vial y Trochas Carrozables de la Provincia de Parinacochas",
            "fuente_oficial": "Ministerio de Transportes y Comunicaciones (MTC) / IGN / OpenStreetMap",
            "servicio": "MTC__InfraestructuraVial / SERV_CARTOGRAFIA_BASE_WGS84 / OSM",
            "srid": "EPSG:4326",
            "total_elementos": len(features_recortadas)
        },
        "features": features_recortadas
    }

    out_file = PUBLIC_DATA_DIR / "carreteras_parinacochas.geojson"
    out_root = ROOT_DATA_DIR / "carreteras_parinacochas.geojson"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(geojson_final, f, ensure_ascii=False, separators=(',', ':'))
    with open(out_root, "w", encoding="utf-8") as f:
        json.dump(geojson_final, f, ensure_ascii=False, indent=2)

    return geojson_final


def main():
    print("=" * 80)
    print(" PROCESAMIENTO GEOESPACIAL DE CAPAS OFICIALES: PARINACOCHAS (MTC + ANA + IGN + TROCHAS)")
    print("=" * 80)

    # 1. Polígono provincial oficial IGN / INEI
    poly_parinacochas, limite_geojson = obtener_poligono_parinacochas()
    print(f"[+] Límite provincial de Parinacochas cargado exitosamente.")
    print(f"    Área: {limite_geojson['metadata']['superficie_km2']} km² ({limite_geojson['metadata']['superficie_ha']} ha)")

    # 2. Red Hidrográfica ANA
    rios = procesar_rios_ana(poly_parinacochas)

    # 3. Red Vial MTC / IGN / OSM Trochas
    carreteras = procesar_carreteras_mtc(poly_parinacochas)

    print("\n" + "=" * 80)
    print(" RESUMEN DE PROCESAMIENTO Y VALIDACIÓN GEOESPACIAL:")
    print("=" * 80)
    print(f"  1. limite_parinacochas.geojson:    1 polígono oficial IGN/INEI (5,873.07 km²)")
    print(f"  2. rios_parinacochas.geojson:      {len(rios['features'])} tramos fluviales (ANA SNIRH / IGN)")
    print(f"  3. carreteras_parinacochas.geojson: {len(carreteras['features'])} tramos viales y trochas (MTC / IGN / OSM)")
    
    cat_counts = {}
    for f in carreteras["features"]:
        cat = f["properties"]["categoria"]
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    print(f"     -> Desglose vial: {cat_counts}")

    print(f"\n  Archivos generados en:")
    print(f"    - {PUBLIC_DATA_DIR / 'limite_parinacochas.geojson'}")
    print(f"    - {PUBLIC_DATA_DIR / 'rios_parinacochas.geojson'}")
    print(f"    - {PUBLIC_DATA_DIR / 'carreteras_parinacochas.geojson'}")
    print("=" * 80)


if __name__ == "__main__":
    main()
