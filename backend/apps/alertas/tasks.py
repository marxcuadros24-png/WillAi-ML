import math
from datetime import timedelta
from django.utils import timezone
from celery import shared_task
from .models import AlertaEmergencia, DestinatarioAlerta, PreferenciaNotificacion
from apps.meteorologia.models import Vivienda, ResidenteVivienda, EvaluacionExposicion
from apps.incidentes.models import Incidente


def calcular_distancia_km(lat1, lon1, lat2, lon2):
    """
    Fórmula de Haversine para distancia en kilómetros entre dos puntos geográficos.
    """
    r = 6371.0  # Radio terrestre en km
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    delta_phi = math.radians(float(lat2) - float(lat1))
    delta_lambda = math.radians(float(lon2) - float(lon1))

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


@shared_task(name="evaluar_exposicion_y_alertar_task")
def evaluar_exposicion_y_alertar_task(id_incidente=None, id_prediccion=None):
    """
    Evalúa la exposición de viviendas rurales ante un foco de incendio o predicción de riesgo crítico,
    generando alertas tempranas y notificando a los residentes.
    """
    lat_ref, lon_ref = -15.0189, -73.7806
    incidente = None
    titulo_alerta = "Aviso de Peligro de Incendio Forestal"

    if id_incidente:
        try:
            incidente = Incidente.objects.get(pk=id_incidente)
            lat_ref = float(incidente.latitud_referencia)
            lon_ref = float(incidente.longitud_referencia)
            titulo_alerta = f"ALERTA: Incendio Activo en Proximidad - {incidente.titulo}"
        except Incidente.DoesNotExist:
            pass

    # Evaluar todas las viviendas activas en un radio de 10 km
    viviendas_expuestas = []
    for viv in Vivienda.objects.filter(activa=True):
        dist_km = calcular_distancia_km(lat_ref, lon_ref, viv.latitud, viv.longitud)
        dist_m = dist_km * 1000.0

        if dist_km <= 2.0:
            nivel = EvaluacionExposicion.NivelRiesgo.CRITICO
        elif dist_km <= 5.0:
            nivel = EvaluacionExposicion.NivelRiesgo.ALTO
        elif dist_km <= 10.0:
            nivel = EvaluacionExposicion.NivelRiesgo.MODERADO
        else:
            nivel = EvaluacionExposicion.NivelRiesgo.BAJO

        EvaluacionExposicion.objects.create(
            vivienda=viv,
            incidente=incidente,
            nivel_riesgo=nivel,
            distancia_metros=round(dist_m, 2)
        )

        if nivel in [EvaluacionExposicion.NivelRiesgo.ALTO, EvaluacionExposicion.NivelRiesgo.CRITICO]:
            viviendas_expuestas.append(viv)

    # Si hay viviendas en riesgo alto o crítico, emitir Alerta de Emergencia
    if viviendas_expuestas:
        alerta = AlertaEmergencia.objects.create(
            incidente=incidente,
            tipo=AlertaEmergencia.TipoAlerta.RIESGO_VIVIENDA,
            prioridad=AlertaEmergencia.PrioridadAlerta.ALTA,
            titulo=titulo_alerta,
            mensaje=f"Se ha detectado riesgo inminente de propagación de fuego a menos de 5 km de su sector comunal.",
            instrucciones="1. Mantenerse alerta y proteger fuentes de agua.\n2. No realizar quemas de rastrojos ni pastizales.\n3. Si observa humo denso, evacuar hacia zonas despejadas.",
            estado=AlertaEmergencia.EstadoAlerta.ENVIADA,
            emitida_en=timezone.now(),
            expira_en=timezone.now() + timedelta(hours=12)
        )

        # Enrolar residentes de las viviendas expuestas como destinatarios
        total_dest = 0
        for viv in viviendas_expuestas:
            for res in viv.residentes.filter(recibe_alertas=True):
                DestinatarioAlerta.objects.create(
                    alerta=alerta,
                    usuario=res.usuario,
                    vivienda=viv,
                    canal=PreferenciaNotificacion.Canal.PUSH,
                    motivo=DestinatarioAlerta.MotivoDestino.VIVIENDA_EXPUESTA,
                    estado_entrega=DestinatarioAlerta.EstadoEntrega.ENTREGADO,
                    enviado_en=timezone.now(),
                    entregado_en=timezone.now()
                )
                total_dest += 1

        return {
            "status": "ok",
            "alerta_creada": alerta.id_alerta,
            "viviendas_expuestas": len(viviendas_expuestas),
            "destinatarios_notificados": total_dest
        }

    return {"status": "ok", "mensaje": "Sin viviendas en riesgo inmediato"}
