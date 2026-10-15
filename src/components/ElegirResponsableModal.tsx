import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { PANTONE_295C } from '../theme/colors';

export type Responsable = { id: number; nombre: string };

/**
 * Elegir a quién se le asigna un seguimiento (web: «Asignar seguimiento»). Carga la lista al abrirse,
 * se elige uno y se confirma. `onConfirm` hace la llamada: si lanza, su mensaje se muestra en el
 * diálogo y queda abierto; si termina, el padre decide qué hacer (cerrarlo, avisar, recargar).
 */
export default function ElegirResponsableModal({
  visible,
  titulo,
  descripcion,
  etiqueta,
  ayuda,
  confirmarLabel,
  cargar,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  titulo: string;
  descripcion: React.ReactNode;
  etiqueta: string;
  ayuda?: string;
  confirmarLabel: string;
  cargar: () => Promise<Responsable[]>;
  onConfirm: (r: Responsable) => Promise<void>;
  onClose: () => void;
}) {
  const [responsables, setResponsables] = useState<Responsable[] | null>(null);
  const [elegido, setElegido] = useState<Responsable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setElegido(null);
    setError(null);
    setResponsables(null);
    cargar()
      .then(setResponsables)
      .catch(() => setResponsables([]));
    // `cargar` es de quien lo usa: solo se vuelve a pedir al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const confirmar = async () => {
    if (!elegido) return;
    setEnviando(true);
    setError(null);
    try {
      await onConfirm(elegido);
    } catch (err: any) {
      setError(err?.message || 'No se pudo completar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.fondo}>
        <View style={styles.caja}>
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.texto} testID="responsable-descripcion">{descripcion}</Text>
          <Text style={styles.label}>{etiqueta}</Text>
          {!!ayuda && <Text style={styles.ayuda}>{ayuda}</Text>}
          {responsables === null ? (
            <ActivityIndicator style={styles.cargando} color={PANTONE_295C} />
          ) : responsables.length === 0 ? (
            <Text style={styles.ayuda}>Nadie disponible</Text>
          ) : (
            <ScrollView style={styles.lista}>
              {responsables.map((r) => {
                const activo = elegido?.id === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.item, activo && styles.itemActivo]}
                    onPress={() => setElegido(r)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activo }}
                  >
                    <Icon
                      source={activo ? 'radiobox-marked' : 'radiobox-blank'}
                      size={22}
                      color={activo ? PANTONE_295C : '#BBB'}
                    />
                    <Text style={styles.nombre}>{r.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.acciones}>
            <TouchableOpacity onPress={onClose} disabled={enviando} style={styles.btnTexto}>
              <Text style={styles.btnTextoLabel}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmar}
              disabled={!elegido || enviando}
              style={[styles.btnConfirmar, (!elegido || enviando) && styles.deshabilitado]}
              testID="responsable-confirmar"
            >
              {enviando ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnConfirmarLabel}>{confirmarLabel}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  caja: { backgroundColor: '#fff', borderRadius: 14, padding: 18, maxHeight: '85%' },
  titulo: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 10 },
  texto: { fontSize: 14, color: '#333', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#444' },
  ayuda: { fontSize: 12, color: '#888', marginBottom: 6 },
  cargando: { marginVertical: 16 },
  lista: { maxHeight: 220, borderTopWidth: 1, borderTopColor: '#EEE' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  itemActivo: { backgroundColor: '#F0F5FF' },
  nombre: { fontSize: 15, color: '#222', flex: 1 },
  error: { color: '#E53935', fontSize: 13, marginTop: 10 },
  acciones: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 16 },
  btnTexto: { paddingHorizontal: 12, paddingVertical: 10 },
  btnTextoLabel: { color: PANTONE_295C, fontWeight: '700', fontSize: 15 },
  btnConfirmar: {
    backgroundColor: PANTONE_295C, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
    minWidth: 90, alignItems: 'center',
  },
  btnConfirmarLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deshabilitado: { opacity: 0.5 },
});
