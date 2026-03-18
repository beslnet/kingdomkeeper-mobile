import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import {
  getMiembro,
  getHistorialMembresia,
  archivarMiembro,
  convertirAUsuario,
  reenviarInvitacion,
  Miembro,
  HistorialMembresia,
  getEstadoMembresiaColor,
  getEstadoMembresiaLabel,
} from '../../api/miembros';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon source={icon} size={18} color={PANTONE_295C} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export default function MiembroDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { miembroId } = route.params;

  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);

  const canEdit = isSuperAdmin || hasPermission('membresia', 'crear');
  const canDelete = isSuperAdmin || hasPermission('membresia', 'eliminar');

  const [miembro, setMiembro] = useState<Miembro | null>(null);
  const [historial, setHistorial] = useState<HistorialMembresia[]>([]);
  const [loading, setLoading] = useState(true);
  const [historialExpanded, setHistorialExpanded] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [m, h] = await Promise.all([
        getMiembro(miembroId),
        getHistorialMembresia(miembroId).catch(() => []),
      ]);
      setMiembro(m);
      setHistorial(h);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el miembro.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [miembroId, navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    navigation.navigate('MiembroForm', { miembro });
  };

  const handleArchive = () => {
    Alert.alert(
      'Archivar miembro',
      `¿Seguro que deseas archivar a ${miembro?.nombre} ${miembro?.apellidos}? Podrás reactivarlo más tarde.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: async () => {
            setArchiveLoading(true);
            try {
              await archivarMiembro(miembroId);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'No se pudo archivar el miembro.');
            } finally {
              setArchiveLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleConvertirUsuario = async () => {
    setConvertModalVisible(false);
    setUserActionLoading(true);
    try {
      const result = await convertirAUsuario(miembroId);
      Alert.alert(
        'Cuenta creada',
        `Se envió una invitación a ${result.email_pendiente}. El miembro deberá activar su cuenta.`,
      );
      await loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ??
        err?.response?.data?.detail ??
        'No se pudo crear la cuenta.';
      Alert.alert('Error', msg);
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleReenviarInvitacion = async () => {
    if (!miembro?.usuario_asociado?.email_pendiente && !miembro?.email) return;
    const email = (miembro.usuario_asociado?.email_pendiente ?? miembro.email)!;
    setUserActionLoading(true);
    try {
      await reenviarInvitacion(email);
      Alert.alert('Enviado', `Se reenvió la invitación a ${email}.`);
    } catch {
      Alert.alert('Error', 'No se pudo reenviar la invitación.');
    } finally {
      setUserActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (!miembro) return null;

  const estadoColor = getEstadoMembresiaColor(miembro.estado_membresia);
  const nombreCompleto = `${miembro.nombre} ${miembro.apellidos}`;

  const usuarioEstado = miembro.usuario_asociado?.estado;
  const enEliminacion = miembro.usuario_asociado?.cuenta_en_eliminacion === true;
  const showConvertirBtn = !miembro.usuario_asociado;
  const showReenviarBtn = usuarioEstado === 'pendiente_activacion';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerAvatar}>
            <Icon source="account" size={52} color={PANTONE_134C} />
          </View>
          <Text style={styles.headerName}>{nombreCompleto}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: estadoColor.bg }]}>
            <Text style={[styles.estadoBadgeText, { color: estadoColor.text }]}>
              {getEstadoMembresiaLabel(miembro.estado_membresia)}
            </Text>
          </View>
        </View>

        {/* Deletion warning banner */}
        {enEliminacion && (
          <View style={styles.deletionBanner}>
            <Icon source="account-remove-outline" size={18} color="#B71C1C" />
            <Text style={styles.deletionBannerText}>
              Este usuario tiene una solicitud de eliminación de cuenta pendiente.
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {canEdit && (
            <TouchableOpacity
              style={[styles.actionBtn, enEliminacion && styles.actionBtnDisabled]}
              onPress={handleEdit}
              disabled={enEliminacion}
              activeOpacity={0.75}
            >
              <Icon source="pencil-outline" size={20} color={enEliminacion ? '#CCC' : PANTONE_295C} />
              <Text style={[styles.actionBtnText, enEliminacion && styles.actionBtnTextDisabled]}>Editar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate('FamilyMiembro', {
                miembroId: miembro.id,
                miembroNombre: nombreCompleto,
                cuentaEnEliminacion: enEliminacion,
              })
            }
            activeOpacity={0.75}
          >
            <Icon source="account-multiple-outline" size={20} color={PANTONE_295C} />
            <Text style={styles.actionBtnText}>Familia</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate('BitacoraMiembro', {
                miembroId: miembro.id,
                miembroNombre: nombreCompleto,
                cuentaEnEliminacion: enEliminacion,
              })
            }
            activeOpacity={0.75}
          >
            <Icon source="notebook-outline" size={20} color={PANTONE_295C} />
            <Text style={styles.actionBtnText}>Bitácora</Text>
          </TouchableOpacity>
          {canDelete && (
            <TouchableOpacity
              style={[styles.actionBtn, archiveLoading && styles.actionBtnDisabled]}
              onPress={handleArchive}
              disabled={archiveLoading}
              activeOpacity={0.75}
            >
              {archiveLoading ? (
                <ActivityIndicator size="small" color="#E53935" />
              ) : (
                <Icon source="archive-outline" size={20} color="#E53935" />
              )}
              <Text style={[styles.actionBtnText, { color: '#E53935' }]}>Archivar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Datos personales */}
        <SectionTitle title="Datos personales" />
        <SectionCard>
          <InfoRow icon="cake-variant-outline" label="Fecha de nacimiento" value={formatDate(miembro.fecha_nacimiento)} />
          <InfoRow
            icon="gender-male-female"
            label="Género"
            value={miembro.genero === 'M' ? 'Masculino' : miembro.genero === 'F' ? 'Femenino' : undefined}
          />
          <InfoRow icon="card-account-details-outline" label="Documento" value={miembro.documento_identidad} />
          <InfoRow
            icon="card-bulleted-outline"
            label="Tipo de documento"
            value={miembro.tipo_documento?.toUpperCase()}
          />
          <InfoRow icon="calendar-check-outline" label="Fecha de ingreso" value={formatDate(miembro.fecha_ingreso)} />
        </SectionCard>

        {/* Contacto */}
        <SectionTitle title="Contacto" />
        <SectionCard>
          {miembro.telefono ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${miembro.telefono}`)}
              activeOpacity={0.7}
            >
              <InfoRow icon="phone-outline" label="Teléfono" value={miembro.telefono} />
            </TouchableOpacity>
          ) : (
            <InfoRow icon="phone-outline" label="Teléfono" value={undefined} />
          )}
          {miembro.email ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${miembro.email}`)}
              activeOpacity={0.7}
            >
              <InfoRow icon="email-outline" label="Email" value={miembro.email} />
            </TouchableOpacity>
          ) : (
            <InfoRow icon="email-outline" label="Email" value={undefined} />
          )}
          {!miembro.telefono && !miembro.email && (
            <Text style={styles.noDataText}>Sin datos de contacto</Text>
          )}
        </SectionCard>

        {/* Dirección */}
        {(miembro.direccion_formateada || miembro.ciudad) && (
          <>
            <SectionTitle title="Dirección" />
            <SectionCard>
              <InfoRow icon="map-marker-outline" label="Dirección" value={miembro.direccion_formateada} />
              <InfoRow icon="city-variant-outline" label="Ciudad" value={miembro.ciudad} />
              <InfoRow icon="map-outline" label="Región" value={miembro.region} />
              <InfoRow icon="earth" label="País" value={miembro.pais} />
            </SectionCard>
          </>
        )}

        {/* Cuenta de usuario */}
        <SectionTitle title="Cuenta de usuario" />
        <SectionCard>
          {miembro.usuario_asociado ? (
            <>
              <InfoRow icon="account-circle-outline" label="Email de cuenta" value={miembro.usuario_asociado.email} />
              <InfoRow
                icon="shield-check-outline"
                label="Estado cuenta"
                value={
                  enEliminacion
                    ? 'En proceso de eliminación'
                    : miembro.usuario_asociado.estado === 'activo'
                    ? 'Activo'
                    : miembro.usuario_asociado.estado === 'pendiente_activacion'
                    ? 'Pendiente de activación'
                    : miembro.usuario_asociado.estado === 'suspendido'
                    ? 'Suspendido'
                    : miembro.usuario_asociado.estado
                }
              />
              {showReenviarBtn && !enEliminacion && (
                <TouchableOpacity
                  style={styles.userActionBtn}
                  onPress={handleReenviarInvitacion}
                  disabled={userActionLoading}
                  activeOpacity={0.75}
                >
                  {userActionLoading ? (
                    <ActivityIndicator size="small" color={PANTONE_295C} />
                  ) : (
                    <Icon source="email-send-outline" size={18} color={PANTONE_295C} />
                  )}
                  <Text style={styles.userActionBtnText}>Reenviar invitación</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={styles.noDataText}>Este miembro no tiene cuenta de usuario.</Text>
              {canEdit && showConvertirBtn && (
                <TouchableOpacity
                  style={styles.userActionBtn}
                  onPress={() => setConvertModalVisible(true)}
                  disabled={userActionLoading}
                  activeOpacity={0.75}
                >
                  {userActionLoading ? (
                    <ActivityIndicator size="small" color={PANTONE_295C} />
                  ) : (
                    <Icon source="account-plus-outline" size={18} color={PANTONE_295C} />
                  )}
                  <Text style={styles.userActionBtnText}>Crear cuenta de usuario</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </SectionCard>

        {/* Historial de membresía */}
        {historial.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setHistorialExpanded((v) => !v)}
              activeOpacity={0.75}
            >
              <Text style={styles.sectionTitle}>Historial de membresía</Text>
              <Icon
                source={historialExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#888"
              />
            </TouchableOpacity>
            {historialExpanded && (
              <SectionCard>
                {historial.map((h, i) => (
                  <View
                    key={h.id}
                    style={[styles.historialItem, i < historial.length - 1 && styles.historialDivider]}
                  >
                    <Icon source="history" size={16} color={PANTONE_295C} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.historialDesc}>{h.descripcion}</Text>
                      {h.iglesia_nombre ? (
                        <Text style={styles.historialMeta}>{h.iglesia_nombre}</Text>
                      ) : null}
                      <Text style={styles.historialMeta}>{formatDate(h.fecha)}</Text>
                    </View>
                  </View>
                ))}
              </SectionCard>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Convert to user confirmation modal */}
      <Modal
        visible={convertModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConvertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Icon source="account-plus-outline" size={40} color={PANTONE_295C} />
            <Text style={styles.confirmTitle}>Crear cuenta de usuario</Text>
            <Text style={styles.confirmBody}>
              Se enviará una invitación al email{' '}
              <Text style={{ fontWeight: '700' }}>{miembro.email}</Text> para que{' '}
              {miembro.nombre} active su cuenta en KingdomKeeper.
            </Text>
            {!miembro.email && (
              <Text style={styles.confirmWarning}>
                Este miembro no tiene email registrado. Agrega uno antes de continuar.
              </Text>
            )}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConvertModalVisible(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              {miembro.email && (
                <TouchableOpacity
                  style={styles.confirmOkBtn}
                  onPress={handleConvertirUsuario}
                  activeOpacity={0.75}
                >
                  <Text style={styles.confirmOkText}>Enviar invitación</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: PANTONE_295C,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  headerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  headerName: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  estadoBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  estadoBadgeText: { fontSize: 13, fontWeight: '600' },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnTextDisabled: { color: '#CCC' },
  actionBtnText: { fontSize: 11, color: PANTONE_295C, fontWeight: '500' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 6,
    marginHorizontal: 16,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoIcon: { marginRight: 12, marginTop: 1 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#999', marginBottom: 1 },
  infoValue: { fontSize: 15, color: '#222' },
  noDataText: { fontSize: 14, color: '#AAA', textAlign: 'center', paddingVertical: 12 },
  deletionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
    padding: 12,
  },
  deletionBannerText: { flex: 1, fontSize: 13, color: '#B71C1C', lineHeight: 18 },
  userActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  userActionBtnText: { fontSize: 14, color: PANTONE_295C, fontWeight: '600' },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  historialItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  historialDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  historialDesc: { fontSize: 14, color: '#333' },
  historialMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmModal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginTop: 12, marginBottom: 8 },
  confirmBody: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },
  confirmWarning: {
    fontSize: 13,
    color: '#E53935',
    textAlign: 'center',
    marginTop: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  confirmCancelText: { fontSize: 15, color: '#555' },
  confirmOkBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PANTONE_295C,
    alignItems: 'center',
  },
  confirmOkText: { fontSize: 15, color: '#FFF', fontWeight: '600' },
});
