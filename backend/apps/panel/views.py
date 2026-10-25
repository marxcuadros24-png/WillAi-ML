import json
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET, require_http_methods
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model, authenticate, login as django_login, logout as django_logout

# Model imports
from apps.incidentes.models import Incidente, AsignacionBrigada, AccionAtencion, HistorialIncidente, CierreIncidente, ReporteIncidente
from apps.reportes.models import Reporte, ValidacionReporte
from apps.firms.models import DeteccionSatelital, LoteImportacionFirms
from apps.meteorologia.models import ObservacionMeteorologica, Vivienda
from apps.predicciones.models import Prediccion
from apps.alertas.models import AlertaEmergencia
from apps.respuesta.models import Brigada, Brigadista, Entidad
from apps.donaciones.models import OfertaDonacion, HistorialOfertaDonacion
from apps.geografia.models import Distrito, Comunidad
from apps.auditoria.services import registrar_auditoria

Usuario = get_user_model()


def es_operador(user):
    """Verifica si el usuario tiene rol operativo de emergencias o es staff."""
    return user.is_authenticated and (
        user.is_staff or
        getattr(user, 'tiene_rol', lambda r: False)('coep') or
        getattr(user, 'tiene_rol', lambda r: False)('coel') or
        getattr(user, 'tiene_rol', lambda r: False)('operador')
    )


def obtener_usuario_operativo(request):
    """Retorna el usuario de la petición o el superusuario/operador del sistema por defecto."""
    if request.user.is_authenticated:
        return request.user
    operador = Usuario.objects.filter(is_staff=True).first()
    if not operador:
        operador = Usuario.objects.first()
    return operador


def get_request_data(request):
    """Extrae datos ya sea de JSON body o de request.POST."""
    if request.content_type and 'application/json' in request.content_type:
        try:
            if request.body:
                return json.loads(request.body.decode('utf-8'))
        except Exception:
            pass
    return request.POST


@login_required
@user_passes_test(es_operador)
def panel_dashboard(request):
    """
    Endpoint informativo que confirma el desacoplamiento del panel administrativo hacia el Frontend SPA.
    El backend opera exclusivamente como proveedor de APIs REST.
    """
    return JsonResponse({
        "status": "online",
        "modulo": "Centro de Mando Táctico WillAI",
        "arquitectura": "Desacoplada (Frontend SPA en React/Vite + Backend REST en Django)",
        "mensaje": "El panel administrativo web ha sido migrado al Frontend SPA (http://localhost:5173). El backend sirve exclusivamente como API REST.",
        "frontend_url": "http://localhost:5173/",
        "api_docs": "/api/docs/"
    }, json_dumps_params={'ensure_ascii': False})


@csrf_exempt
@require_GET
def panel_datos_api(request):
    """
    Retorna métricas ejecutivas, incidentes, reportes ciudadanos, donaciones,
    brigadas, alertas y sincronizaciones para el Centro de Mando Táctico en el frontend.
    """
    # 1. Métricas clave
    incidentes_activos = Incidente.objects.exclude(estado__in=['extinguido', 'cerrado']).count()
    incidentes_en_combate = Incidente.objects.filter(estado='en_combate').count()
    reportes_pendientes = Reporte.objects.filter(estado__in=['recibido', 'en_evaluacion', 'pendiente_revision', 'en_revision']).count()
    brigadas_disponibles = Brigada.objects.filter(estado='disponible').count()
    alertas_activas = AlertaEmergencia.objects.filter(estado__in=['enviada', 'activa', 'programada']).count()
    donaciones_pendientes = OfertaDonacion.objects.filter(estado__in=['pendiente', 'pendiente_revision', 'borrador']).count()

    hace_72h = timezone.now() - timezone.timedelta(hours=72)
    detecciones_recientes = DeteccionSatelital.objects.filter(fecha_observacion__gte=hace_72h).count()

    # Última predicción FWI específica
    ultima_prediccion = Prediccion.objects.filter(
        ejecucion__modelo__nombre__icontains="FWI"
    ).order_by('-creada_en').first()
    fwi_score = None
    fwi_nivel = 'MODERADO'
    if ultima_prediccion:
        fwi_nivel = ultima_prediccion.get_nivel_display().upper()
        if isinstance(ultima_prediccion.incertidumbre, dict):
            fwi_score = ultima_prediccion.incertidumbre.get('fwi')

    # Reportes ciudadanos
    reportes_list = []
    for r in Reporte.objects.select_related('usuario', 'comunidad').prefetch_related('evidencias').order_by('-creado_en')[:30]:
        ev_url = None
        ev = r.evidencias.first()
        if ev and ev.archivo:
            try:
                ev_url = ev.archivo.url
            except Exception:
                ev_url = None
        reportes_list.append({
            'id': r.id_reporte,
            'usuario': r.usuario.nombre_completo if r.usuario else 'Ciudadano Anónimo',
            'comunidad': r.comunidad.nombre if r.comunidad else 'Coracora',
            'tipo_incendio': r.tipo_incendio,
            'estado': r.estado,
            'latitud': float(r.latitud),
            'longitud': float(r.longitud),
            'descripcion': r.descripcion or '',
            'fecha': r.creado_en.strftime('%d/%m/%Y %H:%M'),
            'evidencia_url': ev_url
        })

    # Donaciones comunitarias
    donaciones_list = []
    for d in OfertaDonacion.objects.select_related('donante', 'distrito').prefetch_related('items').order_by('-creada_en')[:25]:
        items_list = []
        for it in d.items.all():
            items_list.append({
                'id': getattr(it, 'id_item_donacion', getattr(it, 'id_item', 0)),
                'descripcion': getattr(it, 'nombre_item', '') or getattr(it, 'descripcion', ''),
                'cantidad': float(it.cantidad_ofrecida),
                'unidad': getattr(it, 'unidad', getattr(it, 'unidad_medida', 'unidades')),
                'categoria': it.categoria
            })
        donaciones_list.append({
            'id': d.id_oferta,
            'titulo': d.titulo,
            'donante': d.donante.nombre_publico if d.donante else 'Comunero Anónimo',
            'estado': 'publicada' if d.estado == 'publicada' else ('rechazada' if d.estado == 'rechazada' else 'pendiente'),
            'descripcion': d.descripcion or '',
            'fecha': d.creada_en.strftime('%d/%m/%Y %H:%M'),
            'items': items_list
        })

    # Lotes de importación FIRMS / SERFOR
    lotes_list = []
    for lot in LoteImportacionFirms.objects.select_related('fuente').order_by('-iniciado_en')[:10]:
        lotes_list.append({
            'id': lot.id_lote,
            'fuente': lot.fuente.proveedor if lot.fuente else 'NASA FIRMS',
            'sensor': lot.fuente.sensor if lot.fuente else 'VIIRS',
            'estado': lot.estado,
            'iniciado_en': lot.iniciado_en.strftime('%d/%m/%Y %H:%M') if lot.iniciado_en else '',
            'registros_nuevos': lot.filas_insertadas,
            'registros_duplicados': lot.filas_omitidas + lot.filas_actualizadas
        })

    return JsonResponse({
        'metricas': {
            'incidentes_activos': incidentes_activos,
            'incidentes_en_combate': incidentes_en_combate,
            'reportes_pendientes': reportes_pendientes,
            'brigadas_disponibles': brigadas_disponibles,
            'alertas_activas': alertas_activas,
            'donaciones_pendientes': donaciones_pendientes,
            'detecciones_recientes': detecciones_recientes,
            'fwi_score': fwi_score,
            'fwi_nivel': fwi_nivel
        },
        'reportes': reportes_list,
        'donaciones': donaciones_list,
        'lotes_satelitales': lotes_list
    })


