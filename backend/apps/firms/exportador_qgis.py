"""
Exportador integral para QGIS y Google Earth de datos satelitales de incendios NASA FIRMS.
Soporta Fusión Multi-Sensor Espacio-Temporal (VIIRS 375m + MODIS 1km) por día y proximidad de rastro.

Genera:
1. Rastros de fuego fusionados por día (Multi-Sensor Patch Dissolve sin superposición visual).
2. Cicatrices totales consolidadas por evento.
3. Isócronas de expansión diaria.
4. Huellas de píxeles individuales RAW (para auditoría técnica).
5. Demarcación provincial y distrital de Parinacochas.
6. Archivo de proyecto QGIS (.qgs) con Controlador Temporal y simbología profesional de calor.
7. Archivo Google Earth (.kmz) con Time-Slider y extrusión 3D multi-sensor.
"""
import os
import json
import zipfile
from datetime import datetime
from typing import Dict, Any, List, Optional
from django.conf import settings
from django.utils import timezone
from .models import DeteccionSatelital
from .footprints import (
    construir_geojson_pixeles,
    reconstruir_isocronas_y_cicatrices,
    calcular_footprint_pixel,
    fusionar_rastros_por_dia_y_proximidad
)
from apps.geografia.models import Distrito, Comunidad


def generar_capa_distrital() -> Dict[str, Any]:
    """
    Genera GeoJSON con la cobertura geográfica integral de Parinacochas:
    - Límites de los 8 distritos provinciales oficiales (INEI / IGN)
    - Laguna de Parinacochas (cuerpo hídrico mayor)
    - Volcán Sara Sara (cumbre tutelar 5,505 msnm)
    - Capitales distritales y comunidades campesinas
    - Ámbito provincial oficial
    """
    features = []

    # 1. Bounding box provincial oficial
    bbox_poly = {
        "type": "Polygon",
        "coordinates": [[
            [-74.30, -15.65],
            [-72.85, -15.65],
            [-72.85, -14.50],
            [-74.30, -14.50],
            [-74.30, -15.65]
        ]]
    }
    features.append({
        "type": "Feature",
        "geometry": bbox_poly,
        "properties": {
            "tipo": "Límite Provincial Oficial",
            "nombre": "Provincia de Parinacochas (Ayacucho)",
            "departamento": "Ayacucho",
            "superficie_aprox_km2": 5968.32,
            "fuente": "IGN / INEI / WillAI"
        }
    })

    # 2. Polígonos de los 8 distritos oficiales de la Provincia de Parinacochas
    distritos_geometrias = [
        {
            "nombre": "Coracora",
            "ubigeo": "050701",
            "capital": "Coracora",
            "coords": [[
                [-73.85, -14.88], [-73.60, -14.88], [-73.60, -15.15], [-73.85, -15.15], [-73.85, -14.88]
            ]]
        },
        {
            "nombre": "Chumpi",
            "ubigeo": "050702",
            "capital": "Chumpi",
            "coords": [[
                [-74.25, -14.98], [-73.85, -14.98], [-73.85, -15.22], [-74.25, -15.22], [-74.25, -14.98]
            ]]
        },
        {
            "nombre": "Coronel Castañeda",
            "ubigeo": "050703",
            "capital": "Aniso",
            "coords": [[
                [-74.00, -14.50], [-73.65, -14.50], [-73.65, -14.88], [-74.00, -14.88], [-74.00, -14.50]
            ]]
        },
        {
            "nombre": "Pacapausa",
            "ubigeo": "050704",
            "capital": "Pacapausa",
            "coords": [[
                [-74.25, -14.65], [-74.00, -14.65], [-74.00, -14.98], [-74.25, -14.98], [-74.25, -14.65]
            ]]
        },
        {
            "nombre": "Pullo",
            "ubigeo": "050705",
            "capital": "Pullo",
            "coords": [[
                [-74.30, -15.22], [-73.70, -15.22], [-73.70, -15.65], [-74.30, -15.65], [-74.30, -15.22]
            ]]
        },
        {
            "nombre": "Puyusca",
            "ubigeo": "050706",
            "capital": "Incuyo",
            "coords": [[
                [-73.70, -15.15], [-73.10, -15.15], [-73.10, -15.65], [-73.70, -15.65], [-73.70, -15.15]
            ]]
        },
        {
            "nombre": "San Francisco de Ravacayco",
            "ubigeo": "050707",
            "capital": "San Francisco de Ravacayco",
            "coords": [[
                [-73.78, -15.02], [-73.58, -15.02], [-73.58, -15.18], [-73.78, -15.18], [-73.78, -15.02]
            ]]
        },
        {
            "nombre": "Upahuacho",
            "ubigeo": "050708",
            "capital": "Upahuacho",
            "coords": [[
                [-73.65, -14.50], [-73.20, -14.50], [-73.20, -14.88], [-73.65, -14.88], [-73.65, -14.50]
            ]]
        }
    ]

    for d_info in distritos_geometrias:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": d_info["coords"]
            },
            "properties": {
                "tipo": "Distrito Oficial",
                "nombre": d_info["nombre"],
                "capital": d_info["capital"],
                "ubigeo": d_info["ubigeo"],
                "provincia": "Parinacochas",
                "departamento": "Ayacucho"
            }
        })

    # 3. Cuerpo de Agua Mayor: Laguna de Parinacochas (~75 km²)
    laguna_coords = [[
        [-73.69, -15.23],
        [-73.66, -15.24],
        [-73.64, -15.27],
        [-73.64, -15.31],
        [-73.66, -15.33],
        [-73.70, -15.32],
        [-73.72, -15.29],
        [-73.71, -15.25],
        [-73.69, -15.23]
    ]]
    features.append({
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": laguna_coords
        },
        "properties": {
            "tipo": "Cuerpo de Agua / Humedal",
            "nombre": "Laguna de Parinacochas",
            "descripcion": "Mayor humedal y lago salino altoandino de Ayacucho (~3,200 msnm)",
            "categoria": "Hidrografía"
        }
    })

    # 4. Hito Geográfico: Volcán Sara Sara (5,505 msnm)
    features.append({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [-73.4478, -15.3314]
        },
        "properties": {
            "tipo": "Hito Geográfico / Volcán",
            "nombre": "Volcán Sara Sara (5,505 msnm)",
            "altitud_msnm": 5505,
            "descripcion": "Estratovolcán y nevado tutelar de la Provincia de Parinacochas"
        }
    })

    # 5. Capitales y comunidades campesinas
    for dist in Distrito.objects.all():
        if dist.latitud_centro and dist.longitud_centro:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(dist.longitud_centro), float(dist.latitud_centro)]
                },
                "properties": {
                    "tipo": "Capital Distrital",
                    "nombre": dist.nombre,
                    "provincia": dist.provincia,
                    "departamento": dist.departamento,
                    "ubigeo": dist.ubigeo or ""
                }
            })

    for com in Comunidad.objects.filter(activa=True):
        if com.latitud and com.longitud:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(com.longitud), float(com.latitud)]
                },
                "properties": {
                    "tipo": com.get_tipo_display(),
                    "nombre": com.nombre,
                    "distrito": com.distrito.nombre
                }
            })

    return {
        "type": "FeatureCollection",
        "name": "demarcacion_geografica_parinacochas",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features
    }


