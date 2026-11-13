from datetime import timedelta
import os
import zipfile
import io
from django.conf import settings
from django.http import HttpResponse, FileResponse
from django.utils import timezone
from django.db.models import Count, Avg
from rest_framework import viewsets, permissions
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import FuenteSatelital, LoteImportacionFirms, DeteccionSatelital
from .serializers import (
    FuenteSatelitalSerializer,
    LoteImportacionFirmsSerializer,
    DeteccionSatelitalSerializer,
)
from .footprints import (
    construir_geojson_pixeles,
    reconstruir_isocronas_y_cicatrices,
    fusionar_rastros_por_dia_y_proximidad
)
from .exportador_qgis import exportar_paquete_qgis_completo, generar_google_earth_kmz


class DeteccionPagination(PageNumberPagination):
    page_size = 500
    page_size_query_param = 'page_size'
    max_page_size = 5000


class DeteccionSatelitalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consulta de puntos de calor satelitales (NASA FIRMS & SERFOR) para visualización en mapa móvil y web.
    Permite filtrar por días hacia atrás (1, 7, 30, 90, 180 días / 6 meses), fechas exactas y sensor.
    """
    serializer_class = DeteccionSatelitalSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = DeteccionPagination
    search_fields = ['clave_deteccion', 'codigo_satelite']

    def get_queryset(self):
        qs = DeteccionSatelital.objects.select_related('fuente').all()

        # Filtrar por rango de fechas específico YYYY-MM-DD
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')

        if fecha_desde:
            try:
                qs = qs.filter(fecha_observacion__date__gte=fecha_desde)
            except Exception:
                pass

        if fecha_hasta:
            try:
                qs = qs.filter(fecha_observacion__date__lte=fecha_hasta)
            except Exception:
                pass

        # Filtrar por días hacia atrás sólo si no se especificó un rango exacto
        dias_param = self.request.query_params.get('dias')
        if dias_param and not (fecha_desde or fecha_hasta):
            try:
                dias = int(dias_param)
                fecha_limite = timezone.now() - timedelta(days=dias)
                qs = qs.filter(fecha_observacion__gte=fecha_limite)
            except ValueError:
                pass

        # Filtrar por sensor específico (MODIS, VIIRS, LANDSAT, SERFOR)
        sensor_param = self.request.query_params.get('sensor')
        if sensor_param:
            sensor_upper = sensor_param.upper()
            if sensor_upper in ('MODIS', 'VIIRS', 'LANDSAT'):
                qs = qs.filter(fuente__sensor__iexact=sensor_upper)
            elif sensor_upper == 'SERFOR':
                qs = qs.filter(fuente__proveedor__iexact='SERFOR')
            else:
                qs = qs.filter(fuente__codigo_producto__icontains=sensor_param)

        # Filtrar por proveedor
        proveedor = self.request.query_params.get('proveedor')
        if proveedor:
            qs = qs.filter(fuente__proveedor__icontains=proveedor)

        # Filtrar por FRP mínimo (Potencia Radiativa MW)
        frp_min = self.request.query_params.get('frp_min')
        if frp_min:
            try:
                qs = qs.filter(frp_mw__gte=float(frp_min))
            except ValueError:
                pass

        # Filtrar por nivel de confianza (high, nominal, low)
        confianza = self.request.query_params.get('confianza')
        if confianza:
            qs = qs.filter(confianza__iexact=confianza)

        return qs

    @action(detail=False, methods=['get'])
    def historial_meses(self, request):
        """
        Retorna la serie temporal agregada por mes de los últimos 6 meses (180 días)
        para análisis histórico y reproducción temporal en el Centro de Mando.
        """
        meses_atras = int(request.query_params.get('meses', 6))
        dias_total = meses_atras * 30
        fecha_inicio = timezone.now() - timedelta(days=dias_total)

        detecciones = DeteccionSatelital.objects.filter(
            fecha_observacion__gte=fecha_inicio
        ).select_related('fuente')

        total = detecciones.count()

        # Agrupar por mes y sensor
        desglose = {}
        for det in detecciones:
            key_mes = det.fecha_observacion.strftime('%Y-%m')
            sensor_nombre = det.fuente.sensor if det.fuente else 'OTRO'
            if key_mes not in desglose:
                desglose[key_mes] = {
                    'mes': key_mes,
                    'total': 0,
                    'modis': 0,
                    'viirs': 0,
                    'serfor': 0,
                    'frp_acumulado': 0.0,
                    'puntos': []
                }
            desglose[key_mes]['total'] += 1
            if 'MODIS' in sensor_nombre.upper():
                desglose[key_mes]['modis'] += 1
            elif 'VIIRS' in sensor_nombre.upper():
                desglose[key_mes]['viirs'] += 1
            else:
                desglose[key_mes]['serfor'] += 1

            if det.frp_mw:
                desglose[key_mes]['frp_acumulado'] += float(det.frp_mw)

        historial = []
        for mes_str in sorted(desglose.keys()):
            item = desglose[mes_str]
            avg_frp = round(item['frp_acumulado'] / item['total'], 2) if item['total'] > 0 else 0
            item['frp_promedio'] = avg_frp
            del item['frp_acumulado']
            del item['puntos']
            historial.append(item)

        return Response({
            'periodo_meses': meses_atras,
            'total_detecciones': total,
            'historial_mensual': historial
        })

    @action(detail=False, methods=['get'])
    def rastros_fusionados(self, request):
        """
        Retorna la colección GeoJSON con los rastros de fuego fusionados por día y proximidad
        (Multi-Sensor MODIS + VIIRS disueltos sin solapamientos).
        """
        qs = self.get_queryset()
        dist_m = float(request.query_params.get('distancia_rastro', 1200.0))
        geojson_data = fusionar_rastros_por_dia_y_proximidad(qs, distancia_rastro_m=dist_m)
        return Response(geojson_data)

    @action(detail=False, methods=['get'])
    def geojson_pixeles(self, request):
        """
        Retorna la colección GeoJSON con las huellas poligonales reales de cada foco individual (VIIRS/MODIS).
        """
        qs = self.get_queryset()
        geojson_data = construir_geojson_pixeles(qs)
        return Response(geojson_data)

    @action(detail=False, methods=['get'])
    def geojson_cicatrices(self, request):
        """
        Retorna las isócronas y cicatrices consolidadas de áreas quemadas detectadas.
        """
        qs = self.get_queryset()
        geojson_isocronas, geojson_cicatrices = reconstruir_isocronas_y_cicatrices(qs)
        tipo = request.query_params.get('tipo', 'cicatrices')
        if tipo == 'isocronas':
            return Response(geojson_isocronas)
        return Response(geojson_cicatrices)

    @action(detail=False, methods=['get'])
    def exportar_kmz(self, request):
        """
        Genera y descarga directamente el archivo KMZ tridimensional para Google Earth
        con rastros fusionados multi-sensor y extrusión 3D.
        """
        qs = self.get_queryset()
        dist_m = float(request.query_params.get('distancia_rastro', 1200.0))
        geojson_rastros = fusionar_rastros_por_dia_y_proximidad(qs, distancia_rastro_m=dist_m)

        buffer = io.BytesIO()
        kmz_temp = os.path.join(settings.BASE_DIR, 'data', 'temp_export.kmz')
        generar_google_earth_kmz(geojson_rastros, kmz_temp)

        with open(kmz_temp, 'rb') as f:
            buffer.write(f.read())
        try:
            os.remove(kmz_temp)
        except Exception:
            pass

        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/vnd.google-earth.kmz')
        response['Content-Disposition'] = 'attachment; filename="mapa_incendios_parinacochas.kmz"'
        return response

    @action(detail=False, methods=['get'])
    def exportar_qgis(self, request):
        """
        Empaca el proyecto QGIS (.qgs) y todas las capas GeoJSON en un archivo ZIP descargable.
        """
        qs = self.get_queryset()
        dist_m = float(request.query_params.get('distancia_rastro', 1200.0))
        dir_salida = os.path.join(settings.BASE_DIR, 'data', 'temp_qgis_pack')
        res = exportar_paquete_qgis_completo(dir_salida, detecciones=qs, distancia_rastro_m=dist_m)

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', compression=zipfile.ZIP_DEFLATED) as zip_file:
            for archivo_nombre in [
                '1_rastros_fuego_fusionados_dia.geojson',
                '2_cicatrices_totales_incendios.geojson',
                '3_isocronas_avance_fuego.geojson',
                '4_pixeles_individuales_satelitales.geojson',
                '5_demarcacion_distrital_parinacochas.geojson',
                'proyecto_qgis_parinacochas.qgs',
                'mapa_incendios_parinacochas.kmz',
                'LEAME_INSTRUCCIONES_QGIS.txt'
            ]:
                ruta_completa = os.path.join(dir_salida, archivo_nombre)
                if os.path.exists(ruta_completa):
                    zip_file.write(ruta_completa, arcname=archivo_nombre)

        zip_buffer.seek(0)
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="paquete_qgis_parinacochas.zip"'
        return response


class LoteImportacionFirmsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Monitoreo de tareas de importación satelital.
    """
    queryset = LoteImportacionFirms.objects.select_related('fuente').all()
    serializer_class = LoteImportacionFirmsSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ['estado', 'fuente']


class FuenteSatelitalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Catálogo de sensores satelitales configurados.
    """
    queryset = FuenteSatelital.objects.filter(activa=True)
    serializer_class = FuenteSatelitalSerializer
    permission_classes = [permissions.AllowAny]
