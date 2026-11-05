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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  btnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  btnBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  photoBox: {
    borderWidth: 2,
    borderColor: '#fca5a5',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2'
  },
  photoBoxCaptured: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
    borderStyle: 'solid',
    padding: 10
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 6
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.firePrimary
  },
  photoBtnSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center'
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  photoSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  photoSmallBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  photoPreviewContainer: {
    width: '100%',
    alignItems: 'center'
  },
  photoPreviewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 8
  },
  photoCapturedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 4
  },
  photoSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  photoCapturedText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#059669'
  },
  photoChangeBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  photoChangeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  videoBox: {
    borderWidth: 2,
    borderColor: '#fed7aa',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed'
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#0f172a'
  },
  videoDurationBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  videoDurationBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  btnRefreshGps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fee2e2'
  },
  btnRefreshGpsText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.firePrimary
  },
  lugarReferenciaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  lugarNombreText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  lugarCoordsText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  gpsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10
  },
  gpsItem: {
    alignItems: 'center'
  },
  gpsLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  gpsValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  optionBtnActiveFire: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626'
  },
  optionBtnActiveAmber: {
    backgroundColor: '#d97706',
    borderColor: '#d97706'
  },
  optionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  optionBtnTextActive: {
    color: '#ffffff'
  },
  fuelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  fuelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  fuelBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7'
  },
  fuelBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  fuelBtnTextActive: {
    color: '#ffffff'
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  switchLabelBox: {
    flex: 1,
    marginRight: 10
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  switchSub: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  switchControls: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden'
  },
  switchBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff'
  },
  switchBtnActive: {
    backgroundColor: '#dc2626'
  },
  switchBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  switchBtnTextActive: {
    color: '#ffffff'
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    fontSize: 12.5,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    minHeight: 64,
    textAlignVertical: 'top'
  },
  btnSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  btnSubmitDisabled: {
    opacity: 0.6
  },
  btnSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  cardSuccess: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 12,
    marginTop: 20
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center'
  },
  successDesc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18
  },
  btnSuccessClose: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 8
  },
  btnSuccessCloseText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  }
});

