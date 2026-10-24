from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.usuarios.models import Rol, Permiso, RolPermiso, UsuarioRol
from apps.geografia.models import Distrito, Comunidad

User = get_user_model()

class Command(BaseCommand):
    help = 'Carga datos semilla esenciales para WillAI (Roles, Permisos, Geografía de Coracora y Superusuario)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Iniciando carga de datos semilla base...'))

        # 1. ROLES
        roles_data = [
            ('poblador', 'Poblador', 'Reporta incidentes y recibe alertas autorizadas', True),
            ('brigadista', 'Brigadista', 'Participa en operaciones de respuesta', True),
            ('verificador', 'Verificador', 'Revisa y valida reportes', True),
            ('operador_emergencia', 'Operador de emergencia', 'Gestiona incidentes y asignaciones', True),
            ('administrador', 'Administrador', 'Administra configuración y accesos', True),
        ]
        roles_dict = {}
        for codigo, nombre, descripcion, sistema in roles_data:
            rol, created = Rol.objects.get_or_create(
                codigo=codigo,
                defaults={'nombre': nombre, 'descripcion': descripcion, 'sistema': sistema}
            )
            roles_dict[codigo] = rol
            if created:
                self.stdout.write(self.style.SUCCESS(f'  [+] Rol creado: {nombre}'))

        # 2. PERMISOS
        permisos_data = [
            ('reporte.crear', 'Crear reportes ciudadanos'),
            ('reporte.validar', 'Validar reportes'),
            ('incidente.gestionar', 'Gestionar incidentes'),
            ('brigada.asignar', 'Asignar brigadas'),
            ('alerta.aprobar', 'Aprobar alertas de emergencia'),
            ('vivienda.ver_restringida', 'Acceder a ubicaciones exactas de viviendas'),
            ('usuario.gestionar', 'Gestionar usuarios y roles'),
            ('firms.importar', 'Importar datos de NASA FIRMS'),
            ('auditoria.consultar', 'Consultar auditoría'),
            ('donacion.publicar', 'Publicar ofertas de donación'),
            ('donacion.revisar', 'Revisar y moderar ofertas de donación'),
            ('donacion.asignar', 'Asignar donaciones a incidentes, brigadas o entidades'),
            ('donacion.confirmar_entrega', 'Confirmar recepción de donaciones'),
        ]
        permisos_dict = {}
        for codigo, descripcion in permisos_data:
            permiso, created = Permiso.objects.get_or_create(
                codigo=codigo,
                defaults={'descripcion': descripcion}
            )
            permisos_dict[codigo] = permiso
            if created:
                self.stdout.write(self.style.SUCCESS(f'  [+] Permiso creado: {codigo}'))

        # Asignar permisos clave a administrador y operador
        admin_rol = roles_dict.get('administrador')
        operador_rol = roles_dict.get('operador_emergencia')
        verificador_rol = roles_dict.get('verificador')
        poblador_rol = roles_dict.get('poblador')

        # Admin tiene todos los permisos
        if admin_rol:
            for p in permisos_dict.values():
                RolPermiso.objects.get_or_create(rol=admin_rol, permiso=p)

        # Operador de emergencia
        if operador_rol:
            for p_cod in ['incidente.gestionar', 'brigada.asignar', 'alerta.aprobar', 'vivienda.ver_restringida', 'donacion.asignar']:
                if p_cod in permisos_dict:
                    RolPermiso.objects.get_or_create(rol=operador_rol, permiso=permisos_dict[p_cod])

        # Verificador
        if verificador_rol:
            for p_cod in ['reporte.validar']:
                if p_cod in permisos_dict:
                    RolPermiso.objects.get_or_create(rol=verificador_rol, permiso=permisos_dict[p_cod])

        # Poblador
        if poblador_rol:
            for p_cod in ['reporte.crear', 'donacion.publicar']:
                if p_cod in permisos_dict:
                    RolPermiso.objects.get_or_create(rol=poblador_rol, permiso=permisos_dict[p_cod])

        # 3. GEOGRAFÍA DE PARINACOCHAS (8 DISTRITOS OFICIALES SEGÚN INEI/IGN)
        distritos_parinacochas = [
            ('Coracora', '050701', -15.0189, -73.7806),
            ('Chumpi', '050702', -15.0667, -73.8333),
            ('Coronel Castañeda', '050703', -14.8833, -73.6833),
            ('Pacapausa', '050704', -14.9333, -73.7167),
            ('Pullo', '050705', -15.2833, -73.7333),
            ('Puyusca', '050706', -15.2667, -73.6167),
            ('San Francisco de Ravacayco', '050707', -15.0500, -73.7000),
            ('Upahuacho', '050708', -14.8167, -73.5500),
        ]
        distrito_coracora = None
        for nom, ubig, lat_c, lon_c in distritos_parinacochas:
            d_obj, created = Distrito.objects.get_or_create(
                departamento='Ayacucho',
                provincia='Parinacochas',
                nombre=nom,
                defaults={
                    'ubigeo': ubig,
                    'latitud_centro': lat_c,
                    'longitud_centro': lon_c,
                }
            )
            if nom == 'Coracora':
                distrito_coracora = d_obj
            if created:
                self.stdout.write(self.style.SUCCESS(f'  [+] Distrito creado: {nom} ({ubig})'))

        # Comunidades representativas de Coracora
        comunidades_data = [
            ('Coracora Centro', 'centro_poblado', -15.0189, -73.7806),
            ('Secce', 'anexo', -15.0450, -73.7620),
            ('Huallhua', 'comunidad_campesina', -15.0800, -73.8100),
            ('Muchapampa', 'sector', -15.0250, -73.7400),
            ('Paucaray', 'comunidad_campesina', -15.1100, -73.7900),
        ]
        for nombre_com, tipo, lat, lon in comunidades_data:
            com, created = Comunidad.objects.get_or_create(
                distrito=distrito_coracora or Distrito.objects.get(nombre='Coracora'),
                nombre=nombre_com,
                defaults={'tipo': tipo, 'latitud': lat, 'longitud': lon, 'activa': True}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'  [+] Comunidad creada: {nombre_com}'))

        # 4. SUPERUSUARIO ADMIN
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@willai.pe',
                'nombre_visible': 'Administrador General WillAI',
                'first_name': 'Admin',
                'last_name': 'WillAI',
                'is_staff': True,
                'is_superuser': True,
                'estado': 'activo',
            }
        )
        if created:
            admin_user.set_password('admin12345')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('  [+] Superusuario creado: admin (clave: admin12345)'))
        else:
            admin_user.set_password('admin12345')
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.save()

        # Asignar rol administrador
        if admin_rol:
            UsuarioRol.objects.get_or_create(usuario=admin_user, rol=admin_rol)

        self.stdout.write(self.style.SUCCESS('¡Datos semilla cargados con éxito!'))
