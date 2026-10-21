import json
from decimal import Decimal
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.utils import timezone
from django.db import transaction

# Model imports
from apps.incidentes.models import Incidente, AsignacionBrigada, AccionAtencion, HistorialIncidente, CierreIncidente
from apps.reportes.models import Reporte, ValidacionReporte
from apps.firms.models import DeteccionSatelital, LoteImportacionFirms
from apps.meteorologia.models import ObservacionMeteorologica, Vivienda
from apps.predicciones.models import Prediccion, EjecucionModelo
from apps.alertas.models import AlertaEmergencia, DestinatarioAlerta
from apps.respuesta.models import Brigada, Entidad
from apps.donaciones.models import OfertaDonacion, HistorialOfertaDonacion, AsignacionDonacion, ItemOfertaDonacion
from apps.geografia.models import Distrito, Comunidad
from apps.auditoria.services import registrar_auditoria

# Verification helper for staff / emergency operators
def es_operador(user):
    return user.is_authenticated and (user.is_staff or user.tiene_rol('coep') or user.tiene_rol('coel') or user.tiene_rol('operador'))


@login_required
@user_passes_test(es_operador)
def panel_dashboard(request):
    """
    Vista principal del Centro de Operaciones y Mando Web WillAI.
    """
    # 1. Métricas clave
    incidentes_activos = Incidente.objects.exclude(estado__in=['extinguido', 'cerrado']).count()
    incidentes_en_combate = Incidente.objects.filter(estado='en_combate').count()
    reportes_pendientes = Reporte.objects.filter(estado='recibido').count()
    brigadas_disponibles = Brigada.objects.filter(estado='disponible').count()
    alertas_activas = AlertaEmergencia.objects.filter(estado='emitida').count()
    donaciones_pendientes = OfertaDonacion.objects.filter(estado='pendiente_revision').count()

    # Detecciones FIRMS recientes (últimas 72h)
    hace_72h = timezone.now() - timezone.timedelta(hours=72)
    detecciones_recientes = DeteccionSatelital.objects.filter(fecha_observacion__gte=hace_72h).count()

    # Última observación meteorológica
    ultima_meteo = ObservacionMeteorologica.objects.order_by('-observada_en').first()

    # Última predicción FWI
    ultima_prediccion = Prediccion.objects.order_by('-creada_en').first()
    fwi_score = None
    fwi_nivel = 'MODERADO'
    if ultima_prediccion:
        fwi_nivel = ultima_prediccion.get_nivel_display().upper()
        if isinstance(ultima_prediccion.incertidumbre, dict):
            fwi_score = ultima_prediccion.incertidumbre.get('fwi')

    # Listas para gestión
    reportes_recientes = Reporte.objects.select_related('usuario', 'comunidad').prefetch_related('evidencias').order_by('-creado_en')[:20]
    incidentes_lista = Incidente.objects.select_related('distrito', 'creado_por').prefetch_related('asignaciones_brigadas__brigada').order_by('-creado_en')[:20]
    brigadas_lista = Brigada.objects.select_related('entidad').all()
    ofertas_donacion = OfertaDonacion.objects.select_related('donante', 'distrito').prefetch_related('items').order_by('-creada_en')[:15]
    alertas_recientes = AlertaEmergencia.objects.select_related('incidente', 'emitida_por').order_by('-emitida_en')[:10]
    lotes_firms = LoteImportacionFirms.objects.select_related('fuente').order_by('-iniciado_en')[:8]

    context = {
        'user': request.user,
        'incidentes_activos': incidentes_activos,
        'incidentes_en_combate': incidentes_en_combate,
        'reportes_pendientes': reportes_pendientes,
        'brigadas_disponibles': brigadas_disponibles,
        'alertas_activas': alertas_activas,
        'donaciones_pendientes': donaciones_pendientes,
        'detecciones_recientes': detecciones_recientes,
        'ultima_meteo': ultima_meteo,
        'fwi_score': fwi_score,
        'fwi_nivel': fwi_nivel,
        'reportes_recientes': reportes_recientes,
        'incidentes_lista': incidentes_lista,
        'brigadas_lista': brigadas_lista,
        'ofertas_donacion': ofertas_donacion,
        'alertas_recientes': alertas_recientes,
        'lotes_firms': lotes_firms,
    }
    return render(request, 'panel/dashboard.html', context)


