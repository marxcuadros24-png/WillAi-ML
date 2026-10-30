export type Idioma = 'es' | 'qu';

export interface Translations {
  // App
  app_name: string;
  app_subtitle: string;
  lang_es: string;
  lang_qu: string;

  // Estado de Conexión
  status_online: string;
  status_offline: string;
  offline_mode: string;
  pending_reports_counter: string;
  syncing_now: string;
  all_synced: string;

  // Peligro FWI
  fwi_title: string;
  fwi_level: string;
  danger_low: string;
  danger_moderate: string;
  danger_high: string;
  danger_critical: string;
  temp: string;
  wind: string;
  humidity: string;

  // Advertencias de Seguridad Andina en Quechua y Español
  safety_title: string;
  do_not_climb: string;
  do_not_climb_desc: string;
  alert_uncertainty: string;
  uncertainty_desc: string;

  // Botón Principal de Emergencia
  btn_report_fire: string;
  btn_report_subtitle: string;

  // Formulario Rápido de 3 Toques
  report_title: string;
  step_1_title: string;
  step_1_subtitle: string;
  step_2_title: string;
  step_2_subtitle: string;
  step_3_title: string;
  step_3_subtitle: string;

  // Tipos de Fuego
  fire_wildfire: string;
  fire_wildfire_desc: string;
  fire_controlled: string;
  fire_controlled_desc: string;

  // Tipos de Combustible
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

  // Alertas
  alerts_title: string;
  alerts_empty: string;
  operator_verified: string;
  satellite_auto: string;
  pending_verification: string;
  confirm_read: string;
  alert_read: string;

  // Roles
  role_comunero: string;
  role_brigadista: string;
  instructions_comunero: string;
  instructions_brigadista: string;

  // Navegación
  nav_home: string;
  nav_report: string;
  nav_alerts: string;
}