@csrf_exempt
@require_GET
def mapa_data_api(request):
    """
    Retorna colecciones JSON para el mapa táctico Leaflet.
    Compatible con llamadas autenticadas o directas desde el frontend SPA.
    """
    incidentes_data = []
    for inc in Incidente.objects.exclude(estado__in=['cerrado']).select_related('distrito')[:50]:
        incidentes_data.append({
            'id': inc.id_incidente,
            'codigo': inc.codigo,
            'titulo': inc.titulo,
            'tipo': inc.tipo_incendio,
            'estado': inc.estado,
            'prioridad': inc.prioridad,
            'lat': float(inc.latitud_referencia),
            'lon': float(inc.longitud_referencia),
            'fecha': inc.creado_en.strftime('%d/%m/%Y %H:%M'),
        })

    hace_72h = timezone.now() - timezone.timedelta(hours=72)
    detecciones_data = []
    for det in DeteccionSatelital.objects.filter(fecha_observacion__gte=hace_72h).select_related('fuente')[:150]:
        detecciones_data.append({
            'id': det.id_deteccion,
            'lat': float(det.latitud),
            'lon': float(det.longitud),
            'frp': float(det.frp_mw) if det.frp_mw else None,
            'confianza': det.confianza or str(det.confianza_numerica or ''),
            'sensor': det.fuente.sensor if det.fuente else 'VIIRS',
            'fecha': det.fecha_observacion.strftime('%d/%m/%Y %H:%M'),
            'dia_noche': det.dia_noche,
        })

    reportes_data = []
    for rep in Reporte.objects.select_related('usuario', 'comunidad').prefetch_related('evidencias')[:50]:
        evidencia_url = None
        ev = rep.evidencias.first()
        if ev and ev.archivo:
            try:
                evidencia_url = ev.archivo.url
            except Exception:
                evidencia_url = None
        reportes_data.append({
            'id': rep.id_reporte,
            'usuario': rep.usuario.nombre_completo if rep.usuario else 'Anónimo',
            'tipo': rep.tipo_incendio,
            'estado': rep.estado,
            'lat': float(rep.latitud),
            'lon': float(rep.longitud),
            'comunidad': rep.comunidad.nombre if rep.comunidad else 'Coracora',
            'descripcion': rep.descripcion,
            'fecha': rep.creado_en.strftime('%d/%m/%Y %H:%M'),
            'evidencia_url': evidencia_url,
        })

    viviendas_data = []
    for viv in Vivienda.objects.select_related('comunidad').filter(activa=True)[:200]:
        viviendas_data.append({
            'id': viv.id_vivienda,
            'codigo': viv.codigo or f"VIV-{viv.id_vivienda:03d}",
            'referencia': viv.referencia or '',
            'direccion': viv.referencia or '',
            'lat': float(viv.latitud),
            'lon': float(viv.longitud),
            'comunidad': viv.comunidad.nombre if viv.comunidad else 'Coracora',
            'material': viv.material_predominante,
            'responsable': viv.nombre_responsable or '',
            'telefono': viv.telefono_contacto or '',
            'habitantes': viv.habitantes or viv.residentes.count() or 4,
            'verificada': viv.verificada,
        })

    return JsonResponse({
        'incidentes': incidentes_data,
        'detecciones': detecciones_data,
        'reportes': reportes_data,
        'viviendas': viviendas_data,
    })


@csrf_exempt
@require_POST
def validar_reporte_rapido(request, id_reporte):
    """
    Valida un reporte ciudadano (validado, rechazado, observado).
    """
    user = obtener_usuario_operativo(request)
    reporte = get_object_or_404(Reporte, id_reporte=id_reporte)
    data = get_request_data(request)
    resultado = data.get('resultado', 'validado')
    comentario = data.get('comentario', 'Validado desde Centro de Mando Táctico')

    ValidacionReporte.objects.create(
        reporte=reporte,
        revisor=user,
        resultado=resultado,
        comentario=comentario
    )

    if resultado == 'validado':
        reporte.estado = 'confirmado'
    elif resultado == 'rechazado':
        reporte.estado = 'rechazado'
    else:
        reporte.estado = 'en_evaluacion'
    reporte.save()

    registrar_auditoria(
        accion=f"VALIDAR_REPORTE_{resultado.upper()}",
        entidad="Reporte",
        id_registro=str(reporte.id_reporte),
        request=request,
        detalles={'resultado': resultado, 'comentario': comentario}
    )

    return JsonResponse({'success': True, 'nuevo_estado': reporte.estado, 'id_reporte': id_reporte})


@csrf_exempt
@require_http_methods(["POST", "DELETE"])
def eliminar_reporte_rapido(request, id_reporte):
    """
    Elimina físicamente un reporte falso, descartado o duplicado de la base de datos.
    """
    reporte = get_object_or_404(Reporte, id_reporte=id_reporte)
    id_rep = reporte.id_reporte
    comunidad_nombre = reporte.comunidad.nombre if reporte.comunidad else 'Coracora'

    # Eliminar evidencias y validaciones asociadas para no dejar huérfanos
    reporte.evidencias.all().delete()
    reporte.validaciones.all().delete()
    reporte.delete()

    registrar_auditoria(
        accion="ELIMINAR_REPORTE",
        entidad="Reporte",
        id_registro=str(id_rep),
        request=request,
        detalles={'motivo': 'Reporte falso/descartado eliminado desde el Centro de Mando', 'comunidad': comunidad_nombre}
    )

    return JsonResponse({'success': True, 'id_reporte': id_rep})


