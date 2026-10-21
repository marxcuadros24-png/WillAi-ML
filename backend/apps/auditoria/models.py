import hashlib
from django.db import models
from django.conf import settings


def hash_ip(ip_address: str) -> str:
    """Calcula el hash SHA-256 anónimo de una dirección IP"""
    if not ip_address:
        return ""
    # Se agrega una sal fija de sistema para evitar ataques de diccionario sobre IPs comunes
    salt = getattr(settings, 'SECRET_KEY', 'willai_audit_salt')
    return hashlib.sha256(f"{salt}_{ip_address}".encode('utf-8')).hexdigest()


class Auditoria(models.Model):
    id_auditoria = models.BigAutoField(primary_key=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='registros_auditoria',
        db_column='id_usuario'
    )
    accion = models.CharField(max_length=100, help_text="Ej: CREAR_INCIDENTE, DESPACHAR_BRIGADA, VALIDAR_REPORTE")
    entidad = models.CharField(max_length=100, help_text="Ej: Incidente, Reporte, Brigada, Donacion")
    id_registro = models.CharField(max_length=100, null=True, blank=True)
    ip_hash = models.CharField(max_length=64, null=True, blank=True, help_text="Hash SHA-256 de la IP")
    detalles = models.JSONField(null=True, blank=True)
    ocurrido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'auditoria'
        verbose_name = 'Registro de Auditoría'
        verbose_name_plural = 'Auditoría Forense'
        indexes = [
            models.Index(fields=['entidad', 'ocurrido_en'], name='idx_audit_ent_fecha'),
            models.Index(fields=['usuario', 'ocurrido_en'], name='idx_audit_usr_fecha'),
        ]
        ordering = ['-ocurrido_en']

    def __str__(self):
        usr = self.usuario.username if self.usuario else "Sistema/Anónimo"
        return f"[{self.ocurrido_en:%Y-%m-%d %H:%M}] {usr} -> {self.accion} ({self.entidad}:{self.id_registro})"
