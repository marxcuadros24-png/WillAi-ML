import { StyleSheet } from 'react-native';
import { COLORS } from '../constants/config';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden'
  },
  langBtn: {
    paddingVertical: 5,
    paddingHorizontal: 9
  },
  langBtnActive: {
    backgroundColor: COLORS.firePrimary
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  langBtnTextActive: {
    color: '#ffffff'
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  statusNetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  statusNetDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5
  },
  statusNetText: {
    fontSize: 11,
    fontWeight: '700'
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#d97706',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14
  },
  pendingBannerText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff'
  },
  btnEmergency: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  emergencyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  emergencyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emergencyTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3
  },
  emergencySubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 2
  },
  mapIncidentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  mapCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  redPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626'
  },
  activePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#dc2626'
  },
  canvasWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  loadingMapBox: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8fafc'
  },
  loadingMapText: {
    fontSize: 11.5,
    color: COLORS.textSecondary
  },
  floatingLegend: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  legendLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  nearestIncidentBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle
  },
  nearestTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  nearestSectorText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  nearestTitleText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  distBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  distBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626'
  },
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginVertical: 4
  },
  windText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  btnExpandMap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#fca5a5'
  },
  btnExpandMapText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.firePrimary
  },
  safetyCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  safetyTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#dc2626',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  safetyHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
    marginVertical: 4
  },
  safetyDesc: {
    fontSize: 11.5,
    color: '#7f1d1d',
    lineHeight: 16
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  cardHeader: {
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  cardHeaderSubtitle: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  fwiBadge: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  fwiNivelText: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  fwiScoreText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2
  },
  meteoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: 10
  },
  meteoItem: {
    alignItems: 'center'
  },
  meteoLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 2
  },
  meteoValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary
  }
});
