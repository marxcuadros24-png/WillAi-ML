from django.utils import timezone
from django.db.models import Count
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Insignia, ActividadUsuario, UsuarioInsignia
from .serializers import InsigniaSerializer, ActividadUsuarioSerializer, UsuarioInsigniaSerializer
from apps.usuarios.models import Usuario


@extend_schema_view(
    list=extend_schema(summary="Catálogo de insignias comunitarias", tags=["Gamificación"]),
    retrieve=extend_schema(summary="Detalle de insignia comunitaria", tags=["Gamificación"]),
)
class InsigniaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Insignia.objects.filter(activa=True)
    serializer_class = InsigniaSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'], url_path='cuadro-honor')
    def cuadro_honor(self, request):
        """
        Retorna el Cuadro de Honor, Ranking de colaboradores comunitarios,
        estadísticas globales y actividades de reconocimiento de WillAI Parinacochas.
        """
        ahora = timezone.now()

        # 1. Catálogo completo de insignias con conteo de usuarios poseedores
        insignias_qs = Insignia.objects.filter(activa=True).annotate(
            total_poseedores=Count('usuarios_poseedores')
        ).order_by('id_insignia')
        catalogo = []
        for ins in insignias_qs:
            catalogo.append({
                'id_insignia': ins.id_insignia,
                'codigo': ins.codigo,
                'nombre': ins.nombre,
                'descripcion': ins.descripcion,
                'icono_url': ins.icono_url or 'award',
                'criterio': ins.criterio or {},
                'puntos': (ins.criterio or {}).get('puntos', 50),
                'total_poseedores': ins.total_poseedores
            })

        # 2. Ranking de Colaboradores (Usuarios con insignias, actividades o reportes validados)
        usuarios_candidatos = Usuario.objects.filter(
            estado=Usuario.Estado.ACTIVO
        ).prefetch_related(
            'roles',
            'insignias_obtenidas__insignia',
            'insignias_obtenidas__otorgada_por',
            'actividades_comunales',
            'reportes'
        ).distinct()

        ranking = []
        comunidades_conteo = {}

        for user in usuarios_candidatos:
            insignias_user = []
            puntos = 0

            for ui in user.insignias_obtenidas.all():
                p_val = (ui.insignia.criterio or {}).get('puntos', 50)
                puntos += p_val
                insignias_user.append({
                    'id_insignia': ui.insignia.id_insignia,
                    'codigo': ui.insignia.codigo,
                    'nombre': ui.insignia.nombre,
                    'descripcion': ui.insignia.descripcion,
                    'icono_url': ui.insignia.icono_url or 'award',
                    'desbloqueada_en': ui.desbloqueada_en.strftime('%Y-%m-%d %H:%M') if ui.desbloqueada_en else '',
                    'otorgada_por': ui.otorgada_por.nombre_visible or ui.otorgada_por.username if ui.otorgada_por else 'Sistema WillAI'
                })

            # Actividades comunitarias validadas
            actividades_validadas = user.actividades_comunales.filter(estado='validada')
            act_count = actividades_validadas.count()
            puntos += act_count * 30

            # Reportes validados
            rep_count = user.reportes.filter(estado__in=['validado', 'vinculado', 'cerrado']).count()
            puntos += rep_count * 40

            # Solo incluir si tiene alguna contribución o rol operativo
            es_operativo = user.roles.filter(codigo__in=['brigadista', 'verificador', 'poblador']).exists()
            if puntos == 0 and not es_operativo and not insignias_user:
                continue

            # Comunidad inferida de su última actividad o reporte
            comunidad_nom = 'Coracora'
            ult_reporte = user.reportes.order_by('-creado_en').first()
            if ult_reporte and ult_reporte.comunidad:
                comunidad_nom = ult_reporte.comunidad.nombre
            elif 'secce' in user.username.lower():
                comunidad_nom = 'Secce'
            elif 'huaccana' in user.username.lower():
                comunidad_nom = 'Huaccana'
            elif 'huallhua' in user.username.lower():
                comunidad_nom = 'Huallhua'
            elif 'muchapampa' in user.username.lower():
                comunidad_nom = 'Muchapampa'
            elif 'paucaray' in user.username.lower():
                comunidad_nom = 'Paucaray'

            comunidades_conteo[comunidad_nom] = comunidades_conteo.get(comunidad_nom, 0) + 1

            # Nivel y Rango Honorífico
            if puntos >= 220:
                rango_honor = 'Centinela Mayor de Parinacochas'
                rango_nivel = 4
                badge_color = '#f59e0b'
            elif puntos >= 130:
                rango_honor = 'Guardián del Fuego'
                rango_nivel = 3
                badge_color = '#38bdf8'
            elif puntos >= 60:
                rango_honor = 'Vigilante Comunal Activo'
                rango_nivel = 2
                badge_color = '#10b981'
            else:
                rango_honor = 'Colaborador Voluntario'
                rango_nivel = 1
                badge_color = '#94a3b8'

            # Última actividad registrada
            ult_act = actividades_validadas.order_by('-ocurrida_en').first()
            ult_act_txt = ult_act.evidencia_referencia if ult_act else 'Vigilancia comunal preventiva activa'

            ranking.append({
                'id_usuario': user.id_usuario,
                'username': user.username,
                'nombre_completo': user.nombre_visible or user.get_full_name() or user.username,
                'telefono': user.telefono or 'No registrado',
                'roles': [r.nombre for r in user.roles.all()] or ['Voluntario Comunal'],
                'comunidad': comunidad_nom,
                'puntos_totales': puntos,
                'rango_honor': rango_honor,
                'rango_nivel': rango_nivel,
                'badge_color': badge_color,
                'insignias_count': len(insignias_user),
                'reportes_validados_count': rep_count,
                'actividades_count': act_count,
                'insignias': insignias_user,
                'ultima_actividad': ult_act_txt
            })

        # Ordenar ranking por puntos de mayor a menor
        ranking.sort(key=lambda x: (x['puntos_totales'], x['insignias_count']), reverse=True)

        # Asignar posición ordinal (1, 2, 3...)
        for idx, item in enumerate(ranking, start=1):
            item['posicion'] = idx

        # 3. Muro de Reconocimientos Recientes (Feed cronológico completo)
        ultimos_logros = UsuarioInsignia.objects.select_related(
            'usuario', 'insignia', 'otorgada_por', 'actividad_desbloqueo'
        ).order_by('-desbloqueada_en')[:200]

        muro_feed = []
        for ul in ultimos_logros:
            motivo_txt = ul.actividad_desbloqueo.evidencia_referencia if ul.actividad_desbloqueo else ''
            muro_feed.append({
                'id_logro': ul.id,
                'usuario_id': ul.usuario.id_usuario,
                'usuario_nombre': ul.usuario.nombre_visible or ul.usuario.get_full_name() or ul.usuario.username,
                'insignia_codigo': ul.insignia.codigo,
                'insignia_nombre': ul.insignia.nombre,
                'insignia_icono': ul.insignia.icono_url or 'award',
                'puntos': (ul.insignia.criterio or {}).get('puntos', 50),
                'desbloqueada_en': ul.desbloqueada_en.strftime('%Y-%m-%d %H:%M') if ul.desbloqueada_en else '',
                'otorgada_por': ul.otorgada_por.nombre_visible or ul.otorgada_por.username if ul.otorgada_por else 'Sistema WillAI',
                'motivo': motivo_txt
            })

        # 4. Estadísticas Globales
        total_insignias_totales = UsuarioInsignia.objects.count()
        total_actividades_totales = ActividadUsuario.objects.filter(estado='validada').count()
        comunidad_top = max(comunidades_conteo.items(), key=lambda x: x[1])[0] if comunidades_conteo else 'Coracora'

        resp = Response({
            'estadisticas': {
                'total_voluntarios_reconocidos': len(ranking),
                'total_insignias_otorgadas': total_insignias_totales,
                'total_actividades_validadas': total_actividades_totales,
                'comunidad_mas_comprometida': comunidad_top,
                'actualizado_en': ahora.strftime('%Y-%m-%d %H:%M:%S')
            },
            'ranking': ranking,
            'catalogo_insignias': catalogo,
            'muro_reciente': muro_feed
        })
        resp['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        resp['Pragma'] = 'no-cache'
        return resp

    @action(detail=False, methods=['post'], url_path='otorgar-insignia')
    def otorgar_insignia(self, request):
        """
        Permite a un operador del Centro de Mando otorgar manualmente
        una insignia honorífica a un voluntario o brigadista.
        Si el usuario ya poseía la insignia, se registra una reiteración
        de mérito con puntaje adicional y actualización de fecha en el muro.
        """
        id_usuario = request.data.get('id_usuario')
        codigo_insignia = request.data.get('codigo_insignia')
        motivo = request.data.get('motivo', 'Reconocimiento honorífico por destacada labor comunal con WillAI.')

        if not id_usuario or not codigo_insignia:
            return Response(
                {'error': 'Debe especificar id_usuario y codigo_insignia.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = Usuario.objects.get(id_usuario=id_usuario)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            insignia = Insignia.objects.get(codigo=codigo_insignia, activa=True)
        except Insignia.DoesNotExist:
            return Response({'error': f"Insignia '{codigo_insignia}' no existe o no está activa."}, status=status.HTTP_404_NOT_FOUND)

        operador = request.user if request.user.is_authenticated else None
        puntos_insignia = (insignia.criterio or {}).get('puntos', 50)

        ui_existente = UsuarioInsignia.objects.filter(usuario=user, insignia=insignia).first()

        if ui_existente:
            # Ya posee la insignia: registrar nueva distinción/reiteración en actividades comunitarias (+30 pts)
            # y actualizar desbloqueada_en para que suba a la cima del muro
            actividad = ActividadUsuario.objects.create(
                usuario=user,
                tipo_actividad='reiteracion_insignia',
                evidencia_referencia=f"Reiteración de mérito: {insignia.nombre} — {motivo}",
                ocurrida_en=timezone.now(),
                estado='validada',
                validada_por=operador,
                validada_en=timezone.now()
            )
            ui_existente.desbloqueada_en = timezone.now()
            ui_existente.otorgada_por = operador
            ui_existente.actividad_desbloqueo = actividad
            ui_existente.save(update_fields=['desbloqueada_en', 'otorgada_por', 'actividad_desbloqueo'])

            puntos_sumados = 30
            mensaje = f"¡Mérito '{insignia.nombre}' reiterado con éxito a {user.nombre_visible or user.username}! Se sumaron +30 puntos de actividad comunal."
            desbloqueada_str = ui_existente.desbloqueada_en.strftime('%Y-%m-%d %H:%M')
        else:
            # Primera vez que obtiene esta insignia
            actividad = ActividadUsuario.objects.create(
                usuario=user,
                tipo_actividad='reconocimiento_manual',
                evidencia_referencia=motivo,
                ocurrida_en=timezone.now(),
                estado='validada',
                validada_por=operador,
                validada_en=timezone.now()
            )

            ui = UsuarioInsignia.objects.create(
                usuario=user,
                insignia=insignia,
                actividad_desbloqueo=actividad,
                otorgada_por=operador
            )
            puntos_sumados = puntos_insignia + 30
            mensaje = f"Insignia '{insignia.nombre}' otorgada con éxito a {user.nombre_visible or user.username} (+{puntos_sumados} pts)."
            desbloqueada_str = ui.desbloqueada_en.strftime('%Y-%m-%d %H:%M')

        return Response({
            'status': 'ok',
            'mensaje': mensaje,
            'usuario': user.nombre_visible or user.username,
            'insignia': insignia.nombre,
            'puntos_sumados': puntos_sumados,
            'desbloqueada_en': desbloqueada_str
        }, status=status.HTTP_201_CREATED)


@extend_schema_view(
    list=extend_schema(summary="Listado de actividades comunales", tags=["Gamificación"]),
    create=extend_schema(summary="Registrar actividad preventiva o de apoyo comunal", tags=["Gamificación"]),
)
class ActividadUsuarioViewSet(viewsets.ModelViewSet):
    queryset = ActividadUsuario.objects.all().select_related('usuario', 'validada_por')
    serializer_class = ActividadUsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(usuario=user)

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)

    @action(detail=False, methods=['get'], url_path='mis-insignias')
    def mis_insignias(self, request):
        """Retorna las insignias desbloqueadas por el usuario actual"""
        insignias_usuario = UsuarioInsignia.objects.filter(
            usuario=request.user
        ).select_related('insignia', 'otorgada_por')
        serializer = UsuarioInsigniaSerializer(insignias_usuario, many=True)
        return Response(serializer.data)
