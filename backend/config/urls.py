"""
URL configuration for WillAI backend.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    # Django Admin (Panel de Operaciones & Gestión)
    path('admin/', admin.site.urls),

    # Centro de Mando Táctico Web (Operadores de Emergencia COEP/COEL/OGRD)
    path('panel/', include('apps.panel.urls')),

    # Documentación interactiva de la API (Swagger & ReDoc)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Endpoints de las aplicaciones
    path('api/v1/usuarios/', include('apps.usuarios.urls')),
    path('api/v1/geografia/', include('apps.geografia.urls')),
    path('api/v1/respuesta/', include('apps.respuesta.urls')),
    path('api/v1/reportes/', include('apps.reportes.urls')),
    path('api/v1/incidentes/', include('apps.incidentes.urls')),
    path('api/v1/firms/', include('apps.firms.urls')),
    path('api/v1/meteorologia/', include('apps.meteorologia.urls')),
    path('api/v1/predicciones/', include('apps.predicciones.urls')),
    path('api/predicciones/', include('apps.predicciones.urls')),
    path('api/v1/alertas/', include('apps.alertas.urls')),
    path('api/v1/gamificacion/', include('apps.gamificacion.urls')),
    path('api/v1/donaciones/', include('apps.donaciones.urls')),
    path('api/v1/auditoria/', include('apps.auditoria.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