@csrf_exempt
@require_POST
def crear_incidente_rapido(request):
    """
    Crea un incidente táctico directamente desde el mapa o botón de acción rápida.
    """
    user = obtener_usuario_operativo(request)
    data = get_request_data(request)

    titulo = data.get('titulo')
    tipo_incendio = data.get('tipo_incendio', 'pastizal')
    prioridad = data.get('prioridad', 'alta')
    lat = data.get('latitud')
    lon = data.get('longitud')
    id_reporte = data.get('id_reporte')
    id_distrito = data.get('id_distrito')
    id_comunidad = data.get('id_comunidad')
    comunidad_nombre = data.get('comunidad_nombre')

    distrito = None
    if id_distrito:
        distrito = Distrito.objects.filter(id_distrito=id_distrito).first()
    if not distrito:
        distrito = Distrito.objects.filter(nombre__icontains='Coracora').first()

    comunidad_obj = None
    if id_comunidad:
        comunidad_obj = Comunidad.objects.filter(id_comunidad=id_comunidad).first()
    elif comunidad_nombre:
        comunidad_obj = Comunidad.objects.filter(nombre__icontains=comunidad_nombre).first()

    fecha_hoy = timezone.now().strftime('%Y%m%d')
    conteo_hoy = Incidente.objects.filter(codigo__startswith=f"INC-{fecha_hoy}").count() + 1
    codigo = f"INC-{fecha_hoy}-{conteo_hoy:03d}"
    while Incidente.objects.filter(codigo=codigo).exists():
        conteo_hoy += 1
        codigo = f"INC-{fecha_hoy}-{conteo_hoy:03d}"

    user_para_fk = user if (user and getattr(user, 'pk', None)) else None

    # Resolve coordinates with priority to lat/lon passed, then comunidad, then Coracora center
    lat_val = Decimal(str(lat)) if lat else (comunidad_obj.latitud if comunidad_obj and comunidad_obj.latitud else Decimal('-15.0189'))
    lon_val = Decimal(str(lon)) if lon else (comunidad_obj.longitud if comunidad_obj and comunidad_obj.longitud else Decimal('-73.7806'))

    nombre_lugar = comunidad_obj.nombre if comunidad_obj else (distrito.nombre if distrito else 'Coracora')
    incidente = Incidente.objects.create(
        codigo=codigo,
        titulo=titulo or f"Incendio en Sector {nombre_lugar}",
        tipo_incendio=tipo_incendio,
        estado='confirmado',
        prioridad=prioridad,
        latitud_referencia=lat_val,
        longitud_referencia=lon_val,
        distrito=distrito,
        comunidad=comunidad_obj,
        creado_por=user_para_fk
    )

    if id_reporte:
        rep = Reporte.objects.filter(id_reporte=id_reporte).first()
        if rep:
            ReporteIncidente.objects.get_or_create(
                incidente=incidente,
                reporte=rep,
                defaults={
                    'tipo_vinculo': ReporteIncidente.TipoVinculo.ORIGEN,
                    'vinculado_por': user_para_fk
                }
            )
            rep.estado = Reporte.EstadoReporte.VINCULADO
            rep.save(update_fields=['estado'])

    HistorialIncidente.objects.create(
        incidente=incidente,
        usuario=user_para_fk,
        estado_anterior=None,
        estado_nuevo='confirmado',
        nota=f"Incidente generado a partir del Reporte Ciudadano #{id_reporte}" if id_reporte else "Incidente registrado desde el Centro de Mando"
    )

    registrar_auditoria(
        accion="CREAR_INCIDENTE_PANEL",
        entidad="Incidente",
        id_registro=incidente.codigo,
        request=request,
        detalles={'titulo': incidente.titulo, 'prioridad': prioridad, 'id_reporte': id_reporte}
    )

    return JsonResponse({'success': True, 'codigo': incidente.codigo, 'id_incidente': incidente.id_incidente})


@csrf_exempt
@require_POST
def cambiar_estado_incidente(request, id_incidente):
    """
    Transiciona el estado de un incidente (en_combate, controlado, extinguido, cerrado).
    """
    user = obtener_usuario_operativo(request)
    incidente = get_object_or_404(Incidente, id_incidente=id_incidente)
    data = get_request_data(request)
    nuevo_estado = (data.get('estado') or '').strip().lower()
    nota = data.get('nota') or 'Cambio de estado desde el Centro de Mando Táctico'

    if not nuevo_estado:
        return JsonResponse({'error': 'Estado requerido'}, status=400)

    # Permitir tanto nombres del frontend como del modelo Django
    mapa_alias = {
        'en_atencion': 'en_combate',
    }
    estado_final = mapa_alias.get(nuevo_estado, nuevo_estado)

    estados_validos = [c[0] for c in Incidente.EstadoIncidente.choices] + [
        'en_combate', 'controlado', 'extinguido', 'cerrado', 'en_atencion', 'contenido', 'confirmado'
    ]

    if estado_final in estados_validos:
        estado_anterior = incidente.estado
        incidente.estado = estado_final
        if estado_final in ['cerrado', 'extinguido'] and not incidente.cerrado_en:
            incidente.cerrado_en = timezone.now()
        incidente.save()

        HistorialIncidente.objects.create(
            incidente=incidente,
            usuario=user,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_final,
            nota=nota
        )

        AccionAtencion.objects.create(
            incidente=incidente,
            usuario=user,
            tipo_accion='cambio_estado',
            descripcion=f"Estado actualizado a: {incidente.get_estado_display() or estado_final}. Nota: {nota}"
        )

        registrar_auditoria(
            accion="CAMBIAR_ESTADO_INCIDENTE",
            entidad="Incidente",
            id_registro=incidente.codigo,
            request=request,
            detalles={'nuevo_estado': estado_final, 'nota': nota}
        )

        return JsonResponse({
            'success': True,
            'nuevo_estado': estado_final,
            'estado_display': incidente.get_estado_display() or estado_final.replace('_', ' ').title()
        })

    return JsonResponse({'error': f'Estado {nuevo_estado} no es válido'}, status=400)


@csrf_exempt
@require_POST
def asignar_brigada_rapida(request, id_incidente):
    """
    Despacha una brigada al incidente de manera inmediata.
    """
    user = obtener_usuario_operativo(request)
    incidente = get_object_or_404(Incidente, id_incidente=id_incidente)
    data = get_request_data(request)
    id_brigada = data.get('id_brigada')
    rol_operativo = data.get('rol_operativo', 'combate_directo')

    brigada = get_object_or_404(Brigada, id_brigada=id_brigada)

    asignacion = AsignacionBrigada.objects.create(
        incidente=incidente,
        brigada=brigada,
        instrucciones=rol_operativo,
        asignado_por=user
    )

    brigada.estado = 'desplegada'
    brigada.save()

    if incidente.estado in ['confirmado', 'nuevo']:
        incidente.estado = 'en_combate'
        incidente.save()

    AccionAtencion.objects.create(
        incidente=incidente,
        brigada=brigada,
        usuario=user,
        tipo_accion='despacho_brigada',
        descripcion=f"Despacho inmediato de {brigada.nombre} (Rol: {rol_operativo})"
    )

    registrar_auditoria(
        accion="DESPACHAR_BRIGADA",
        entidad="Incidente",
        id_registro=incidente.codigo,
        request=request,
        detalles={'brigada': brigada.nombre, 'rol': rol_operativo}
    )

    return JsonResponse({'success': True, 'brigada': brigada.nombre, 'id_asignacion': asignacion.id_asignacion})


