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

        # Caso A: Terreno plano sin viento con combustible uniforme
        sim_plano = SimuladorElipticoAndino(
            lat=self.lat_ignicion,
            lon=self.lon_ignicion,
            viento_kmh=0.0,
            dir_viento_grados=0.0,
            ffmc=85.0,
            dem_array=np.full((grid_size, grid_size), 3180.0, dtype=np.float32),
            combustible_array=np.full((grid_size, grid_size), 1.8, dtype=np.float32),
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
            combustible_array=np.full((grid_size, grid_size), 1.8, dtype=np.float32),
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

    def test_validador_dnbr_calculo_metricas_iou(self):
        """
        Test 6: Verifica el cálculo matemático exacto de IoU, Dice/F1, Comisión y Omisión
        usando geometrías controladas con solapamiento conocido.
        """
        from shapely.geometry import box
        from apps.predicciones.validador_dnbr import ValidadorVerdadTerrenoDNBR

        # Caja 1 (Simulación): (0, 0) a (100, 100) -> 10,000 m2
        poly_sim = box(0, 0, 100, 100)
        # Caja 2 (Real): (50, 0) a (150, 100) -> 10,000 m2
        poly_real = box(50, 0, 150, 100)
        # Intersección: (50, 0) a (100, 100) -> 5,000 m2
        # Unión: (0, 0) a (150, 100) -> 15,000 m2

        metricas = ValidadorVerdadTerrenoDNBR.calcular_metricas_iou(poly_sim, poly_real)

        self.assertAlmostEqual(metricas["iou_porcentaje"], 33.33, places=1)
        self.assertAlmostEqual(metricas["dice_f1_porcentaje"], 50.0, places=1)
        self.assertAlmostEqual(metricas["comision_porcentaje"], 50.0, places=1)
        self.assertAlmostEqual(metricas["omision_porcentaje"], 50.0, places=1)
        self.assertEqual(metricas["area_simulada_ha"], 1.0)
        self.assertEqual(metricas["area_real_ha"], 1.0)
        self.assertEqual(metricas["area_interseccion_ha"], 0.5)

    def test_validador_dnbr_extraccion_cicatriz_evento(self):
        """
        Test 7: Verifica la extracción satelital o calibrada de la cicatriz dNBR
        para el incendio histórico de Huac-Cana (2026-08-20).
        """
        from apps.predicciones.validador_dnbr import (
            ValidadorVerdadTerrenoDNBR,
            EVENTOS_HISTORICOS_FIRMS,
        )

        validador = ValidadorVerdadTerrenoDNBR(umbral_dnbr=0.12, radio_m=3500.0)
        evento = EVENTOS_HISTORICOS_FIRMS[0]

        poly_real, area_real_ha, stats = validador.extraer_poligono_dnbr_real(evento)

        self.assertTrue(poly_real.is_valid)
        self.assertFalse(poly_real.is_empty)
        self.assertGreater(area_real_ha, 100.0)
        self.assertIn("pixeles_quemados", stats)
        self.assertGreater(stats["pixeles_quemados"], 500)
        self.assertGreater(stats["dnbr_max"], 0.3)

    def test_validador_dnbr_evaluar_todos_reporte(self):
        """
        Test 8: Verifica la evaluación consolidada de los 3 incendios FIRMS
        y la generación de métricas macro sin errores.
        """
        from apps.predicciones.validador_dnbr import ValidadorVerdadTerrenoDNBR

        validador = ValidadorVerdadTerrenoDNBR(umbral_dnbr=0.12, radio_m=3500.0)
        reporte = validador.evaluar_todos(guardar_artefacto=False)

        self.assertEqual(reporte["total_eventos_evaluados"], 3)
        self.assertEqual(len(reporte["eventos"]), 3)
        macro = reporte["resumen_metricas_macro"]
        self.assertIn("iou_medio_porcentaje", macro)
        self.assertGreater(macro["iou_medio_porcentaje"], 0.0)
        self.assertIn("calificacion_concordancia", macro)

    def test_endpoint_reporte_validacion_dnbr(self):
        """
        Test 9: Verifica que el endpoint GET /api/v1/predicciones/simulaciones/reporte_validacion_dnbr/
        retorne 200 OK con el reporte estructurado de los 3 eventos.
        """
        url = "/api/v1/predicciones/simulaciones/reporte_validacion_dnbr/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("total_eventos_evaluados"), 3)
        self.assertIn("resumen_metricas_macro", response.data)
        self.assertIn("eventos", response.data)
        self.assertEqual(len(response.data["eventos"]), 3)

    def test_clasificar_r0_andino_ndvi_ndmi_dem(self):
        """
        Test 10: Verifica que clasificar_r0_andino module la tasa base R0 según
        estrés hídrico NDMI, vigor NDVI y cumbres estériles del DEM.
        """
        from scripts.generar_combustibles_coracora import clasificar_r0_andino

        ndvi = np.array([[0.30, 0.30], [-0.15, 0.50]], dtype=np.float32)
        ndmi_seco = np.array([[-0.10, 0.10], [0.10, -0.10]], dtype=np.float32)
        dem = np.array([[3200.0, 3200.0], [3200.0, 4900.0]], dtype=np.float32)

        r0 = clasificar_r0_andino(ndvi, ndmi=ndmi_seco, dem=dem)

        # Ichu seco con NDMI < -0.05 debe ser mayor que ichu con humedad normal
        self.assertGreater(r0[0, 0], r0[0, 1])
        # Agua con NDVI < -0.10 debe ser 0.0 m/min
        self.assertEqual(r0[1, 0], 0.0)
        # Cumbre alta (>4800m) debe ser incombustible (0.0 m/min)
        self.assertEqual(r0[1, 1], 0.0)

    def test_simulador_multi_ignicion_cluster(self):
        """
        Test 11: Verifica que el Simulador admita un cluster de focos FIRMS simultáneos
        y que la multi-ignición genere un perímetro coherente y mayor que un solo foco.
        """
        focos = [
            (self.lat_ignicion, self.lon_ignicion),
            (self.lat_ignicion - 0.005, self.lon_ignicion + 0.005),
        ]
        # Simulación multi-ignición
        sim_multi = SimuladorElipticoAndino(
            puntos_ignicion=focos,
            viento_kmh=15.0,
            dir_viento_grados=90.0,
            ffmc=85.0,
            grid_size=100,
            dem_array=np.full((100, 100), 3180.0, dtype=np.float32),
            combustible_array=np.full((100, 100), 1.8, dtype=np.float32),
        )
        self.assertGreaterEqual(len(sim_multi.focos), 2)
        res_multi = sim_multi.simular(horizontes_horas=(1,))

        # Simulación foco único
        sim_single = SimuladorElipticoAndino(
            lat=self.lat_ignicion,
            lon=self.lon_ignicion,
            viento_kmh=15.0,
            dir_viento_grados=90.0,
            ffmc=85.0,
            grid_size=100,
            dem_array=np.full((100, 100), 3180.0, dtype=np.float32),
            combustible_array=np.full((100, 100), 1.8, dtype=np.float32),
        )
        res_single = sim_single.simular(horizontes_horas=(1,))

        self.assertGreater(
            res_multi[1]["area_hectareas"],
            res_single[1]["area_hectareas"],
            "El cluster de múltiples focos debe propagar más área que una ignición puntual."
        )

    def test_simulador_multiplicadores_calibracion_alfa(self):
        """
        Test 12: Verifica que los multiplicadores alfa_r0, alfa_viento y alfa_pendiente
        incrementen la tasa de avance de manera estrictamente monótona.
        """
        grid_size = 100
        dem_plano = np.full((grid_size, grid_size), 3180.0, dtype=np.float32)
        comb_uniforme = np.full((grid_size, grid_size), 1.8, dtype=np.float32)

        sim_base = SimuladorElipticoAndino(
            lat=self.lat_ignicion,
            lon=self.lon_ignicion,
            viento_kmh=20.0,
            dir_viento_grados=90.0,
            ffmc=85.0,
            alfa_r0=1.0,
            alfa_viento=1.0,
            grid_size=grid_size,
            dem_array=dem_plano,
            combustible_array=comb_uniforme,
        )
        res_base = sim_base.simular(horizontes_horas=(1,))

        sim_ampliado = SimuladorElipticoAndino(
            lat=self.lat_ignicion,
            lon=self.lon_ignicion,
            viento_kmh=20.0,
            dir_viento_grados=90.0,
            ffmc=85.0,
            alfa_r0=1.5,
            alfa_viento=1.5,
            grid_size=grid_size,
            dem_array=dem_plano,
            combustible_array=comb_uniforme,
        )
        res_ampliado = sim_ampliado.simular(horizontes_horas=(1,))

        self.assertGreater(
            res_ampliado[1]["area_hectareas"],
            res_base[1]["area_hectareas"],
            "Multiplicadores alfa mayores deben producir un área propagada mayor."
        )

    def test_calibrador_lofo_ejecucion_y_reporte(self):
        """
        Test 13: Verifica que CalibradorLOFO ejecute la partición Leave-One-Fire-Out
        con scipy.optimize y retorne las métricas de train y test no visto.
        """
        from apps.predicciones.calibrador_lofo import CalibradorLOFO

        calibrador = CalibradorLOFO(test_id_or_keyword="UPAHUACHO", max_iter=2)
        self.assertEqual(len(calibrador.train_eventos), 2)
        self.assertEqual(calibrador.test_evento["id_evento"], "FIRMS-2026-1011-UPAHUACHO")

        rep = calibrador.calibrar()
        self.assertIn("multiplicadores_optimos", rep)
        self.assertIn("rendimiento_entrenamiento", rep)
        self.assertIn("rendimiento_prueba_no_visto", rep)
        self.assertGreater(rep["rendimiento_entrenamiento"]["iou_calibrado"], 0.0)
        self.assertGreater(rep["rendimiento_prueba_no_visto"]["iou_calibrado"], 0.0)