@login_required
@user_passes_test(es_operador)
@require_GET
def mapa_data_api(request):
    """
    Retorna colecciones GeoJSON/JSON para las capas del mapa Leaflet:
    - Incidentes activos
    - Detecciones satelitales NASA FIRMS
    - Reportes ciudadanos recientes
    - Brigadas y bases
    - Viviendas rurales
    """
    # 1. Incidentes
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

    # 2. Detecciones satelitales FIRMS (últimas 72h)
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

    # 3. Reportes ciudadanos
    reportes_data = []
    for rep in Reporte.objects.select_related('usuario', 'comunidad').prefetch_related('evidencias')[:50]:
        evidencia_url = None
        ev = rep.evidencias.first()
        if ev and ev.archivo:
            evidencia_url = ev.archivo.url
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

    # 4. Viviendas rurales
    viviendas_data = []
    for viv in Vivienda.objects.select_related('comunidad')[:60]:
        viviendas_data.append({
            'id': viv.id_vivienda,
            'codigo': viv.codigo_catastral,
            'direccion': viv.direccion_referencial,
            'lat': float(viv.latitud),
            'lon': float(viv.longitud),
            'comunidad': viv.comunidad.nombre if viv.comunidad else '',
            'material': viv.material_predominante,
            'habitantes': viv.residentes.count(),
        })

    return JsonResponse({
        'incidentes': incidentes_data,
        'detecciones': detecciones_data,
        'reportes': reportes_data,
        'viviendas': viviendas_data,
    })