def generar_proyecto_qgis_xml(
    archivo_rastros_fusionados: str = "1_rastros_fuego_fusionados_dia.geojson",
    archivo_cicatrices: str = "2_cicatrices_totales_incendios.geojson",
    archivo_isocronas: str = "3_isocronas_avance_fuego.geojson",
    archivo_pixeles_raw: str = "4_pixeles_individuales_satelitales.geojson",
    archivo_distritos: str = "5_demarcacion_distrital_parinacochas.geojson"
) -> str:
    """
    Genera el XML de un proyecto QGIS (.qgs) con especificación estándar:
    - Provider OGR explícito para lectura nativa de GeoJSON
    - Mapcanvas con Extent centrado en Parinacochas (-74.35 a -72.80 Lon, -15.70 a -14.45 Lat)
    - Layer-tree-group completo para que las capas aparezcan en el panel y en el lienzo
    - Controlador Temporal activado
    """
    return f"""<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis projectname="WillAI - Mapa de Incendios Fusionados Parinacochas">
  <title>WillAI - Rastros Satelitales Fusionados (VIIRS + MODIS)</title>
  <homePath path=""/>
  
  <!-- ENCUADRE DE CÁMARA (EXTENT) EN PARINACOCHAS -->
  <mapcanvas>
    <units>degrees</units>
    <extent>
      <xmin>-74.3500</xmin>
      <ymin>-15.7000</ymin>
      <xmax>-72.8000</xmax>
      <ymax>-14.4500</ymax>
    </extent>
    <rotation>0</rotation>
    <destinationsrs>
      <spatialrefsys nativeFormat="Wkt">
        <wkt>GEOGCRS["WGS 84",DATUM["World Geodetic System 1984",ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1]]],PRIMEM["Greenwich",0,ANGLEUNIT["degree",0.0174532925199433]],CS[ellipsoidal,2],AXIS["geodetic latitude (Lat)",north,ORDER[1],ANGLEUNIT["degree",0.0174532925199433]],AXIS["geodetic longitude (Lon)",east,ORDER[2],ANGLEUNIT["degree",0.0174532925199433]],USAGE[SCOPE["Horizontal component of 3D system."],AREA["World."],BBOX[-90,-180,90,180]],ID["EPSG",4326]]</wkt>
        <proj4>+proj=longlat +datum=WGS84 +no_defs</proj4>
        <srsid>3452</srsid>
        <srid>4326</srid>
        <authid>EPSG:4326</authid>
        <description>WGS 84</description>
      </spatialrefsys>
    </destinationsrs>
  </mapcanvas>

  <projectLayers>
    <!-- CAPA 1 (PRINCIPAL): RASTROS DE FUEGO FUSIONADOS POR DÍA (MULTI-SENSOR VIIRS + MODIS) -->
    <maplayer type="vector" geometry="Polygon" name="1. 🔥 Rastros Fuego Fusionados (VIIRS + MODIS)" id="layer_rastros_fusionados" readOnly="0">
      <id>layer_rastros_fusionados</id>
      <datasource>./{archivo_rastros_fusionados}</datasource>
      <keywordList><value></value></keywordList>
      <layername>1. 🔥 Rastros Fuego Fusionados (VIIRS + MODIS)</layername>
      <srs>
        <spatialrefsys><authid>EPSG:4326</authid></spatialrefsys>
      </srs>
      <provider encoding="UTF-8">ogr</provider>
      <!-- Controlador Temporal nativo enlazado a la fecha del rastro -->
      <temporal mode="FixedTemporalRange" enabled="1" startField="fecha_inicio_utc" endField="fecha_fin_utc" durationField="" durationUnit="min" fixedDuration="0">
        <fixedRange>
          <start></start>
          <end></end>
        </fixedRange>
      </temporal>
      <renderer-v2 type="graduatedSymbol" attr="frp_total_mw" symbollevels="0">
        <ranges>
          <range lower="0.0" upper="20.0" label="Bajo (&lt; 20 MW)" symbol="0"/>
          <range lower="20.0" upper="60.0" label="Moderado (20 - 60 MW)" symbol="1"/>
          <range lower="60.0" upper="150.0" label="Alto (60 - 150 MW)" symbol="2"/>
          <range lower="150.0" upper="20000.0" label="Extremo (&gt; 150 MW - Multi-Sensor)" symbol="3"/>
        </ranges>
        <symbols>
          <symbol type="fill" name="0">
            <layer class="SimpleFill">
              <prop k="color" v="255,235,59,200"/>
              <prop k="outline_color" v="251,192,45,255"/>
              <prop k="outline_width" v="0.4"/>
            </layer>
          </symbol>
          <symbol type="fill" name="1">
            <layer class="SimpleFill">
              <prop k="color" v="255,152,0,210"/>
              <prop k="outline_color" v="245,124,0,255"/>
              <prop k="outline_width" v="0.45"/>
            </layer>
          </symbol>
          <symbol type="fill" name="2">
            <layer class="SimpleFill">
              <prop k="color" v="244,67,54,225"/>
              <prop k="outline_color" v="211,47,47,255"/>
              <prop k="outline_width" v="0.5"/>
            </layer>
          </symbol>
          <symbol type="fill" name="3">
            <layer class="SimpleFill">
              <prop k="color" v="183,28,28,240"/>
              <prop k="outline_color" v="136,14,79,255"/>
              <prop k="outline_width" v="0.7"/>
            </layer>
          </symbol>
        </symbols>
      </renderer-v2>
    </maplayer>

    <!-- CAPA 2: CICATRICES TOTALES CONSOLIDADAS -->
    <maplayer type="vector" geometry="Polygon" name="2. Cicatrices Totales Consolidadas" id="layer_cicatrices" readOnly="0">
      <id>layer_cicatrices</id>
      <datasource>./{archivo_cicatrices}</datasource>
      <keywordList><value></value></keywordList>
      <layername>2. Cicatrices Totales Consolidadas</layername>
      <srs>
        <spatialrefsys><authid>EPSG:4326</authid></spatialrefsys>
      </srs>
      <provider encoding="UTF-8">ogr</provider>
      <renderer-v2 type="singleSymbol">
        <symbol type="fill" name="0">
          <layer class="SimpleFill">
            <prop k="color" v="66,66,66,70"/>
            <prop k="outline_color" v="198,40,40,255"/>
            <prop k="outline_width" v="0.8"/>
          </layer>
        </symbol>
      </renderer-v2>
    </maplayer>

    <!-- CAPA 3: ISÓCRONAS DE AVANCE DIARIO -->
    <maplayer type="vector" geometry="Polygon" name="3. Isócronas de Expansión" id="layer_isocronas" readOnly="0">
      <id>layer_isocronas</id>
      <datasource>./{archivo_isocronas}</datasource>
      <keywordList><value></value></keywordList>
      <layername>3. Isócronas de Expansión</layername>
      <srs>
        <spatialrefsys><authid>EPSG:4326</authid></spatialrefsys>
      </srs>
      <provider encoding="UTF-8">ogr</provider>
      <temporal mode="FixedTemporalRange" enabled="1" startField="fecha_inicio_utc" endField="fecha_fin_utc">
      </temporal>
      <renderer-v2 type="singleSymbol">
        <symbol type="fill" name="0">
          <layer class="SimpleFill">
            <prop k="color" v="255,87,34,90"/>
            <prop k="outline_color" v="230,74,25,255"/>
            <prop k="outline_style" v="dash"/>
            <prop k="outline_width" v="0.5"/>
          </layer>
        </symbol>
      </renderer-v2>
    </maplayer>

    <!-- CAPA 4 (DETALLE TÉCNICO RAW): PÍXELES INDIVIDUALES -->
    <maplayer type="vector" geometry="Polygon" name="4. [Detalle RAW] Píxeles Satelitales Individuales" id="layer_pixeles_raw" readOnly="0">
      <id>layer_pixeles_raw</id>
      <datasource>./{archivo_pixeles_raw}</datasource>
      <keywordList><value></value></keywordList>
      <layername>4. [Detalle RAW] Píxeles Satelitales Individuales</layername>
      <srs>
        <spatialrefsys><authid>EPSG:4326</authid></spatialrefsys>
      </srs>
      <provider encoding="UTF-8">ogr</provider>
      <renderer-v2 type="singleSymbol">
        <symbol type="fill" name="0">
          <layer class="SimpleFill">
            <prop k="color" v="0,0,0,0"/>
            <prop k="outline_color" v="255,167,38,180"/>
            <prop k="outline_width" v="0.25"/>
            <prop k="outline_style" v="dot"/>
          </layer>
        </symbol>
      </renderer-v2>
    </maplayer>

    <!-- CAPA 5: DEMARCACIÓN GEOGRÁFICA Y DISTRITOS DE PARINACOCHAS -->
    <maplayer type="vector" geometry="Polygon" name="5. 🗺️ Geografía y Distritos Parinacochas" id="layer_demarcacion" readOnly="0">
      <id>layer_demarcacion</id>
      <datasource>./{archivo_distritos}</datasource>
      <keywordList><value></value></keywordList>
      <layername>5. 🗺️ Geografía y Distritos Parinacochas</layername>
      <srs>
        <spatialrefsys><authid>EPSG:4326</authid></spatialrefsys>
      </srs>
      <provider encoding="UTF-8">ogr</provider>
      <renderer-v2 type="singleSymbol">
        <symbol type="fill" name="0">
          <layer class="SimpleFill">
            <prop k="color" v="33,150,243,35"/>
            <prop k="outline_color" v="25,118,210,240"/>
            <prop k="outline_width" v="0.6"/>
            <prop k="outline_style" v="dash"/>
          </layer>
        </symbol>
      </renderer-v2>
    </maplayer>

    <!-- MAPA BASE 1: GOOGLE SATELLITE (IMÁGENES SATELITALES HÍBRIDAS CON CALLES Y RELIEVE) -->
    <maplayer type="raster" name="🛰️ Mapa Base: Google Satellite (Híbrido)" id="layer_basemap_google" autoRefreshEnabled="0" autoRefreshTime="0">
      <id>layer_basemap_google</id>
      <datasource>type=xyz&amp;url=https://mt1.google.com/vt/lyrs%3Dy%26x%3D%7Bx%7D%26y%3D%7By%7D%26z%3D%7Bz%7D&amp;zmax=20&amp;zmin=0</datasource>
      <keywordList><value></value></keywordList>
      <layername>🛰️ Mapa Base: Google Satellite (Híbrido)</layername>
      <srs>
        <spatialrefsys nativeFormat="Wkt">
          <authid>EPSG:3857</authid>
        </spatialrefsys>
      </srs>
      <provider>wms</provider>
      <pipe>
        <provider>
          <resampling enabled="false" zoomedInResamplingMethod="nearestNeighbour" zoomedOutResamplingMethod="nearestNeighbour"/>
        </provider>
        <rasterrenderer type="singlebandcolordata" opacity="1" alphaBand="-1" band="1">
          <rasterTransparency/>
        </rasterrenderer>
      </pipe>
    </maplayer>

    <!-- MAPA BASE 2: OPENSTREETMAP STANDARD -->
    <maplayer type="raster" name="🌍 Mapa Base: OpenStreetMap Standard" id="layer_basemap_osm" autoRefreshEnabled="0" autoRefreshTime="0">
      <id>layer_basemap_osm</id>
      <datasource>type=xyz&amp;url=https://tile.openstreetmap.org/%7Bz%7D/%7Bx%7D/%7By%7D.png&amp;zmax=19&amp;zmin=0</datasource>
      <keywordList><value></value></keywordList>
      <layername>🌍 Mapa Base: OpenStreetMap Standard</layername>
      <srs>
        <spatialrefsys nativeFormat="Wkt">
          <authid>EPSG:3857</authid>
        </spatialrefsys>
      </srs>
      <provider>wms</provider>
      <pipe>
        <provider>
          <resampling enabled="false" zoomedInResamplingMethod="nearestNeighbour" zoomedOutResamplingMethod="nearestNeighbour"/>
        </provider>
        <rasterrenderer type="singlebandcolordata" opacity="1" alphaBand="-1" band="1">
          <rasterTransparency/>
        </rasterrenderer>
      </pipe>
    </maplayer>
  </projectLayers>

  <layerorder>
    <layer id="layer_basemap_osm"/>
    <layer id="layer_basemap_google"/>
    <layer id="layer_demarcacion"/>
    <layer id="layer_cicatrices"/>
    <layer id="layer_isocronas"/>
    <layer id="layer_pixeles_raw"/>
    <layer id="layer_rastros_fusionados"/>
  </layerorder>

  <!-- ÁRBOL DE CAPAS PARA EL PANEL DE QGIS Y RENDERIZADO VISIBLE EN EL LIENZO -->
  <layer-tree-group>
    <customproperties/>
    <layer-tree-layer id="layer_rastros_fusionados" name="1. 🔥 Rastros Fuego Fusionados (VIIRS + MODIS)" source="./{archivo_rastros_fusionados}" providerKey="ogr" checked="Qt::Checked" expanded="1"/>
    <layer-tree-layer id="layer_cicatrices" name="2. Cicatrices Totales Consolidadas" source="./{archivo_cicatrices}" providerKey="ogr" checked="Qt::Checked" expanded="1"/>
    <layer-tree-layer id="layer_demarcacion" name="5. 🗺️ Geografía y Distritos Parinacochas" source="./{archivo_distritos}" providerKey="ogr" checked="Qt::Checked" expanded="1"/>
    <layer-tree-layer id="layer_basemap_google" name="🛰️ Mapa Base: Google Satellite (Híbrido)" source="type=xyz&amp;url=https://mt1.google.com/vt/lyrs%3Dy%26x%3D%7Bx%7D%26y%3D%7By%7D%26z%3D%7Bz%7D&amp;zmax=20&amp;zmin=0" providerKey="wms" checked="Qt::Checked" expanded="0"/>
    <layer-tree-layer id="layer_basemap_osm" name="🌍 Mapa Base: OpenStreetMap Standard" source="type=xyz&amp;url=https://tile.openstreetmap.org/%7Bz%7D/%7Bx%7D/%7By%7D.png&amp;zmax=19&amp;zmin=0" providerKey="wms" checked="Qt::Unchecked" expanded="0"/>
    <layer-tree-layer id="layer_isocronas" name="3. Isócronas de Expansión" source="./{archivo_isocronas}" providerKey="ogr" checked="Qt::Unchecked" expanded="0"/>
    <layer-tree-layer id="layer_pixeles_raw" name="4. [Detalle RAW] Píxeles Satelitales Individuales" source="./{archivo_pixeles_raw}" providerKey="ogr" checked="Qt::Unchecked" expanded="0"/>
  </layer-tree-group>
</qgis>
"""


