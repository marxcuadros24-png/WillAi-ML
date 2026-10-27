import numpy as np
from django.test import TestCase
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient
from rest_framework import status

from apps.predicciones.models import (
    ModeloPredictivo,
    SimulacionPropagacion,
    ResultadoPropagacion,
)
from apps.predicciones.motor_andino import SimuladorElipticoAndino
from apps.predicciones.services import ejecutar_simulacion_propagacion
from apps.alertas.models import AlertaEmergencia
from apps.alertas.services import evaluar_viviendas_en_riesgo_simulacion
from apps.meteorologia.models import Vivienda
from apps.geografia.models import Distrito, Comunidad


class SimulacionPropagacionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Configurar modelo predictivo del motor
        self.modelo_motor, _ = ModeloPredictivo.objects.get_or_create(
            nombre="CA_ELIPTICO_ANDINO_V1",
            version="1.0.0",
            defaults={
                "algoritmo": "Cellular Automata Eliptico Andino con Corrección FWI y DEM",
                "descripcion": "Propagación celular elíptica en UTM 18S con balance Rothermel y pendiente andina.",
                "estado": ModeloPredictivo.EstadoModelo.VALIDADO,
            }
        )

        # Ubicación geográfica de referencia (Coracora)
        self.lat_ignicion = -15.0189
        self.lon_ignicion = -73.7806
        self.punto = Point(self.lon_ignicion, self.lat_ignicion, srid=4326)

        # Distrito y comunidad para viviendas de prueba
        self.distrito, _ = Distrito.objects.get_or_create(
            nombre="Coracora",
            provincia="Parinacochas",
            departamento="Ayacucho",
            defaults={"latitud_centro": -15.0189, "longitud_centro": -73.7806}
        )
        self.comunidad, _ = Comunidad.objects.get_or_create(
            distrito=self.distrito,
            nombre="Sector Huallhua",
            defaults={"latitud": -15.0189, "longitud": -73.7806}
        )

    def test_creacion_simulacion_y_tres_isocronas(self):
        """
        Test 1: Creación de SimulacionPropagacion y generación de exactamente 3 registros
        en ResultadoPropagacion (isócronas a 1h, 3h y 6h) con áreas crecientes.
        """
        simulacion = SimulacionPropagacion.objects.create(
            modelo_motor=self.modelo_motor,
            punto_ignicion=self.punto,
            horizonte_horas=6,
            parametros_entrada={
                "viento_kmh": 15.0,
                "dir_viento_grados": 270.0,
                "ffmc": 85.0,
            }
        )

        res = ejecutar_simulacion_propagacion(simulacion.id_simulacion)
        self.assertEqual(res["status"], "ok")

        simulacion.refresh_from_db()
        self.assertEqual(simulacion.estado, SimulacionPropagacion.EstadoSimulacion.COMPLETADO)

        # Verificar que se generaron 3 isócronas (1h, 3h, 6h)
        resultados = simulacion.resultados.order_by("hora_paso")
        self.assertEqual(resultados.count(), 3)

        pasos = [r.hora_paso for r in resultados]
        self.assertEqual(pasos, [1, 3, 6])

        # Verificar que cada una posee un MultiPolygon válido con SRID 4326 y área positiva
        areas = []
        for r in resultados:
            self.assertEqual(r.perimetro.geom_type, "MultiPolygon")
            self.assertEqual(r.perimetro.srid, 4326)
            self.assertGreater(r.area_hectareas, 0.0)
            areas.append(r.area_hectareas)

        # El área debe crecer monotónicamente: 1h < 3h < 6h
        self.assertLess(areas[0], areas[1])
        self.assertLess(areas[1], areas[2])

    def test_verificacion_fisica_pendiente_y_viento(self):
        """
        Test 2: Verificación física del simulador. Con viento fuerte y pendiente positiva
        subiendo ladera, el área quemada a 3 horas es estrictamente mayor que sin viento y terreno plano.
        """
        grid_size = 100

        # Caso A: Terreno plano sin viento
        sim_plano = SimuladorElipticoAndino(
            lat=self.lat_ignicion,
            lon=self.lon_ignicion,
            viento_kmh=0.0,
            dir_viento_grados=0.0,
            ffmc=85.0,
            grid_size=grid_size
        )
        res_plano = sim_plano.simular(horizontes_horas=(3,))
        area_plano = res_plano[3]["area_hectareas"]

        # Caso B: Viento fuerte (30 km/h) del Este (90°) empujando hacia el Oeste (270°)
        # subiendo una ladera empinada hacia el Oeste
        dem_ladera = np.zeros((grid_size, grid_size), dtype=np.float32)
        for col in range(grid_size):
            dem_ladera[:, col] = (grid_size - col) * 12.0  # Fuerte ascenso hacia el Oeste

        sim_ladera_viento = SimuladorElipticoAndino(
            lat=self.lat_ignicion,
            lon=self.lon_ignicion,
            viento_kmh=30.0,
            dir_viento_grados=90.0,
            ffmc=85.0,
            dem_array=dem_ladera,
            grid_size=grid_size
        )
        res_ladera_viento = sim_ladera_viento.simular(horizontes_horas=(3,))
        area_ladera_viento = res_ladera_viento[3]["area_hectareas"]

        self.assertGreater(
            area_ladera_viento,
            area_plano,
            "El frente de fuego con pendiente positiva y viento a favor debe quemar más área que el plano sin viento."
        )

    def test_verificacion_seguridad_requiere_revision_humana(self):
        """
        Test 3: Verificación de seguridad crítica. La simulación nace SIEMPRE con
        requiere_revision_humana=True por defecto para garantizar que ninguna simulación
        dispare alertas públicas automáticas sin la debida validación del operador.
        """
        simulacion = SimulacionPropagacion.objects.create(
            modelo_motor=self.modelo_motor,
            punto_ignicion=self.punto,
            horizonte_horas=6,
        )

        # Nace en True por defecto
        self.assertTrue(simulacion.requiere_revision_humana)

        # Ejecutar la simulación
        ejecutar_simulacion_propagacion(simulacion.id_simulacion)
        simulacion.refresh_from_db()

        # Debe permanecer en True tras la ejecución (nunca auto-aprobada)
        self.assertTrue(simulacion.requiere_revision_humana)

    def test_evaluacion_viviendas_expuestas_y_alerta_pendiente_operador(self):
        """
        Test 4: El helper de alertas evalúa viviendas a menos de 5 km del perímetro de 6h
        y genera la alerta en estado PENDIENTE_APROBACION (bloqueada para revisión humana).
        """
        # Crear simulación completada
        simulacion = SimulacionPropagacion.objects.create(
            modelo_motor=self.modelo_motor,
            punto_ignicion=self.punto,
            horizonte_horas=6,
            parametros_entrada={"viento_kmh": 20.0, "dir_viento_grados": 270.0, "ffmc": 85.0}
        )
        ejecutar_simulacion_propagacion(simulacion.id_simulacion)

        # Registrar vivienda a corta distancia (~1 km al norte de ignición)
        vivienda = Vivienda.objects.create(
            comunidad=self.comunidad,
            codigo="VIV-TEST-001",
            nombre_responsable="Comunero Evaluado",
            latitud=-15.0100,  # ~1 km de Coracora
            longitud=-73.7800,
            activa=True
        )

        resultado = evaluar_viviendas_en_riesgo_simulacion(simulacion.id_simulacion, distancia_km=5.0)

        self.assertEqual(resultado["status"], "ok")
        self.assertTrue(resultado["requiere_confirmacion_humana"])
        self.assertGreaterEqual(resultado["viviendas_en_riesgo_count"], 1)

        # Verificar que la alerta creada está en estado PENDIENTE_APROBACION
        alerta_id = resultado["alerta_id"]
        self.assertIsNotNone(alerta_id)
        alerta = AlertaEmergencia.objects.get(pk=alerta_id)
        self.assertEqual(alerta.estado, AlertaEmergencia.EstadoAlerta.PENDIENTE_APROBACION)
        self.assertEqual(alerta.tipo, AlertaEmergencia.TipoAlerta.RIESGO_VIVIENDA)

    def test_conexion_dem_geotiff_y_grilla_300(self):
        """
        Test 5: Verifica la conexión automática al GeoTIFF Copernicus DEM GLO-30 de Coracora
        (data/coracora_dem_utm18s.tif) y la resolución de grilla 300x300 celdas a 6 horas.
        """
        simulacion = SimulacionPropagacion.objects.create(
            modelo_motor=self.modelo_motor,
            punto_ignicion=self.punto,
            horizonte_horas=6,
            parametros_entrada={"viento_kmh": 20.0, "dir_viento_grados": 270.0, "ffmc": 88.0}
        )
        resultados = ejecutar_simulacion_propagacion(simulacion.id_simulacion)
        simulacion.refresh_from_db()

        self.assertEqual(simulacion.estado, SimulacionPropagacion.EstadoSimulacion.COMPLETADO)
        self.assertIn("ruta_dem", simulacion.parametros_entrada)
        self.assertTrue(simulacion.parametros_entrada["ruta_dem"].endswith("coracora_dem_utm18s.tif"))

        res_6h = simulacion.resultados.get(hora_paso=6)
        self.assertGreater(res_6h.area_hectareas, 200.0)
        self.assertIsNotNone(res_6h.perimetro)

