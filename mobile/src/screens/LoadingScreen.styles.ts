import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 48,
    paddingHorizontal: 24
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    maxWidth: 340
  },
  logoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#fff1f2',
    borderWidth: 2,
    borderColor: '#fecdd3',
    marginBottom: 20,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 6,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.firePrimary,
    textAlign: 'center',
    marginBottom: 4
  },
  subtitleQuechua: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 10,
    textAlign: 'center'
  },
  statusSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 3,
    textAlign: 'center'
  },
  footer: {
    alignItems: 'center',
    gap: 4
  },
  footerText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669'
  },
  footerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669'
  }
});

