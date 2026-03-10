import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import { getDetalleRecibida, Comunicacion } from '../../api/comunicaciones';
import { useBadgeStore } from '../../store/badgeStore';

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

export default function BandejaDetailScreen({ route }: { route: any }) {
  const { id } = route.params as { id: number; titulo?: string };
  const refreshBadge = useBadgeStore((s) => s.refresh);
  const [mensaje, setMensaje] = useState<Comunicacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDetalleRecibida(id);
      setMensaje(data);
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al cargar el mensaje.';
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
      // Refresh badge after viewing — backend marks message as read on load
      return () => { refreshBadge(); };
    }, [load, refreshBadge])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error || !mensaje) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'No encontrado'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.75}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tipoColors = TIPO_COLORS[mensaje.tipo] ?? TIPO_COLORS.notificacion;
  const prioridadColors = PRIORIDAD_COLORS[mensaje.prioridad] ?? PRIORIDAD_COLORS.normal;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Título */}
      <Text style={styles.titulo}>{mensaje.titulo}</Text>

      {/* Remitente */}
      <View style={styles.metaRow}>
        <Icon source="account-circle-outline" size={16} color="#888" />
        <Text style={styles.metaLabel}>De: </Text>
        <Text style={styles.metaValue}>{mensaje.remitente ?? '—'}</Text>
      </View>

      {/* Fecha */}
      <View style={styles.metaRow}>
        <Icon source="clock-outline" size={16} color="#888" />
        <Text style={styles.metaLabel}>Recibido: </Text>
        <Text style={styles.metaValue}>{formatDate(mensaje.fecha_envio ?? mensaje.created_at)}</Text>
      </View>

      {/* Chips */}
      <View style={styles.chipsRow}>
        <View style={[styles.chip, { backgroundColor: tipoColors.bg }]}>
          <Text style={[styles.chipText, { color: tipoColors.text }]}>
            {mensaje.tipo_display ?? mensaje.tipo}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: prioridadColors.bg }]}>
          <Text style={[styles.chipText, { color: prioridadColors.text }]}>
            {mensaje.prioridad_display ?? mensaje.prioridad}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Contenido */}
      <Text style={styles.contenido}>{mensaje.contenido}</Text>

      {/* Archivos adjuntos */}
      {mensaje.archivos_adjuntos && mensaje.archivos_adjuntos.length > 0 && (
        <View style={styles.adjuntosCard}>
          <Text style={styles.adjuntosTitle}>Archivos adjuntos</Text>
          {mensaje.archivos_adjuntos.map((a) => (
            <View key={a.id} style={styles.adjuntoItem}>
              <Icon source="paperclip" size={16} color="#666" />
              <Text style={styles.adjuntoNombre}>{a.nombre}</Text>
            </View>
          ))}
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
    padding: 20,
    paddingBottom: 40,
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
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 14,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: '#888',
    marginLeft: 4,
  },
  metaValue: {
    fontSize: 13,
    color: '#444',
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 16,
  },
  contenido: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  adjuntosCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  adjuntosTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    marginBottom: 10,
  },
  adjuntoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  adjuntoNombre: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
});
