from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.geografia.models import Distrito
from apps.incidentes.models import Incidente
from apps.donaciones.models import (
    Donante, OfertaDonacion, ItemOfertaDonacion,
    AsignacionDonacion, HistorialOfertaDonacion
)

Usuario = get_user_model()


class DonacionesTestCase(TestCase):
    def setUp(self):
        self.distrito = Distrito.objects.create(
            ubigeo='050601',
            nombre='Coracora',
            provincia='Parinacochas',
            departamento='Ayacucho'
        )
        self.donante_user = Usuario.objects.create_user(
            username='comerciante1',
            email='comerciante@willai.pe',
            password='password123',
            telefono='966444555',
            nombre_visible='Ferretería Parinacochas'
        )
        self.operador = Usuario.objects.create_user(
            username='operador1',
            email='operador@willai.pe',
            password='password123',
            telefono='966777888',
            nombre_visible='Operador COEP',
            is_staff=True
        )
        self.donante = Donante.objects.create(
            usuario=self.donante_user,
            tipo_donante='negocio',
            nombre_publico='Ferretería Parinacochas SAC',
            telefono_contacto='966444555'
        )

        self.incidente = Incidente.objects.create(
            codigo='INC-2026-TEST',
            titulo='Incidente Pastizal de Prueba',
            tipo_incendio=Incidente.TipoIncendio.PASTIZAL,
            estado=Incidente.EstadoIncidente.CONFIRMADO,
            prioridad=Incidente.Prioridad.ALTA,
            latitud_referencia=-15.02,
            longitud_referencia=-73.78,
            distrito=self.distrito,
            creado_por=self.donante_user
        )

    def test_flujo_oferta_items_y_asignacion(self):
        # 1. Crear oferta
        oferta = OfertaDonacion.objects.create(
            donante=self.donante,
            distrito=self.distrito,
            titulo='Lote de 20 batefuegos y 50 botellas de agua',
            modalidad_entrega='entrega_en_punto',
            estado='pendiente_revision'
        )

        # 2. Agregar ítem
        item = ItemOfertaDonacion.objects.create(
            oferta=oferta,
            categoria='herramientas',
            nombre_item='Batefuegos forestales',
            cantidad_ofrecida=Decimal('20.0'),
            cantidad_disponible=Decimal('20.0'),
            unidad='unidades'
        )

        # 3. Moderar oferta (Aprobar)
        oferta.estado = 'publicada'
        oferta.revisada_por = self.operador
        oferta.save()
        HistorialOfertaDonacion.objects.create(
            oferta=oferta,
            usuario=self.operador,
            estado_anterior='pendiente_revision',
            estado_nuevo='publicada',
            comentario='Oferta aprobada y publicada para apoyo logístico'
        )

        self.assertEqual(oferta.historial.count(), 1)

        # 4. Asignar 10 batefuegos al incidente activo
        asignacion = AsignacionDonacion(
            item_donacion=item,
            incidente=self.incidente,
            cantidad_asignada=Decimal('10.0'),
            estado='solicitada',
            solicitada_por=self.operador
        )
        asignacion.full_clean()
        asignacion.save()

        # Descontar stock disponible
        item.cantidad_disponible -= Decimal('10.0')
        item.save()

        self.assertEqual(item.cantidad_disponible, Decimal('10.0'))
        self.assertEqual(asignacion.incidente, self.incidente)