@csrf_exempt
@require_POST
def disparar_sincronizacion(request):
    """
    Ejecuta manualmente tareas de importación FIRMS, Open-Meteo o cálculo FWI.
    """
    data = get_request_data(request)
    tipo = data.get('tipo')

    if tipo == 'firms':
        from apps.firms.tasks import importar_firms_task
        res = importar_firms_task()
        return JsonResponse({'success': True, 'mensaje': f"Importación FIRMS completada exitosamente: {res}"})

    elif tipo == 'meteo':
        from apps.meteorologia.tasks import importar_openmeteo_task
        res = importar_openmeteo_task()
        return JsonResponse({'success': True, 'mensaje': f"Datos meteorológicos actualizados desde Open-Meteo: {res}"})

    elif tipo == 'fwi':
        from apps.predicciones.tasks import calcular_riesgo_fwi_task
        res = calcular_riesgo_fwi_task()
        return JsonResponse({'success': True, 'mensaje': f"Cálculo FWI Canadiense finalizado: {res}"})

    return JsonResponse({'error': 'Tipo de sincronización inválido'}, status=400)


@csrf_exempt
@require_POST
@transaction.atomic
def cerrar_incidente_rapido(request, id_incidente):
    """
    Cierra formalmente un incidente forestal, libera a las brigadas asignadas y registra el acta de cierre.
    """
    user = obtener_usuario_operativo(request)
    incidente = get_object_or_404(Incidente, id_incidente=id_incidente)
    data = get_request_data(request)
    motivo = data.get('motivo', 'Liquidación completa del incidente y perímetro asegurado.')
    evidencia_uri = data.get('evidencia_uri', '')

    cierre, _ = CierreIncidente.objects.get_or_create(
        incidente=incidente,
        defaults={
            'cerrado_por': user,
            'motivo': motivo,
            'evidencia_uri': evidencia_uri
        }
    )

    estado_anterior = incidente.estado
    incidente.estado = 'cerrado'
    incidente.cerrado_en = timezone.now()
    incidente.save()

    brigadas_liberadas = []
    for asig in incidente.asignaciones_brigadas.filter(estado__in=['asignada', 'aceptada', 'en_camino', 'trabajando']):
        asig.estado = 'finalizada'
        asig.finalizada_en = timezone.now()
        asig.save()
        brigada = asig.brigada
        brigada.estado = 'disponible'
        brigada.save()
        brigadas_liberadas.append(brigada.nombre)

    HistorialIncidente.objects.create(
        incidente=incidente,
        usuario=user,
        estado_anterior=estado_anterior,
        estado_nuevo='cerrado',
        nota=f"Cierre definitivo. Motivo: {motivo}. Brigadas liberadas: {', '.join(brigadas_liberadas) if brigadas_liberadas else 'Ninguna'}"
    )

    AccionAtencion.objects.create(
        incidente=incidente,
        usuario=user,
        tipo_accion='cierre_incidente',
        descripcion=f"Incidente cerrado oficialmente por {getattr(user, 'nombre_completo', user.username)}. Acta: {motivo}"
    )

    registrar_auditoria(
        accion="CERRAR_INCIDENTE",
        entidad="Incidente",
        id_registro=incidente.codigo,
        request=request,
        detalles={'motivo': motivo, 'brigadas_liberadas': brigadas_liberadas}
    )

    return JsonResponse({
        'success': True,
        'codigo': incidente.codigo,
        'mensaje': f"Incidente {incidente.codigo} cerrado con éxito. Brigadas liberadas: {len(brigadas_liberadas)}"
    })


@csrf_exempt
@require_POST
def emitir_alerta_rapida(request):
    """
    Emite una alerta comunitaria urgente desde el panel de mando.
    """
    user = obtener_usuario_operativo(request)
    data = get_request_data(request)

    titulo = data.get('titulo') or 'Alerta de Emergencia Comunitaria Coracora'
    mensaje = data.get('mensaje') or 'Se alerta a la población y autoridades locales ante peligro de incendio en el sector.'
    instrucciones = data.get('instrucciones') or 'Mantener la calma, alejarse de zonas de humo denso y seguir las instrucciones de las brigadas.'
    prioridad = data.get('prioridad') or 'alta'
    tipo = data.get('tipo') or 'evacuacion'
    id_incidente = data.get('id_incidente')

    incidente = None
    if id_incidente:
        incidente = Incidente.objects.filter(id_incidente=id_incidente).first()

    alerta = AlertaEmergencia.objects.create(
        incidente=incidente,
        tipo=tipo,
        prioridad=prioridad,
        titulo=titulo,
        mensaje=mensaje,
        instrucciones=instrucciones,
        estado='enviada',
        emitida_por=user,
        aprobada_por=user,
        aprobada_en=timezone.now(),
        emitida_en=timezone.now()
    )

    registrar_auditoria(
        accion="EMITIR_ALERTA_PANEL",
        entidad="AlertaEmergencia",
        id_registro=str(alerta.id_alerta),
        request=request,
        detalles={'titulo': titulo, 'prioridad': prioridad, 'incidente': incidente.codigo if incidente else None}
    )

    return JsonResponse({
        'success': True,
        'id_alerta': alerta.id_alerta,
        'titulo': alerta.titulo,
        'mensaje': "Alerta comunitaria emitida y notificada a los residentes."
    })


@csrf_exempt
@require_POST
def moderar_donacion_rapida(request, id_oferta):
    """
    Modera una oferta de donación (aprobar / rechazar) desde el panel.
    """
    user = obtener_usuario_operativo(request)
    oferta = get_object_or_404(OfertaDonacion, id_oferta=id_oferta)
    data = get_request_data(request)
    accion = data.get('accion', 'aprobar')
    comentario = data.get('comentario', 'Revisado desde Centro de Mando')

    estado_anterior = oferta.estado
    if accion == 'aprobar':
        oferta.estado = 'publicada'
        oferta.publicada_en = timezone.now()
    else:
        oferta.estado = 'rechazada'
        oferta.motivo_rechazo = comentario

    oferta.revisada_por = user
    oferta.revisada_en = timezone.now()
    oferta.save()

    HistorialOfertaDonacion.objects.create(
        oferta=oferta,
        usuario=user,
        estado_anterior=estado_anterior,
        estado_nuevo=oferta.estado,
        comentario=comentario
    )

    registrar_auditoria(
        accion=f"MODERAR_DONACION_{accion.upper()}",
        entidad="OfertaDonacion",
        id_registro=str(oferta.id_oferta),
        request=request,
        detalles={'accion': accion, 'comentario': comentario}
    )

    return JsonResponse({'success': True, 'nuevo_estado': oferta.estado, 'id_oferta': id_oferta})


