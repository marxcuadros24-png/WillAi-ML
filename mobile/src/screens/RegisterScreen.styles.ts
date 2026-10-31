import { StyleSheet, Platform } from 'react-native';
import { COLORS } from '../constants/config';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 28 : 12,
    paddingBottom: 40
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 2
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  langBtnActive: {
    backgroundColor: COLORS.firePrimary
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  langTextActive: {
    color: '#ffffff'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  roleBtnActive: {
    backgroundColor: COLORS.firePrimary,
    borderColor: COLORS.firePrimary
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  roleBtnTextActive: {
    color: '#ffffff'
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    flex: 1,
    fontWeight: '600'
  },
  form: {
    gap: 12
  },
  row: {
    flexDirection: 'row',
    gap: 10
  },
  inputGroup: {
    gap: 4
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 10
  },
  inputIcon: {
    marginRight: 6
  },
  inputIconText: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary
  },
  chipsScroll: {
    flexDirection: 'row',
    marginVertical: 4
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginRight: 6
  },
  chipActive: {
    backgroundColor: COLORS.firePrimary,
    borderColor: COLORS.firePrimary
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  chipTextActive: {
    color: '#ffffff'
  },
  btnSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.firePrimary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 8
  },
  btnDisabled: {
    opacity: 0.7
  },
  btnSubmitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 8
  },
  linkText: {
    fontSize: 13,
    color: COLORS.firePrimary,
    fontWeight: '700'
  },
  btnEmergency: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 14,
    borderRadius: 12
  },
  emergencyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626'
  },
  emergencySub: {
    fontSize: 11,
    color: COLORS.textSecondary
  }
});
