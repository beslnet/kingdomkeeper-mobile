import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import {
  verificarEliminacion,
  eliminarCuenta,
  VerificarEliminacionResponse,
} from '../api/auth';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

export default function DeleteAccountScreen() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [verificacion, setVerificacion] = useState<VerificarEliminacionResponse | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState<'info' | 'confirm'>('info');

  const fetchVerificacion = useCallback(async () => {
    try {
      setLoading(true);
      const data = await verificarEliminacion();
      setVerificacion(data);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo verificar el estado de tu cuenta.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerificacion();
  }, [fetchVerificacion]);

  const handleDelete = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Ingresa tu contraseña para confirmar.');
      return;
    }

    Alert.alert(
      '⚠️ Última confirmación',
      '¿Estás completamente seguro? Esta acción desactivará tu cuenta. Después de 30 días, tus datos personales serán anonimizados de forma irreversible.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar mi cuenta',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await eliminarCuenta(password);
              Alert.alert(
                'Cuenta desactivada',
                'Tu cuenta ha sido desactivada. Si cambias de opinión, contacta a soporte@kingdomkeeper.church dentro de los próximos 30 días.',
                [{ text: 'Entendido', onPress: () => logout() }]
              );
            } catch (err: any) {
              const msg =
                err?.response?.data?.error ||
                err?.response?.data?.detail ||
                'No se pudo eliminar la cuenta. Verifica tu contraseña.';
              Alert.alert('Error', msg);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  const canDelete = verificacion?.puede_eliminar ?? false;
  const iglesiasAdmin = verificacion?.iglesias_administradas ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Warning banner */}
      <View style={styles.warningBanner}>
        <Icon source="alert-circle-outline" size={24} color="#D35400" />
        <Text style={styles.warningTitle}>Eliminar cuenta</Text>
        <Text style={styles.warningText}>
          Esta acción es permanente. Lee atentamente antes de continuar.
        </Text>
      </View>

      {step === 'info' && (
        <>
          {/* What happens section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>¿Qué ocurre al eliminar tu cuenta?</Text>

            <View style={styles.infoRow}>
              <Icon source="clock-outline" size={20} color={PANTONE_295C} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Desactivación inmediata</Text>
                <Text style={styles.infoDesc}>
                  Tu cuenta se desactiva al instante. No podrás iniciar sesión.
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon source="calendar-clock" size={20} color={PANTONE_295C} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Período de gracia: 30 días</Text>
                <Text style={styles.infoDesc}>
                  Durante 30 días puedes revertir la eliminación contactando a soporte@kingdomkeeper.church.
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon source="account-off-outline" size={20} color={PANTONE_295C} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Anonimización después de 30 días</Text>
                <Text style={styles.infoDesc}>
                  Tus datos personales (nombre, email, teléfono, documento) serán eliminados de forma irreversible.
                  En los registros históricos figurarás como "Usuario eliminado".
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon source="database-outline" size={20} color={PANTONE_295C} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Registros históricos</Text>
                <Text style={styles.infoDesc}>
                  Los registros de asistencia, transacciones y préstamos se conservan de forma anonimizada
                  para preservar la integridad operativa de la iglesia.
                </Text>
              </View>
            </View>
          </View>

          {/* Admin blocker */}
          {!canDelete && iglesiasAdmin.length > 0 && (
            <View style={styles.blockerSection}>
              <Icon source="shield-alert-outline" size={24} color="#C0392B" />
              <Text style={styles.blockerTitle}>
                No puedes eliminar tu cuenta aún
              </Text>
              <Text style={styles.blockerDesc}>
                Eres administrador de {iglesiasAdmin.length === 1 ? 'una organización' : `${iglesiasAdmin.length} organizaciones`}.
                Debes transferir la administración antes de poder eliminar tu cuenta.
              </Text>

              {iglesiasAdmin.map((ig) => (
                <View key={ig.id} style={styles.iglesiaRow}>
                  <Icon source="church" size={18} color={PANTONE_295C} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.iglesiaName}>{ig.nombre}</Text>
                    <Text style={styles.iglesiaAdmins}>
                      {ig.otros_admins > 0
                        ? `${ig.otros_admins} otro(s) administrador(es)`
                        : 'Eres el único administrador'}
                    </Text>
                  </View>
                </View>
              ))}

              <Text style={styles.blockerHelp}>
                Transfiere la administración desde el panel web en Configuración → Administradores,
                o contacta a soporte@kingdomkeeper.church.
              </Text>
            </View>
          )}

          {/* Proceed button */}
          {canDelete && (
            <TouchableOpacity
              style={styles.proceedButton}
              onPress={() => setStep('confirm')}
              activeOpacity={0.8}
            >
              <Text style={styles.proceedButtonText}>
                Entiendo, deseo continuar
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {step === 'confirm' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirma tu identidad</Text>
          <Text style={styles.confirmDesc}>
            Ingresa tu contraseña actual para confirmar la eliminación de tu cuenta
            ({user?.email}).
          </Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Contraseña actual"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Icon
                source={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.deleteButton, deleting && { opacity: 0.6 }]}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon source="delete-forever-outline" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>Eliminar mi cuenta</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => {
              setStep('info');
              setPassword('');
            }}
          >
            <Text style={styles.backLinkText}>← Volver</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  warningBanner: {
    backgroundColor: '#FFF3E0',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#F39C12',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D35400',
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#7F6543',
    textAlign: 'center',
    marginTop: 6,
  },

  section: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PANTONE_295C,
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: { flex: 1, marginLeft: 12 },
  infoLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  infoDesc: { fontSize: 13, color: '#666', lineHeight: 19 },

  blockerSection: {
    backgroundColor: '#FDEDEC',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1948A',
    alignItems: 'center',
  },
  blockerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C0392B',
    marginTop: 8,
    textAlign: 'center',
  },
  blockerDesc: {
    fontSize: 13,
    color: '#7B241C',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },

  iglesiaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    width: '100%',
  },
  iglesiaName: { fontSize: 14, fontWeight: '600', color: '#333' },
  iglesiaAdmins: { fontSize: 12, color: '#888', marginTop: 2 },

  blockerHelp: {
    fontSize: 12,
    color: '#7B241C',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },

  proceedButton: {
    backgroundColor: '#E74C3C',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  proceedButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  confirmDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E4EA',
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
  },
  eyeButton: { paddingHorizontal: 14 },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C0392B',
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  deleteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  backLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  backLinkText: { color: PANTONE_295C, fontSize: 14, fontWeight: '600' },
});