@csrf_exempt
@require_GET
def panel_usuarios_api(request):
    """
    Retorna la lista de usuarios del sistema con sus roles, teléfonos, correos y estado.
    """
    from apps.usuarios.models import Rol
    usuarios = Usuario.objects.prefetch_related('roles', 'insignias_obtenidas__insignia').order_by('-creado_en')
    lista = []
    for u in usuarios:
        ins_list = [
            {'codigo': ui.insignia.codigo, 'nombre': ui.insignia.nombre, 'icono': ui.insignia.icono_url or 'award'}
            for ui in u.insignias_obtenidas.all()
        ]
        lista.append({
            'id': u.id_usuario,
            'uuid': str(u.uuid),
            'username': u.username,
            'nombre': u.get_full_name() or u.nombre_visible or u.username,
            'email': u.email,
            'telefono': u.telefono or 'No registrado',
            'estado': u.estado,
            'is_staff': u.is_staff,
            'is_superuser': u.is_superuser,
            'roles': [r.nombre for r in u.roles.all()],
            'roles_codigos': [r.codigo for r in u.roles.all()],
            'insignias': ins_list,
            'creado_en': u.creado_en.strftime('%d/%m/%Y'),
            'ultimo_acceso': u.last_login.strftime('%d/%m/%Y %H:%M') if u.last_login else 'Nunca'
        })
    roles = [{'codigo': r.codigo, 'nombre': r.nombre} for r in Rol.objects.all()]
    return JsonResponse({'usuarios': lista, 'roles': roles})


@csrf_exempt
@require_POST
def cambiar_estado_usuario(request, id_usuario):
    """
    Activa o suspende a un usuario desde el panel administrativo.
    """
    u = get_object_or_404(Usuario, id_usuario=id_usuario)
    data = get_request_data(request)
    nuevo_estado = data.get('estado')
    if nuevo_estado in ['activo', 'suspendido', 'pendiente']:
        u.estado = nuevo_estado
        u.save(update_fields=['estado', 'actualizado_en'])
        registrar_auditoria(
            accion=f"CAMBIAR_ESTADO_USUARIO_{nuevo_estado.upper()}",
            entidad="Usuario",
            id_registro=str(u.id_usuario),
            request=request,
            detalles={'nuevo_estado': nuevo_estado, 'username': u.username}
        )
        return JsonResponse({'success': True, 'nuevo_estado': u.estado, 'id_usuario': u.id_usuario})
    return JsonResponse({'success': False, 'error': 'Estado no válido'}, status=400)


@csrf_exempt
@require_POST
def asignar_rol_usuario(request, id_usuario):
    """
    Asigna o retira un rol a un usuario.
    """
    from apps.usuarios.models import Rol, UsuarioRol
    u = get_object_or_404(Usuario, id_usuario=id_usuario)
    data = get_request_data(request)
    codigo_rol = data.get('codigo_rol')
    accion = data.get('accion', 'asignar')

    rol = get_object_or_404(Rol, codigo=codigo_rol)
    if accion == 'asignar':
        UsuarioRol.objects.get_or_create(usuario=u, rol=rol)
    else:
        UsuarioRol.objects.filter(usuario=u, rol=rol).delete()

    roles_actuales = [r.nombre for r in u.roles.all()]
    registrar_auditoria(
        accion=f"{accion.upper()}_ROL_USUARIO",
        entidad="Usuario",
        id_registro=str(u.id_usuario),
        request=request,
        detalles={'rol': codigo_rol, 'accion': accion, 'username': u.username}
    )
    return JsonResponse({'success': True, 'roles': roles_actuales, 'id_usuario': u.id_usuario})


@csrf_exempt
@require_POST
def crear_usuario_operativo(request):
    """
    Crea un nuevo usuario operador, verificador o brigadista desde el panel.
    """
    from apps.usuarios.models import Rol, UsuarioRol
    data = get_request_data(request)
    username = data.get('username')
    email = data.get('email', '')
    password = data.get('password', 'willai2026')
    nombre = data.get('nombre', '')
    telefono = data.get('telefono', None)
    codigo_rol = data.get('codigo_rol', 'operador')

    if not username:
        return JsonResponse({'success': False, 'error': 'El nombre de usuario es obligatorio'}, status=400)

    if Usuario.objects.filter(username=username).exists():
        return JsonResponse({'success': False, 'error': 'El nombre de usuario ya existe'}, status=400)

    u = Usuario.objects.create_user(
        username=username,
        email=email,
        password=password,
        nombre_visible=nombre,
        telefono=telefono or None,
        estado=Usuario.Estado.ACTIVO
    )
    if codigo_rol:
        rol = Rol.objects.filter(codigo=codigo_rol).first()
        if rol:
            UsuarioRol.objects.create(usuario=u, rol=rol)

    registrar_auditoria(
        accion="CREAR_USUARIO_OPERATIVO",
        entidad="Usuario",
        id_registro=str(u.id_usuario),
        request=request,
        detalles={'username': u.username, 'rol': codigo_rol}
    )
    return JsonResponse({
        'success': True,
        'id_usuario': u.id_usuario,
        'username': u.username,
        'mensaje': f"Usuario {u.username} creado exitosamente con rol {codigo_rol}."
    })


@csrf_exempt
@require_POST
def panel_login_api(request):
    """
    Autenticación de operadores y administradores para el Centro de Mando Táctico.
    Acepta username o email y password.
    """
    data = get_request_data(request)
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return JsonResponse({'success': False, 'error': 'Debe ingresar usuario y contraseña.'}, status=400)

    # Permitir login con email o username
    user = None
    if '@' in username:
        user_obj = Usuario.objects.filter(email__iexact=username).first()
        if user_obj:
            user = authenticate(request, username=user_obj.username, password=password)
    if not user:
        user = authenticate(request, username=username, password=password)

    if user is None:
        return JsonResponse({'success': False, 'error': 'Credenciales incorrectas o usuario no registrado.'}, status=401)

    if user.estado != Usuario.Estado.ACTIVO:
        return JsonResponse({'success': False, 'error': 'La cuenta se encuentra suspendida o pendiente de activación.'}, status=403)

    django_login(request, user)
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])

    registrar_auditoria(
        accion="LOGIN_CENTRO_MANDO",
        entidad="Usuario",
        id_registro=str(user.id_usuario),
        request=request,
        detalles={'username': user.username, 'ip': request.META.get('REMOTE_ADDR')}
    )

    roles = [r.codigo for r in user.roles.all()]
    if user.is_superuser and 'administrador' not in roles:
        roles.append('administrador')
    if user.is_staff and 'operador_emergencia' not in roles:
        roles.append('operador_emergencia')

    return JsonResponse({
        'success': True,
        'user': {
            'id': user.id_usuario,
            'username': user.username,
            'nombre': user.get_full_name() or user.nombre_visible or user.username,
            'email': user.email,
            'roles': roles,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser
        },
        'token': f"session_{user.uuid}"
    })