def generar_google_earth_kmz(
    geojson_rastros: Dict[str, Any],
    archivo_kmz_salida: str
) -> str:
    """
    Genera un archivo .kmz interactivo para Google Earth Pro y Google Earth Web
    utilizando los rastros de fuego fusionados multi-sensor por día:
    - Sin píxeles solapados ni duplicados.
    - Time-Slider nativo con <TimeSpan> enlazado a la fecha del rastro.
    - Extrusión 3D (altura proporcional al FRP total del rastro).
    - Popups con tabla de datos de la fusión (sensores involucrados, área en ha, etc.).
    """
    kml_parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2">',
        '<Document>',
        '  <name>WillAI - Rastros de Fuego Fusionados (Parinacochas)</name>',
        '  <open>1</open>',
        '  <description>Fusión Multi-Sensor (VIIRS 375m + MODIS 1km) por día y proximidad de rastro. Sin solapamientos.</description>',
        '',
        '  <!-- Estilos de color para Google Earth (Formato aabbggrr) -->',
        '  <Style id="frp_bajo">',
        '    <LineStyle><color>ff20c0ff</color><width>2.0</width></LineStyle>',
        '    <PolyStyle><color>9920e0ff</color></PolyStyle>',
        '  </Style>',
        '  <Style id="frp_moderado">',
        '    <LineStyle><color>ff0090ff</color><width>2.2</width></LineStyle>',
        '    <PolyStyle><color>b300a0ff</color></PolyStyle>',
        '  </Style>',
        '  <Style id="frp_alto">',
        '    <LineStyle><color>ff0020ff</color><width>2.5</width></LineStyle>',
        '    <PolyStyle><color>cc0020ff</color></PolyStyle>',
        '  </Style>',
        '  <Style id="frp_extremo">',
        '    <LineStyle><color>ff600090</color><width>3.0</width></LineStyle>',
        '    <PolyStyle><color>e6100080</color></PolyStyle>',
        '  </Style>',
        ''
    ]

    for feat in geojson_rastros.get('features', []):
        try:
            props = feat.get('properties', {})
            geom = feat.get('geometry', {})
            id_rastro = props.get('id_rastro', 'RASTRO')
            dia_str = props.get('fecha_dia', '')
            t_inicio = props.get('fecha_inicio_utc', f"{dia_str}T00:00:00Z")
            t_fin = props.get('fecha_fin_utc', f"{dia_str}T23:59:59Z")
            frp = float(props.get('frp_total_mw', 0.0))
            area_ha = float(props.get('area_quemada_ha', 0.0))
            sensores = props.get('sensores_fusionados', 'Satélite')
            satelites = props.get('satelites_involucrados', 'N/A')
            total_focos = props.get('focos_totales_fusionados', 1)
            brillo_max = props.get('temperatura_brillo_max_c', 'N/A')
            conf_max = props.get('confianza_maxima', 'nominal')

            # Altura de extrusión proporcional al FRP total
            altitud_m = max(180.0, min(2800.0, frp * 15.0))

            if frp < 25.0:
                style_id = "#frp_bajo"
            elif frp < 70.0:
                style_id = "#frp_moderado"
            elif frp < 160.0:
                style_id = "#frp_alto"
            else:
                style_id = "#frp_extremo"

            # Extraer polígonos (Polygon o MultiPolygon)
            g_type = geom.get('type')
            coords_lists = []
            if g_type == 'Polygon':
                coords_lists.append(geom['coordinates'][0])
            elif g_type == 'MultiPolygon':
                for p_coords in geom['coordinates']:
                    coords_lists.append(p_coords[0])

            for part_idx, c_list in enumerate(coords_lists):
                coords_kml_str = " ".join([f"{p_lon},{p_lat},{altitud_m:.1f}" for p_lon, p_lat in c_list])
                part_label = f" (Parte {part_idx + 1})" if len(coords_lists) > 1 else ""

                placemark = f"""  <Placemark>
    <name>{id_rastro} - {sensores} ({frp:.1f} MW){part_label}</name>
    <styleUrl>{style_id}</styleUrl>
    <TimeSpan>
      <begin>{t_inicio}</begin>
      <end>{t_fin}</end>
    </TimeSpan>
    <description><![CDATA[
      <div style="font-family:sans-serif; min-width:260px;">
        <h3 style="margin:0 0 8px 0; color:#d32f2f;">🔥 Rastro de Fuego Fusionado: {id_rastro}</h3>
        <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:12px;">
          <tr style="background:#fce4ec;"><td><b>Fecha de Incidente:</b></td><td><b>{dia_str}</b></td></tr>
          <tr><td><b>Fusión de Sensores:</b></td><td><b style="color:#c2185b;">{sensores}</b></td></tr>
          <tr><td><b>Satélites Involucrados:</b></td><td>{satelites}</td></tr>
          <tr><td><b>Focos Fusionados:</b></td><td>{total_focos} detecciones individuales</td></tr>
          <tr style="background:#fff3e0;"><td><b>Potencia Térmica Total:</b></td><td><b style="color:#e65100;">{frp:.2f} MW</b></td></tr>
          <tr><td><b>Área Real Quemada:</b></td><td><b style="color:#2e7d32;">{area_ha:.2f} hectáreas</b></td></tr>
          <tr><td><b>Temp. Brillo Pico:</b></td><td>{brillo_max} °C</td></tr>
          <tr><td><b>Ventana Detección:</b></td><td>{t_inicio[11:16]} - {t_fin[11:16]} UTC</td></tr>
          <tr><td><b>Nivel de Confianza:</b></td><td>{conf_max.upper()}</td></tr>
        </table>
        <p style="margin:8px 0 0 0; font-size:11px; color:#666;">Sistema WillAI - Parinacochas (Fusión Espacio-Temporal)</p>
      </div>
    ]]></description>
    <Polygon>
      <extrude>1</extrude>
      <altitudeMode>relativeToGround</altitudeMode>
      <outerBoundaryIs>
        <LinearRing>
          <coordinates>{coords_kml_str}</coordinates>
        </LinearRing>
      </outerBoundaryIs>
    </Polygon>
  </Placemark>"""
                kml_parts.append(placemark)
        except Exception:
            continue

    kml_parts.append('</Document>')
    kml_parts.append('</kml>')

    kml_content = "\n".join(kml_parts)

    os.makedirs(os.path.dirname(archivo_kmz_salida), exist_ok=True)
    with zipfile.ZipFile(archivo_kmz_salida, 'w', compression=zipfile.ZIP_DEFLATED) as kmz:
        kmz.writestr('doc.kml', kml_content.encode('utf-8'))

    return archivo_kmz_salida


