"""
Capa de compatibilidad GeoDjango / PostGIS resiliente para WillAI.
Permite operar transparentemente tanto en entornos PostGIS nativos (Docker / Producción)
como en entornos locales donde la extensión C de PostGIS no se encuentre instalada en PostgreSQL.
"""
import logging
from django.contrib.gis.db.backends.postgis.base import DatabaseWrapper as PostGISDatabaseWrapper
from django.contrib.gis.db.backends.postgis.operations import PostGISOperations
from django.contrib.gis.db.backends.postgis.schema import PostGISSchemaEditor
from django.contrib.gis.db.models.fields import GeometryField
from django.contrib.gis.geos import Point, MultiPolygon, Polygon, GEOSGeometry

logger = logging.getLogger(__name__)


def is_postgis_available(connection):
    """Verifica si la extensión postgis está instalada en el PostgreSQL actual."""
    if not hasattr(connection, '_has_postgis'):
        try:
            with connection.cursor() as cur:
                cur.execute("SELECT 1 FROM pg_extension WHERE extname = 'postgis'")
                connection._has_postgis = bool(cur.fetchone())
        except Exception:
            connection._has_postgis = False
    return connection._has_postgis


# 1. Manejo seguro de prepare_database (sin fallar si postgis no existe en host)
_orig_prepare_database = PostGISDatabaseWrapper.prepare_database

def _safe_prepare_database(self):
    super(PostGISDatabaseWrapper, self).prepare_database()
    with self.cursor() as cursor:
        try:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis")
            self._has_postgis = True
        except Exception:
            self._has_postgis = False
            logger.warning("PostGIS no está disponible en este servidor PostgreSQL; usando modo EWKT compatible.")

PostGISDatabaseWrapper.prepare_database = _safe_prepare_database


# 2. Versión segura de PostGIS para SchemaEditor
_orig_postgis_lib_version = PostGISOperations.postgis_lib_version

def _safe_postgis_lib_version(self):
    try:
        with self.connection.cursor() as cursor:
            cursor.execute("SELECT postgis_lib_version()")
            row = cursor.fetchone()
            if row:
                return row[0]
    except Exception:
        pass
    return "3.4.0"

PostGISOperations.postgis_lib_version = _safe_postgis_lib_version


# 3. Tipo de columna: nativo 'geometry' o fallback 'text'
_orig_geo_db_type = PostGISOperations.geo_db_type

def _safe_geo_db_type(self, f):
    if is_postgis_available(self.connection):
        return _orig_geo_db_type(self, f)
    return 'text'

PostGISOperations.geo_db_type = _safe_geo_db_type


# 4. Placeholder SQL para inserción de geometrías
_orig_get_geom_placeholder = PostGISOperations.get_geom_placeholder

def _safe_get_geom_placeholder(self, f, value, compiler):
    if not is_postgis_available(self.connection):
        return '%s'
    return _orig_get_geom_placeholder(self, f, value, compiler)

PostGISOperations.get_geom_placeholder = _safe_get_geom_placeholder


# 5. Serialización de geometrías a la BD como HexEWKB
_orig_get_db_prep_value = GeometryField.get_db_prep_value

def _safe_get_db_prep_value(self, value, connection, prepared=False):
    if not is_postgis_available(connection):
        if value is None:
            return None
        if isinstance(value, str):
            return value
        if hasattr(value, 'hexewkb'):
            h = value.hexewkb
            return h.decode('ascii') if isinstance(h, bytes) else str(h)
        return str(value)
    return _orig_get_db_prep_value(self, value, connection, prepared=prepared)

GeometryField.get_db_prep_value = _safe_get_db_prep_value


# 6. Deserialización de geometrías desde la BD
_orig_get_db_converters = GeometryField.get_db_converters

def _safe_get_db_converters(self, connection):
    converters = _orig_get_db_converters(self, connection)
    if not is_postgis_available(connection):
        converters.append(lambda value, expression, conn: self.to_python(value) if value is not None else None)
    return converters

GeometryField.get_db_converters = _safe_get_db_converters


# 7. No crear índices espaciales si PostGIS no está disponible
_orig_field_should_be_indexed = PostGISSchemaEditor._field_should_be_indexed

def _safe_field_should_be_indexed(self, model, field):
    if not is_postgis_available(self.connection):
        if getattr(field, "spatial_index", False) or hasattr(field, "geodetic"):
            return False
    return _orig_field_should_be_indexed(self, model, field)

PostGISSchemaEditor._field_should_be_indexed = _safe_field_should_be_indexed
