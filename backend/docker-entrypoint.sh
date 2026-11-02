#!/bin/bash
set -e

echo "=================================================="
echo "  Iniciando WillAI Backend (Coracora, Ayacucho)   "
echo "=================================================="

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-alerta_incendios_coracora}"

echo "[1/4] Verificando conexion con base de datos PostgreSQL/PostGIS ($DB_HOST:$DB_PORT)..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; do
    echo "  PostgreSQL no disponible todavia. Esperando 1 segundo..."
    sleep 1
done
echo "  PostgreSQL esta listo y respondiendo."

echo "[2/4] Ejecutando migraciones del esquema de base de datos..."
python manage.py migrate --noinput

echo "[3/4] Verificando datos operacionales iniciales..."
python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.usuarios.models import Usuario
from django.core.management import call_command

if not Usuario.objects.filter(is_superuser=True).exists():
    print('  Base de datos vacia detectada. Sembrando datos operacionales...')
    try:
        call_command('seed_base')
        call_command('seed_operativo')
        call_command('seed_insignias')
        call_command('seed_gamificacion')
        print('  Datos base y operacionales sembrados con exito.')
    except Exception as e:
        print(f'  Aviso sembrando datos: {e}')
else:
    print('  Superusuario y datos existentes confirmados.')
"

echo "[4/4] Recolectando archivos estaticos para Admin y Swagger..."
python manage.py collectstatic --noinput

echo "=================================================="
echo "  Servidor WillAI listo. Ejecutando proceso: $@    "
echo "=================================================="

exec "$@"
