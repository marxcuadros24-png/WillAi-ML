import json
from .services import registrar_auditoria


class AuditLoggingMiddleware:
    """
    Middleware que audita automáticamente peticiones de modificación (POST, PUT, PATCH, DELETE)
    en las rutas de la API de WillAI.
    """
    CRITICAL_PREFIXES = [
        '/api/v1/incidentes/',
        '/api/v1/reportes/',
        '/api/v1/donaciones/',
        '/api/v1/alertas/',
        '/api/v1/respuesta/',
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Solo registrar mutaciones con éxito (2xx o 3xx)
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE'] and (200 <= response.status_code < 400):
            path = request.path
            for prefix in self.CRITICAL_PREFIXES:
                if path.startswith(prefix):
                    accion = f"HTTP_{request.method}"
                    entidad = prefix.strip('/').split('/')[-1]
                    detalles = {
                        'path': path,
                        'status_code': response.status_code,
                    }
                    registrar_auditoria(
                        accion=accion,
                        entidad=entidad,
                        id_registro=path,
                        request=request,
                        detalles=detalles
                    )
                    break

        return response
