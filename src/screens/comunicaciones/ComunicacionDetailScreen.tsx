import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import {
  obtenerComunicacion,
  enviarComunicacion,
  reintentarComunicacion,
  eliminarComunicacion,
  Comunicacion,
} from '../../api/comunicaciones';

const ESTADO_STYLES: Record<string, { bg: string; text: string }> = {
  borrador: { bg: '#FFF3E0', text: '#E65100' },
  programada: { bg: '#EDE7F6', text: '#6A1B9A' },
  enviada: { bg: '#E8F5E9', text: '#2E7D32' },
  enviada_con_fallos: { bg: '#FFF3E0', text: '#E65100' },
  fallida: { bg: '#FFEBEE', text: '#C62828' },
  cancelada: { bg: '#F5F5F5', text: '#757575' },
};

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  notificacion: { bg: '#EAF0FB', text: PANTONE_295C },
  anuncio: { bg: '#EAF0FB', text: PANTONE_295C },
  recordatorio: { bg: '#FFF3E0', text: '#E65100' },
  alerta: { bg: '#FFEBEE', text: '#B71C1C' },
};

const PRIORIDAD_COLORS: Record<string, { bg: string; text: string }> = {
  urgente: { bg: '#FFEBEE', text: '#B71C1C' },
  alta: { bg: '#FFF3E0', text: '#E65100' },
  normal: { bg: '#EAF0FB', text: PANTONE_295C },
  baja: { bg: '#F1F8E9', text: '#558B2F' },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ComunicacionDetailScreen({ route }: { route: any }) {
  const navigation = useNavigation<any>();
  const { id } = route.params as { id: number; titulo?: string };

  const [comunicacion, setComunicacion] = useState<Comunicacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerComunicacion(id);
      setComunicacion(data);
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al cargar la comunicación.';
      if (typeof d === 'string') msg = d;
      else if (d?.error) msg = d.error;
      else if (d?.detail) msg = d.detail;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleEnviar = async () => {
    if (!comunicacion) return;
    Alert.alert(
      'Confirmar envío',
      `¿Enviar "${comunicacion.titulo}" a ${comunicacion.num_destinatarios_display || comunicacion.num_destinatarios} destinatario(s)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setActionLoading(true);
            try {
              const result = await enviarComunicacion(id);
              const stats = result?.estadisticas ?? result;
              Alert.alert(
                'Enviado ✓',
                `Total: ${stats?.total ?? 0} | Enviados: ${stats?.enviados ?? 0} | Fallos: ${stats?.fallos ?? 0}`,
                [{ text: 'OK', onPress: load }]
              );
            } catch (err: any) {
              const d = err?.response?.data;
              let msg = 'Error al enviar.';
              if (typeof d === 'string') msg = d;
              else if (d?.error) msg = d.error;
              else if (d?.detail) msg = d.detail;
              Alert.alert('Error', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReintentar = async () => {
    if (!comunicacion) return;
    setActionLoading(true);
    try {
      const result = await reintentarComunicacion(id);
      const stats = result?.estadisticas ?? result;
      Alert.alert(
        'Reintento',
        `Total: ${stats?.total ?? 0} | Enviados: ${stats?.enviados ?? 0} | Fallos: ${stats?.fallos ?? 0}`,
        [{ text: 'OK', onPress: load }]
      );
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al reintentar.';
      if (typeof d === 'string') msg = d;
      else if (d?.error) msg = d.error;
      else if (d?.detail) msg = d.detail;
      Alert.alert('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEliminar = () => {
    if (!comunicacion) return;
    Alert.alert(
      'Eliminar comunicación',
      `¿Estás seguro de eliminar "${comunicacion.titulo}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await eliminarComunicacion(id);
              navigation.goBack();
            } catch (err: any) {
              const d = err?.response?.data;
              let msg = 'Error al eliminar.';
              if (typeof d === 'string') msg = d;
              else if (d?.error) msg = d.error;
              else if (d?.detail) msg = d.detail;
              Alert.alert('Error', msg);
            } finally {
              setActionLoading(false);
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

  if (error || !comunicacion) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'No encontrado'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.75}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const estadoStyle = ESTADO_STYLES[comunicacion.estado] ?? { bg: '#F5F5F5', text: '#757575' };
  const tipoStyle = TIPO_COLORS[comunicacion.tipo] ?? TIPO_COLORS.notificacion;
  const prioridadStyle = PRIORIDAD_COLORS[comunicacion.prioridad] ?? PRIORIDAD_COLORS.normal;

  const canEnviar = comunicacion.estado === 'borrador';
  const canReintentar =
    comunicacion.estado === 'fallida' || comunicacion.estado === 'enviada_con_fallos';
  const canEdit = comunicacion.estado === 'borrador';
  const canDelete = ['borrador', 'fallida', 'enviada_con_fallos', 'enviada'].includes(
    comunicacion.estado
  );
  const showStats = comunicacion.estado !== 'borrador';

  const dest = comunicacion.destinatarios_detalle ?? [];
  const gruposDest = comunicacion.grupos_destinatarios_detalle ?? [];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <View style={styles.headerCard}>
        <Text style={styles.titulo}>{comunicacion.titulo}</Text>
        <View style={styles.chipsRow}>
          <View style={[styles.chip, { backgroundColor: estadoStyle.bg }]}>
            <Text style={[styles.chipText, { color: estadoStyle.text }]}>
              {comunicacion.estado_display ?? comunicacion.estado}
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: tipoStyle.bg }]}>
            <Text style={[styles.chipText, { color: tipoStyle.text }]}>
              {comunicacion.tipo_display ?? comunicacion.tipo}
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: prioridadStyle.bg }]}>
            <Text style={[styles.chipText, { color: prioridadStyle.text }]}>
              {comunicacion.prioridad_display ?? comunicacion.prioridad}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Icon source="broadcast" size={14} color="#888" />
          <Text style={styles.metaText}>{comunicacion.canal_nombre ?? comunicacion.canal}</Text>
          {comunicacion.created_by && (
            <>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.metaText}>Por: {comunicacion.created_by}</Text>
            </>
          )}
        </View>
        {comunicacion.fecha_envio && (
          <View style={styles.metaRow}>
            <Icon source="clock-outline" size={14} color="#888" />
            <Text style={styles.metaText}>{formatDate(comunicacion.fecha_envio)}</Text>
          </View>
        )}
      </View>

      {/* Estadísticas */}
      {showStats && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Estadísticas de envío</Text>
          <View style={styles.statsRow}>
            <StatBox label="Enviados" value={comunicacion.estadisticas_envio.enviados} color="#2E7D32" />
            <StatBox label="Leídos" value={comunicacion.estadisticas_envio.leidos} color={PANTONE_295C} />
            <StatBox label="Fallos" value={comunicacion.estadisticas_envio.fallos} color="#C62828" />
            <StatBox label="Pendientes" value={comunicacion.estadisticas_envio.pendientes} />
          </View>
        </View>
      )}

      {/* Contenido */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Contenido</Text>
        {comunicacion.resumen ? (
          <Text style={styles.resumen}>{comunicacion.resumen}</Text>
        ) : null}
        <Text style={styles.contenido}>{comunicacion.contenido}</Text>
      </View>

      {/* Destinatarios */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Destinatarios ({comunicacion.num_destinatarios_display ?? comunicacion.num_destinatarios})
        </Text>
        {gruposDest.length > 0 && (
          <View style={styles.gruposRow}>
            {gruposDest.map((g) => (
              <View key={g.id} style={styles.grupoChip}>
                <Icon source="account-group-outline" size={14} color={PANTONE_295C} />
                <Text style={styles.grupoChipText}>
                  {g.nombre} ({g.num_miembros})
                </Text>
              </View>
            ))}
          </View>
        )}
        {dest.slice(0, 5).map((d) => (
          <View key={d.id} style={styles.destItem}>
            <Icon source="account-outline" size={16} color="#888" />
            <Text style={styles.destNombre}>{d.nombre}</Text>
          </View>
        ))}
        {dest.length > 5 && (
          <Text style={styles.masText}>y {dest.length - 5} más…</Text>
        )}
        {dest.length === 0 && gruposDest.length === 0 && (
          <Text style={styles.emptyText}>Sin destinatarios</Text>
        )}
      </View>

      {/* Acciones */}
      {(canEnviar || canReintentar || canEdit || canDelete) && (
        <View style={styles.actionsCard}>
          {canEnviar && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={handleEnviar}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Icon source="send" size={18} color="#FFF" />
                  <Text style={styles.actionBtnTextPrimary}>Enviar</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {canReintentar && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnRetry]}
              onPress={handleReintentar}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Icon source="refresh" size={18} color="#FFF" />
                  <Text style={styles.actionBtnTextPrimary}>Reintentar</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline]}
              onPress={() => navigation.navigate('ComunicacionForm', { comunicacion })}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Icon source="pencil-outline" size={18} color={PANTONE_295C} />
              <Text style={styles.actionBtnTextOutline}>Editar</Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={handleEliminar}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Icon source="delete-outline" size={18} color="#C62828" />
              <Text style={styles.actionBtnTextDanger}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 14,
    paddingBottom: 40,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#E53935',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 12,
    lineHeight: 26,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
  },
  metaSep: {
    fontSize: 12,
    color: '#CCC',
    marginHorizontal: 2,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  resumen: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 20,
  },
  contenido: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  gruposRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  grupoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF0FB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  grupoChipText: {
    fontSize: 12,
    color: PANTONE_295C,
    fontWeight: '600',
  },
  destItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  destNombre: {
    fontSize: 14,
    color: '#444',
  },
  masText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
  },
  actionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 13,
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: PANTONE_295C,
  },
  actionBtnRetry: {
    backgroundColor: '#E65100',
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: PANTONE_295C,
    backgroundColor: '#FFF',
  },
  actionBtnDanger: {
    borderWidth: 1.5,
    borderColor: '#C62828',
    backgroundColor: '#FFF',
  },
  actionBtnTextPrimary: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  actionBtnTextOutline: {
    color: PANTONE_295C,
    fontWeight: '700',
    fontSize: 15,
  },
  actionBtnTextDanger: {
    color: '#C62828',
    fontWeight: '700',
    fontSize: 15,
  },
});
