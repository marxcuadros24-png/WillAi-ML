from django.urls import path
from .public_views import (
    IncidentesPublicosView,
    EstadisticasPublicasView,
    DistritosPublicosView,
)

app_name = 'publico'

urlpatterns = [
    path('incidentes/', IncidentesPublicosView.as_view(), name='publico-incidentes'),
    path('estadisticas/', EstadisticasPublicasView.as_view(), name='publico-estadisticas'),
    path('distritos/', DistritosPublicosView.as_view(), name='publico-distritos'),
]

