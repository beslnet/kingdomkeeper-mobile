import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
  Linking,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { getDetalleRecibida } from '../api/comunicaciones';
import { PANTONE_295C } from '../theme/colors';

function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageDetailScreen() {
  const route = useRoute<any>();
  const { id } = route.params ?? {};

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getDetalleRecibida(id);
      setData(result);
    } catch {
      setError('No se pudo cargar el mensaje.');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error ?? 'Mensaje no encontrado.'}</Text>
      </View>
    );
  }

  const archivos: any[] = data.archivos_adjuntos ?? [];

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Title */}
        <Text style={styles.title}>{data.titulo}</Text>

        {/* Meta */}
        <View style={styles.metaRow}>
          <Icon source="account-outline" size={16} color="#888" />
          <Text style={styles.metaText}>{data.remitente}</Text>
          <Text style={styles.metaDate}>{formatFullDate(data.fecha_envio)}</Text>
        </View>

        {/* Chips */}
        <View style={styles.chipsRow}>
          {data.tipo_display && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{data.tipo_display}</Text>
            </View>
          )}
          {data.prioridad_display && (
            <View style={[styles.chip, styles.chipPriority]}>
              <Text style={[styles.chipText, styles.chipTextPriority]}>{data.prioridad_display}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentBox}>
          <Text style={styles.bodyText}>{data.contenido}</Text>
        </View>

        {/* Attachments */}
        {archivos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ARCHIVOS ADJUNTOS</Text>
            {archivos.map((archivo: any, i: number) => {
              const isImage = (archivo.mime_type ?? '').startsWith('image/');
              return isImage ? (
                <TouchableOpacity
                  key={archivo.id ?? i}
                  style={styles.imageAttachment}
                  onPress={() => setPreviewImage(archivo.url)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: archivo.url }} style={styles.attachmentThumbnail} resizeMode="cover" />
                  <Text style={styles.attachmentName}>{archivo.nombre}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  key={archivo.id ?? i}
                  style={styles.fileAttachment}
                  onPress={() => Linking.openURL(archivo.url)}
                  activeOpacity={0.75}
                >
                  <Icon source="file-outline" size={28} color={PANTONE_295C} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attachmentName} numberOfLines={1}>{archivo.nombre}</Text>
                    {archivo.tamano && (
                      <Text style={styles.attachmentSize}>{formatFileSize(archivo.tamano)}</Text>
                    )}
                  </View>
                  <Icon source="open-in-new" size={18} color={PANTONE_295C} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Image preview modal */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#E53935', marginTop: 12, textAlign: 'center', fontSize: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 12, lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  metaText: { fontSize: 13, color: '#666', flex: 1 },
  metaDate: { fontSize: 12, color: '#AAA' },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  chip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#EAF0FB' },
  chipText: { fontSize: 12, fontWeight: '600', color: PANTONE_295C },
  chipPriority: { backgroundColor: '#FFF3E0' },
  chipTextPriority: { color: '#E65100' },
  contentBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  bodyText: { fontSize: 15, color: '#333', lineHeight: 24 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 12,
  },
  imageAttachment: { marginBottom: 12 },
  attachmentThumbnail: { width: '100%', height: 180, borderRadius: 10, marginBottom: 4 },
  attachmentName: { fontSize: 13, color: '#444' },
  attachmentSize: { fontSize: 12, color: '#AAA', marginTop: 2 },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: { width: '95%', height: '80%' },
});
