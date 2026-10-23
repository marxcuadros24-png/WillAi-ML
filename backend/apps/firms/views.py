from datetime import timedelta
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

        # Filtrar por días hacia atrás (ej: dias=180 para 6 meses, dias=7, dias=30)
        dias_param = self.request.query_params.get('dias')
        if dias_param:
            try:
                dias = int(dias_param)
                fecha_limite = timezone.now() - timedelta(days=dias)
                qs = qs.filter(fecha_observacion__gte=fecha_limite)
            except ValueError:
                pass

        # Filtrar por rango de fechas específico YYYY-MM-DD
        fecha_desde = self.request.query_params.get('fecha_desde')
        if fecha_desde:
            try:
                qs = qs.filter(fecha_observacion__date__gte=fecha_desde)
            except Exception:
                pass

        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_hasta:
            try:
                qs = qs.filter(fecha_observacion__date__lte=fecha_hasta)
            except Exception:
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
