from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta

from .models import Incidente
from apps.geografia.models import Distrito
from apps.predicciones.models import Prediccion


class IncidentesPublicosView(APIView):
    """
    Endpoint público de solo lectura para consulta ciudadana de incidentes forestales.
    Excluye falsas alarmas/descartados y respeta estrictamente la privacidad del reportante:
    solo muestra el nombre si 'autoriza_publicacion' es True; de lo contrario anonimiza.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        queryset = Incidente.objects.exclude(estado='descartado').select_related(
            'distrito', 'comunidad', 'creado_por'
        ).prefetch_related(
            'reportes_vinculados__evidencias',
            'reportes_vinculados__usuario'
        ).order_by('-detectado_en', '-creado_en')

        # 1. Filtro por fecha
        fecha_filtro = request.query_params.get('fecha', '').strip()
        hoy = timezone.localdate()

        if fecha_filtro == 'hoy':
            queryset = queryset.filter(
                Q(detectado_en__date=hoy) | (Q(detectado_en__isnull=True) & Q(creado_en__date=hoy))
            )
        elif fecha_filtro == '7d':
            hace_7d = hoy - timedelta(days=7)
            queryset = queryset.filter(
                Q(detectado_en__date__gte=hace_7d) | (Q(detectado_en__isnull=True) & Q(creado_en__date__gte=hace_7d))
            )
        elif fecha_filtro == '30d':
            hace_30d = hoy - timedelta(days=30)
            queryset = queryset.filter(
                Q(detectado_en__date__gte=hace_30d) | (Q(detectado_en__isnull=True) & Q(creado_en__date__gte=hace_30d))
            )
        elif fecha_filtro and fecha_filtro != 'todos':
            try:
                from datetime import datetime
                fecha_obj = datetime.strptime(fecha_filtro, '%Y-%m-%d').date()
                queryset = queryset.filter(
                    Q(detectado_en__date=fecha_obj) | (Q(detectado_en__isnull=True) & Q(creado_en__date=fecha_obj))
                )
            except ValueError:
                pass

        # 2. Filtro por distrito
        distrito_param = request.query_params.get('distrito', '').strip()
        if distrito_param and distrito_param != 'todos':
            if distrito_param.isdigit():
                queryset = queryset.filter(distrito_id=int(distrito_param))
            else:
                queryset = queryset.filter(distrito__nombre__icontains=distrito_param)

        # 3. Filtro por estado
        estado_param = request.query_params.get('estado', '').strip().lower()
        if estado_param and estado_param != 'todos':
            if estado_param == 'activos':
                queryset = queryset.filter(estado__in=['nuevo', 'verificacion', 'confirmado', 'asignado', 'en_atencion', 'en_combate'])
            elif estado_param == 'controlados':
                queryset = queryset.filter(estado__in=['contenido', 'controlado'])
            elif estado_param in ['extinguidos', 'cerrados']:
                queryset = queryset.filter(estado__in=['extinguido', 'cerrado'])
            else:
                queryset = queryset.filter(estado=estado_param)

        # 4. Filtro por búsqueda textual libre
        q = request.query_params.get('q', '').strip()
        if q:
            queryset = queryset.filter(
                Q(titulo__icontains=q) |
                Q(codigo__icontains=q) |
                Q(resumen__icontains=q) |
                Q(comunidad__nombre__icontains=q) |
                Q(distrito__nombre__icontains=q)
            )

        # 5. Serialización segura de datos públicos
        resultados = []
        for inc in queryset:
            # Fotografías públicas (de reportes vinculados)
            fotografias = []
            reporte_principal = None
            for rep in inc.reportes_vinculados.all():
                if not reporte_principal:
                    reporte_principal = rep
                for ev in rep.evidencias.all():
                    if ev.tipo == 'fotografia':
                        url = None
                        if ev.archivo:
                            try:
                                url = request.build_absolute_uri(ev.archivo.url)
                            except Exception:
                                url = None
                        elif ev.uri_archivo:
                            url = ev.uri_archivo
                        if url and url not in fotografias:
                            fotografias.append(url)

            # Nombre de quién reportó con validación estricta de consentimiento
            if reporte_principal:
                if getattr(reporte_principal, 'autoriza_publicacion', False) and reporte_principal.usuario:
                    nombre_rep = reporte_principal.usuario.nombre_visible or reporte_principal.usuario.get_full_name() or "Ciudadano Registrado"
                    identidad_autorizada = True
                else:
                    nombre_rep = "Ciudadano Anónimo (Identidad protegida)"
                    identidad_autorizada = False
            else:
                if inc.creado_por and inc.creado_por.is_staff:
                    nombre_rep = "COEP / Centro de Operaciones de Emergencia"
                else:
                    nombre_rep = "Detección Satelital (NASA FIRMS / SERFOR)"
                identidad_autorizada = True

            fecha_dt = inc.detectado_en or inc.creado_en
            fecha_iso = fecha_dt.isoformat() if fecha_dt else None
            fecha_display = fecha_dt.strftime('%d/%m/%Y %H:%M') if fecha_dt else "Fecha no registrada"

            resultados.append({
                'id': inc.id_incidente,
                'codigo': inc.codigo,
                'titulo': inc.titulo,
                'resumen': inc.resumen or 'Incidente registrado en el sistema de respuesta ante incendios forestales.',
                'tipo_incendio': inc.tipo_incendio,
                'tipo_incendio_display': inc.get_tipo_incendio_display(),
                'estado': inc.estado,
                'estado_display': inc.get_estado_display(),
                'prioridad': inc.prioridad,
                'prioridad_display': inc.get_prioridad_display(),
                'latitud': float(inc.latitud_referencia),
                'longitud': float(inc.longitud_referencia),
                'distrito_id': inc.distrito_id,
                'distrito_nombre': inc.distrito.nombre if inc.distrito else 'Coracora',
                'comunidad_nombre': inc.comunidad.nombre if inc.comunidad else (inc.distrito.nombre if inc.distrito else 'Sector Rural'),
                'fecha_iso': fecha_iso,
                'fecha_display': fecha_display,
                'fotografias': fotografias,
                'reportado_por': nombre_rep,
                'identidad_autorizada': identidad_autorizada,
            })

        return Response({
            'total': len(resultados),
            'incidentes': resultados
        })


class EstadisticasPublicasView(APIView):
    """
    Métricas e indicadores ejecutivos públicos en tiempo real sobre incidentes del día.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        hoy = timezone.localdate()
        base_qs = Incidente.objects.exclude(estado='descartado')

        # Incidentes del día
        qs_hoy = base_qs.filter(
            Q(detectado_en__date=hoy) | (Q(detectado_en__isnull=True) & Q(creado_en__date=hoy))
        )
        hoy_total = qs_hoy.count()
        hoy_activos = qs_hoy.filter(estado__in=['nuevo', 'verificacion', 'confirmado', 'asignado', 'en_atencion', 'en_combate']).count()
        hoy_controlados = qs_hoy.filter(estado__in=['contenido', 'controlado', 'extinguido', 'cerrado']).count()

        # Totales vigentes en toda la provincia
        total_activos_sistema = base_qs.filter(
            estado__in=['nuevo', 'verificacion', 'confirmado', 'asignado', 'en_atencion', 'en_combate']
        ).count()
        total_controlados_sistema = base_qs.filter(estado__in=['contenido', 'controlado']).count()
        total_cerrados_sistema = base_qs.filter(estado__in=['extinguido', 'cerrado']).count()
        total_historico = base_qs.count()

        # Peligro FWI Canadiense calibrado para Coracora
        ultima_pred = Prediccion.objects.filter(
            ejecucion__modelo__nombre__icontains="FWI"
        ).order_by('-creada_en').first()

        fwi_nivel = 'MODERADO'
        fwi_score = None
        if ultima_pred:
            fwi_nivel = ultima_pred.get_nivel_display().upper()
            if isinstance(ultima_pred.incertidumbre, dict):
                fwi_score = ultima_pred.incertidumbre.get('fwi')

        # Distritos con presencia de incidentes
        distritos_afectados = base_qs.filter(
            estado__in=['nuevo', 'verificacion', 'confirmado', 'asignado', 'en_atencion', 'en_combate']
        ).values('distrito__nombre').distinct().count()

        return Response({
            'hoy': {
                'fecha': hoy.strftime('%d/%m/%Y'),
                'total': hoy_total,
                'activos': hoy_activos,
                'controlados': hoy_controlados,
            },
            'sistema': {
                'total_activos': total_activos_sistema,
                'total_controlados': total_controlados_sistema,
                'total_cerrados': total_cerrados_sistema,
                'total_historico': total_historico,
                'distritos_con_focos_activos': distritos_afectados,
            },
            'meteorologia': {
                'fwi_nivel': fwi_nivel,
                'fwi_score': fwi_score,
                'zona': 'Coracora, Parinacochas, Ayacucho',
            }
        })


class DistritosPublicosView(APIView):
    """
    Catálogo geográfico de distritos de la Provincia de Parinacochas para filtros públicos.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        distritos = Distrito.objects.all().order_by('nombre')
        data = [
            {
                'id': d.id_distrito,
                'nombre': d.nombre,
                'provincia': d.provincia,
                'departamento': d.departamento,
                'latitud': float(d.latitud_centro) if d.latitud_centro else None,
                'longitud': float(d.longitud_centro) if d.longitud_centro else None,
            }
            for d in distritos
        ]
        return Response({'distritos': data})

