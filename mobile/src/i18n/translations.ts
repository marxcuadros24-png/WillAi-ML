export type Idioma = 'es' | 'qu';

export interface Translations {
  // App General
  app_name: string;
  app_subtitle: string;
  lang_es: string;
  lang_qu: string;

  // Login & Acceso
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

  // Peligro de Fuego & Clima
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

  // Mapa
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

  // Reporte con Cámara y Foto Real
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

  // Perfil & Logros
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
    app_subtitle: 'Cuidado Comunal contra Incendios • Parinacochas',
    lang_es: 'ES',
    lang_qu: 'QU',

    login_title: 'Ingresar a WillAI',
    login_subtitle: 'Protegiendo los pastizales y cerros de Coracora',
    role_brigadista: 'Soy Bombero / Brigadista',
    role_poblador: 'Soy Vecino / Comunero',
    btn_biometric: 'Ingresar con mi Huella Digital',
    btn_google: 'Ingresar con Google',
    btn_emergency_fast: '🚨 AVISAR FUEGO AHORA (SIN CLAVE)',
    btn_emergency_fast_sub: 'Toca aquí con cámara y GPS para pedir ayuda urgente',
    satellite_sync_active: 'Satélite vigilando el cielo de Coracora',

    status_online: '🟢 Hay señal de internet',
    status_offline: '🟠 Sin señal (se guarda en tu celular)',
    offline_mode: 'Modo Sin Conexión',
    pending_reports_counter: '{count} aviso(s) listos para enviar',
    syncing_now: 'Enviando avisos...',
    all_synced: 'Todos tus avisos fueron enviados',

    fwi_title: '¿Cómo está el peligro de fuego hoy?',
    fwi_level: 'Nivel de Peligro en Coracora',
    danger_low: 'CALMADO (POCO PELIGRO)',
    danger_moderate: 'CUIDADO (PELIGRO MEDIO)',
    danger_high: 'MUY PELIGROSO',
    danger_critical: '¡PELIGRO MÁXIMO! NO PRENDER FUEGO',
    temp: 'Calor',
    wind: 'Viento',
    humidity: 'Humedad del pasto',

    safety_title: '¡CUIDADO! REGLA PARA SALVAR TU VIDA',
    do_not_climb: '¡NO SUBAS EL CERRO HACIA EL HUMO!',
    do_not_climb_desc: 'El fuego corre cerro arriba mucho más rápido que una persona. Si ves humo, escapa hacia los costados o hacia caminos limpios sin pasto seco.',
    alert_uncertainty: '⚠️ Aviso recibido, verificando en la zona',
    uncertainty_desc: 'Los verificadores de la comunidad y bomberos van hacia el lugar para confirmar.',

    map_title: '¿Dónde hay fuego ahora?',
    map_focos_activos: 'Fuegos vistos desde el cielo',
    map_simulacion_viento: '¿Hacia dónde sopla el viento?',
    map_isocronas: 'Hacia dónde avanzará el humo',
    map_nearest_fire: 'Fuego más cercano a ti',
    map_escape_route: 'Camino seguro para escapar',
    map_escape_route_desc: 'Sigue los caminos limpios hacia la quebrada o piedras, lejos del ichu seco.',
    map_escape_warning: '⚠️ ¡Qata wichayman amapuni asuykuychu! Corre hacia zonas limpias o caminos.',
    map_brigades_active: 'Brigadistas ayudando ahora',
    map_water_dropped: 'Agua lanzada',

    btn_report_fire: 'AVISAR FUEGO AHORA',
    btn_report_subtitle: 'Toca aquí con cámara y GPS para avisar',
    report_title: 'Avisar fuego en tu zona',
    camera_hud_scan: 'FOTO CON CÁMARA Y UBICACIÓN',
    smoke_density: 'Cantidad de humo',
    severity_estimated: 'Tamaño del fuego',
    azimuth_heading: 'Hacia dónde mira el fuego',
    distance_optical: 'Distancia aproximada',
    viviendas_500m: '¿Hay casas cerca del fuego?',
    viviendas_500m_desc: 'Casas, chozas o corrales a menos de 5 cuadras.',
    area_scale: 'Tamaño del fuego',
    voice_note: 'Nota o mensaje de voz',
    voice_note_placeholder: 'Escribe o describe lo que ves...',
    btn_dispatch_urgent: '🚨 PEDIR AYUDA URGENTE A BOMBEROS',

