export type Idioma = 'es' | 'qu';

export interface Translations {
  // App General
  app_name: string;
  app_subtitle: string;
  lang_es: string;
  lang_qu: string;

  // Login & Acceso Operativo
  login_title: string;
  login_subtitle: string;
  role_brigadista: string;
  role_poblador: string;
  btn_biometric: string;
  btn_google: string;
  btn_emergency_fast: string;
  btn_emergency_fast_sub: string;
  satellite_sync_active: string;

  // Estado de Conexión
  status_online: string;
  status_offline: string;
  offline_mode: string;
  pending_reports_counter: string;
  syncing_now: string;
  all_synced: string;

  // Peligro FWI & Meteo
  fwi_title: string;
  fwi_level: string;
  danger_low: string;
  danger_moderate: string;
  danger_high: string;
  danger_critical: string;
  temp: string;
  wind: string;
  humidity: string;

  // Advertencias de Seguridad Andina
  safety_title: string;
  do_not_climb: string;
  do_not_climb_desc: string;
  alert_uncertainty: string;
  uncertainty_desc: string;

  // Mapa Táctico & Simulación
  map_title: string;
  map_focos_activos: string;
  map_simulacion_viento: string;
  map_isocronas: string;
  map_nearest_fire: string;
  map_escape_route: string;
  map_escape_route_desc: string;
  map_escape_warning: string;
  map_brigades_active: string;
  map_water_dropped: string;

  // Reporte con Cámara & Vision Scan
  btn_report_fire: string;
  btn_report_subtitle: string;
  report_title: string;
  camera_hud_scan: string;
  smoke_density: string;
  severity_estimated: string;
  azimuth_heading: string;
  distance_optical: string;
  viviendas_500m: string;
  viviendas_500m_desc: string;
  area_scale: string;
  voice_note: string;
  voice_note_placeholder: string;
  btn_dispatch_urgent: string;

  // Tipos de Fuego & Combustible
  fire_wildfire: string;
  fire_wildfire_desc: string;
  fire_controlled: string;
  fire_controlled_desc: string;
  fuel_ichu: string;
  fuel_matorral: string;
  fuel_bofedal: string;
  fuel_cultivo: string;

  // Ubicación GPS
  gps_capturing: string;
  gps_ready: string;
  gps_accuracy: string;
  gps_heading: string;
  gps_retry: string;

  // Envío
  btn_send_report: string;
  btn_cancel: string;
  report_sent_online: string;
  report_saved_offline: string;
  report_offline_explanation: string;

  // Centro de Notificaciones & Alertas
  alerts_title: string;
  alerts_empty: string;
  alert_red_banner: string;
  alert_red_banner_desc: string;
  btn_i_am_safe: string;
  i_am_safe_confirmed: string;
  air_quality: string;
  georadar_title: string;
  georadar_radius: string;
  operator_verified: string;
  satellite_auto: string;
  pending_verification: string;
  confirm_read: string;
  alert_read: string;

  // Perfil & Insignias
  profile_title: string;
  profile_rank: string;
  profile_xp: string;
  badges_title: string;
  telemetry_title: string;
  hectares_protected: string;
  co2_avoided: string;
  credential_title: string;
  credential_verified: string;
  btn_siren_alarm: string;
  siren_active: string;

  // Registro & Edición de Perfil
  register_title: string;
  register_subtitle: string;
  btn_create_account: string;
  btn_go_to_login: string;
  btn_go_to_register: string;
  field_first_name: string;
  field_last_name: string;
  field_username: string;
  field_phone: string;
  field_email: string;
  field_password: string;
  field_password_confirm: string;
  field_community: string;
  btn_edit_profile: string;
  btn_save_changes: string;
  profile_updated_success: string;
  my_badges_title: string;
  badges_unlocked: string;
  badges_locked: string;

  // Navegación
  nav_home: string;
  nav_map: string;
  nav_report: string;
  nav_alerts: string;
  nav_profile: string;
}

