import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Home, Flame, User, Bell } from 'lucide-react-native';

import { COLORS } from './src/constants/config';
import { initDatabase } from './src/db/database';
import { useTranslation } from './src/i18n/useTranslation';
import { useAuthStore } from './src/stores/authStore';
import { useNetworkSync } from './src/hooks/useNetworkSync';
import { configurarCanalNotificacionesAndroid } from './src/services/notifications';

import { HomeScreen } from './src/screens/HomeScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { LoginScreen } from './src/screens/LoginScreen';

export default function App() {
  const { t, cargarIdiomaGuardado } = useTranslation();
  const { isAuthenticated, cargarSesionGuardada, usuario, logout } = useAuthStore();
  const { pendingCount } = useNetworkSync();

  const [currentScreen, setCurrentScreen] = useState<'home' | 'report' | 'login'>('home');

  useEffect(() => {
    // 1. Inicializar SQLite
    initDatabase();

    // 2. Cargar idioma y sesión guardados en SecureStore
    cargarIdiomaGuardado();
    cargarSesionGuardada();

    // 3. Configurar canal Android de alta prioridad
    configurarCanalNotificacionesAndroid();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Pantalla Activa */}
      <View style={styles.screenContainer}>
        {currentScreen === 'home' && (
          <HomeScreen onNavigateToReport={() => setCurrentScreen('report')} />
        )}

        {currentScreen === 'report' && (
          <ReportScreen onBack={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'login' && (
          <LoginScreen
            onSuccess={() => setCurrentScreen('home')}
            onSkip={() => setCurrentScreen('home')}
          />
        )}
      </View>

      {/* Barra de Navegación Inferior (Tabs) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'home' && styles.tabItemActive]}
          onPress={() => setCurrentScreen('home')}
          activeOpacity={0.7}
        >
          <Home size={20} color={currentScreen === 'home' ? COLORS.firePrimary : COLORS.textMuted} />
          <Text style={[styles.tabText, currentScreen === 'home' && styles.tabTextActive]}>
            {t('nav_home')}
          </Text>
        </TouchableOpacity>

        {/* Botón Central Flotante de Emergencia */}
        <TouchableOpacity
          style={styles.tabReportBtn}
          onPress={() => setCurrentScreen('report')}
          activeOpacity={0.85}
        >
          <Flame size={24} color="#ffffff" />
          {pendingCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'login' && styles.tabItemActive]}
          onPress={() => {
            if (isAuthenticated) {
              logout();
            } else {
              setCurrentScreen('login');
            }
          }}
          activeOpacity={0.7}
        >
          <User size={20} color={currentScreen === 'login' ? COLORS.firePrimary : COLORS.textMuted} />
          <Text style={[styles.tabText, currentScreen === 'login' && styles.tabTextActive]}>
            {isAuthenticated ? (usuario?.username || 'Perfil') : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    paddingTop: Platform.OS === 'android' ? 30 : 0
  },
  screenContainer: {
    flex: 1
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 60,
    backgroundColor: COLORS.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingHorizontal: 16
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4
  },
  tabItemActive: {},
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  tabTextActive: {
    color: COLORS.firePrimary,
    fontWeight: '700'
  },
  tabReportBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.firePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 6,
    shadowColor: COLORS.firePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.fireAmber,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.bgSecondary
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff'
  }
});
