# Contexto Permanente del Proyecto WillAI para Agentes

Al interactuar con este repositorio, ten en cuenta las siguientes directrices y decisiones arquitectónicas:

1. **Stack Tecnológico:**
   - Backend Django 5.1 con DRF en la carpeta `backend/`.
   - Entorno virtual en `backend/.venv`.
   - PostgreSQL en puerto 5432 (base de datos `alerta_incendios_coracora`).
   - El frontend web es **exclusivamente para administradores/operadores** (Django Admin + Leaflet).
   - La app móvil (React Native) es la interfaz principal para todos los usuarios.

2. **APIs Externas Configuradas:**
   - NASA FIRMS: MAP_KEY activa en `backend/.env` (`a84d23a9aab653f18f15991290bd093e`).
   - SERFOR Perú: ArcGIS MapServer de focos de calor oficial.
   - Open-Meteo: Coordenadas Coracora (`-15.0189, -73.7806`).

3. **Cálculo FWI:**
   - Implementado en Python puro en `backend/apps/predicciones/fwi.py`. No requiere microservicios ni compiladores binarios.

4. **Documentación del Estado:**
   - La hoja de ruta viva está en `AGENTS.md` (en la raíz) y en el Plan Maestro.