export const DICCIONARIO: Record<Idioma, Translations> = {
  es: {
    app_name: 'WillAI Coracora',
    app_subtitle: 'Alerta Temprana de Incendios • Parinacochas',
    lang_es: 'ES',
    lang_qu: 'QU',

    login_title: 'Centro de Mando Operativo',
    login_subtitle: 'Sistema Satelital Copernicus & NASA FIRMS',
    role_brigadista: 'Brigadista Forestal',
    role_poblador: 'Poblador / Guardián',
    btn_biometric: 'Ingresar con Biometría (Huella / Rostro)',
    btn_google: 'Continuar con Google',
    btn_emergency_fast: '🚨 REPORTE DE EMERGENCIA (SIN REGISTRO)',
    btn_emergency_fast_sub: 'Cualquier ciudadano puede reportar un fuego activo al instante con GPS',
    satellite_sync_active: 'Satélites Copernicus & NASA FIRMS Sincronizados',

    status_online: 'Conectado a Red 4G/2G',
    status_offline: 'Sin Señal (Modo Offline SQLite)',
    offline_mode: 'Modo Sin Conexión',
    pending_reports_counter: '{count} reporte(s) en cola SQLite',
    syncing_now: 'Sincronizando reportes...',
    all_synced: 'Todos los reportes sincronizados',

    fwi_title: 'Índice Canadiense de Peligro FWI',
    fwi_level: 'Nivel Actual en Coracora',
    danger_low: 'BAJO',
    danger_moderate: 'MODERADO',
    danger_high: 'ALTO',
    danger_critical: 'CRÍTICO / EXTREMO',
    temp: 'Temperatura',
    wind: 'Viento',
    humidity: 'Humedad',

    safety_title: 'Norma de Seguridad Andina',
    do_not_climb: '¡No subas la ladera hacia el humo!',
    do_not_climb_desc: 'El fuego avanza hasta 4 veces más rápido cuesta arriba por convección térmica y viento de quebrada. Evacúa lateralmente hacia zonas sin pastizal.',
    alert_uncertainty: '⚠️ Alerta con margen de incertidumbre',
    uncertainty_desc: 'Detección satelital / modelo preliminar. Verificadores locales y brigadas están en camino a confirmar.',

    map_title: 'Mapa de Incidencias en Vivo',
    map_focos_activos: 'Focos Activos Satelitales',
    map_simulacion_viento: 'Propagación Elíptica por Viento (Cell2Fire)',
    map_isocronas: 'Frente 1h, 3h y 6h',
    map_nearest_fire: 'Foco Más Próximo',
    map_escape_route: 'Ruta Segura de Escape',
    map_escape_route_desc: 'Trayectoria contra el viento hacia quebrada rocosa sin combustible.',
    map_escape_warning: '⚠️ ¡Qata wichayman amapuni asuykuychu! Evacúa hacia la zona rocosa / quebrada sin ichu.',
    map_brigades_active: 'Brigadas Desplegadas',
    map_water_dropped: 'Agua y Retardante Lanzado',

    btn_report_fire: 'REPORTAR INCENDIO',
    btn_report_subtitle: 'Escaneo táctico WillAi Vision Scan + GPS',
    report_title: 'Reportar Incendio con IA y GPS',
    camera_hud_scan: 'WILLAI VISION SCAN v2.4 — ESCANEO TÁCTICO',
    smoke_density: 'Densidad de Humo',
    severity_estimated: 'Severidad Estimada',
    azimuth_heading: 'Rumbo Azimut',
    distance_optical: 'Distancia Óptica',
    viviendas_500m: 'Viviendas Rurales a < 500m',
    viviendas_500m_desc: 'Riesgo inminente de afectación habitacional en caserío',
    area_scale: 'Escala del Frente',
    voice_note: 'Dictado de Voz / Nota Rápida',
    voice_note_placeholder: 'Toca el micrófono o escribe una observación...',
    btn_dispatch_urgent: '🚨 DESPACHO URGENTE B-12 Y BOMBEROS',

    fire_wildfire: 'Incendio Descontrolado',
    fire_wildfire_desc: 'Fuego activo que avanza sin control',
    fire_controlled: 'Quema Agrícola Controlada',
    fire_controlled_desc: 'Rocería o limpieza de chacra con resguardo',
    fuel_ichu: 'Ichu / Pajonal Altoandino',
    fuel_matorral: 'Matorral / Tola',
    fuel_bofedal: 'Bofedal / Humedal',
    fuel_cultivo: 'Chacra / Rastrojo de Cultivo',

    gps_capturing: 'Buscando satélites GPS...',
    gps_ready: 'Coordenadas GPS fijadas',
    gps_accuracy: 'Precisión',
    gps_heading: 'Rumbo (Azimut)',
    gps_retry: 'Recalibrar GPS',

    btn_send_report: 'GUARDAR Y ENVIAR REPORTE',
    btn_cancel: 'Volver',
    report_sent_online: '¡Reporte recibido por el COEP Coracora!',
    report_saved_offline: '¡Reporte guardado en el teléfono!',
    report_offline_explanation: 'No tienes señal en este sector. Tu reporte quedó guardado de forma segura en la base de datos de tu teléfono y se enviará automáticamente cuando recuperes cobertura 2G o 4G.',

    alerts_title: 'Centro de Notificaciones y Alertas',
    alerts_empty: 'No hay alertas activas en tu sector.',
    alert_red_banner: '🔴 ALERTA ROJA REGIONAL: CORDILLERA PARINACOCHAS',
    alert_red_banner_desc: 'Viento 28 km/h, FWI Crítico (68.4). Se ordena extrema precaución en laderas de Coracora, Upahuacho y Chumpi.',
    btn_i_am_safe: '✅ Me encuentro a salvo',
    i_am_safe_confirmed: 'Estado confirmado: Persona a salvo en zona segura',
    air_quality: 'Calidad del Aire (PM 2.5)',
    georadar_title: 'Radio Georadar de Alertas',
    georadar_radius: 'Radio de Cobertura',
    operator_verified: 'Confirmado por Operador COEP',
    satellite_auto: 'Detección Satelital Automática VIIRS',
    pending_verification: 'Por Verificar en Terreno',
    confirm_read: 'Marcar como Leído',
    alert_read: 'Alerta Confirmada',

    profile_title: 'Perfil y Mérito Comunitario',
    profile_rank: 'Guardián Rango IV — Halcón Andino',
    profile_xp: 'Puntos Cívicos de Protección',
    badges_title: 'Colección de Insignias Tácticas',
    telemetry_title: 'Telemetría de Impacto Ambiental',
    hectares_protected: 'ha de Bosque Nativo e Ichu Resguardadas',
    co2_avoided: 'kg de CO₂ Evitado por Alerta Temprana',
    credential_title: 'Credencial Digital Oficial Verificada',
    credential_verified: 'Firma Criptográfica SHA-256 SERFOR / COEP',
    btn_siren_alarm: '🔔 ACTIVAR SIRENA DE EVACUACIÓN COMUNAL',
    siren_active: '¡Sirena comunal activada!',

    register_title: 'Crear Perfil Comunal',
    register_subtitle: 'Únete como poblador o brigadista para proteger Parinacochas',
    btn_create_account: 'CREAR MI PERFIL',
    btn_go_to_login: '¿Ya tienes una cuenta? Iniciar Sesión',
    btn_go_to_register: '¿No tienes cuenta? Crear Perfil',
    field_first_name: 'Nombres',
    field_last_name: 'Apellidos',
    field_username: 'Nombre de usuario',
    field_phone: 'Teléfono / Celular de contacto',
    field_email: 'Correo electrónico (opcional)',
    field_password: 'Contraseña segura',
    field_password_confirm: 'Confirmar contraseña',
    field_community: 'Comunidad o Sector',
    btn_edit_profile: 'Editar Mi Perfil',
    btn_save_changes: 'Guardar Cambios',
    profile_updated_success: '¡Perfil actualizado correctamente!',
    my_badges_title: 'Mis Insignias de Mérito',
    badges_unlocked: 'Insignias Desbloqueadas',
    badges_locked: 'Insignias por Desbloquear',

    nav_home: 'Inicio',
    nav_map: 'Mapa Vivo',
    nav_report: 'Reportar',
    nav_alerts: 'Alertas',
    nav_profile: 'Perfil'
  },

  qu: {
    app_name: 'WillAI Quracura',
    app_subtitle: 'Ninata Qawapayanapaq • Parinaqucha',
    lang_es: 'ES',
    lang_qu: 'QU',

    login_title: 'Kamachikuq Umalliq Wasi',
    login_subtitle: 'Copernicus & NASA FIRMS Quyllur Llikacha',
    role_brigadista: 'B-12 Nina Waqaychaq',
    role_poblador: 'Ayllu Runa / Guardián',
    btn_biometric: 'Ruk\'ana / Qawariqninwan Yaykuy',
    btn_google: 'Google Llikawan Yaykuy',
    btn_emergency_fast: '🚨 UTQAYLLA WILLAKUY (MANA QILLQAKUSPA)',
    btn_emergency_fast_sub: 'Mayqan llaqtamasipas GPS nisqawan ninata utqaylla willayta atin',
    satellite_sync_active: 'Copernicus & NASA FIRMS Quyllurkuna Tupanachisqa',

    status_online: 'Llikapi Tupanachisqa (4G/2G)',
    status_offline: 'Mana Llikayuq (SQLite Telefonopi)',
    offline_mode: 'Mana Internet Llikayuq',
    pending_reports_counter: '{count} willakuy(kuna) suyachkan',
    syncing_now: 'Willakuykuna apachikuchkan...',
    all_synced: 'Llapallan willakuykuna apachisqaña',

    fwi_title: 'FWI Nina Qallariy Tupuy',
    fwi_level: 'Quracurapi Nina Manchakuy Kunan',
    danger_low: 'PISI',
    danger_moderate: 'CHAWPI',
    danger_high: 'HATUN',
    danger_critical: 'ANCHA HATUN / SASA',
    temp: 'Rupay',
    wind: 'Wayra',
    humidity: 'Qapa / Mikhuy',

    safety_title: 'Apu Pachamama Kamachikuy',
    do_not_climb: '¡Qata wichayman amapuni asuykuychu!',
    do_not_climb_desc: 'Ninaqa wayra qallariptin qata wichayman tawa kutitaraq utqaylla phawan. Qusñimanqa ama wichaychu, kinraykama qispiy ichu mana kanchu chayman.',
    alert_uncertainty: '⚠️ Kay willakuyqa mana allinta chiqapchaqa kanmanchu',
    uncertainty_desc: 'Hawa pacha quyllur qawasqanmanta willakuy. Huñusqa runakunañam rispa chiqapchanqa.',

    map_title: 'Kunan Nina Kawsay Saywiti',
    map_focos_activos: 'Quyllurpa Qawasqan Ninakuna',
    map_simulacion_viento: 'Wayrawan Nina Phawaynin (Cell2Fire)',
    map_isocronas: '1h, 3h hinaspa 6h Chayaynin',
    map_nearest_fire: 'Aswan Sispa Nina',
    map_escape_route: 'Qispina Allin Ñan',
    map_escape_route_desc: 'Wayrapa contranman qaqakunaman qispina ñan, mana ichuyuq.',
    map_escape_warning: '⚠️ ¡Qata wichayman amapuni asuykuychu! Qaqa pampaman qispiykuychik.',
    map_brigades_active: 'Llamkachkaq Brigadakuna',
    map_water_dropped: 'Yaku Hich\'asqa',

    btn_report_fire: 'NINATA WILLAKUY',
    btn_report_subtitle: 'WillAi Vision Scan qaway + GPS',
    report_title: 'IA Quyllurwan hinaspa GPS-wan Willakuy',
    camera_hud_scan: 'WILLAI VISION SCAN v2.4 — TÁCTICO QAWAY',
    smoke_density: 'Qusñi Kanchaynin',
    severity_estimated: 'Nina Manchakuy Chani',
    azimuth_heading: 'Wayrapa Mayman Rinqan',
    distance_optical: 'Karu Kaynin',
    viviendas_500m: '500m sispallapi Wasikuna',
    viviendas_500m_desc: 'Ayllu wasikunapaq ancha hatun manchakuy',
    area_scale: 'Pampa Rupay Hatun Kaynin',
    voice_note: 'Kunkawan Willakuy / Rimay Qillqana',
    voice_note_placeholder: 'Micrófono ñit\'iy rimayta qallarinaykipaq...',
    btn_dispatch_urgent: '🚨 UTQAYLLA B-12 BOMBEROKUNAMAN WILLAY',

    fire_wildfire: 'Mana Kamachisqa Nina',
    fire_wildfire_desc: 'Sallqa nina maymanpas phawaq, mana amachasqa',
    fire_controlled: 'Kamachisqa Chakrawan Rupachiy',
    fire_controlled_desc: 'Chakrata qawariykuspa chhalla rupachiy',
    fuel_ichu: 'Ichu / Sallqa Pampa',
    fuel_matorral: 'Ch\'akillapa / T\'ula',
    fuel_bofedal: 'Uqhu / Bofedal Yaku Pampa',
    fuel_cultivo: 'Chakra / Mikuy Rastrojo',

    gps_capturing: 'GPS Quyllurkunata maskachkan...',
    gps_ready: 'Maypi kasqayki tarisqaña',
    gps_accuracy: 'Tupuy Chani',
    gps_heading: 'Wayrapa Mayman Rinqan',
    gps_retry: 'Wakmanta GPS maskay',

    btn_send_report: 'WILLAKUYTA TAQIKUY HINASPA APACHIY',
    btn_cancel: 'Kutiy',
    report_sent_online: '¡COEP Quracuraman willakuy chayasqaña!',
    report_saved_offline: '¡Willakuyqa telefonoykipi taqikusqaña!',
    report_offline_explanation: 'Kaypiqa manam llikachu kachkan. Willakusqaykiqa telefonoykipi allin waqaychasqam kachkan; signal 2G/4G chayamuptinlla kikillan apachikusunqa.',

    alerts_title: 'Ayllukunapaq Willakuykuna',
    alerts_empty: 'Manam ima manchakuypas kanchu kunanqa.',
    alert_red_banner: '🔴 PUKA WILLAKUY: PARINAQUCHA SALLQA PAMPAKUNA',
    alert_red_banner_desc: 'Wayra 28 km/h, FWI Ancha Hatun (68.4). Quracura, Upawachu, Chumpipi allinta qawakuychik.',
    btn_i_am_safe: '✅ Allinllampim kani / Qispiykuniñam',
    i_am_safe_confirmed: 'Chiqapchasqa: Runaqa allinllañam kachkan',
    air_quality: 'Wayra Qapa Kaynin (PM 2.5)',
    georadar_title: 'Karu Mast\'ariy Georadar',
    georadar_radius: 'Karu Chayaynin',
    operator_verified: 'COEP Umalliqpa Chiqapchasqan',
    satellite_auto: 'Quyllur Kikinmanta Qawasqa VIIRS',
    pending_verification: 'Pachapi Chiqapchanankukamalla',
    confirm_read: 'Ñawinchasqañam Ñitiy',
    alert_read: 'Willakuy Qawasqaña',

    profile_title: 'Sallqa Waqaychaqpa Qillqan',
    profile_rank: 'Waqaychaq Rango IV — Anka / Kuntur',
    profile_xp: 'Pachamama Waqaychay Chani',
    badges_title: 'Quri Unanchakuna',
    telemetry_title: 'Pachamama Allinyasqa Tupuy',
    hectares_protected: 'ha Sallqa Pampa Waqaychasqa',
    co2_avoided: 'kg CO₂ Qusñi Hark\'asqa',
    credential_title: 'Kamachikuq Qillqasqa Verificasqa',
    credential_verified: 'SHA-256 Criptográfica Sello SERFOR / COEP',
    btn_siren_alarm: '🔔 AYLLU MANCHAKUY SIRENATA TOQYACHIY',
    siren_active: '¡Ayllu sirena qaparichkanñam!',

    register_title: 'Ayllu Runapa Qillqakuynin',
    register_subtitle: 'Parinaquchata amachanapaq aylluman yaykuy',
    btn_create_account: 'KIKIYPA PERFILNINTA RURAY',
    btn_go_to_login: '¿Ñachu qillqasqa kanki? Yaykuy',
    btn_go_to_register: '¿Manaraqchu qillqasqa kanki? Qillqakuy',
    field_first_name: 'Sutikuna',
    field_last_name: 'Ayllu sutikuna',
    field_username: 'Yaykuna suti',
    field_phone: 'Telefonoyki / Celular',
    field_email: 'Chaski correo (munaspaqa)',
    field_password: 'Pakasqa simi',
    field_password_confirm: 'Pakasqa simi takyachiy',
    field_community: 'Ayllu / Suyuyki',
    btn_edit_profile: 'Perfilniyta Allichay',
    btn_save_changes: 'Takyachispa Waqaychay',
    profile_updated_success: '¡Perfil allichasqaña!',
    my_badges_title: 'Quri Unanchakunay',
    badges_unlocked: 'Tarisqa Unanchakuna',
    badges_locked: 'Tarinapaq Unanchakuna',

    nav_home: 'Qallariy',
    nav_map: 'Saywiti',
    nav_report: 'Willakuy',
    nav_alerts: 'Willakuykuna',
    nav_profile: 'Waqaychaq'
  }
};
