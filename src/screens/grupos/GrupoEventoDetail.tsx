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
import { obtenerEvento, eliminarEvento } from '../../api/eventos';
import { PANTONE_295C } from '../../theme/colors';

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()} de ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getEstadoStyle(estado: string): { bg: string; text: string } {
  switch (estado) {
    case 'planificado': return { bg: '#E3F2FD', text: '#1565C0' };
    case 'abierto': return { bg: '#E8F5E9', text: '#2E7D32' };
    case 'en_curso': return { bg: '#FFF8E1', text: '#F57F17' };
    case 'finalizado': return { bg: '#F5F5F5', text: '#757575' };
    case 'cancelado': return { bg: '#FFEBEE', text: '#C62828' };
    default: return { bg: '#F5F5F5', text: '#555' };
  }
}

export default function GrupoEventoDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { eventoId, grupoId, grupo } = route.params ?? {};

  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const user = useAuthStore((s) => s.user);

  const [evento, setEvento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await obtenerEvento(eventoId);
      setEvento(result);
      navigation.setOptions({ title: result.titulo || 'Evento' });
    } catch {
      setError('No se pudo cargar el evento. Toca para reintentar.');
    }
  }, [eventoId, navigation]);

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

  if (error || !evento) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => { setLoading(true); load().finally(() => setLoading(false)); }}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error ?? 'Evento no encontrado'}</Text>
      </TouchableOpacity>
    );
  }

  // Permission checks
  const miembroId = user?.miembro_id;
  const esLiderPrincipal = miembroId && grupo && Number(miembroId) === Number(grupo.lider_id);
  const esCoLider = miembroId && grupo?.miembros?.some(
    (m: any) => Number(m.miembro_id) === Number(miembroId) && m.rol_en_grupo === 'co_leader'
  );
  const isLeader = isSuperAdmin || hasAnyRole(['church_admin', 'pastor']) || esLiderPrincipal || esCoLider;

  const esPasado = evento.fecha_inicio ? new Date(evento.fecha_inicio) < new Date() : false;
  const canEdit = isLeader && !esPasado && evento.estado !== 'cancelado' && evento.estado !== 'finalizado';
  const canDelete = isLeader && evento.estado === 'planificado';
  const canRegisterAttendance = isLeader && evento.estado !== 'cancelado';
  const canViewAttendance = true; // all users can view

  const handleDelete = () => {
    Alert.alert(
      'Eliminar evento',
      `¿Estás seguro de eliminar "${evento.titulo}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarEvento(evento.id);
              navigation.goBack();
            } catch (err: any) {
              const msg = err?.response?.data?.detail ?? 'No se pudo eliminar el evento.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const estadoStyle = getEstadoStyle(evento.estado);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
    >
      {/* Header card */}
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.titulo}>{evento.titulo}</Text>
          <View style={[styles.chip, { backgroundColor: estadoStyle.bg }]}>
            <Text style={[styles.chipText, { color: estadoStyle.text }]}>
              {evento.estado_display ?? evento.estado}
            </Text>
          </View>
        </View>

        {evento.tipo_display || evento.tipo ? (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{evento.tipo_display ?? evento.tipo}</Text>
          </View>
        ) : null}

        {evento.descripcion ? (
          <Text style={styles.description}>{evento.descripcion}</Text>
        ) : null}

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <Icon source="calendar-clock" size={16} color="#666" />
            <Text style={styles.metaLabel}>Inicio:</Text>
            <Text style={styles.metaValue}>{formatDate(evento.fecha_inicio)}</Text>
          </View>
          {evento.fecha_fin ? (
            <View style={styles.metaRow}>
              <Icon source="calendar-clock" size={16} color="#666" />
              <Text style={styles.metaLabel}>Fin:</Text>
              <Text style={styles.metaValue}>{formatDate(evento.fecha_fin)}</Text>
            </View>
          ) : null}
          {evento.es_online ? (
            <View style={styles.metaRow}>
              <Icon source="video-outline" size={16} color="#666" />
              <Text style={styles.metaValue}>Evento online</Text>
            </View>
          ) : evento.ubicacion ? (
            <View style={styles.metaRow}>
              <Icon source="map-marker-outline" size={16} color="#666" />
              <Text style={styles.metaValue} numberOfLines={2}>{evento.ubicacion}</Text>
            </View>
          ) : null}
          {evento.capacidad_maxima != null ? (
            <View style={styles.metaRow}>
              <Icon source="account-multiple-outline" size={16} color="#666" />
              <Text style={styles.metaLabel}>Capacidad:</Text>
              <Text style={styles.metaValue}>{evento.capacidad_maxima}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Icon source="account-check-outline" size={16} color="#666" />
            <Text style={styles.metaLabel}>Asistentes:</Text>
            <Text style={styles.metaValue}>
              {evento.miembros_grupo_asistieron ?? 0} del grupo
              {(evento.total_asistieron ?? 0) > (evento.miembros_grupo_asistieron ?? 0)
                ? ` + ${(evento.total_asistieron ?? 0) - (evento.miembros_grupo_asistieron ?? 0)} otros`
                : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsCard}>
        {canViewAttendance ? (
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('VerAsistencia', { eventoId: evento.id, titulo: evento.titulo })}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Icon source="account-check-outline" size={20} color="#2E7D32" />
            </View>
            <Text style={styles.actionLabel}>Ver asistencia</Text>
            <Icon source="chevron-right" size={20} color="#BBB" />
          </TouchableOpacity>
        ) : null}

        {canRegisterAttendance ? (
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('RegistrarAsistencia', { eventoId: evento.id, titulo: evento.titulo, grupoId })}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Icon source="clipboard-check-outline" size={20} color={PANTONE_295C} />
            </View>
            <Text style={styles.actionLabel}>Registrar asistencia</Text>
            <Icon source="chevron-right" size={20} color="#BBB" />
          </TouchableOpacity>
        ) : null}

        {canEdit ? (
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('GrupoEventoForm', { grupoId, evento })}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFF8E1' }]}>
              <Icon source="pencil-outline" size={20} color="#F57F17" />
            </View>
            <Text style={styles.actionLabel}>Editar evento</Text>
            <Icon source="chevron-right" size={20} color="#BBB" />
          </TouchableOpacity>
        ) : null}

        {canDelete ? (
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFEBEE' }]}>
              <Icon source="trash-can-outline" size={20} color="#C62828" />
            </View>
            <Text style={[styles.actionLabel, { color: '#C62828' }]}>Eliminar evento</Text>
            <Icon source="chevron-right" size={20} color="#BBB" />
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  card: {
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  titulo: { fontSize: 20, fontWeight: '700', color: '#222', flex: 1, marginRight: 10 },
  chip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
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
  description: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 12 },
  metaList: { gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  metaLabel: { fontSize: 13, color: '#666', fontWeight: '600' },
  metaValue: { fontSize: 13, color: '#333', flex: 1 },
  actionsCard: {
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
});
