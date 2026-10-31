import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import {
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldAlert,
  Bell
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { fetchAlertasComunitariasApi, AlertaPublicaItem } from '../services/api';
import { styles } from './AlertsScreen.styles';

function formatoTiempo(fechaIso?: string): string {
  if (!fechaIso) return 'Reciente';
  const fecha = new Date(fechaIso);
  const ahora = new Date();
  const diffMin = Math.round((ahora.getTime() - fecha.getTime()) / 60000);
  if (diffMin < 2) return 'Justo ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHoras = Math.round(diffMin / 60);
  if (diffHoras < 24) return `Hace ${diffHoras} h`;
  return `Hace ${Math.round(diffHoras / 24)} d`;
}

export const AlertsScreen: React.FC = () => {
  const { t, idioma } = useTranslation();
  const [aSalvoConfirmado, setASalvoConfirmado] = useState<boolean>(false);
  const [alertas, setAlertas] = useState<AlertaPublicaItem[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  const cargarAlertas = useCallback(async () => {
    try {
      const data = await fetchAlertasComunitariasApi();
      if (Array.isArray(data)) {
        setAlertas(data);
      }
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarAlertas();
    // Consulta periódica cada 8 segundos para reflejar novedades de la central de mando
    const timer = setInterval(cargarAlertas, 8000);
    return () => clearInterval(timer);
  }, [cargarAlertas]);

  const onRefresh = useCallback(() => {
    setRefrescando(true);
    cargarAlertas();
  }, [cargarAlertas]);

  const handleConfirmarASalvo = () => {
    setASalvoConfirmado(true);
    Alert.alert(
      idioma === 'qu' ? '¡Allinmi kachkanki!' : 'Aviso Enviado',
      idioma === 'qu'
        ? 'Aylluykiman hinaspa centralman willasqaña: mana peligropim kachkanki.'
        : 'Se ha registrado que estás a salvo fuera de peligro. ¡Gracias por avisar!'
    );
  };

  // Alerta destacada (la más reciente de alta prioridad o emitida por el centro de mando)
  const alertaDestacada =
    alertas.find(
      (a) =>
        (a.prioridad === 'critica' || a.prioridad === 'alta') &&
        ['emitida', 'enviada', 'pendiente_aprobacion'].includes(a.estado)
    ) || alertas[0] || null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={onRefresh}
          colors={[COLORS.firePrimary]}
          tintColor={COLORS.firePrimary}
        />
      }
    >
      {/* Cabecera */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('alerts_title')}</Text>
          <Text style={styles.headerSubtitle}>
            {idioma === 'qu' ? 'Aylluykipi ninamanta willaykuna' : 'Avisos oficiales emitidos desde la Central Web'}
          </Text>
        </View>
      </View>

      {/* Tarjeta de Alerta Roja Regional o Alerta Activa Emitida */}
      <View style={styles.redAlertCard}>
        <View style={styles.redAlertHeader}>
          <ShieldAlert size={22} color="#ffffff" />
          <Text style={styles.redAlertTitle}>
            {alertaDestacada
              ? alertaDestacada.titulo
              : t('alert_red_banner')}
          </Text>
        </View>
        <Text style={styles.redAlertDesc}>
          {alertaDestacada
            ? (alertaDestacada.instrucciones
                ? `${alertaDestacada.mensaje}\n\n⚠️ INSTRUCCIÓN: ${alertaDestacada.instrucciones}`
                : alertaDestacada.mensaje)
            : t('alert_red_banner_desc')}
        </Text>

        {aSalvoConfirmado ? (
          <View style={styles.safeConfirmedBox}>
            <CheckCircle2 size={18} color="#ffffff" />
            <Text style={styles.safeConfirmedText}>
              {t('i_am_safe_confirmed')}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.btnSafe}
            onPress={handleConfirmarASalvo}
            activeOpacity={0.88}
          >
            <Text style={styles.btnSafeText}>{t('btn_i_am_safe')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de Avisos Recientes desde Django */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
          {idioma === 'qu' ? 'Kunan punchaw willaykuna' : 'Avisos de hoy'}
        </Text>
        {cargando && <ActivityIndicator size="small" color={COLORS.firePrimary} />}
      </View>

      {alertas.length === 0 && !cargando ? (
        <View style={[styles.alertCard, { alignItems: 'center', paddingVertical: 24 }]}>
          <Bell size={32} color={COLORS.textMuted} />
          <Text style={[styles.alertTitle, { marginTop: 8, textAlign: 'center' }]}>
            No hay alertas activas en este momento
          </Text>
          <Text style={[styles.alertMessage, { textAlign: 'center', marginTop: 4 }]}>
            La central de mando no ha emitido alertas en Parinacochas hoy.
          </Text>
        </View>
      ) : (
        alertas.map((alerta) => {
          const badgeColor =
            alerta.prioridad === 'critica'
              ? '#dc2626'
              : alerta.prioridad === 'alta'
              ? '#ea580c'
              : '#0284c7';

          return (
            <View key={alerta.id_alerta} style={styles.alertCard}>
              <View style={styles.alertCardHeader}>
                <View style={styles.alertHeaderLeft}>
                  <View style={[styles.priorityBadge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.priorityBadgeText}>
                      {alerta.prioridad === 'critica'
                        ? 'URGENTE'
                        : alerta.prioridad === 'alta'
                        ? 'PELIGRO'
                        : 'AVISO'}
                    </Text>
                  </View>
                  <Text style={styles.alertTitle} numberOfLines={1}>
                    {alerta.titulo}
                  </Text>
                </View>

                <View style={styles.alertTimeRow}>
                  <Clock size={11} color={COLORS.textMuted} />
                  <Text style={styles.alertTime}>
                    {formatoTiempo(alerta.emitida_en || alerta.creada_en)}
                  </Text>
                </View>
              </View>

              <Text style={styles.alertMessage}>{alerta.mensaje}</Text>

              {alerta.instrucciones ? (
                <Text style={[styles.alertMessage, { color: '#b91c1c', fontWeight: '700', marginTop: -4 }]}>
                  🛡️ {alerta.instrucciones}
                </Text>
              ) : null}

              <View style={styles.alertFooter}>
                <View style={styles.alertSectorRow}>
                  <MapPin size={12} color={COLORS.textMuted} />
                  <Text style={styles.alertSectorText}>
                    {alerta.incidente_codigo
                      ? `Incidente ${alerta.incidente_codigo} · Coracora`
                      : 'Distrito Coracora · Parinacochas'}
                  </Text>
                </View>

                <Text style={styles.alertDistText}>
                  {alerta.estado === 'emitida' || alerta.estado === 'enviada'
                    ? '🟢 Activa'
                    : alerta.estado_display || alerta.estado}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};