export const DICCIONARIO: Record<Idioma, Translations> = {
  es: {
    app_name: 'WillAI Coracora',
    app_subtitle: 'Alerta Temprana de Incendios • Parinacochas',
    lang_es: 'ES',
    lang_qu: 'QU',

    status_online: 'Conectado a Red 4G/2G',
    status_offline: 'Sin Señal (Modo Offline)',
    offline_mode: 'Modo Sin Conexión',
    pending_reports_counter: '{count} reporte(s) en cola SQLite',
    syncing_now: 'Sincronizando reportes...',
    all_synced: 'Todos los reportes sincronizados',

    fwi_title: 'Índice de Peligro Canadiense FWI',
    fwi_level: 'Nivel Actual en Coracora',
    danger_low: 'BAJO',
    danger_moderate: 'MODERADO',
    danger_high: 'ALTO',
    danger_critical: 'CRÍTICO',
    temp: 'Temperatura',
    wind: 'Viento',
    humidity: 'Humedad',

    safety_title: 'Norma de Seguridad Andina',
    do_not_climb: '¡No subas la ladera hacia el humo!',
    do_not_climb_desc: 'El fuego avanza hasta 4 veces más rápido cuesta arriba por convección térmica y viento de quebrada. Evacúa lateralmente hacia zonas sin pastizal.',
    alert_uncertainty: '⚠️ Alerta con margen de incertidumbre',
    uncertainty_desc: 'Detección satelital / modelo preliminar. Verificadores locales y brigadas están en camino a confirmar.',

    btn_report_fire: 'REPORTAR INCENDIO',
    btn_report_subtitle: 'Toca aquí para enviar coordenadas GPS al COEP',

    report_title: 'Reporte Rápido de Fuego',
    step_1_title: 'Paso 1: ¿Qué tipo de fuego es?',
    step_1_subtitle: 'Selecciona una opción',
    step_2_title: 'Paso 2: ¿Qué vegetación se quema?',
    step_2_subtitle: 'Tipo de combustible andino',
    step_3_title: 'Paso 3: Posición GPS y Envío',
    step_3_subtitle: 'Capturando satélites en tiempo real',

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
    btn_cancel: 'Volver al Inicio',
    report_sent_online: '¡Reporte recibido por el COEP Coracora!',
    report_saved_offline: '¡Reporte guardado en el teléfono!',
    report_offline_explanation: 'No tienes señal en este sector. Tu reporte quedó guardado de forma segura en la base de datos de tu teléfono y se enviará automáticamente cuando recuperes cobertura 2G o 4G.',

    alerts_title: 'Alertas Comunitarias Recientes',
    alerts_empty: 'No hay alertas activas en tu sector.',
    operator_verified: 'Confirmado por Operador COEP',
    satellite_auto: 'Detección Satelital Automática',
    pending_verification: 'Por Verificar en Terreno',
    confirm_read: 'Marcar como Leído',
    alert_read: 'Alerta Confirmada',

    role_comunero: 'Poblador / Comunero',
    role_brigadista: 'Brigadista Forestal B-12',
    instructions_comunero: 'Evita acercarte a la línea de humo. Si vives cerca a la ladera, prepara a niños y ancianos para evacuar hacia la plaza comunal.',
    instructions_brigadista: 'Verifica azimut del viento antes del ataque. Equípate con batefuegos, pulaski y mochila extintora. Espera confirmación de radio.',

    nav_home: 'Inicio',
    nav_report: 'Reportar',
    nav_alerts: 'Alertas'
  },

  qu: {
    app_name: 'WillAI Quracura',
    app_subtitle: 'Ninata Qawapayanapaq • Parinaqucha',
    lang_es: 'ES',
    lang_qu: 'QU',

    status_online: 'Llikapi Tupanachisqa (4G/2G)',
    status_offline: 'Mana Llikayuq (Telefono Ukhullapi)',
    offline_mode: 'Mana Internet Llikayuq',
    pending_reports_counter: '{count} willakuy(kuna) suyachkan',
    syncing_now: 'Willakuykuna apachikuchkan...',
    all_synced: 'Llapallan willakuykuna apachisqaña',

    fwi_title: 'FWI Nina Qallariy Tupuy',
    fwi_level: 'Quracurapi Nina Manchakuy Kunan',
    danger_low: 'PISI',
    danger_moderate: 'CHAWPI',
    danger_high: 'HATUN',
    danger_critical: 'ANCHA HATUN',
    temp: 'Rupay',
    wind: 'Wayra',
    humidity: 'Qapa / Mikhuy',

    safety_title: 'Apu Pachamama Kamachikuy',
    do_not_climb: '¡Qata wichayman amapuni asuykuychu!',
    do_not_climb_desc: 'Ninaqa wayra qallariptin qata wichayman tawa kutitaraq utqaylla phawan. Qusñimanqa ama wichaychu, kinraykama qispiy ichu mana kanchu chayman.',
    alert_uncertainty: '⚠️ Kay willakuyqa mana allinta chiqapchaqa kanmanchu',
    uncertainty_desc: 'Hawa pacha quyllur qawasqanmanta willakuy. Huñusqa runakunañam rispa chiqapchanqa.',

    btn_report_fire: 'NINATA WILLAKUY',
    btn_report_subtitle: 'Kaypi ñit\'iy COEP umalliqkunaman apachinaykipaq',

    report_title: 'Utqaylla Nina Willakuy',
    step_1_title: '1 Kaq: ¿Ima laya ninataq?',
    step_1_subtitle: 'Hukta akllay',
    step_2_title: '2 Kaq: ¿Ima qurataq rupachkan?',
    step_2_subtitle: 'Urqukunapi kawsaykuna',
    step_3_title: '3 Kaq: Maypi kachkasqayki (GPS)',
    step_3_subtitle: 'Hawa pacha quyllur tupachkanku',

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
    btn_cancel: 'Kutiy Qallariyman',
    report_sent_online: '¡COEP Quracuraman willakuy chayasqaña!',
    report_saved_offline: '¡Willakuyqa telefonoykipi taqikusqaña!',
    report_offline_explanation: 'Kaypiqa manam llikachu kachkan. Willakusqaykiqa telefonoykipi allin waqaychasqam kachkan; signal 2G/4G chayamuptinlla kikillan apachikusunqa.',

    alerts_title: 'Ayllukunapaq Willakuykuna',
    alerts_empty: 'Manam ima manchakuypas kanchu kunanqa.',
    operator_verified: 'COEP Umalliqpa Chiqapchasqan',
    satellite_auto: 'Quyllur Kikinmanta Qawasqa',
    pending_verification: 'Pachapi Chiqapchanankukamalla',
    confirm_read: 'Ñawinchasqañam Ñitiy',
    alert_read: 'Willakuy Qawasqaña',

    role_comunero: 'Ayllu Runa / Llaqtamasi',
    role_brigadista: 'B-12 Nina Waqaychaq (Brigadista)',
    instructions_comunero: 'Qusñimanqa ama asuykuychu. Wawachakunata, machu-payakunatapas ayllu plazaman pusaykuychik.',
    instructions_brigadista: 'Wayrapa riyninta qaway nina chayananta manaraq harkaspa. Batefuego, pulaski yanapakuykunawan lliw allichasqa riychik.',

    nav_home: 'Qallariy',
    nav_report: 'Willakuy',
    nav_alerts: 'Willakuykuna'
  }
};

