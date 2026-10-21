from django.urls import path
from . import views

app_name = 'panel'

urlpatterns = [
    # Dashboard principal
    path('', views.panel_dashboard, name='dashboard'),

    # APIs para Leaflet y métricas
    path('api/mapa/', views.mapa_data_api, name='api_mapa_data'),

    # Acciones operativas tácticas
    path('api/reportes/<int:id_reporte>/validar/', views.validar_reporte_rapido, name='validar_reporte'),
    path('api/incidentes/crear/', views.crear_incidente_rapido, name='crear_incidente'),
    path('api/incidentes/<int:id_incidente>/cambiar-estado/', views.cambiar_estado_incidente, name='cambiar_estado_incidente'),
    path('api/incidentes/<int:id_incidente>/asignar-brigada/', views.asignar_brigada_rapida, name='asignar_brigada'),
    path('api/incidentes/<int:id_incidente>/cerrar/', views.cerrar_incidente_rapido, name='cerrar_incidente'),
    path('api/alertas/emitir/', views.emitir_alerta_rapida, name='emitir_alerta'),
    path('api/donaciones/<int:id_oferta>/moderar/', views.moderar_donacion_rapida, name='moderar_donacion'),
    path('api/sincronizar/', views.disparar_sincronizacion, name='disparar_sincronizacion'),
]
