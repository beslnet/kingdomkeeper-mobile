import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';
import { Notificacion, marcarLeida } from '../../api/notificaciones';
import { useBadgeStore } from '../../store/badgeStore';
import { NotificacionesStackParamList } from '../../types/navigation';

type RouteProps = RouteProp<NotificacionesStackParamList, 'NotificacionDetail'>;

const TIPO_ICON: Record<string, string> = {
  exportacion_lista: 'download-circle-outline',
  sistema: 'information-outline',
  alerta: 'alert-circle-outline',
};

const TIPO_LABEL: Record<string, string> = {
  exportacion_lista: 'Exportación',
  sistema: 'Sistema',
  alerta: 'Alerta',
};

function formatFecha(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificacionDetailScreen() {
  const { params } = useRoute<RouteProps>();
  const notificacion: Notificacion = params.notificacion;
  const refresh = useBadgeStore((s) => s.refresh);

  useEffect(() => {
    if (!notificacion.leida) {
      marcarLeida(notificacion.id)
        .then(() => refresh())
        .catch(() => {});
    }
  }, [notificacion.id, notificacion.leida, refresh]);

  const isExport = notificacion.payload?.action === 'download_export';
  const icon = TIPO_ICON[notificacion.tipo] ?? 'bell-outline';
  const tipoLabel = TIPO_LABEL[notificacion.tipo] ?? notificacion.tipo;

  const handleDescargar = async () => {
    const url: string | undefined = notificacion.payload?.url_descarga;
    if (!url) {
      Alert.alert('Enlace no disponible', 'El enlace de descarga ha expirado o no está disponible.');
      return;
    }
    Alert.alert(
      'Descargar respaldo',
      'Se abrirá el enlace en tu navegador para descargar el archivo ZIP.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abrir descarga',
          onPress: async () => {
            try {
              await Linking.openURL(url);
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'No se pudo abrir el enlace de descarga.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Cabecera tipo + ícono */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Icon source={icon} size={36} color={PANTONE_295C} />
        </View>
        <Text style={styles.tipoLabel}>{tipoLabel}</Text>
        <Text style={styles.fecha}>{formatFecha(notificacion.created_at)}</Text>
      </View>

      {/* Cuerpo */}
      <View style={styles.body}>
        <Text style={styles.titulo}>{notificacion.titulo}</Text>
        <Text style={styles.mensaje}>{notificacion.mensaje}</Text>
      </View>

      {/* Acción descarga */}
      {isExport && (
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDescargar} activeOpacity={0.8}>
          <Icon source="download" size={20} color="#FFF" />
          <Text style={styles.downloadBtnText}>Descargar archivo</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20 },
  header: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: PANTONE_295C,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fecha: { fontSize: 12, color: '#999' },
  body: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
    lineHeight: 26,
  },
  mensaje: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PANTONE_295C,
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  downloadBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
