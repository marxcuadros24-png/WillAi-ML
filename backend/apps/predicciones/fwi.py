"""
Implementación en Python puro del Sistema Canadiense de Índice de Peligro de Incendios Forestales
(Canadian Forest Fire Weather Index - FWI System / Van Wagner & Pickett, 1985 / Lawson & Armitage, 2008).

Sin dependencias externas binarias. 100% compatible con cualquier sistema operativo.
"""
import math


def calcular_ffmc(temp: float, rh: float, wind: float, rain: float, ffmc_prev: float = 85.0) -> float:
    """
    Calcula el Fine Fuel Moisture Code (FFMC) - Humedad de combustibles finos superficiales.
    """
    rh = max(0.0, min(100.0, rh))
    # Contenido de humedad previo del combustible
    w_o = 147.2 * (101.0 - ffmc_prev) / (59.5 + ffmc_prev)

    # Efecto de la lluvia
    if rain > 0.5:
        r_f = rain - 0.5
        if w_o > 150.0:
            mr = w_o + 42.5 * r_f * math.exp(-100.0 / (251.0 - w_o)) * (1.0 - math.exp(-6.93 / r_f)) + (0.0015 * (w_o - 150.0) ** 2) * math.sqrt(r_f)
        else:
            mr = w_o + 42.5 * r_f * math.exp(-100.0 / (251.0 - w_o)) * (1.0 - math.exp(-6.93 / r_f))
        mr = min(250.0, mr)
        w_o = mr

    # Humedad de equilibrio de secado (Ed) y humectación (Ew)
    ed = 0.942 * (rh ** 0.679) + (11.0 * math.exp((rh - 100.0) / 10.0)) + 0.18 * (21.1 - temp) * (1.0 - math.exp(-0.115 * rh))
    ew = 0.618 * (rh ** 0.753) + (10.0 * math.exp((rh - 100.0) / 10.0)) + 0.18 * (21.1 - temp) * (1.0 - math.exp(-0.115 * rh))

    if w_o > ed:
        # Proceso de secado
        k0 = 0.424 * (1.0 - ((rh / 100.0) ** 1.7)) + (0.0694 * math.sqrt(wind)) * (1.0 - ((rh / 100.0) ** 8.0))
        kd = k0 * 0.581 * math.exp(0.0365 * temp)
        m = ed + (w_o - ed) * (10.0 ** (-kd))
    elif w_o < ew:
        # Proceso de humectación
        k1 = 0.424 * (1.0 - (((100.0 - rh) / 100.0) ** 1.7)) + (0.0694 * math.sqrt(wind)) * (1.0 - (((100.0 - rh) / 100.0) ** 8.0))
        kw = k1 * 0.581 * math.exp(0.0365 * temp)
        m = ew - (ew - w_o) * (10.0 ** (-kw))
    else:
        m = w_o

    m = max(0.0, min(250.0, m))
    ffmc = (59.5 * (250.0 - m)) / (147.2 + m)
    return max(0.0, min(101.0, ffmc))


def calcular_dmc(temp: float, rh: float, rain: float, month: int, lat: float = -15.02, dmc_prev: float = 6.0) -> float:
    """
    Calcula el Duff Moisture Code (DMC) - Humedad de la capa orgánica media.
    Ajustado para hemisferio sur (Perú) en longitud del día efectiva.
    """
    # Factor de duración del día efectivo (Le) para hemisferio sur (lat < 0)
    # Tabla estándar FWI para hemisferio sur por mes (enero a diciembre)
    le_south = [11.5, 10.5, 9.2, 7.9, 6.8, 6.2, 6.5, 7.4, 8.7, 10.0, 11.2, 11.8]
    le = le_south[month - 1] if 1 <= month <= 12 else 9.0

    if rain > 1.5:
        r_e = 0.92 * rain - 1.27
        m_o = 20.0 + math.exp(5.6348 - (dmc_prev / 43.43))
        if dmc_prev <= 33.0:
            b = 100.0 / (0.5 + 0.3 * dmc_prev)
        elif dmc_prev <= 65.0:
            b = 14.0 - 1.3 * math.log(dmc_prev)
        else:
            b = 6.2 * math.log(dmc_prev) - 17.2
        m_r = m_o + (1000.0 * r_e) / (48.77 + b * r_e)
        dmc_prev = 244.72 - 43.43 * math.log(max(1.0, m_r - 20.0))
        dmc_prev = max(0.0, dmc_prev)

    t = max(-1.1, temp)
    rk = 1.894 * (t + 1.1) * (100.0 - rh) * le * 1e-4
    dmc = dmc_prev + rk
    return max(0.0, dmc)