    fire_wildfire: 'Fuego sin control (Incendio)',
    fire_wildfire_desc: 'El cerro o pastizal se quema sin poder pararlo',
    fire_controlled: 'Quema de chacra',
    fire_controlled_desc: 'Quema cuidada de rastrojo en la chacra',
    fuel_ichu: 'Pasto seco / Ichu',
    fuel_matorral: 'Arbustos / Matorral',
    fuel_bofedal: 'Pasto verde / Humedal',
    fuel_cultivo: 'Chacra sembrada',

    gps_capturing: 'Buscando tu ubicación con satélite...',
    gps_ready: 'Ubicación lista',
    gps_accuracy: 'Certeza',
    gps_heading: 'Dirección',
    gps_retry: 'Buscar de nuevo',

    btn_send_report: 'ENVIAR AVISO A LOS BOMBEROS',
    btn_cancel: 'Volver',
    report_sent_online: '¡Tu aviso llegó a los bomberos y a la central!',
    report_saved_offline: '¡Aviso guardado en tu teléfono!',
    report_offline_explanation: 'En este cerro no hay señal. Tu aviso quedó guardado en tu teléfono y se enviará solito apenas recuperes señal.',

    alerts_title: 'Avisos de Emergencia',
    alerts_empty: 'No hay fuegos reportados en tu zona. Todo en calma.',
    alert_red_banner: '🔴 ¡ALERTA DE FUEGO GRANDE EN PARINACOCHAS!',
    alert_red_banner_desc: 'Viento fuerte y pasto muy seco. Mucho cuidado en Coracora, Upahuacho y Chumpi.',
    btn_i_am_safe: '✅ Me encuentro a salvo (Avisar)',
    i_am_safe_confirmed: 'Aviso enviado: Estás a salvo fuera de peligro',
    air_quality: 'Humo en el aire',
    georadar_title: 'Fuegos cerca de ti',
    georadar_radius: 'Distancia',
    operator_verified: 'Confirmado por Bomberos de Coracora',
    satellite_auto: 'Visto por satélite en el cielo',
    pending_verification: 'Por confirmar por brigada',
    confirm_read: 'Entendido',
    alert_read: 'Aviso leído',

    profile_title: 'Mi Cuenta y Ayudas',
    profile_rank: 'Guardián Comunal',
    profile_xp: 'Puntos por cuidar el cerro',
    badges_title: 'Medallas Ganadas',
    telemetry_title: 'Pastos Cuidados',
    hectares_protected: 'hectáreas de pasto e ichu salvadas',
    co2_avoided: 'kilos de humo evitados gracias a tu aviso',
    credential_title: 'Carnet Comunal Verificado',
    credential_verified: 'Reconocido por Bomberos y Comunidad',
    btn_siren_alarm: '🔔 TOCAR ALARMA DE EMERGENCIA',
    siren_active: '¡Alarma comunal sonando!',

    register_title: 'Crear Mi Cuenta',
    register_subtitle: 'Súmate para cuidar juntos nuestras comunidades',
    btn_create_account: 'GUARDAR Y CREAR CUENTA',
    btn_go_to_login: '¿Ya tienes cuenta? Entrar aquí',
    btn_go_to_register: '¿No tienes cuenta? Regístrate aquí',
    field_first_name: 'Nombres',
    field_last_name: 'Apellidos',
    field_username: 'Tu nombre de usuario',
    field_phone: 'Tu número de celular',
    field_email: 'Correo (opcional)',
    field_password: 'Tu clave',
    field_password_confirm: 'Repite tu clave',
    field_community: 'Tu Comunidad o Barrio',
    btn_edit_profile: 'Cambiar mis datos',
    btn_save_changes: 'Guardar cambios',
    profile_updated_success: '¡Tus datos fueron guardados!',
    my_badges_title: 'Mis Medallas',
    badges_unlocked: 'Medallas Ganadas',
    badges_locked: 'Medallas por Ganar',