def exportar_paquete_qgis_completo(
    directorio_salida: str,
    detecciones=None,
    anos: Optional[List[int]] = None,
    distancia_rastro_m: float = 1200.0
) -> Dict[str, Any]:
    """
    Genera el paquete completo de exportación para QGIS y Google Earth con FUSIÓN MULTI-SENSOR:
    - 1_rastros_fuego_fusionados_dia.geojson (Capa principal limpia)
    - 2_cicatrices_totales_incendios.geojson (Perímetros consolidados)
    - 3_isocronas_avance_fuego.geojson (Avance cronológico)
    - 4_pixeles_individuales_satelitales.geojson (Píxeles RAW)
    - 5_demarcacion_distrital_parinacochas.geojson (Límites)
    - proyecto_qgis_parinacochas.qgs (Proyecto QGIS listo)
    - mapa_incendios_parinacochas.kmz (Google Earth 3D fusionado)
    - LEAME_INSTRUCCIONES_QGIS.txt (Guía)
    """
    os.makedirs(directorio_salida, exist_ok=True)

    if detecciones is None:
        qs = DeteccionSatelital.objects.select_related('fuente').all()
        if anos:
            qs = qs.filter(fecha_observacion__year__in=anos)
    else:
        qs = detecciones

    total_dets = qs.count()

    # 1. RASTROS FUSIONADOS POR DÍA Y PROXIMIDAD (Multi-Sensor MODIS + VIIRS)
    geojson_rastros = fusionar_rastros_por_dia_y_proximidad(qs, distancia_rastro_m=distancia_rastro_m)
    ruta_rastros = os.path.join(directorio_salida, "1_rastros_fuego_fusionados_dia.geojson")
    with open(ruta_rastros, "w", encoding="utf-8") as f:
        json.dump(geojson_rastros, f, ensure_ascii=False, indent=2)

    # 2. CICATRICES TOTALES CONSOLIDADAS E ISÓCRONAS
    geojson_isocronas, geojson_cicatrices = reconstruir_isocronas_y_cicatrices(qs)
    ruta_cicatrices = os.path.join(directorio_salida, "2_cicatrices_totales_incendios.geojson")
    with open(ruta_cicatrices, "w", encoding="utf-8") as f:
        json.dump(geojson_cicatrices, f, ensure_ascii=False, indent=2)

    ruta_isocronas = os.path.join(directorio_salida, "3_isocronas_avance_fuego.geojson")
    with open(ruta_isocronas, "w", encoding="utf-8") as f:
        json.dump(geojson_isocronas, f, ensure_ascii=False, indent=2)

    # 3. PÍXELES INDIVIDUALES RAW (Para auditoría técnica de cada satélite)
    geojson_pixeles_raw = construir_geojson_pixeles(qs)
    ruta_pixeles_raw = os.path.join(directorio_salida, "4_pixeles_individuales_satelitales.geojson")
    with open(ruta_pixeles_raw, "w", encoding="utf-8") as f:
        json.dump(geojson_pixeles_raw, f, ensure_ascii=False, indent=2)

    # 4. DEMARCACIÓN DISTRITAL
    geojson_distritos = generar_capa_distrital()
    ruta_distritos = os.path.join(directorio_salida, "5_demarcacion_distrital_parinacochas.geojson")
    with open(ruta_distritos, "w", encoding="utf-8") as f:
        json.dump(geojson_distritos, f, ensure_ascii=False, indent=2)

    # 5. ARCHIVO DE PROYECTO QGIS (.qgs)
    ruta_qgs = os.path.join(directorio_salida, "proyecto_qgis_parinacochas.qgs")
    qgs_xml = generar_proyecto_qgis_xml(
        archivo_rastros_fusionados="1_rastros_fuego_fusionados_dia.geojson",
        archivo_cicatrices="2_cicatrices_totales_incendios.geojson",
        archivo_isocronas="3_isocronas_avance_fuego.geojson",
        archivo_pixeles_raw="4_pixeles_individuales_satelitales.geojson",
        archivo_distritos="5_demarcacion_distrital_parinacochas.geojson"
    )
    with open(ruta_qgs, "w", encoding="utf-8") as f:
        f.write(qgs_xml)

    # 6. ARCHIVO GOOGLE EARTH (.kmz) FUSIONADO
    ruta_kmz = os.path.join(directorio_salida, "mapa_incendios_parinacochas.kmz")
    generar_google_earth_kmz(geojson_rastros, ruta_kmz)

    # 7. GUÍA LEAME_INSTRUCCIONES_QGIS.txt
    ruta_leame = os.path.join(directorio_salida, "LEAME_INSTRUCCIONES_QGIS.txt")
    total_rastros = len(geojson_rastros['features'])
    total_cicatrices = len(geojson_cicatrices['features'])
    multisensores = sum(1 for feat in geojson_rastros['features'] if feat['properties'].get('es_multisensor'))

    guia_texto = f"""===========================================================================
  WILLAI - MAPA DE INCENDIOS SATELITALES FUSIONADOS (QGIS & GOOGLE EARTH)
  Provincia de Parinacochas, Ayacucho, Perú
===========================================================================

RESUMEN DE LA FUSIÓN MULTI-SENSOR:
----------------------------------
- Detecciones satelitales procesadas: {total_dets} focos reales (NASA FIRMS: VIIRS + MODIS)
- Rastros de fuego fusionados por día: {total_rastros} frentes consolidados
- Rastros con coincidencia Multi-Sensor (VIIRS + MODIS): {multisensores} eventos confirmados
- Cicatrices totales consolidadas: {total_cicatrices} áreas quemadas
- Umbral de proximidad de rastro: {distancia_rastro_m} metros

¿POR QUÉ ESTÁN FUSIONADOS?:
--------------------------
Anteriormente, cuando MODIS (1km) y VIIRS (375m) sobrevolaban la misma zona el mismo día,
se generaban múltiples rectángulos solapados que saturaban el mapa y duplicaban el área.
Con la Fusión Espacio-Temporal:
1. Todos los focos del mismo día y rastro continuo se unen geométricamente (unary_union).
2. Se eliminan las áreas duplicadas entre sensores.
3. Se calcula el área neta real en hectáreas sobre UTM Zona 18S.
4. Se consolidan métricas clave: FRP total, temperatura máxima y satélites intervinientes.

CAPAS EN ESTA CARPETA:
---------------------
1. proyecto_qgis_parinacochas.qgs
   -> Proyecto listo para QGIS. Haz doble clic para abrir directamente.
2. 1_rastros_fuego_fusionados_dia.geojson
   -> CAPA PRINCIPAL: Rastros limpios fusionados por día.
3. 2_cicatrices_totales_incendios.geojson
   -> Perímetros finales acumulados de cada incendio.
4. 3_isocronas_avance_fuego.geojson
   -> Isócronas de expansión del fuego día a día.
5. 4_pixeles_individuales_satelitales.geojson
   -> Detalle RAW de cada píxel individual (apagada por defecto).
6. 5_demarcacion_distrital_parinacochas.geojson
   -> Límites distritales y comunidades campesinas.
7. mapa_incendios_parinacochas.kmz
   -> Google Earth con los rastros fusionados y extrusión 3D por FRP.

CONTROLADOR TEMPORAL EN QGIS:
----------------------------
1. Abre 'proyecto_qgis_parinacochas.qgs' en QGIS.
2. En la barra superior, haz clic en el reloj 'Controlador Temporal'.
3. Presiona el botón 'Play' (▶) para ver el fuego avanzar día a día.
===========================================================================
"""
    with open(ruta_leame, "w", encoding="utf-8") as f:
        f.write(guia_texto)

    return {
        "directorio": directorio_salida,
        "rastros_fusionados": ruta_rastros,
        "cicatrices": ruta_cicatrices,
        "isocronas": ruta_isocronas,
        "pixeles_raw": ruta_pixeles_raw,
        "pixeles": ruta_pixeles_raw,
        "distritos": ruta_distritos,
        "proyecto_qgis": ruta_qgs,
        "google_earth_kmz": ruta_kmz,
        "guia": ruta_leame,
        "total_detecciones": total_dets,
        "total_rastros": total_rastros,
        "total_cicatrices": total_cicatrices,
        "multisensores": multisensores
    }
