import { StyleSheet } from 'react-native';
import { COLORS } from '../constants/config';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  btnServerConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff'
  },
  btnServerConfigText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7'
  },
  langSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden'
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  langBtnActive: {
    backgroundColor: COLORS.firePrimary
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  langBtnTextActive: {
    color: '#ffffff'
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 18
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff1f2',
    borderWidth: 1.5,
    borderColor: '#fecdd3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.2
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center'
  },
  btnEmergencyBox: {
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
  btnEmergencyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  btnEmergencyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnEmergencyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3
  },
  btnEmergencySub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 2
  },
  btnSkipToMap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  btnSkipToMapText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0284c7'
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderSubtle
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  roleSelectorBox: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  roleTabActive: {
    backgroundColor: '#ffffff',
    borderColor: COLORS.firePrimary,
    borderWidth: 1.5
  },
  roleTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  roleTabTextActive: {
    color: COLORS.firePrimary,
    fontWeight: '800'
  },
  cardForm: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 14
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fca5a5'
  },
  errorText: {
    fontSize: 11.5,
    color: '#dc2626',
    fontWeight: '700'
  },
  inputGroup: {
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    height: 44
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary
  },
  btnLogin: {
    backgroundColor: COLORS.firePrimary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  btnLoginDisabled: {
    opacity: 0.6
  },
  btnLoginText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800'
  },
  btnGoRegister: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4
  },
  btnGoRegisterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7'
  },
  socialButtonsContainer: {
    gap: 10
  },
  btnBiometric: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#bae6fd'
  },
  btnBiometricText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0369a1'
  },

  // Modal de Conexión del Servidor
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 17
  },
  serverInputWrapper: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12
  },
  serverTextInput: {
    fontSize: 12.5,
    color: COLORS.textPrimary
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1
  },
  testResultSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0'
  },
  testResultError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  testResultText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700'
  },
  testResultTextSuccess: {
    color: '#059669'
  },
  testResultTextError: {
    color: '#dc2626'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  btnTestServer: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnTestServerText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284c7'
  },
  btnSaveServer: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.firePrimary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnSaveServerText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff'
  },
  btnResetServer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8
  },
  btnResetServerText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textMuted
  }
});
