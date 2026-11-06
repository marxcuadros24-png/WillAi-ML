import os
import shutil
import subprocess
import logging

logger = logging.getLogger(__name__)


def optimizar_video_evidencia(id_evidencia: int) -> bool:
    """
    Optimiza el archivo de video de una evidencia táctica para el Centro de Mando Web:
    1. Remueve la pista de audio (-an) para reproducción silenciosa en el panel.
    2. Limita la duración a máximo 15 segundos (-t 15).
    3. Escala a 480p (-vf 'scale=-2:480') manteniendo relación de aspecto y dimensiones pares.
    4. Comprime con H.264 ultra-eficiente (-c:v libx264 -crf 28 -preset veryfast -pix_fmt yuv420p).
    5. Optimiza metadatos para streaming web instantáneo (-movflags +faststart).
    6. Reemplaza el archivo original en disco y actualiza tamano_bytes en PostgreSQL.
    """
    from apps.reportes.models import Evidencia

    try:
        ev = Evidencia.objects.filter(id_evidencia=id_evidencia, tipo=Evidencia.TipoEvidencia.VIDEO).first()
        if not ev or not ev.archivo:
            return False

        input_path = ev.archivo.path
        if not os.path.exists(input_path):
            logger.warning(f"[optimizar_video_evidencia] Archivo no existe en disco: {input_path}")
            return False

        original_size = os.path.getsize(input_path)
        dir_name = os.path.dirname(input_path)
        base_name = os.path.basename(input_path)
        temp_output_path = os.path.join(dir_name, f"opt_{base_name}.mp4")

        cmd = [
            'ffmpeg',
            '-y',
            '-i', input_path,
            '-t', '15',
            '-an',
            '-vf', 'scale=-2:480',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '28',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            temp_output_path
        ]

        logger.info(f"[optimizar_video_evidencia] Optimizando Evidencia #{id_evidencia} ({original_size / 1024:.1f} KB)...")
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=45
        )

        if result.returncode != 0:
            logger.warning(f"[optimizar_video_evidencia] ffmpeg falló (código {result.returncode}): {result.stderr[-300:]}")
            if os.path.exists(temp_output_path):
                try:
                    os.remove(temp_output_path)
                except OSError:
                    pass
            return False

        if os.path.exists(temp_output_path) and os.path.getsize(temp_output_path) > 0:
            new_size = os.path.getsize(temp_output_path)
            shutil.move(temp_output_path, input_path)
            ev.tamano_bytes = new_size
            ev.mime_type = 'video/mp4'
            ev.save(update_fields=['tamano_bytes', 'mime_type'])
            logger.info(
                f"[optimizar_video_evidencia] Evidencia #{id_evidencia} optimizada: "
                f"{original_size / 1024:.1f} KB -> {new_size / 1024:.1f} KB "
                f"(-{((original_size - new_size) / max(original_size, 1)) * 100:.1f}%)"
            )
            return True
        else:
            logger.warning("[optimizar_video_evidencia] Archivo optimizado no generado o vacío.")
            return False

    except FileNotFoundError:
        logger.warning("[optimizar_video_evidencia] Binario ffmpeg no disponible en el entorno.")
        return False
    except subprocess.TimeoutExpired:
        logger.warning(f"[optimizar_video_evidencia] Timeout de ffmpeg (45s) en Evidencia #{id_evidencia}")
        return False
    except Exception as e:
        logger.error(f"[optimizar_video_evidencia] Error optimizando video #{id_evidencia}: {e}", exc_info=True)
        return False