@csrf_exempt
@require_POST
def panel_logout_api(request):
    """Cierra la sesión del operador."""
    django_logout(request)
    return JsonResponse({'success': True, 'mensaje': 'Sesión cerrada exitosamente.'})


# ==============================================================================
# GESTIÓN DE BRIGADAS OPERATIVAS Y ASIGNACIÓN DE DOTACIÓN
# ==============================================================================

@csrf_exempt
@require_GET
def panel_brigadas_api(request):
    """
    Retorna el listado completo de brigadas con sus integrantes detallados,
    estado operativo, coordenadas e incidentes en los que están desplegadas.
    """
    brigadas = Brigada.objects.select_related('entidad', 'comunidad').prefetch_related(
        'integrantes__usuario', 'asignaciones__incidente'
    ).order_by('nombre')

    data = []
    for b in brigadas:
        # Integrantes activos
        integrantes_list = []
        for i in b.integrantes.filter(activo=True).select_related('usuario'):
            u = i.usuario
            integrantes_list.append({
                'id_brigadista': i.id,
                'id_usuario': u.id_usuario,
                'nombre': u.get_full_name() or u.nombre_visible or u.username,
                'username': u.username,
                'funcion': i.funcion,
                'telefono': u.telefono or '',
                'activo': i.activo,
            })

        # Incidente asignado activo
        incidente_asignado = None
        asignacion_activa = b.asignaciones.exclude(
            estado__in=['finalizada', 'cancelada']
        ).exclude(
            incidente__estado__in=['cerrado', 'extinguido']
        ).select_related('incidente').first()
        if asignacion_activa and asignacion_activa.incidente:
            inc = asignacion_activa.incidente
            incidente_asignado = {
                'id_asignacion': asignacion_activa.id_asignacion,
                'id_incidente': inc.id_incidente,
                'codigo': inc.codigo,
                'titulo': inc.titulo,
                'latitud': float(inc.latitud_referencia),
                'longitud': float(inc.longitud_referencia),
                'estado': inc.estado,
                'rol': asignacion_activa.instrucciones or 'combate_directo',
                'estado_asignacion': asignacion_activa.estado,
                'asignada_en': asignacion_activa.asignada_en.strftime('%d/%m/%Y %H:%M') if asignacion_activa.asignada_en else '',
            }

        # Estado normalizado
        raw_estado = (b.estado or 'disponible').lower()
        if incidente_asignado:
            raw_estado = 'desplegada'

        lider_nombre = ''
        jefe = next((i['nombre'] for i in integrantes_list if 'jefe' in i['funcion'].lower() or 'líder' in i['funcion'].lower() or 'lider' in i['funcion'].lower()), '')
        if jefe:
            lider_nombre = jefe
        elif integrantes_list:
            lider_nombre = integrantes_list[0]['nombre']
        else:
            lider_nombre = 'Coordinador OGRD'

        data.append({
            'id': b.id_brigada,
            'nombre': b.nombre,
            'tipo': b.tipo,
            'tipo_display': b.get_tipo_display(),
            'estado': raw_estado,
            'estado_display': b.get_estado_display(),
            'telefono': b.telefono_contacto or '+51 966 321 445',
            'comunidad': b.comunidad.nombre if b.comunidad else 'Coracora Centro',
            'comunidad_id': b.comunidad.id_comunidad if b.comunidad else None,
            'entidad': b.entidad.nombre if b.entidad else 'Defensa Civil Provincial',
            'entidad_id': b.entidad.id_entidad if b.entidad else None,
            'latitud': float(b.latitud_base) if b.latitud_base is not None else -15.0189,
            'longitud': float(b.longitud_base) if b.longitud_base is not None else -73.7806,
            'numero_efectivos': len(integrantes_list) if integrantes_list else 6,
            'lider': lider_nombre,
            'recursos_asignados': ['Mochilas extintoras', 'Batefuegos', 'Radios VHF', 'Machetes tácticos'],
            'integrantes': integrantes_list,
            'incidente_asignado': incidente_asignado,
            'creada_en': b.creada_en.strftime('%d/%m/%Y') if b.creada_en else '',
        })

    return JsonResponse({'success': True, 'brigadas': data})


