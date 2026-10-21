from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Rol, Permiso

User = get_user_model()


class PermisoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permiso
        fields = ['id_permiso', 'codigo', 'descripcion']


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['id_rol', 'codigo', 'nombre', 'descripcion', 'sistema']


class UsuarioPublicoSerializer(serializers.ModelSerializer):
    roles = RolSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['uuid', 'username', 'nombre_visible', 'roles', 'estado', 'creado_en']


class UsuarioDetalleSerializer(serializers.ModelSerializer):
    roles = RolSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id_usuario',
            'uuid',
            'username',
            'first_name',
            'last_name',
            'nombre_visible',
            'email',
            'telefono',
            'estado',
            'verificado_en',
            'ultimo_acceso_en',
            'roles',
            'is_staff',
            'creado_en',
        ]
        read_only_fields = ['id_usuario', 'uuid', 'creado_en', 'ultimo_acceso_en']


class RegistroCiudadanoSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'username',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'nombre_visible',
            'email',
            'telefono',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')

        if not validated_data.get('nombre_visible'):
            first = validated_data.get('first_name', '')
            last = validated_data.get('last_name', '')
            validated_data['nombre_visible'] = f"{first} {last}".strip() or validated_data['username']

        user = User.objects.create_user(password=password, **validated_data)

        # Asignar rol poblador por defecto al registrarse
        rol_poblador = Rol.objects.filter(codigo='poblador').first()
        if rol_poblador:
            user.roles.add(rol_poblador)

        return user