    nav_home: 'Inicio',
    nav_map: 'Mapa',
    nav_report: 'Avisar',
    nav_alerts: 'Alertas',
    nav_profile: 'Mi Cuenta'
  },

  qu: {
    app_name: 'WillAI Quracura',
    app_subtitle: 'Ayllunchikpaq Ninamanta Qawapakuq • Parinaqucha',
    lang_es: 'ES',
    lang_qu: 'QU',

    login_title: 'WillAIman Yaykuy',
    login_subtitle: 'Quracurapa quranpata hinaspa urqunkunata qawapanapaq',
    role_brigadista: 'Nina Wañuchiq Bombero kani',
    role_poblador: 'Ayllu Runa / Wasiyuq kani',
    btn_biometric: 'Ruk\'ana / Dedowan Yaykuy',
    btn_google: 'Googlewan Yaykuy',
    btn_emergency_fast: '🚨 UTQAYLLA WILLAY (MANA CLAVEYUQ)',
    btn_emergency_fast_sub: 'Fotowan hinaspa maypi kasqaykiwan utqaylla willay',
    satellite_sync_active: 'Satelite hanaqmanta Quracurata qawamuchkan',

    status_online: '🟢 Signal kachkan',
    status_offline: '🟠 Mana signalchu (celularpi waqaychan)',
    offline_mode: 'Mana Internet Llikayuq',
    pending_reports_counter: '{count} willaykuna kachaypaq',
    syncing_now: 'Willaykuna kachachkanña...',
    all_synced: 'Llapan willakuykuna kachasqaña',

    fwi_title: '¿Imaynataq nina peligro kunan punchaw?',
    fwi_level: 'Nina Peligro Quracurapi',
    danger_low: 'SAMASQA (MANA ANCHACHU)',
    danger_moderate: 'QAWAKUY (CHAWPI)',
    danger_high: 'LLUMPAY PELIGRO',
    danger_critical: '¡PELIGRO MÁXIMO! AMA NINATA RAWRACHIYCHU',
    temp: 'Rupay',
    wind: 'Wayra',
    humidity: 'Qura uqu kaynin',

    safety_title: '¡QAWAKUY! AMA WAÑUNAYKIPAQ KAMACHIKUY',
    do_not_climb: '¡QATA WICHAYMAN AMAPUNI ASUYKUYCHU!',
    do_not_climb_desc: 'Ninaqa wayra qallariptin qata wichayman runamanta aswan utqayllam pawan. Qusñimanqa ama wichaychu, kinraykama qispiy chaki ichu mana kanchu chayman.',
    alert_uncertainty: '⚠️ Willay chayamunña, ayllupi chiqapchachkanku',
    uncertainty_desc: 'Ayllu runakuna hinaspa bomberokuna rillachkanku qawanankupaq.',

    map_title: '¿Maypim nina kachkan?',
    map_focos_activos: 'Hanaqmanta rikusqa ninakuna',
    map_simulacion_viento: '¿Maymanmi wayrachkan?',
    map_isocronas: 'Maymanmi qusñi rinqa',
    map_nearest_fire: 'Asuykamusuq nina',
    map_escape_route: 'Qispina allin ñan',
    map_escape_route_desc: 'Chuya ñankunata qatiy mayuman icha qaqakunaman, chaki ichumanta karunchakuspa.',
    map_escape_warning: '⚠️ ¡Qata wichayman amapuni asuykuychu! Qaqa pampaman utqaylla qispiykuy.',
    map_brigades_active: 'Yanapaq runakuna',
    map_water_dropped: 'Yaku hich\'asqa',

    btn_report_fire: 'NINATA UTQAYLLA WILLAY',
    btn_report_subtitle: 'Cámarawan hinaspa maypi kasqaykiwan willay',
    report_title: 'Aylluykipi nina willay',
    camera_hud_scan: 'FOTO CáMARAWAN HINASPA MAYPI KASQAN',
    smoke_density: 'Qusñi hatun kaynin',
    severity_estimated: 'Nina manchakuy',
    azimuth_heading: 'Maymanmi nina qawan',
    distance_optical: 'Karu kaynin',
    viviendas_500m: '¿Wasikuna qayllapichu kachkan?',
    viviendas_500m_desc: 'Wasikuna icha kanchakuna pichqa cuadrapi.',
    area_scale: 'Pampa rupay hatun kaynin',
    voice_note: 'Kunkawan rimay willay',
    voice_note_placeholder: 'Imata rikusqaykita rimariy...',
    btn_dispatch_urgent: '🚨 BOMBEROKUNATA UTQAYLLA WAQYAY',

    fire_wildfire: 'Nina mana wañuchiypaq (Hatun Incendio)',
    fire_wildfire_desc: 'Urqu rupachkan manam wañuchiyta atikunchu',
    fire_controlled: 'Chacrapi qura kañay',
    fire_controlled_desc: 'Chacrapi qura pichay allin waqaychasqa',
    fuel_ichu: 'Chaki ichu',
    fuel_matorral: 'Kichka sachakuna / Tola',
    fuel_bofedal: 'Uqu pampa / Bofedal',
    fuel_cultivo: 'Tarpusqa chacra',

    gps_capturing: 'Maypi kasqaykita quyllurwan maskachkan...',
    gps_ready: 'Maypi kasqayki tarisqaña',
    gps_accuracy: 'Certeza',
    gps_heading: 'Mayman rinan',
    gps_retry: 'Musuqmanta maskay',

    btn_send_report: 'BOMBEROKUNAMAN WILLAYTA KACHAY',
    btn_cancel: 'Kutipariy',
    report_sent_online: '¡Willasqayki bomberokunaman chayaramunña!',
    report_saved_offline: '¡Celularnikipi waqaychasqaña!',
    report_offline_explanation: 'Kay urqupi manam signal kanchu. Willasqayki celularnikipi allin waqaychasqam kachkan, señal kaptin kikinllam kachakunqa.',

    alerts_title: 'Willakuykuna',
    alerts_empty: 'Kunanqa manam nina kanchu. Allillanmi kachkanchik.',
    alert_red_banner: '🔴 ¡HATUN NINA RAWRACHKAN PARINAQUCHAPI!',
    alert_red_banner_desc: 'Sinchi wayram kachkan, ichupas chakim kachkan. Qawapayakuy Quracurapi, Upahuachopi hinaspa Chumpipi.',
    btn_i_am_safe: '✅ Allinmi kachkani (Aylluykiman willay)',
    i_am_safe_confirmed: 'Willasqaña: Manam peligrochu kachkanki',
    air_quality: 'Qusñi wayrapi',
    georadar_title: 'Sispaykipi ninakuna',
    georadar_radius: 'Karu kaynin',
    operator_verified: 'Quracura bomberokunapa chiqapchasqan',
    satellite_auto: 'Quyllurpa hanaqmanta rikusqan',
    pending_verification: 'Chiqapchanankupaq suyachkan',
    confirm_read: 'Chaskiniñam',
    alert_read: 'Qawasqaña',

    profile_title: 'Ñuqa hinaspa Yanapakuyniy',
    profile_rank: 'Ayllu Qawapaq',
    profile_xp: 'Puntos puriqmasikunapaq',
    badges_title: 'Medallakuna Ganashqa',
    telemetry_title: 'Qawapasqa Pampakuna',
    hectares_protected: 'hectáreas pampa ichu salvamusqa',
    co2_avoided: 'kilos qusñi mana pawananchikpaq',
    credential_title: 'Ayllu Runapa Carnetnin',
    credential_verified: 'Bomberokunapa hinaspa Ayllupa riqsisqan',
    btn_siren_alarm: '🔔 AYLLU CORNETATA / SIRENATA RAWRACHIY',
    siren_active: '¡Ayllu sirena waqachkanña!',

    register_title: 'Musuq Cuenta Ruway',
    register_subtitle: 'Huñunakusun ayllunchikpa urqunkuna waqaychanapaq',
    btn_create_account: 'CUENTATA RUWAY',
    btn_go_to_login: '¿Cuentayki kanchu? Yaykuy kaypi',
    btn_go_to_register: '¿Manaraqchu cuentayki? Qillqakuy kaypi',
    field_first_name: 'Sutiyki',
    field_last_name: 'Ayllu sutiyki',
    field_username: 'Suti celularpi',
    field_phone: 'Celular número',
    field_email: 'Correo (munaspaykiqa)',
    field_password: 'Claveykita churay',
    field_password_confirm: 'Musuqmanta claveykita churay',
    field_community: 'Aylluyki icha barrioyki',
    btn_edit_profile: 'Datosniyta allichay',
    btn_save_changes: 'Waqaychay',
    profile_updated_success: '¡Datosniyki waqaychasqañam!',
    my_badges_title: 'Medallakunay',
    badges_unlocked: 'Ganashqa Medallakuna',
    badges_locked: 'Gananaykipaq Medallakuna',

    nav_home: 'Inicio',
    nav_map: 'Mapa',
    nav_report: 'Avisar',
    nav_alerts: 'Alertas',
    nav_profile: 'Mi Cuenta'
  }
};
