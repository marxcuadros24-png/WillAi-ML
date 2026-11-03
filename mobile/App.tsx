import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Platform, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Home, Flame, User, Bell, Map as MapIcon } from 'lucide-react-native';

import { COLORS, loadStoredApiBase } from './src/constants/config';
import { initDatabase } from './src/db/database';
import { useTranslation } from './src/i18n/useTranslation';
import { useAuthStore } from './src/stores/authStore';
import { useNetworkSync } from './src/hooks/useNetworkSync';
import { configurarCanalNotificacionesAndroid } from './src/services/notifications';

import { LoadingScreen } from './src/screens/LoadingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MapScreen } from './src/screens/MapScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';

type ScreenType = 'loading' | 'home' | 'map' | 'report' | 'alerts' | 'profile' | 'login' | 'register';

export default function App() {
  const { t, cargarIdiomaGuardado } = useTranslation();
  const { isAuthenticated, cargarSesionGuardada } = useAuthStore();
  const { pendingCount } = useNetworkSync();

  const [currentScreen, setCurrentScreen] = useState<ScreenType>('loading');

  useEffect(() => {
    // 1. Inicializar base de datos local SQLite
    loadStoredApiBase();
    initDatabase();

    // 2. Cargar idioma y sesión guardados en SecureStore
    cargarIdiomaGuardado();
    cargarSesionGuardada();

    // 3. Configurar canal Android de alta prioridad
    configurarCanalNotificacionesAndroid();
  }, []);

  // Manejo del botón físico/gesto Atrás de Android
  useEffect(() => {
    const onBackPress = () => {
      if (currentScreen === 'register') {
        setCurrentScreen('login');
        return true;
      }
      if (currentScreen === 'report') {
        setCurrentScreen('home');
        return true;
      }
      if (['map', 'alerts', 'profile'].includes(currentScreen)) {
        setCurrentScreen('home');
        return true;
      }
      if (currentScreen === 'login') {
        if (isAuthenticated) {
          setCurrentScreen('home');
          return true;
        }
        return false;
      }
      if (currentScreen === 'home') {
        return false;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [currentScreen, isAuthenticated]);


  const handleFinishLoading = () => {
    // Al terminar la pantalla de carga, dirigir a login si no hay sesión, o directo a inicio
    if (isAuthenticated) {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('login');
    }
  };

  const showTabBar = ['home', 'map', 'alerts', 'profile'].includes(currentScreen);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Pantalla Activa */}
      <View style={styles.screenContainer}>
        {currentScreen === 'loading' && (
          <LoadingScreen onFinish={handleFinishLoading} />
        )}

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

      {/* Barra de Navegación Inferior (elevada para no colisionar con los botones de Android) */}
      {showTabBar && (
        <View style={styles.tabBar}>
          {/* 1. Inicio */}
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

          {/* 2. Mapa */}
          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'map' && styles.tabItemActive]}
            onPress={() => setCurrentScreen('map')}
            activeOpacity={0.7}
          >
            <MapIcon size={20} color={currentScreen === 'map' ? COLORS.firePrimary : COLORS.textMuted} />
            <Text style={[styles.tabText, currentScreen === 'map' && styles.tabTextActive]}>
              {t('nav_map')}
            </Text>
          </TouchableOpacity>

          {/* 3. BOTÓN FLOTANTE CENTRAL DE EMERGENCIA: AVISAR */}
          <TouchableOpacity
            style={styles.tabReportBtn}
            onPress={() => setCurrentScreen('report')}
            activeOpacity={0.88}
          >
            <Flame size={26} color="#ffffff" />
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
              <Bell size={20} color={currentScreen === 'alerts' ? COLORS.firePrimary : COLORS.textMuted} />
              <View style={styles.redAlertDot} />
            </View>
            <Text style={[styles.tabText, currentScreen === 'alerts' && styles.tabTextActive]}>
              {t('nav_alerts')}
            </Text>
          </TouchableOpacity>

          {/* 5. Perfil / Mi Cuenta */}
          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'profile' && styles.tabItemActive]}
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
              size={20}
              color={currentScreen === 'profile' ? COLORS.firePrimary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                currentScreen === 'profile' && styles.tabTextActive
              ]}
            >
              {isAuthenticated ? t('nav_profile') : 'Mi Cuenta'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: Platform.OS === 'android' ? 82 : 88,
    paddingBottom: Platform.OS === 'android' ? 24 : 30,
    paddingTop: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 3,
    paddingVertical: 4,
  },
  tabItemActive: {},
  tabText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.firePrimary,
    fontWeight: '800',
  },
  tabReportBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'android' ? 26 : 30,
    elevation: 10,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  tabBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: COLORS.fireAmber,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
  },
  redAlertDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#dc2626',
  },
});
