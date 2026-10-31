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
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#fca5a5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.firePrimary
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  badgeRolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  profileRol: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.firePrimary
  },
  profileUsername: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  btnEditProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  btnEditProfileText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.firePrimary
  },
  contactInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 14
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  contactValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  rankContainer: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a'
  },
  rankTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  rankTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400e'
  },
  rankPuntos: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309'
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#d97706',
    borderRadius: 3
  },
  rankHint: {
    fontSize: 10.5,
    color: '#78350f',
    lineHeight: 14
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  badgeItem: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1
  },
  badgeItemUnlocked: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0'
  },
  badgeItemLocked: {
    backgroundColor: '#f8fafc',
    borderColor: COLORS.borderSubtle
  },
  badgeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  badgeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconUnlocked: {
    backgroundColor: '#dcfce7'
  },
  iconLocked: {
    backgroundColor: '#e2e8f0'
  },
  badgePoints: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706'
  },
  badgeNombre: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3
  },
  badgeDesc: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    lineHeight: 14,
    marginBottom: 8
  },
  badgeStatusPill: {
    alignSelf: 'flex-start'
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  btnSiren: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12
  },
  btnSirenActive: {
    backgroundColor: '#991b1b'
  },
  btnSirenText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10
  },
  btnLogoutText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700'
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  modalBody: {
    maxHeight: 340
  },
  inputGroup: {
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textPrimary
  },
  chipModal: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginRight: 6
  },
  chipModalActive: {
    backgroundColor: COLORS.firePrimary,
    borderColor: COLORS.firePrimary
  },
  chipModalText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  chipModalTextActive: {
    color: '#ffffff'
  },
  langModalRow: {
    flexDirection: 'row',
    gap: 8
  },
  langModalBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  langModalBtnActive: {
    backgroundColor: COLORS.firePrimary,
    borderColor: COLORS.firePrimary
  },
  langModalText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  langModalTextActive: {
    color: '#ffffff'
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle
  },
  btnCancelModal: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f1f5f9'
  },
  btnCancelModalText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  btnSaveModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.firePrimary
  },
  btnSaveModalText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff'
  }
});

