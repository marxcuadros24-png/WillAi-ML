from django.urls import path
from . import views

app_name = 'panel'

urlpatterns = [
    # Información de desacoplamiento de panel
    path('', views.panel_dashboard, name='dashboard'),

    # APIs para Centro de Mando Táctico SPA (Frontend)
    path('api/datos/', views.panel_datos_api, name='api_panel_datos'),
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

    # Gestión de Usuarios, Roles y Autenticación
    path('api/login/', views.panel_login_api, name='api_login'),
    path('api/logout/', views.panel_logout_api, name='api_logout'),
    path('api/usuarios/', views.panel_usuarios_api, name='api_usuarios'),
    path('api/usuarios/<int:id_usuario>/cambiar-estado/', views.cambiar_estado_usuario, name='cambiar_estado_usuario'),
    path('api/usuarios/<int:id_usuario>/asignar-rol/', views.asignar_rol_usuario, name='asignar_rol_usuario'),
    path('api/usuarios/crear/', views.crear_usuario_operativo, name='crear_usuario'),
]
