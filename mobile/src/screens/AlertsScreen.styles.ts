import { StyleSheet } from 'react-native';
import { COLORS } from '../constants/config';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  redAlertCard: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  redAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  redAlertTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3
  },
  redAlertDesc: {
    fontSize: 12.5,
    color: '#ffffff',
    lineHeight: 18,
    marginBottom: 14
  },
  btnSafe: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnSafeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#dc2626'
  },
  safeConfirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    padding: 10,
    borderRadius: 8
  },
  safeConfirmedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  priorityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6
  },
  priorityBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#ffffff'
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1
  },
  alertTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  alertTime: {
    fontSize: 10.5,
    color: COLORS.textMuted
  },
  alertMessage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 10
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: 8
  },
  alertSectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  alertSectorText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  alertDistText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626'
  }
});