@csrf_exempt
@require_POST
def crear_brigada_rapida(request):
    """
    Crea una nueva brigada y asigna usuarios seleccionados del sistema como integrantes.
    """
    from apps.usuarios.models import Rol, UsuarioRol
    data = get_request_data(request)

    nombre = data.get('nombre', '').strip()
    tipo = data.get('tipo', 'comunal')
    comunidad_id = data.get('comunidad_id')
    comunidad_nombre = data.get('comunidad_nombre', '')
    telefono = data.get('telefono_contacto', '').strip()
    lat = data.get('latitud_base')
    lon = data.get('longitud_base')
    miembros_raw = data.get('miembros', [])  # list of {"usuario_id": int, "funcion": str} or [int]

    if not nombre:
        return JsonResponse({'success': False, 'error': 'El nombre de la brigada es obligatorio.'}, status=400)

    # Buscar comunidad
    comunidad_obj = None
    if comunidad_id:
        comunidad_obj = Comunidad.objects.filter(id_comunidad=comunidad_id).first()
    elif comunidad_nombre:
        comunidad_obj = Comunidad.objects.filter(nombre__icontains=comunidad_nombre).first()

    # Coordenadas
    if lat is None or lat == '':
        lat = comunidad_obj.latitud if (comunidad_obj and comunidad_obj.latitud) else Decimal('-15.018900')
    else:
        lat = Decimal(str(lat))

    if lon is None or lon == '':
        lon = comunidad_obj.longitud if (comunidad_obj and comunidad_obj.longitud) else Decimal('-73.780600')
    else:
        lon = Decimal(str(lon))

    # Entidad
    entidad_obj = None
    if tipo == 'bomberos':
        entidad_obj = Entidad.objects.filter(tipo='bomberos').first()
    elif tipo == 'municipal':
        entidad_obj = Entidad.objects.filter(tipo='ogrd').first() or Entidad.objects.filter(tipo='municipalidad').first()
    elif tipo == 'forestal':
        entidad_obj = Entidad.objects.filter(tipo='serfor').first()
    if not entidad_obj:
        entidad_obj = Entidad.objects.filter(tipo='comunidad').first() or Entidad.objects.first()

    with transaction.atomic():
        brigada = Brigada.objects.create(
            nombre=nombre,
            tipo=tipo,
            estado='disponible',
            entidad=entidad_obj,
            comunidad=comunidad_obj,
            telefono_contacto=telefono or None,
            latitud_base=lat,
            longitud_base=lon
        )

        rol_brigadista = Rol.objects.filter(codigo='brigadista').first()
        hoy = timezone.now().date()

        for m in miembros_raw:
            u_id = m.get('usuario_id') if isinstance(m, dict) else m
            func = m.get('funcion', 'Combatiente de Incendios') if isinstance(m, dict) else 'Combatiente de Incendios'
            usuario = Usuario.objects.filter(id_usuario=u_id).first()
            if usuario:
                Brigadista.objects.create(
                    brigada=brigada,
                    usuario=usuario,
                    funcion=func,
                    desde=hoy,
                    activo=True
                )
                if rol_brigadista and not UsuarioRol.objects.filter(usuario=usuario, rol=rol_brigadista).exists():
                    UsuarioRol.objects.create(usuario=usuario, rol=rol_brigadista)

    registrar_auditoria(
        accion="CREAR_BRIGADA",
        entidad="Brigada",
        id_registro=str(brigada.id_brigada),
        request=request,
        detalles={'nombre': brigada.nombre, 'tipo': tipo, 'integrantes_iniciales': len(miembros_raw)}
    )

    return JsonResponse({
        'success': True,
        'mensaje': f"Brigada '{brigada.nombre}' creada exitosamente con {len(miembros_raw)} integrantes.",
        'id_brigada': brigada.id_brigada
    })


@csrf_exempt
@require_POST
def cambiar_estado_brigada(request, id_brigada):
    """
    Cambia el estado operacional de una brigada (disponible, en_descanso/ocupada, inactiva).
    """
    brigada = get_object_or_404(Brigada, id_brigada=id_brigada)
    data = get_request_data(request)
    nuevo_estado = data.get('estado')
    
    # Normalizar
    if nuevo_estado in ['en_descanso', 'ocupada']:
        nuevo_estado = 'ocupada'
    elif nuevo_estado == 'disponible':
        nuevo_estado = 'disponible'
    elif nuevo_estado == 'inactiva':
        nuevo_estado = 'inactiva'
    elif nuevo_estado == 'desplegada':
        nuevo_estado = 'desplegada'
    else:
        return JsonResponse({'success': False, 'error': f'Estado {nuevo_estado} no válido.'}, status=400)

    brigada.estado = nuevo_estado
    brigada.save(update_fields=['estado'])

    registrar_auditoria(
        accion="CAMBIAR_ESTADO_BRIGADA",
        entidad="Brigada",
        id_registro=str(brigada.id_brigada),
        request=request,
        detalles={'nuevo_estado': nuevo_estado}
    )
    return JsonResponse({'success': True, 'id_brigada': id_brigada, 'nuevo_estado': nuevo_estado})


@csrf_exempt
@require_POST
def asignar_miembros_brigada(request, id_brigada):
    """
    Actualiza la dotación de combatientes/integrantes de una brigada con usuarios existentes.
    """
    from apps.usuarios.models import Rol, UsuarioRol
    brigada = get_object_or_404(Brigada, id_brigada=id_brigada)
    data = get_request_data(request)
    miembros = data.get('miembros', [])  # list of {"usuario_id": int, "funcion": str}

    rol_brigadista = Rol.objects.filter(codigo='brigadista').first()
    hoy = timezone.now().date()

    with transaction.atomic():
        usuario_ids = [m.get('usuario_id') if isinstance(m, dict) else m for m in miembros]
        
        # Desactivar miembros excluidos
        brigada.integrantes.exclude(usuario_id__in=usuario_ids).update(activo=False, hasta=hoy)

        for m in miembros:
            u_id = m.get('usuario_id') if isinstance(m, dict) else m
            func = m.get('funcion', 'Combatiente') if isinstance(m, dict) else 'Combatiente'
            usuario = Usuario.objects.filter(id_usuario=u_id).first()
            if usuario:
                brigadista = Brigadista.objects.filter(brigada=brigada, usuario=usuario).first()
                if brigadista:
                    brigadista.funcion = func
                    brigadista.activo = True
                    brigadista.hasta = None
                    brigadista.save()
                else:
                    Brigadista.objects.create(
                        brigada=brigada,
                        usuario=usuario,
                        funcion=func,
                        desde=hoy,
                        activo=True
                    )

                if rol_brigadista and not UsuarioRol.objects.filter(usuario=usuario, rol=rol_brigadista).exists():
                    UsuarioRol.objects.create(usuario=usuario, rol=rol_brigadista)

    registrar_auditoria(
        accion="ACTUALIZAR_MIEMBROS_BRIGADA",
        entidad="Brigada",
        id_registro=str(brigada.id_brigada),
        request=request,
        detalles={'cantidad_miembros': len(miembros)}
    )
    return JsonResponse({'success': True, 'id_brigada': id_brigada, 'mensaje': 'Dotación actualizada correctamente.'})


@csrf_exempt
@require_http_methods(["POST", "DELETE"])
def eliminar_brigada(request, id_brigada):
    """
    Elimina una brigada del sistema.
    """
    brigada = get_object_or_404(Brigada, id_brigada=id_brigada)
    nombre = brigada.nombre

    with transaction.atomic():
        brigada.integrantes.all().delete()
        brigada.asignaciones.all().delete()
        brigada.delete()

    registrar_auditoria(
        accion="ELIMINAR_BRIGADA",
        entidad="Brigada",
        id_registro=str(id_brigada),
        request=request,
        detalles={'nombre': nombre}
    )
    return JsonResponse({'success': True, 'id_brigada': id_brigada, 'mensaje': f"Brigada '{nombre}' eliminada exitosamente."})


# ==============================================================================
# GESTIÓN Y PADRÓN DE VIVIENDAS RURALES VULNERABLES
# ==============================================================================

