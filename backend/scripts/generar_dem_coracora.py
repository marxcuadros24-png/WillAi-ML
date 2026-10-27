"""
Script de descarga y recorte del Modelo Digital de Elevación (DEM) Copernicus GLO-30
para el distrito de Coracora y la provincia de Parinacochas, Ayacucho, Perú.
Reproyectado a UTM Zona 18 Sur (EPSG:32718) a 30m de resolución espacial.
"""
import os
import sys
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import from_bounds
from rasterio.warp import calculate_default_transform, reproject, Resampling, transform
from rasterio.transform import from_origin

def generar_dem_coracora():
    # Rutas de destino
    backend_dir = Path(__file__).resolve().parent.parent
    root_dir = backend_dir.parent

    out_dirs = [
        root_dir / "data",
        backend_dir / "data"
    ]
    for d in out_dirs:
        d.mkdir(parents=True, exist_ok=True)

    target_files = [d / "coracora_dem_utm18s.tif" for d in out_dirs]

    print("Iniciando extracción de Copernicus DEM GLO-30 para Coracora/Parinacochas...")

    # Bounding box en WGS84 para cubrir Coracora y Parinacochas
    # Coracora: lat -15.0189, lon -73.7806
    west = -74.00
    east = -73.55
    south = -15.25
    north = -14.80

    url_s = "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_S16_00_W074_00_DEM/Copernicus_DSM_COG_10_S16_00_W074_00_DEM.tif"
    url_n = "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_S15_00_W074_00_DEM/Copernicus_DSM_COG_10_S15_00_W074_00_DEM.tif"

    print("Leyendo COG Copernicus DEM desde AWS S3...")
    with rasterio.open(url_s) as src_s, rasterio.open(url_n) as src_n:
        # Ventana sur: south a -15.00
        win_s = from_bounds(west, south, east, -15.00, src_s.transform)
        data_s = src_s.read(1, window=win_s)
        trans_s = rasterio.windows.transform(win_s, src_s.transform)

        # Ventana norte: -15.00 a north
        win_n = from_bounds(west, -15.00, east, north, src_n.transform)
        data_n = src_n.read(1, window=win_n)
        trans_n = rasterio.windows.transform(win_n, src_n.transform)

        # Mosaico vertical: data_n arriba (norte), data_s abajo (sur)
        # Asegurar coincidencia de columnas
        min_cols = min(data_n.shape[1], data_s.shape[1])
        data_n = data_n[:, :min_cols]
        data_s = data_s[:, :min_cols]
        mosaic_data = np.vstack([data_n, data_s]).astype(np.float32)

        mosaic_transform = from_origin(
            west, north,
            src_s.transform.a, -src_s.transform.e
        )

        h, w = mosaic_data.shape
        print(f"Mosaico WGS84 creado: {w}x{h} píxeles, elevación min: {mosaic_data.min():.1f}m, max: {mosaic_data.max():.1f}m")

    # Reproyectar a UTM 18S (EPSG:32718) a 30m
    print("Reproyectando a UTM Zona 18 Sur (EPSG:32718) a 30m de resolución...")
    dst_crs = "EPSG:32718"

    # Calcular dimensiones y transformación de destino
    # Obtener esquinas en UTM
    xs, ys = transform("EPSG:4326", dst_crs, [west, east, west, east], [south, south, north, north])
    dst_xmin = min(xs)
    dst_xmax = max(xs)
    dst_ymin = min(ys)
    dst_ymax = max(ys)

    resolucion = 30.0
    dst_width = int(np.ceil((dst_xmax - dst_xmin) / resolucion))
    dst_height = int(np.ceil((dst_ymax - dst_ymin) / resolucion))
    dst_transform = from_origin(dst_xmin, dst_ymax, resolucion, resolucion)

    dst_array = np.full((dst_height, dst_width), -9999.0, dtype=np.float32)

    reproject(
        source=mosaic_data,
        destination=dst_array,
        src_transform=mosaic_transform,
        src_crs="EPSG:4326",
        dst_transform=dst_transform,
        dst_crs=dst_crs,
        resampling=Resampling.bilinear,
        dst_nodata=-9999.0,
    )

    valid_mask = dst_array != -9999.0
    print(f"Raster UTM 18S generado: {dst_width}x{dst_height} celdas (30m).")
    print(f"Elevación válida: {dst_array[valid_mask].min():.1f}m a {dst_array[valid_mask].max():.1f}m")

    # Guardar en GeoTIFF comprimido (DEFLATE)
    meta = {
        "driver": "GTiff",
        "dtype": "float32",
        "nodata": -9999.0,
        "width": dst_width,
        "height": dst_height,
        "count": 1,
        "crs": dst_crs,
        "transform": dst_transform,
        "compress": "deflate",
    }

    for target in target_files:
        with rasterio.open(target, "w", **meta) as dst:
            dst.write(dst_array, 1)
        print(f"Guardado exitosamente: {target} ({target.stat().st_size / 1024 / 1024:.2f} MB)")

if __name__ == "__main__":
    generar_dem_coracora()
