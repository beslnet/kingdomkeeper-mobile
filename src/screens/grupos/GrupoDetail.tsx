import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { useAuthStore } from '../../store/authStore';
import { obtenerGrupo, eliminarGrupo, archivarGrupo, restaurarGrupo } from '../../api/grupos';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';

type SectionItem = {
  icon: string;
  label: string;
  screen: string;
  badgeCount?: number;
  restricted?: boolean;
};

function SectionRow({
  item,
  grupoId,
  grupoNombre,
}: {
  item: SectionItem;
  grupoId: number;
  grupoNombre: string;
}) {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      style={styles.sectionRow}
      onPress={() => navigation.navigate(item.screen, { grupoId, grupoNombre })}
      activeOpacity={0.7}
    >
      <View style={styles.sectionIconWrapper}>
        <Icon source={item.icon} size={22} color={PANTONE_295C} />
      </View>
      <Text style={styles.sectionLabel}>{item.label}</Text>
      {item.badgeCount != null && item.badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badgeCount}</Text>
        </View>
      ) : null}
      <Icon source="chevron-right" size={20} color="#BBB" />
    </TouchableOpacity>
  );
}

export default function GrupoDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id, nombre } = route.params ?? {};

  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const user = useAuthStore((s) => s.user);

  const [grupo, setGrupo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await obtenerGrupo(id);
      setGrupo(result);
      navigation.setOptions({ title: result.nombre || nombre || 'Grupo' });
    } catch {
      setError('No se pudo cargar el grupo. Toca para reintentar.');
    }
  }, [id, nombre, navigation]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => { setLoading(true); load().finally(() => setLoading(false)); }}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
      </TouchableOpacity>
    );
  }

  const grupoNombre = grupo?.nombre ?? nombre ?? 'Grupo';

  // puedeGestionar: replicates web frontend logic (ListadoGrupos.jsx)
  const miembroId = user?.miembro_id;
  const esLiderPrincipal = miembroId && grupo && Number(miembroId) === Number(grupo.lider_id);
  const esCoLider = miembroId && grupo?.miembros?.some(
    (m: any) => Number(m.miembro_id) === Number(miembroId) && m.rol_en_grupo === 'co_leader'
  );
  const puedeGestionar = isSuperAdmin || hasAnyRole(['church_admin']) || esLiderPrincipal || esCoLider;
  const puedeEliminar = isSuperAdmin || hasAnyRole(['church_admin']) || hasPermission('grupos', 'eliminar');
  const estaArchivado = grupo?.estado === 'archivado';
  const tieneRegistros = grupo?.tiene_registros === true;

  const handleEdit = () => {
    navigation.navigate('GrupoForm', { grupo });
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar grupo',
      `¿Estás seguro de que deseas eliminar "${grupoNombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarGrupo(id);
              navigation.navigate('GruposList', { refresh: Date.now() });
            } catch (err: any) {
              const msg = err?.response?.data?.detail ?? err?.response?.data?.error ?? 'No se pudo eliminar el grupo.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const handleArchivar = () => {
    Alert.alert(
      'Archivar grupo',
      `El grupo "${grupoNombre}" tiene miembros o registros asociados.\n\nArchivarlo lo ocultará del listado principal, pero sus datos se conservarán y podrás restaurarlo cuando quieras.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await archivarGrupo(id);
              navigation.navigate('GruposList', { refresh: Date.now() });
            } catch (err: any) {
              const msg = err?.response?.data?.error ?? 'No se pudo archivar el grupo.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const handleRestaurar = () => {
    Alert.alert(
      'Restaurar grupo',
      `¿Deseas restaurar "${grupoNombre}"? Volverá a aparecer en el listado principal con estado activo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            try {
              await restaurarGrupo(id);
              navigation.navigate('GruposList', { refresh: Date.now() });
            } catch (err: any) {
              const msg = err?.response?.data?.error ?? 'No se pudo restaurar el grupo.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };
  const canSeeFinanzas =
    isSuperAdmin ||
    hasPermission('finanzas', 'ver') ||
    hasAnyRole(['church_admin', 'pastor', 'leader']);

  const sections: SectionItem[] = [
    { icon: 'account-multiple-outline', label: 'Miembros', screen: 'GrupoMiembros', badgeCount: grupo?.total_miembros },
    { icon: 'crown-outline', label: 'Liderazgo', screen: 'GrupoLiderazgo' },
    { icon: 'calendar-outline', label: 'Eventos', screen: 'GrupoEventos' },
    ...(canSeeFinanzas ? [{ icon: 'cash-multiple', label: 'Finanzas', screen: 'GrupoFinanzas' }] : []),
    { icon: 'folder-outline', label: 'Recursos', screen: 'GrupoRecursos' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
    >
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.grupoName}>{grupoNombre}</Text>
          {grupo?.estado_display || grupo?.estado ? (
            <View style={[styles.chip, getEstadoStyle(grupo.estado)]}>
              <Text style={[styles.chipText, getEstadoTextStyle(grupo.estado)]}>
                {grupo.estado_display ?? grupo.estado}
              </Text>
            </View>
          ) : null}
        </View>
        {grupo?.tipo_display || grupo?.tipo ? (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{grupo.tipo_display ?? grupo.tipo}</Text>
          </View>
        ) : null}
        {grupo?.descripcion ? (
          <Text style={styles.description}>{grupo.descripcion}</Text>
        ) : null}
        <View style={styles.metaSection}>
          {grupo?.lider_nombre ? (
            <View style={styles.metaRow}>
              <Icon source="account-outline" size={16} color="#666" />
              <Text style={styles.metaLabel}>Líder:</Text>
              <Text style={styles.metaValue}>{grupo.lider_nombre}</Text>
            </View>
          ) : null}
          {grupo?.total_miembros != null ? (
            <View style={styles.metaRow}>
              <Icon source="account-multiple-outline" size={16} color="#666" />
              <Text style={styles.metaLabel}>Miembros:</Text>
              <Text style={styles.metaValue}>{grupo.total_miembros}</Text>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        {(puedeGestionar || puedeEliminar) ? (
          <View style={styles.actionsRow}>
            {puedeGestionar && !estaArchivado ? (
              <TouchableOpacity style={styles.actionBtn} onPress={handleEdit} activeOpacity={0.8}>
                <Icon source="pencil-outline" size={16} color={PANTONE_295C} />
                <Text style={styles.actionBtnText}>Editar</Text>
              </TouchableOpacity>
            ) : null}
            {puedeEliminar && estaArchivado ? (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSuccess]} onPress={handleRestaurar} activeOpacity={0.8}>
                <Icon source="restore" size={16} color="#2E7D32" />
                <Text style={styles.actionBtnTextSuccess}>Restaurar</Text>
              </TouchableOpacity>
            ) : null}
            {puedeEliminar && !estaArchivado ? (
              tieneRegistros ? (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWarning]} onPress={handleArchivar} activeOpacity={0.8}>
                  <Icon source="archive-arrow-down-outline" size={16} color="#E65100" />
                  <Text style={styles.actionBtnTextWarning}>Archivar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleDelete} activeOpacity={0.8}>
                  <Icon source="trash-can-outline" size={16} color="#E53935" />
                  <Text style={styles.actionBtnTextDanger}>Eliminar</Text>
                </TouchableOpacity>
              )
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Section menu */}
      <View style={styles.sectionMenu}>
        {sections.map((item) => (
          <SectionRow key={item.screen} item={item} grupoId={id} grupoNombre={grupoNombre} />
        ))}
      </View>
    </ScrollView>
  );
}

function getEstadoStyle(estado: string) {
  switch (estado) {
    case 'activo': return { backgroundColor: '#E8F5E9' };
    case 'inactivo': return { backgroundColor: '#F5F5F5' };
    case 'suspendido': return { backgroundColor: '#FFF3E0' };
    case 'archivado': return { backgroundColor: '#ECEFF1' };
    default: return { backgroundColor: '#E3F2FD' };
  }
}

function getEstadoTextStyle(estado: string) {
  switch (estado) {
    case 'activo': return { color: '#2E7D32' };
    case 'inactivo': return { color: '#757575' };
    case 'suspendido': return { color: '#E65100' };
    case 'archivado': return { color: '#546E7A' };
    default: return { color: '#1565C0' };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  headerCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  grupoName: { fontSize: 20, fontWeight: '700', color: '#222', flex: 1, marginRight: 8 },
  chip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '600' },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  typeBadgeText: { fontSize: 12, color: PANTONE_295C, fontWeight: '500' },
  description: { fontSize: 14, color: '#555', marginBottom: 12, lineHeight: 20 },
  metaSection: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  metaValue: { fontSize: 13, color: '#333' },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: PANTONE_295C,
    borderRadius: 20,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  actionBtnText: { fontSize: 14, color: PANTONE_295C, fontWeight: '600' },
  actionBtnDanger: { borderColor: '#E53935' },
  actionBtnTextDanger: { fontSize: 14, color: '#E53935', fontWeight: '600' },
  actionBtnWarning: { borderColor: '#E65100' },
  actionBtnTextWarning: { fontSize: 14, color: '#E65100', fontWeight: '600' },
  actionBtnSuccess: { borderColor: '#2E7D32' },
  actionBtnTextSuccess: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  sectionMenu: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionIconWrapper: { marginRight: 14 },
  sectionLabel: { flex: 1, fontSize: 15, color: '#333' },
  badge: {
    backgroundColor: PANTONE_295C,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginRight: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