def calcular_dc(temp: float, rain: float, month: int, lat: float = -15.02, dc_prev: float = 15.0) -> float:
    """
    Calcula el Drought Code (DC) - Índice de sequía profunda del suelo.
    """
    # Longitud de día estacional (Lf) para hemisferio sur
    lf_south = [6.4, 5.0, 2.4, 0.4, -1.6, -1.6, -1.6, -1.6, -1.6, 0.9, 3.8, 5.8]
    lf = lf_south[month - 1] if 1 <= month <= 12 else 1.0

    if rain > 2.8:
        r_d = 0.83 * rain - 1.27
        q_o = 800.0 * math.exp(-dc_prev / 400.0)
        q_r = q_o + 3.937 * r_d
        dc_prev = 400.0 * math.log(max(1.0, 800.0 / max(1.0, q_r)))
        dc_prev = max(0.0, dc_prev)

    t = max(-2.8, temp)
    v = 0.36 * (t + 2.8) + lf
    v = max(0.0, v)
    dc = dc_prev + 0.5 * v
    return max(0.0, dc)


def calcular_isi(wind: float, ffmc: float) -> float:
    """
    Calcula el Initial Spread Index (ISI) - Tasa de propagación inicial por viento.
    """
    f_wind = math.exp(0.05039 * wind)
    m = 147.2 * (101.0 - ffmc) / (59.5 + ffmc)
    f_f = 91.9 * math.exp(-0.1386 * m) * (1.0 + (m ** 5.31) / (4.93e7))
    isi = 0.208 * f_wind * f_f
    return max(0.0, isi)


def calcular_bui(dmc: float, dc: float) -> float:
    """
    Calcula el Buildup Index (BUI) - Combustible total disponible.
    """
    if dmc <= 0.4 * dc:
        bui = (0.8 * dmc * dc) / (dmc + 0.4 * dc + 1e-6)
    else:
        bui = dmc - (1.0 - (0.8 * dc) / (dmc + 0.4 * dc + 1e-6)) * (0.92 + (0.0114 * dmc) ** 1.7)
    return max(0.0, bui)


def calcular_fwi(isi: float, bui: float) -> float:
    """
    Calcula el Fire Weather Index (FWI) final.
    """
    if bui <= 80.0:
        b = 0.1 * isi * (0.626 * (bui ** 0.809) + 2.0)
    else:
        b = 0.1 * isi * (1000.0 / (25.0 + 108.64 * math.exp(-0.023 * bui)))

    if b > 1.0:
        fwi = math.exp(2.72 + 0.434 * math.log(b))
    else:
        fwi = b
    return max(0.0, fwi)


def clasificar_nivel_peligro(fwi: float) -> str:
    """
    Clasifica el nivel de riesgo de incendio según escala estándar FWI:
    - Bajo: < 5.2
    - Moderado: 5.2 - 11.2
    - Alto: 11.2 - 21.3
    - Crítico / Extremo: >= 21.3
    """
    if fwi < 5.2:
        return 'bajo'
    elif fwi < 11.2:
        return 'moderado'
    elif fwi < 21.3:
        return 'alto'
    else:
        return 'critico'


def calcular_sistema_fwi_completo(temp: float, rh: float, wind: float, rain: float, month: int, lat: float = -15.02,
                                  ffmc_prev: float = 85.0, dmc_prev: float = 6.0, dc_prev: float = 15.0) -> dict:
    """
    Ejecuta el cálculo completo de los 6 índices del sistema FWI canadiense.
    """
    ffmc = calcular_ffmc(temp, rh, wind, rain, ffmc_prev)
    dmc = calcular_dmc(temp, rh, rain, month, lat, dmc_prev)
    dc = calcular_dc(temp, rain, month, lat, dc_prev)
    isi = calcular_isi(wind, ffmc)
    bui = calcular_bui(dmc, dc)
    fwi = calcular_fwi(isi, bui)
    nivel = clasificar_nivel_peligro(fwi)

    return {
        'ffmc': round(ffmc, 2),
        'dmc': round(dmc, 2),
        'dc': round(dc, 2),
        'isi': round(isi, 2),
        'bui': round(bui, 2),
        'fwi': round(fwi, 2),
        'nivel_peligro': nivel,
    }
