import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import {
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldAlert
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { styles } from './AlertsScreen.styles';

interface AlertaLocal {
  id: string;
  categoria: 'evacuacion' | 'satelite' | 'validacion';
  titulo: string;
  mensaje: string;
  tiempo: string;
  sector: string;
  prioridad: 'critica' | 'alta' | 'media';
  distanciaKm: number;
}

export const AlertsScreen: React.FC = () => {
  const { t, idioma } = useTranslation();
  const [aSalvoConfirmado, setASalvoConfirmado] = useState<boolean>(false);

  const ALERTAS_DEFAULT: AlertaLocal[] = [
    {
      id: 'ALT-01',
      categoria: 'evacuacion',
      titulo: idioma === 'qu' ? '¡LADERA BAJAPANTA RUNAKUNA QISPIYCHIK!' : '¡AVISO DE EVACUACIÓN EN HUACCANA!',
      mensaje: idioma === 'qu'
        ? 'Nina Huaccana laderaman asuykamuchkan. Wasiyuqkuna Plazaman qispiykuychik. ¡Amapuni urquta wichaychikchu!'
        : 'Fuego acercándose hacia Huaccana. Familias evacuar con calma hacia la Plaza Comunal. ¡No suban el cerro hacia el humo!',
      tiempo: 'Hace 8 min',
      sector: 'Comunidad Huaccana, Coracora',
      prioridad: 'critica',
      distanciaKm: 3.2
    },
    {
      id: 'ALT-02',
      categoria: 'satelite',
      titulo: idioma === 'qu' ? 'Satelite ninata rikumun' : 'Satélite detectó fuego activo',
      mensaje: idioma === 'qu'
        ? 'Satelite hanaqmanta Huaccana Alta pajonalpi nina rawrachkaqta rikun.'
        : 'Satélite en el cielo vio fuego activo en el pajonal alto de Huaccana.',
      tiempo: 'Hace 24 min',
      sector: 'Sector Huaccana Alta',
      prioridad: 'alta',
      distanciaKm: 4.8
    },
    {
      id: 'ALT-03',
      categoria: 'validacion',
      titulo: idioma === 'qu' ? 'Bomberokuna llamkachkanku' : 'Bomberos B-12 trabajando en la zona',
      mensaje: idioma === 'qu'
        ? 'Bombero cuadrilla chayamunña ninata wañuchinankupaq.'
        : 'Cuadrilla de bomberos y brigadistas comunales llegaron al sector para apagar las llamas.',
      tiempo: 'Hace 45 min',
      sector: 'Paucaray',
      prioridad: 'media',
      distanciaKm: 6.1
    }
  ];

  const handleConfirmarASalvo = () => {
    setASalvoConfirmado(true);
    Alert.alert(
      idioma === 'qu' ? '¡Allinmi kachkanki!' : 'Aviso Enviado',
      idioma === 'qu'
        ? 'Aylluykiman hinaspa centralman willasqaña: mana peligropim kachkanki.'
        : 'Se ha registrado que estás a salvo fuera de peligro. ¡Gracias por avisar!'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Cabecera */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('alerts_title')}</Text>
          <Text style={styles.headerSubtitle}>
            {idioma === 'qu' ? 'Aylluykipi ninamanta willaykuna' : 'Avisos importantes para tu comunidad'}
          </Text>
        </View>
      </View>

      {/* Tarjeta de Alerta Roja Regional */}
      <View style={styles.redAlertCard}>
        <View style={styles.redAlertHeader}>
          <ShieldAlert size={22} color="#ffffff" />
          <Text style={styles.redAlertTitle}>
            {t('alert_red_banner')}
          </Text>
        </View>
        <Text style={styles.redAlertDesc}>
          {t('alert_red_banner_desc')}
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

      {/* Lista de Avisos Recientes */}
      <Text style={styles.sectionTitle}>
        {idioma === 'qu' ? 'Kunan punchaw willaykuna' : 'Avisos de hoy'}
      </Text>

      {ALERTAS_DEFAULT.map((alerta) => {
        const badgeColor =
          alerta.prioridad === 'critica'
            ? '#dc2626'
            : alerta.prioridad === 'alta'
            ? '#ea580c'
            : '#0284c7';

        return (
          <View key={alerta.id} style={styles.alertCard}>
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
                <Text style={styles.alertTime}>{alerta.tiempo}</Text>
              </View>
            </View>

            <Text style={styles.alertMessage}>{alerta.mensaje}</Text>

            <View style={styles.alertFooter}>
              <View style={styles.alertSectorRow}>
                <MapPin size={12} color={COLORS.textMuted} />
                <Text style={styles.alertSectorText}>{alerta.sector}</Text>
              </View>

              <Text style={styles.alertDistText}>A {alerta.distanciaKm} km de ti</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};
