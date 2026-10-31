import { StyleSheet } from 'react-native';
import { COLORS } from '../constants/config';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  btnRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2'
  },
  btnRefreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.firePrimary
  },
  meteoBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  meteoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  meteoLabel: {
    fontSize: 10.5,
    color: COLORS.textSecondary
  },
  meteoVal: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  filterPillActive: {
    backgroundColor: COLORS.firePrimary,
    borderColor: COLORS.firePrimary
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  filterPillTextActive: {
    color: '#ffffff'
  },
  mapArea: {
    flex: 1,
    position: 'relative'
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  bottomCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#ffffff'
  },
  cardCode: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  cardCloseBtn: {
    padding: 4
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8
  },
  metadataGrid: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 6,
    marginBottom: 10
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  metaRowDual: {
    flexDirection: 'row',
    gap: 12
  },
  metaLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  descBox: {
    gap: 2,
    marginTop: 2
  },
  descText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    lineHeight: 15
  },
  photoContainer: {
    marginTop: 4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  photoImg: {
    width: '100%',
    height: 110
  },
  photoCaption: {
    fontSize: 9.5,
    color: COLORS.textSecondary,
    padding: 4,
    backgroundColor: '#ffffff'
  },
  noPhotoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    marginTop: 2
  },
  noPhotoText: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontStyle: 'italic'
  },
  btnEscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 11
  },
  btnEscapeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  warningQuechuaBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14
  },
  warningQuechuaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 4
  },
  warningQuechuaDesc: {
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 16
  },
  rulesList: {
    gap: 10,
    marginBottom: 16
  },
  ruleItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start'
  },
  ruleText: {
    fontSize: 12.5,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 16
  },
  modalCloseBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  }
});
