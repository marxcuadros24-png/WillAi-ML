import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  G,
  Line
} from 'react-native-svg';

interface WillAiLogoProps {
  size?: number;
  showText?: boolean;
}

/**
 * Logotipo Vectorial de WillAi:
 * Fuego andino + Hoja bio-tecnológica + Nodos neuronales interconectados de IA.
 */
export const WillAiLogo: React.FC<WillAiLogoProps> = ({ size = 64, showText = false }) => {
  const viewBoxSize = 100;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
        <Defs>
          {/* Gradiente de Fuego */}
          <LinearGradient id="fireGrad" x1="0%" y1="100%" x2="50%" y2="0%">
            <Stop offset="0%" stopColor="#b91c1c" stopOpacity="1" />
            <Stop offset="40%" stopColor="#ef4444" stopOpacity="1" />
            <Stop offset="80%" stopColor="#f59e0b" stopOpacity="1" />
            <Stop offset="100%" stopColor="#fef08a" stopOpacity="1" />
          </LinearGradient>

          {/* Gradiente de Hoja Bio-Tecnológica */}
          <LinearGradient id="leafGrad" x1="100%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#047857" stopOpacity="1" />
            <Stop offset="50%" stopColor="#10b981" stopOpacity="1" />
            <Stop offset="100%" stopColor="#06b6d4" stopOpacity="1" />
          </LinearGradient>

          {/* Gradiente Nodos Neuronales */}
          <LinearGradient id="synapseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
          </LinearGradient>
        </Defs>

        {/* 1. Llama Izquierda Externa (Fuego Andino) */}
        <Path
          d="M 50 10 
             C 42 26 30 36 24 50 
             C 17 64 22 80 34 88 
             C 24 76 28 60 38 52 
             C 42 49 46 52 46 56 
             C 46 64 38 72 40 82 
             C 42 90 48 94 50 95
             C 48 85 45 76 49 68
             C 52 62 58 56 57 48
             C 56 36 52 24 50 10 Z"
          fill="url(#fireGrad)"
        />

        {/* 2. Hoja Bio-Tecnológica Derecha (Resguardo Ecológico) */}
        <Path
          d="M 50 10 
             C 55 24 66 34 74 48 
             C 83 62 82 78 70 88 
             C 76 78 72 64 64 54 
             C 59 48 53 50 51 55 
             C 49 62 55 70 54 80 
             C 53 87 50 92 50 95 
             C 51 86 55 77 53 67 
             C 51 58 46 52 47 44 
             C 48 32 49 22 50 10 Z"
          fill="url(#leafGrad)"
        />

        {/* 3. Redes Neuronales / Sinapsis Interconectadas */}
        <G stroke="url(#synapseGrad)" strokeWidth="1.6" opacity="0.9">
          {/* Conexiones sinápticas */}
          <Line x1="50" y1="28" x2="38" y2="44" />
          <Line x1="50" y1="28" x2="62" y2="42" />
          <Line x1="38" y1="44" x2="48" y2="58" />
          <Line x1="62" y1="42" x2="52" y2="58" />
          <Line x1="48" y1="58" x2="36" y2="72" />
          <Line x1="52" y1="58" x2="64" y2="70" />
          <Line x1="36" y1="72" x2="50" y2="82" />
          <Line x1="64" y1="70" x2="50" y2="82" />
        </G>

        {/* 4. Nodos Neuronales IA (Puntos resplandecientes) */}
        <G>
          <Circle cx="50" cy="28" r="3.2" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.8" />
          <Circle cx="38" cy="44" r="2.8" fill="#fef08a" stroke="#f59e0b" strokeWidth="1.5" />
          <Circle cx="62" cy="42" r="2.8" fill="#a7f3d0" stroke="#10b981" strokeWidth="1.5" />
          <Circle cx="50" cy="58" r="3.6" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.8" />
          <Circle cx="36" cy="72" r="2.8" fill="#fca5a5" stroke="#ef4444" strokeWidth="1.5" />
          <Circle cx="64" cy="70" r="2.8" fill="#67e8f9" stroke="#06b6d4" strokeWidth="1.5" />
          <Circle cx="50" cy="82" r="3.2" fill="#ffffff" stroke="#c084fc" strokeWidth="1.5" />
        </G>
      </Svg>

      {showText && (
        <View style={styles.textContainer}>
          <Text style={styles.title}>Will<Text style={styles.aiTitle}>Ai</Text></Text>
          <Text style={styles.subtitle}>SISTEMA DE ALERTA TEMPRANA</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  aiTitle: {
    color: '#ff6b00',
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
