import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Home, Flame, User, Bell, Map as MapIcon, ShieldAlert, Scan } from 'lucide-react-native';

import { COLORS } from './src/constants/config';
import { initDatabase } from './src/db/database';
import { useTranslation } from './src/i18n/useTranslation';
import { useAuthStore } from './src/stores/authStore';
import { useNetworkSync } from './src/hooks/useNetworkSync';
import { configurarCanalNotificacionesAndroid } from './src/services/notifications';

import { HomeScreen } from './src/screens/HomeScreen';
import { MapScreen } from './src/screens/MapScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';

type ScreenType = 'home' | 'map' | 'report' | 'alerts' | 'profile' | 'login' | 'register';

export default function App() {
  const { t, cargarIdiomaGuardado } = useTranslation();
  const { isAuthenticated, cargarSesionGuardada } = useAuthStore();
  const { pendingCount } = useNetworkSync();

  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');

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
      <StatusBar style="dark" />

      {/* Pantalla Activa */}
      <View style={styles.screenContainer}>
        {currentScreen === 'home' && (
          <HomeScreen
            onNavigateToReport={() => setCurrentScreen('report')}
            onNavigateToMap={() => setCurrentScreen('map')}
            onNavigateToAlerts={() => setCurrentScreen('alerts')}
            onNavigateToProfile={() => setCurrentScreen('profile')}
          />
        )}

        {currentScreen === 'map' && <MapScreen />}

        {currentScreen === 'report' && (
          <ReportScreen onBack={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'alerts' && <AlertsScreen />}

        {currentScreen === 'profile' && <ProfileScreen />}

        {currentScreen === 'login' && (
          <LoginScreen
            onSuccess={() => setCurrentScreen('home')}
            onEmergencyReport={() => setCurrentScreen('report')}
            onGoToRegister={() => setCurrentScreen('register')}
          />
        )}

        {currentScreen === 'register' && (
          <RegisterScreen
            onSuccess={() => setCurrentScreen('home')}
            onGoToLogin={() => setCurrentScreen('login')}
            onEmergencyReport={() => setCurrentScreen('report')}
          />
        )}
      </View>

      {/* Barra de Navegación Inferior Diurna (5 Tabs) */}
      <View style={styles.tabBar}>
        {/* 1. Inicio */}
        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'home' && styles.tabItemActive]}
          onPress={() => setCurrentScreen('home')}
          activeOpacity={0.7}
        >
          <Home size={19} color={currentScreen === 'home' ? COLORS.firePrimary : COLORS.textMuted} />
          <Text style={[styles.tabText, currentScreen === 'home' && styles.tabTextActive]}>
            {t('nav_home')}
          </Text>
        </TouchableOpacity>

        {/* 2. Mapa Vivo */}
        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'map' && styles.tabItemActive]}
          onPress={() => setCurrentScreen('map')}
          activeOpacity={0.7}
        >
          <MapIcon size={19} color={currentScreen === 'map' ? COLORS.firePrimary : COLORS.textMuted} />
          <Text style={[styles.tabText, currentScreen === 'map' && styles.tabTextActive]}>
            {t('nav_map')}
          </Text>
        </TouchableOpacity>

        {/* 3. BOTÓN FLOTANTE CENTRAL DE EMERGENCIA: REPORTAR */}
        <TouchableOpacity
          style={styles.tabReportBtn}
          onPress={() => setCurrentScreen('report')}
          activeOpacity={0.88}
        >
          <Flame size={24} color="#ffffff" />
          {pendingCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 4. Alertas */}
        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'alerts' && styles.tabItemActive]}
          onPress={() => setCurrentScreen('alerts')}
          activeOpacity={0.7}
        >
          <View style={{ position: 'relative' }}>
            <Bell size={19} color={currentScreen === 'alerts' ? COLORS.firePrimary : COLORS.textMuted} />
            <View style={styles.redAlertDot} />
          </View>
          <Text style={[styles.tabText, currentScreen === 'alerts' && styles.tabTextActive]}>
            {t('nav_alerts')}
          </Text>
        </TouchableOpacity>

        {/* 5. Perfil / Acceso */}
        <TouchableOpacity
          style={[styles.tabItem, (currentScreen === 'profile' || currentScreen === 'login' || currentScreen === 'register') && styles.tabItemActive]}
          onPress={() => {
            if (isAuthenticated) {
              setCurrentScreen('profile');
            } else {
              setCurrentScreen('login');
            }
          }}
          activeOpacity={0.7}
        >
          <User
            size={19}
            color={currentScreen === 'profile' || currentScreen === 'login' || currentScreen === 'register' ? COLORS.firePrimary : COLORS.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              (currentScreen === 'profile' || currentScreen === 'login' || currentScreen === 'register') && styles.tabTextActive
            ]}
          >
            {isAuthenticated ? t('nav_profile') : 'Perfil'}
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
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 62,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 3,
  },
  tabItemActive: {},
  tabText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.firePrimary,
    fontWeight: '800',
  },
  tabReportBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#b91c1c',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
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
    borderColor: '#ffffff',
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
  },
  redAlertDot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#dc2626',
  },
});
