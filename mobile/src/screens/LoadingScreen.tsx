import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { WillAiLogo } from '../components/WillAiLogo';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { styles } from './LoadingScreen.styles';

interface LoadingScreenProps {
  onFinish: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinish }) => {
  const { idioma } = useTranslation();
  const [paso, setPaso] = useState<number>(1);

  useEffect(() => {
    // Transición de mensajes de progreso amigables
    const timer1 = setTimeout(() => setPaso(2), 700);
    const timer2 = setTimeout(() => setPaso(3), 1400);
    const timerFinal = setTimeout(() => {
      onFinish();
    }, 2100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timerFinal);
    };
  }, [onFinish]);

  const obtenerMensaje = () => {
    if (paso === 1) {
      return {
        es: 'Iniciando sistema WillAI...',
        qu: 'Kallpachachkan...'
      };
    }
    if (paso === 2) {
      return {
        es: 'Verificando viento y satélites...',
        qu: 'Wayrata hinaspa quyllurta qawachkan...'
      };
    }
    return {
      es: 'Preparando mapa de Coracora...',
      qu: 'Coracora mapata allichachkan...'
    };
  };

  const msj = obtenerMensaje();

  return (
    <View style={styles.container}>
      {/* Centro: Logo + Títulos + Spinner */}
      <View style={styles.centerContent}>
        <View style={styles.logoBox}>
          <WillAiLogo size={70} />
        </View>

        <Text style={styles.title}>WillAI Coracora</Text>
        <Text style={styles.subtitle}>
          {idioma === 'qu' ? 'Ayllunchikpaq Ninamanta Qawapakuq' : 'Alerta Comunal contra Incendios'}
        </Text>
        <Text style={styles.subtitleQuechua}>
          Parinacochas • Ayacucho
        </Text>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.firePrimary} />
          <Text style={styles.statusText}>
            {idioma === 'qu' ? msj.qu : msj.es}
          </Text>
          <Text style={styles.statusSubtext}>
            {idioma === 'qu' ? 'Suyaykuy...' : 'Un momento por favor...'}
          </Text>
        </View>
      </View>

      {/* Pie de pantalla */}
      <View style={styles.footer}>
        <View style={styles.footerBadge}>
          <View style={styles.footerDot} />
          <Text style={styles.footerBadgeText}>
            {idioma === 'qu' ? 'Satelitekuna tupanachisqa' : 'Satélites y Sensores Listos'}
          </Text>
        </View>
        <Text style={styles.footerText}>COEP Parinacochas • Bomberos B-12 • v1.0.1 (Build 2)</Text>
      </View>
    </View>
  );
};

