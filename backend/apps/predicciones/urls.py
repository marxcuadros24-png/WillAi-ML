from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PrediccionViewSet, ModeloPredictivoViewSet

router = DefaultRouter()
router.register(r'predicciones', PrediccionViewSet, basename='prediccion')
router.register(r'modelos', ModeloPredictivoViewSet, basename='modelo')

urlpatterns = [
    path('', include(router.urls)),
]
