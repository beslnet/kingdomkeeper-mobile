import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';
import {
  AlcanceComunicado,
  PeticionOracion,
  acompanarPeticion,
  listarResponsablesPeticion,
} from '../../api/pastoral';
import { fraseAlcance, mensajeDeError, payloadAcompanar } from '../../utils/peticiones';
import { PANTONE_295C } from '../../theme/colors';
import { cerrarSalvoTeclado } from '../../utils/teclado';

// «Necesita acompañamiento» y «Borrador listo»: los dos diálogos de la web (PeticionesPage) con sus
// palabras. Quién los ve lo decide el backend (`peticiones.acompanar`); la pantalla solo los ofrece.

type Responsable = { id: number; nombre: string };

export function AcompanarModal({
  peticion,
  onClose,
  onHecho,
}: {
  peticion: PeticionOracion | null;
  onClose: () => void;
  /** `recargar`: hay que volver a pedir la lista (se abrió el caso, o ya lo tenía: 409). */
  onHecho: (aviso: { mensaje: string; error?: boolean }) => void;
}) {
  const [tipo, setTipo] = useState<'oracion' | 'visita'>('oracion');
  const [responsables, setResponsables] = useState<Responsable[] | null>(null);
  const [elegido, setElegido] = useState<Responsable | null>(null);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinLista, setSinLista] = useState(false);

  useEffect(() => {
    if (!peticion) return;
    setTipo('oracion');
    setElegido(null);
    setNota('');
    setError(null);
    setSinLista(false);
    setResponsables(null);
    listarResponsablesPeticion()
      .then(setResponsables)
      .catch(() => {
        setResponsables([]);
        setSinLista(true);
      });
  }, [peticion]);

  const confirmar = async () => {
    if (!peticion) return;
    setEnviando(true);
    setError(null);
    try {
      await acompanarPeticion(
        peticion.id,
        payloadAcompanar({ tipo, responsableId: elegido?.id ?? null, nota })
      );
      onHecho({ mensaje: 'Caso abierto y responsable avisado' });
    } catch (err: any) {
      const mensaje = mensajeDeError(err, 'No se pudo abrir el caso.');
      // 409: ya tenía un caso. No hay nada que reintentar: se dice y se recarga la lista.
      if (err?.response?.status === 409) onHecho({ mensaje, error: true });
      else setError(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={!!peticion} animationType="slide" transparent onRequestClose={cerrarSalvoTeclado(onClose)}>
      <KeyboardAvoidingView style={styles.fondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.titulo}>Necesita acompañamiento</Text>
            <Text style={styles.resumen}>
              <Text style={styles.negrita}>{peticion?.por_quien}</Text> — {peticion?.motivo}
            </Text>

            <View style={styles.segmento}>
              {(['oracion', 'visita'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  testID={`acompanar-tipo-${t}`}
                  style={[styles.segmentoBtn, tipo === t && styles.segmentoBtnActivo]}
                  onPress={() => setTipo(t)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: tipo === t }}
                >
                  <Text style={[styles.segmentoTexto, tipo === t && styles.segmentoTextoActivo]}>
                    {t === 'oracion' ? 'Oración' : 'Visita'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Responsable (si no elige, queda usted)</Text>
            {sinLista && (
              <Text style={styles.advertencia} testID="acompanar-sin-lista">
                No se pudo cargar la lista de responsables. Quedará asignado a usted.
              </Text>
            )}
            {responsables === null ? (
              <ActivityIndicator style={styles.cargando} color={PANTONE_295C} />
            ) : (
              responsables.map((r) => {
                const activo = elegido?.id === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    testID={`acompanar-responsable-${r.id}`}
                    style={[styles.opcion, activo && styles.opcionActiva]}
                    // Tocarlo de nuevo lo quita: "queda usted" es volver a no elegir a nadie.
                    onPress={() => setElegido(activo ? null : r)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activo }}
                  >
                    <Icon
                      source={activo ? 'radiobox-marked' : 'radiobox-blank'}
                      size={22}
                      color={activo ? PANTONE_295C : '#BBB'}
                    />
                    <Text style={styles.opcionTexto}>{r.nombre}</Text>
                  </TouchableOpacity>
                );
              })
            )}

            <Text style={styles.label}>Nota para el responsable (opcional)</Text>
            <TextInput
              testID="acompanar-nota"
              style={styles.input}
              value={nota}
              onChangeText={setNota}
              multiline
              textAlignVertical="top"
            />

            {peticion?.visibilidad === 'privada' && (
              <View style={styles.info} testID="acompanar-aviso-privada">
                <Text style={styles.infoTexto}>
                  La petición es privada: el caso será confidencial (lo ven el responsable, usted y la administración).
                </Text>
              </View>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.botones}>
              <TouchableOpacity style={styles.btnSecundario} onPress={onClose} disabled={enviando}>
                <Text style={styles.btnSecundarioTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="acompanar-confirmar"
                style={[styles.btnPrimario, enviando && styles.deshabilitado]}
                onPress={confirmar}
                disabled={enviando}
              >
                <Text style={styles.btnPrimarioTexto}>{enviando ? 'Abriendo…' : 'Abrir caso'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function BorradorModal({
  peticion,
  alcance,
  onClose,
}: {
  peticion: PeticionOracion | null;
  alcance: AlcanceComunicado | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!peticion} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.fondoCentro}>
        <View style={styles.cardCentro}>
          <Text style={styles.titulo}>Borrador listo</Text>
          <Text style={styles.resumen} testID="borrador-texto">
            El testimonio de <Text style={styles.negrita}>{peticion?.por_quien}</Text> quedó como borrador de
            comunicado. Todavía no se envió a nadie.
          </Text>
          <View style={[styles.info, styles.infoAmarillo]}>
            <Text style={styles.infoAmarilloTexto} testID="borrador-alcance">
              {fraseAlcance(alcance)} Revíselo y envíelo desde Comunicaciones.
            </Text>
          </View>
          <View style={styles.botones}>
            <TouchableOpacity testID="borrador-cerrar" style={styles.btnPrimario} onPress={onClose}>
              <Text style={styles.btnPrimarioTexto}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  fondoCentro: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 18, paddingBottom: 28,
    maxHeight: '92%',
  },
  cardCentro: { backgroundColor: '#FFF', borderRadius: 14, padding: 18 },
  titulo: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 6 },
  resumen: { fontSize: 14, color: '#555', lineHeight: 20 },
  negrita: { fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 14, marginBottom: 5 },
  segmento: { flexDirection: 'row', gap: 8, marginTop: 14 },
  segmentoBtn: {
    flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 10,
    backgroundColor: '#FFF',
  },
  segmentoBtnActivo: { backgroundColor: PANTONE_295C, borderColor: PANTONE_295C },
  segmentoTexto: { fontSize: 14, fontWeight: '600', color: '#666' },
  segmentoTextoActivo: { color: '#FFF' },
  cargando: { marginVertical: 14 },
  advertencia: { fontSize: 13, color: '#E65100', marginBottom: 6 },
  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  opcionActiva: { backgroundColor: '#F0F5FF' },
  opcionTexto: { flex: 1, fontSize: 15, color: '#222' },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#FAFAFA', paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 15, color: '#222', minHeight: 70,
  },
  info: { backgroundColor: '#E8F1FB', borderRadius: 8, padding: 10, marginTop: 14 },
  infoTexto: { fontSize: 13, color: '#14487A', lineHeight: 18 },
  infoAmarillo: { backgroundColor: '#FFF4E5' },
  infoAmarilloTexto: { fontSize: 13, color: '#8A4B00', lineHeight: 18 },
  error: { color: '#E53935', fontSize: 14, marginTop: 10, textAlign: 'center' },
  botones: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btnSecundario: {
    flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#CCC', paddingVertical: 12, alignItems: 'center',
    justifyContent: 'center', minHeight: 46,
  },
  btnSecundarioTexto: { color: '#555', fontWeight: '600', fontSize: 15 },
  btnPrimario: {
    flex: 1, backgroundColor: PANTONE_295C, borderRadius: 8, paddingVertical: 12, alignItems: 'center',
    justifyContent: 'center', minHeight: 46,
  },
  btnPrimarioTexto: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  deshabilitado: { opacity: 0.5 },
});