@login_required
@user_passes_test(es_operador)
@require_POST
def validar_reporte_rapido(request, id_reporte):
    """
    Valida un reporte con un solo clic desde el panel de mando.
    """
    reporte = get_object_or_404(Reporte, id_reporte=id_reporte)
    resultado = request.POST.get('resultado', 'validado')
    comentario = request.POST.get('comentario', 'Validado desde Centro de Mando Táctico')

    ValidacionReporte.objects.create(
        reporte=reporte,
        revisor=request.user,
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


@login_required
@user_passes_test(es_operador)
@require_POST
def crear_incidente_rapido(request):
    """
    Crea un incidente táctico directamente desde el mapa o botón de acción rápida.
    """
    titulo = request.POST.get('titulo')
    tipo_incendio = request.POST.get('tipo_incendio', 'pastizal')
    prioridad = request.POST.get('prioridad', 'alta')
    lat = request.POST.get('latitud')
    lon = request.POST.get('longitud')
    id_reporte = request.POST.get('id_reporte')
    id_distrito = request.POST.get('id_distrito')

    distrito = None
    if id_distrito:
        distrito = Distrito.objects.filter(id_distrito=id_distrito).first()
    if not distrito:
        distrito = Distrito.objects.filter(nombre__icontains='Coracora').first()

    codigo = f"INC-{timezone.now().strftime('%Y%m%d')}-{Incidente.objects.count() + 1:03d}"

    incidente = Incidente.objects.create(
        codigo=codigo,
        titulo=titulo or f"Incendio en Sector {distrito.nombre if distrito else 'Coracora'}",
        tipo_incendio=tipo_incendio,
        estado='confirmado',
        prioridad=prioridad,
        latitud_referencia=Decimal(lat) if lat else Decimal('-15.0189'),
        longitud_referencia=Decimal(lon) if lon else Decimal('-73.7806'),
        distrito=distrito,
        creado_por=request.user
    )

    # Si proviene de un reporte, asociarlo
    if id_reporte:
        from apps.incidentes.models import ReporteIncidente
        rep = Reporte.objects.filter(id_reporte=id_reporte).first()
        if rep:
            ReporteIncidente.objects.create(
                incidente=incidente,
                reporte=rep,
                incorporado_por=request.user
            )

    registrar_auditoria(
        accion="CREAR_INCIDENTE_PANEL",
        entidad="Incidente",
        id_registro=incidente.codigo,
        request=request,
        detalles={'titulo': incidente.titulo, 'prioridad': prioridad}
    )

    return JsonResponse({'success': True, 'codigo': incidente.codigo, 'id_incidente': incidente.id_incidente})


@login_required
@user_passes_test(es_operador)
@require_POST
def cambiar_estado_incidente(request, id_incidente):
    """
    Transiciona el estado de un incidente (en_combate, controlado, extinguido, cerrado).
    """
    incidente = get_object_or_404(Incidente, id_incidente=id_incidente)
    nuevo_estado = request.POST.get('estado')
    nota = request.POST.get('nota', 'Cambio de estado desde el panel de mando')

    if nuevo_estado in dict(Incidente.EstadoIncidente.choices):
        estado_anterior = incidente.estado
        incidente.estado = nuevo_estado
        incidente.save()

        HistorialIncidente.objects.create(
            incidente=incidente,
            usuario=request.user,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            nota=nota
        )

        AccionAtencion.objects.create(
            incidente=incidente,
            usuario=request.user,
            tipo_accion='cambio_estado',
            descripcion=f"Estado actualizado a: {incidente.get_estado_display()}. Nota: {nota}"
        )

        registrar_auditoria(
            accion="CAMBIAR_ESTADO_INCIDENTE",
            entidad="Incidente",
            id_registro=incidente.codigo,
            request=request,
            detalles={'nuevo_estado': nuevo_estado, 'nota': nota}
        )

        return JsonResponse({'success': True, 'nuevo_estado': incidente.get_estado_display()})
    return JsonResponse({'error': 'Estado inválido'}, status=400)


@login_required
@user_passes_test(es_operador)
@require_POST
def asignar_brigada_rapida(request, id_incidente):
    """
    Despacha una brigada al incidente de manera inmediata.
    """
    incidente = get_object_or_404(Incidente, id_incidente=id_incidente)
    id_brigada = request.POST.get('id_brigada')
    rol_operativo = request.POST.get('rol_operativo', 'combate_directo')

    brigada = get_object_or_404(Brigada, id_brigada=id_brigada)

    asignacion = AsignacionBrigada.objects.create(
        incidente=incidente,
        brigada=brigada,
        instrucciones=rol_operativo,
        asignado_por=request.user
    )

    # Actualizar estado de la brigada y del incidente
    brigada.estado = 'desplegada'
    brigada.save()

    if incidente.estado == 'confirmado':
        incidente.estado = 'en_combate'
        incidente.save()

    AccionAtencion.objects.create(
        incidente=incidente,
        brigada=brigada,
        usuario=request.user,
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


@login_required
@user_passes_test(es_operador)
@require_POST
def disparar_sincronizacion(request):
    """
    Ejecuta manualmente tareas de importación FIRMS, Open-Meteo o cálculo FWI.
    """
    tipo = request.POST.get('tipo')

    if tipo == 'firms':
        from apps.firms.tasks import importar_firms_task
        res = importar_firms_task()
        return JsonResponse({'success': True, 'mensaje': f"Importación FIRMS completada: {res}"})

    elif tipo == 'meteo':
        from apps.meteorologia.tasks import importar_openmeteo_task
        res = importar_openmeteo_task()
        return JsonResponse({'success': True, 'mensaje': f"Datos meteorológicos actualizados: {res}"})

    elif tipo == 'fwi':
        from apps.predicciones.tasks import calcular_fwi_task
        res = calcular_fwi_task()
        return JsonResponse({'success': True, 'mensaje': f"Cálculo FWI finalizado: {res}"})

    return JsonResponse({'error': 'Tipo de sincronización inválido'}, status=400)


@login_required
@user_passes_test(es_operador)
@require_POST
@transaction.atomic
def cerrar_incidente_rapido(request, id_incidente):
    """
    Cierra formalmente un incidente forestal, libera a las brigadas asignadas y registra el acta de cierre.
    """
    incidente = get_object_or_404(Incidente, id_incidente=id_incidente)
    motivo = request.POST.get('motivo', 'Liquidación completa del incidente y perímetro asegurado.')
    evidencia_uri = request.POST.get('evidencia_uri', '')

    # 1. Crear registro formal de CierreIncidente
    cierre, _ = CierreIncidente.objects.get_or_create(
        incidente=incidente,
        defaults={
            'cerrado_por': request.user,
            'motivo': motivo,
            'evidencia_uri': evidencia_uri
        }
    )

    # 2. Actualizar estado del Incidente a cerrado
    estado_anterior = incidente.estado
    incidente.estado = 'cerrado'
    incidente.cerrado_en = timezone.now()
    incidente.save()

    # 3. Liberar brigadas asignadas a este incidente
    brigadas_liberadas = []
    for asig in incidente.asignaciones_brigadas.filter(estado__in=['asignada', 'aceptada', 'en_camino', 'trabajando']):
        asig.estado = 'finalizada'
        asig.finalizada_en = timezone.now()
        asig.save()
        # Retornar brigada a disponible
        brigada = asig.brigada
        brigada.estado = 'disponible'
        brigada.save()
        brigadas_liberadas.append(brigada.nombre)

    # 4. Registrar en historial y acciones
    HistorialIncidente.objects.create(
        incidente=incidente,
        usuario=request.user,
        estado_anterior=estado_anterior,
        estado_nuevo='cerrado',
        nota=f"Cierre definitivo. Motivo: {motivo}. Brigadas liberadas: {', '.join(brigadas_liberadas) if brigadas_liberadas else 'Ninguna'}"
    )

    AccionAtencion.objects.create(
        incidente=incidente,
        usuario=request.user,
        tipo_accion='cierre_incidente',
        descripcion=f"Incidente cerrado oficialmente por {request.user.nombre_completo}. Acta: {motivo}"
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


@login_required
@user_passes_test(es_operador)
@require_POST
def emitir_alerta_rapida(request):
    """
    Emite una alerta comunitaria urgente desde el panel de mando.
    """
    titulo = request.POST.get('titulo')
    mensaje = request.POST.get('mensaje')
    instrucciones = request.POST.get('instrucciones')
    prioridad = request.POST.get('prioridad', 'alta')
    tipo = request.POST.get('tipo', 'evacuacion')
    id_incidente = request.POST.get('id_incidente')

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
        emitida_por=request.user,
        aprobada_por=request.user,
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


@login_required
@user_passes_test(es_operador)
@require_POST
def moderar_donacion_rapida(request, id_oferta):
    """
    Modera una oferta de donación (aprobar / rechazar) desde el panel.
    """
    oferta = get_object_or_404(OfertaDonacion, id_oferta=id_oferta)
    accion = request.POST.get('accion', 'aprobar')
    comentario = request.POST.get('comentario', 'Revisado desde Centro de Mando')

    estado_anterior = oferta.estado
    if accion == 'aprobar':
        oferta.estado = 'publicada'
        oferta.publicada_en = timezone.now()
    else:
        oferta.estado = 'rechazada'
        oferta.motivo_rechazo = comentario

    oferta.revisada_por = request.user
    oferta.revisada_en = timezone.now()
    oferta.save()

    HistorialOfertaDonacion.objects.create(
        oferta=oferta,
        usuario=request.user,
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
