from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.usuarios.models import Usuario, Rol, UsuarioRol
from apps.geografia.models import Distrito, Comunidad
from apps.respuesta.models import Entidad, Brigada, Brigadista
from apps.reportes.models import Reporte
from apps.incidentes.models import Incidente
from apps.alertas.models import AlertaEmergencia
from apps.donaciones.models import Donante, OfertaDonacion, ItemOfertaDonacion


class Command(BaseCommand):
    help = 'Siembra datos operacionales reales de brigadas, reportes ciudadanos, incidentes, alertas y donaciones para Coracora'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Iniciando siembra de datos operacionales para Coracora...'))

        # 1. Distrito y Comunidades
        distrito, _ = Distrito.objects.get_or_create(
            nombre='Coracora',
            defaults={
                'departamento': 'Ayacucho',
                'provincia': 'Parinacochas',
                'ubigeo': '050701',
                'latitud_centro': Decimal('-15.0189'),
                'longitud_centro': Decimal('-73.7806'),
            }
        )

        comunidades = {}
        com_coords = [
            ('Coracora Centro', -15.0189, -73.7806),
            ('Secce', -15.0450, -73.7620),
            ('Huallhua', -15.0800, -73.8100),
            ('Muchapampa', -15.0250, -73.7400),
            ('Paucaray', -15.1100, -73.7900),
        ]
        for name, lat, lon in com_coords:
            com, _ = Comunidad.objects.get_or_create(
                distrito=distrito,
                nombre=name,
                defaults={'latitud': Decimal(str(lat)), 'longitud': Decimal(str(lon)), 'activa': True}
            )
            comunidades[name] = com

        # 2. Usuarios del sistema
        admin_user = Usuario.objects.filter(is_staff=True).first()
        if not admin_user:
            admin_user = Usuario.objects.create_superuser('admin', 'admin@willai.pe', 'admin12345')

        # Operador de emergencia COEP
        operador, _ = Usuario.objects.get_or_create(
            username='operador.coep',
            defaults={
                'nombre_visible': 'Ing. Carlos Mendoza (COEP Parinacochas)',
                'first_name': 'Carlos',
                'last_name': 'Mendoza',
                'email': 'coep.parinacochas@willai.pe',
                'is_staff': True,
                'estado': 'activo'
            }
        )
        operador.set_password('willai2026')
        operador.save()

        # Jefe de Brigada Bomberos
        jefe_bomberos, _ = Usuario.objects.get_or_create(
            username='comandante.b12',
            defaults={
                'nombre_visible': 'Capitán Raúl Huamaní (B-12)',
                'first_name': 'Raúl',
                'last_name': 'Huamaní',
                'email': 'bomberos.coracora@willai.pe',
                'estado': 'activo'
            }
        )
        jefe_bomberos.set_password('willai2026')
        jefe_bomberos.save()

        # Verificador Comunal
        verificador, _ = Usuario.objects.get_or_create(
            username='verificador.secce',
            defaults={
                'nombre_visible': 'Marcos Quispe (Verificador Secce)',
                'first_name': 'Marcos',
                'last_name': 'Quispe',
                'email': 'verificador.secce@willai.pe',
                'estado': 'activo'
            }
        )
        verificador.set_password('willai2026')
        verificador.save()

        # Asignar roles
        rol_operador = Rol.objects.filter(codigo='operador_emergencia').first()
        rol_brigadista = Rol.objects.filter(codigo='brigadista').first()
        rol_verificador = Rol.objects.filter(codigo='verificador').first()

        if rol_operador:
            UsuarioRol.objects.get_or_create(usuario=operador, rol=rol_operador)
        if rol_brigadista:
            UsuarioRol.objects.get_or_create(usuario=jefe_bomberos, rol=rol_brigadista)
        if rol_verificador:
            UsuarioRol.objects.get_or_create(usuario=verificador, rol=rol_verificador)

        # 3. Entidades de Primera Respuesta
        ent_bomberos, _ = Entidad.objects.get_or_create(
            nombre='Compañía de Bomberos Voluntarios Coracora B-12',
            defaults={
                'tipo': Entidad.TipoEntidad.BOMBEROS,
                'sigla': 'BOMBEROS B-12',
                'telefono_operativo': '+51 966 845 112',
                'correo_operativo': 'b12coracora@bomberosperu.gob.pe',
                'distrito': distrito,
                'activa': True
            }
        )

        ent_ogrd, _ = Entidad.objects.get_or_create(
            nombre='Oficina de Gestión del Riesgo de Desastres Parinacochas',
            defaults={
                'tipo': Entidad.TipoEntidad.OGRD,
                'sigla': 'OGRD PARINACOCHAS',
                'telefono_operativo': '+51 966 123 789',
                'correo_operativo': 'ogrd@muniparinacochas.gob.pe',
                'distrito': distrito,
                'activa': True
            }
        )

        ent_serfor, _ = Entidad.objects.get_or_create(
            nombre='SERFOR ATFFS Ayacucho — Sede Sur',
            defaults={
                'tipo': Entidad.TipoEntidad.SERFOR,
                'sigla': 'SERFOR',
                'telefono_operativo': '+51 988 554 210',
                'correo_operativo': 'atffs.ayacucho@serfor.gob.pe',
                'distrito': distrito,
                'activa': True
            }
        )

        ent_comunal, _ = Entidad.objects.get_or_create(
            nombre='Comunidad Campesina de Huallhua',
            defaults={
                'tipo': Entidad.TipoEntidad.COMUNIDAD,
                'sigla': 'CC HUALLHUA',
                'telefono_operativo': '+51 954 789 654',
                'distrito': distrito,
                'activa': True
            }
        )

        # 4. Brigadas Operativas
        brigadas_defs = [
            ('Brigada Rápida B-12 Coracora', ent_bomberos, comunidades['Coracora Centro'], Brigada.TipoBrigada.BOMBEROS, Brigada.EstadoBrigada.DISPONIBLE, '+51 966 845 112', -15.0195, -73.7810),
            ('Cuadrilla Forestal Comunal Huallhua', ent_comunal, comunidades['Huallhua'], Brigada.TipoBrigada.COMUNAL, Brigada.EstadoBrigada.DISPONIBLE, '+51 954 789 654', -15.0805, -73.8115),
            ('Equipo Táctico de Intervención OGRD', ent_ogrd, comunidades['Secce'], Brigada.TipoBrigada.MUNICIPAL, Brigada.EstadoBrigada.DISPONIBLE, '+51 966 123 789', -15.0455, -73.7625),
            ('Especialistas Forestales SERFOR', ent_serfor, comunidades['Muchapampa'], Brigada.TipoBrigada.FORESTAL, Brigada.EstadoBrigada.DISPONIBLE, '+51 988 554 210', -15.0255, -73.7405),
        ]

        brigadas_creadas = []
        for nom, ent, com, tipo, est, tel, lat, lon in brigadas_defs:
            b, _ = Brigada.objects.get_or_create(
                nombre=nom,
                defaults={
                    'entidad': ent,
                    'comunidad': com,
                    'tipo': tipo,
                    'estado': est,
                    'telefono_contacto': tel,
                    'latitud_base': Decimal(str(lat)),
                    'longitud_base': Decimal(str(lon)),
                }
            )
            brigadas_creadas.append(b)

            # Integrante líder
            Brigadista.objects.get_or_create(
                brigada=b,
                usuario=jefe_bomberos,
                desde=timezone.now().date(),
                defaults={'funcion': 'Líder de Cuadrilla', 'activo': True}
            )

        self.stdout.write(self.style.SUCCESS(f'  [+] 4 Brigadas operativas configuradas.'))

        # 5. Incidentes Tácticos Activos
        inc_1, _ = Incidente.objects.get_or_create(
            codigo='INC-20261022-001',
            defaults={
                'titulo': 'Incendio Forestal Activo en Ladera Cerro Huallhua',
                'tipo_incendio': 'pastizal',
                'estado': 'en_combate',
                'prioridad': 'alta',
                'latitud_referencia': Decimal('-15.0800'),
                'longitud_referencia': Decimal('-73.8100'),
                'distrito': distrito,
                'comunidad': comunidades['Huallhua'],
                'creado_por': admin_user
            }
        )

        inc_2, _ = Incidente.objects.get_or_create(
            codigo='INC-20261022-002',
            defaults={
                'titulo': 'Frente de Fuego en Pastizal Quebrada Secce',
                'tipo_incendio': 'pastizal',
                'estado': 'confirmado',
                'prioridad': 'critica',
                'latitud_referencia': Decimal('-15.0450'),
                'longitud_referencia': Decimal('-73.7620'),
                'distrito': distrito,
                'comunidad': comunidades['Secce'],
                'creado_por': admin_user
            }
        )

        inc_3, _ = Incidente.objects.get_or_create(
            codigo='INC-20261022-003',
            defaults={
                'titulo': 'Foco de Combustión en Matorrales de Muchapampa',
                'tipo_incendio': 'arbustivo',
                'estado': 'controlado',
                'prioridad': 'media',
                'latitud_referencia': Decimal('-15.0250'),
                'longitud_referencia': Decimal('-73.7400'),
                'distrito': distrito,
                'comunidad': comunidades['Muchapampa'],
                'creado_por': admin_user
            }
        )
        self.stdout.write(self.style.SUCCESS('  [+] 3 Incidentes tácticos registrados.'))

        # 6. Reportes Ciudadanos
        reportes_data = [
            (verificador, comunidades['Secce'], 'pastizal', 'recibido', -15.0440, -73.7610, 'Columna densa de humo avistada avanzando rápidamente hacia el sector alto de Secce. Ráfagas de viento del noreste.'),
            (operador, comunidades['Huallhua'], 'pastizal', 'recibido', -15.0790, -73.8090, 'Comuneros reportan fuego en pastizales de altura amenazando corrales ganaderos.'),
            (verificador, comunidades['Muchapampa'], 'pastizal', 'confirmado', -15.0240, -73.7390, 'Quema de rastrojos agrícolas descontrolada cerca al camino vecinal.'),
            (operador, comunidades['Paucaray'], 'forestal', 'en_revision', -15.1090, -73.7890, 'Humo continuo en bosque de eucaliptos cerca a la quebrada Paucaray.')
        ]

        for usr, com, tipo, est, lat, lon, desc in reportes_data:
            Reporte.objects.get_or_create(
                usuario=usr,
                comunidad=com,
                descripcion=desc,
                defaults={
                    'tipo_incendio': tipo,
                    'estado': est,
                    'fecha_evento': timezone.now(),
                    'latitud': Decimal(str(lat)),
                    'longitud': Decimal(str(lon)),
                    'origen': Reporte.OrigenReporte.MOVIL,
                    'direccion_viento': Reporte.DireccionViento.NE
                }
            )
        self.stdout.write(self.style.SUCCESS('  [+] 4 Reportes ciudadanos registrados.'))

        # 7. Alertas Comunitarias
        alertas_data = [
            ('Alerta Naranja: Advertencia por Ráfagas de Viento en Huallhua', 'prevencion', 'alta', 'Se registran vientos intensos favorables a la rápida propagación de focos en la ladera sur de Huallhua.', 'Mantener despejadas las líneas cortafuego y no realizar quemas agrícolas.', inc_1),
            ('Alerta Roja: Evacuación Preventiva en Quebrada Secce', 'evacuacion', 'critica', 'Frente de fuego activo con riesgo directo de aproximación a viviendas del sector alto de Secce.', 'Pobladores deben desplazarse inmediatamente hacia la losa deportiva comunal de Secce.', inc_2),
            ('Alerta Informativa: Control Perimetral en Muchapampa', 'cambio_estado', 'media', 'La brigada ha contenido el avance del fuego en Muchapampa. Se inicia guardia de cenizas.', 'Evitar acercarse al perímetro quemado debido a riesgo de rescoldos.', inc_3),
        ]

        for tit, tip, prio, msg, inst, inc in alertas_data:
            AlertaEmergencia.objects.get_or_create(
                titulo=tit,
                defaults={
                    'incidente': inc,
                    'tipo': tip,
                    'prioridad': prio,
                    'mensaje': msg,
                    'instrucciones': inst,
                    'estado': 'enviada',
                    'emitida_por': admin_user,
                    'aprobada_por': admin_user,
                    'emitida_en': timezone.now(),
                    'aprobada_en': timezone.now()
                }
            )
        self.stdout.write(self.style.SUCCESS('  [+] 3 Alertas comunitarias registradas.'))

        # 8. Donantes y Ofertas de Donación
        donante_1, _ = Donante.objects.get_or_create(
            nombre_publico='Comité de Regantes Canal Principal Coracora',
            defaults={
                'tipo_donante': 'organizacion',
                'telefono_contacto': '+51 966 221 445',
                'correo_contacto': 'regantes.coracora@gmail.com',
                'verificado': True
            }
        )

        donante_2, _ = Donante.objects.get_or_create(
            nombre_publico='Asociación de Productores de Parinacochas',
            defaults={
                'tipo_donante': 'negocio',
                'telefono_contacto': '+51 988 332 114',
                'correo_contacto': 'productores.parinacochas@gmail.com',
                'verificado': True
            }
        )

        of_1, _ = OfertaDonacion.objects.get_or_create(
            titulo='Lote de Agua Mineral y Bebidas Rehidratantes para Combatientes',
            defaults={
                'donante': donante_1,
                'distrito': distrito,
                'descripcion': '40 paquetes de agua de mesa de 2.5L y 20 cajas de suero rehidratante para las cuadrillas en Huallhua y Secce.',
                'modalidad_entrega': 'entrega_en_punto',
                'referencia_entrega': 'Almacén del Comité de Regantes, Jr. Arequipa 340, Coracora',
                'estado': 'publicada'
            }
        )
        ItemOfertaDonacion.objects.get_or_create(
            oferta=of_1,
            nombre_item='Agua mineral embotellada 2.5L',
            defaults={
                'categoria': 'alimento',
                'cantidad_ofrecida': Decimal('40.0'),
                'cantidad_disponible': Decimal('40.0'),
                'unidad': 'paquetes'
            }
        )

        of_2, _ = OfertaDonacion.objects.get_or_create(
            titulo='Herramientas de Zapa y Batefuegos Forestales Metálicos',
            defaults={
                'donante': donante_2,
                'distrito': distrito,
                'descripcion': '15 palas forestales y 10 batefuegos reforzados listos para entrega inmediata a brigadas comunales.',
                'modalidad_entrega': 'recojo',
                'referencia_entrega': 'Local Comunal de Huallhua',
                'estado': 'pendiente_revision'
            }
        )
        ItemOfertaDonacion.objects.get_or_create(
            oferta=of_2,
            nombre_item='Batefuegos forestales metálicos',
            defaults={
                'categoria': 'herramienta',
                'cantidad_ofrecida': Decimal('10.0'),
                'cantidad_disponible': Decimal('10.0'),
                'unidad': 'unidades'
            }
        )

        of_3, _ = OfertaDonacion.objects.get_or_create(
            titulo='Mochilas Aspersoras Extintoras de Espalda (20 Litros)',
            defaults={
                'donante': donante_2,
                'distrito': distrito,
                'descripcion': '6 mochilas aspersoras marca Guarany con boquilla doble para liquidación de incendios.',
                'modalidad_entrega': 'entrega_en_punto',
                'referencia_entrega': 'Compañía de Bomberos Coracora B-12',
                'estado': 'publicada'
            }
        )
        ItemOfertaDonacion.objects.get_or_create(
            oferta=of_3,
            nombre_item='Mochilas aspersoras 20L',
            defaults={
                'categoria': 'epp',
                'cantidad_ofrecida': Decimal('6.0'),
                'cantidad_disponible': Decimal('6.0'),
                'unidad': 'unidades'
            }
        )
        self.stdout.write(self.style.SUCCESS('  [+] 3 Ofertas de donación registradas.'))

        self.stdout.write(self.style.SUCCESS('¡Datos operacionales sembrados con éxito en la base de datos!'))