@csrf_exempt
@require_GET
def panel_viviendas_api(request):
    """
    Retorna el listado completo de viviendas rurales registradas en Coracora.
    """
    viviendas = Vivienda.objects.select_related('comunidad').filter(activa=True).order_by('comunidad__nombre', '-creado_en')
    data = []
    for v in viviendas:
        data.append({
            'id': v.id_vivienda,
            'codigo': v.codigo or f"VIV-{v.id_vivienda:03d}",
            'comunidad_id': v.comunidad.id_comunidad if v.comunidad else None,
            'comunidad': v.comunidad.nombre if v.comunidad else 'Coracora Centro',
            'referencia': v.referencia or '',
            'latitud': float(v.latitud),
            'longitud': float(v.longitud),
            'material': v.material_predominante,
            'material_display': dict([
                ('adobe_teja', 'Adobe y Teja'),
                ('quincha', 'Quincha / Caña'),
                ('tapial', 'Tapial y Paja'),
                ('madera', 'Madera'),
                ('calamina', 'Adobe y Calamina'),
                ('material_noble', 'Material Noble'),
                ('otro', 'Otro')
            ]).get(v.material_predominante, v.material_predominante),
            'habitantes': v.habitantes or 4,
            'nombre_responsable': v.nombre_responsable or '',
            'telefono_contacto': v.telefono_contacto or '',
            'verificada': v.verificada,
            'activa': v.activa,
            'creado_en': v.creado_en.strftime('%d/%m/%Y') if v.creado_en else '',
        })
    return JsonResponse({'success': True, 'viviendas': data})


@csrf_exempt
@require_POST
def crear_vivienda_rapida(request):
    """
    Registra una nueva vivienda rural manualmente desde el Centro de Mando o Mapa Táctico.
    """
    data = get_request_data(request)
    comunidad_id = data.get('comunidad_id')
    comunidad_nombre = data.get('comunidad_nombre', '')
    referencia = data.get('referencia', '').strip()
    lat = data.get('latitud')
    lon = data.get('longitud')
    codigo = data.get('codigo', '').strip()
    nombre_responsable = data.get('nombre_responsable', '').strip()
    telefono = data.get('telefono_contacto', '').strip()
    material = data.get('material_predominante', 'adobe_teja')
    habitantes = int(data.get('habitantes', 4) or 4)
    verificada = bool(data.get('verificada', True))

    # Buscar comunidad
    comunidad_obj = None
    if comunidad_id:
        comunidad_obj = Comunidad.objects.filter(id_comunidad=comunidad_id).first()
    elif comunidad_nombre:
        comunidad_obj = Comunidad.objects.filter(nombre__icontains=comunidad_nombre).first()

    # Coordenadas
    if lat is None or lat == '':
        lat = comunidad_obj.latitud if (comunidad_obj and comunidad_obj.latitud) else Decimal('-15.018900')
    else:
        lat = Decimal(str(lat))

    if lon is None or lon == '':
        lon = comunidad_obj.longitud if (comunidad_obj and comunidad_obj.longitud) else Decimal('-73.780600')
    else:
        lon = Decimal(str(lon))

    # Auto-código si no se proporcionó
    if not codigo:
        prefijo = (comunidad_obj.nombre[:3].upper() if comunidad_obj else 'COR')
        conteo = Vivienda.objects.filter(comunidad=comunidad_obj).count() + 1
        codigo = f"VIV-{prefijo}-{conteo:03d}"
        while Vivienda.objects.filter(codigo=codigo).exists():
            conteo += 1
            codigo = f"VIV-{prefijo}-{conteo:03d}"

    vivienda = Vivienda.objects.create(
        comunidad=comunidad_obj,
        codigo=codigo,
        referencia=referencia,
        latitud=lat,
        longitud=lon,
        material_predominante=material,
        habitantes=habitantes,
        nombre_responsable=nombre_responsable or None,
        telefono_contacto=telefono or None,
        verificada=verificada,
        verificada_en=timezone.now() if verificada else None,
        activa=True
    )

    registrar_auditoria(
        accion="CREAR_VIVIENDA",
        entidad="Vivienda",
        id_registro=str(vivienda.id_vivienda),
        request=request,
        detalles={'codigo': vivienda.codigo, 'comunidad': comunidad_obj.nombre if comunidad_obj else 'Coracora', 'habitantes': habitantes}
    )

    return JsonResponse({
        'success': True,
        'mensaje': f"Vivienda '{vivienda.codigo}' registrada exitosamente en {comunidad_obj.nombre if comunidad_obj else 'Coracora'}.",
        'id_vivienda': vivienda.id_vivienda,
        'codigo': vivienda.codigo
    })


@csrf_exempt
@require_POST
def editar_vivienda_rapida(request, id_vivienda):
    """
    Edita los datos de una vivienda rural registrada.
    """
    vivienda = get_object_or_404(Vivienda, id_vivienda=id_vivienda)
    data = get_request_data(request)

    if 'referencia' in data:
        vivienda.referencia = data.get('referencia', '').strip()
    if 'nombre_responsable' in data:
        vivienda.nombre_responsable = data.get('nombre_responsable', '').strip() or None
    if 'telefono_contacto' in data:
        vivienda.telefono_contacto = data.get('telefono_contacto', '').strip() or None
    if 'material_predominante' in data:
        vivienda.material_predominante = data.get('material_predominante', vivienda.material_predominante)
    if 'habitantes' in data:
        vivienda.habitantes = int(data.get('habitantes', vivienda.habitantes) or 4)
    if 'verificada' in data:
        vivienda.verificada = bool(data.get('verificada'))
        if vivienda.verificada and not vivienda.verificada_en:
            vivienda.verificada_en = timezone.now()
    if 'latitud' in data and data.get('latitud') is not None:
        vivienda.latitud = Decimal(str(data.get('latitud')))
    if 'longitud' in data and data.get('longitud') is not None:
        vivienda.longitud = Decimal(str(data.get('longitud')))

    vivienda.save()

    registrar_auditoria(
        accion="EDITAR_VIVIENDA",
        entidad="Vivienda",
        id_registro=str(vivienda.id_vivienda),
        request=request,
        detalles={'codigo': vivienda.codigo}
    )

    return JsonResponse({'success': True, 'mensaje': f"Vivienda '{vivienda.codigo}' actualizada exitosamente."})


@csrf_exempt
@require_http_methods(["POST", "DELETE"])
def eliminar_vivienda_rapida(request, id_vivienda):
    """
    Elimina una vivienda rural del padrón.
    """
    vivienda = get_object_or_404(Vivienda, id_vivienda=id_vivienda)
    cod = vivienda.codigo or str(vivienda.id_vivienda)

    vivienda.delete()

    registrar_auditoria(
        accion="ELIMINAR_VIVIENDA",
        entidad="Vivienda",
        id_registro=str(id_vivienda),
        request=request,
        detalles={'codigo': cod}
    )

    return JsonResponse({'success': True, 'id_vivienda': id_vivienda, 'mensaje': f"Vivienda '{cod}' eliminada exitosamente."})




