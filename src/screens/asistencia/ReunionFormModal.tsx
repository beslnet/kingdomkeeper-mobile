import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from 'react-native-paper';
import { Reunion, ReunionPayload, crearReunion, editarReunion, eliminarReunion } from '../../api/asistencia';
import { listarGrupos } from '../../api/grupos';
import { horaComoDate, horaCorta } from '../../utils/asistencia';
import { PANTONE_295C } from '../../theme/colors';

// 0 = lunes … 6 = domingo, como el backend.
const DIAS = [
  { corto: 'Lun', largo: 'Lunes' },
  { corto: 'Mar', largo: 'Martes' },
  { corto: 'Mié', largo: 'Miércoles' },
  { corto: 'Jue', largo: 'Jueves' },
  { corto: 'Vie', largo: 'Viernes' },
  { corto: 'Sáb', largo: 'Sábado' },
  { corto: 'Dom', largo: 'Domingo' },
];

// Los mismos valores con que abre «Nueva reunión» en la web: el culto del domingo a las 11.
const VACIO: ReunionPayload = { nombre: '', tipo: 'culto', dia_semana: 6, hora: '11:00', lugar: '', grupo: null };

type GrupoOpcion = { id: number; nombre: string };

const mensajeDeError = (err: any, porDefecto: string): string => {
  const data = err?.response?.data;
  if (!data) return porDefecto;
  if (typeof data.detail === 'string') return data.detail;
  const primero: any = Object.values(data)[0];
  return String(Array.isArray(primero) ? primero[0] : primero ?? porDefecto);
};

/**
 * Crear una reunión (web: Asistencia → «Nueva reunión») o editar una que ya existe. Lo pueden hacer el
 * pastor, la administración y quienes lideran la asistencia (`asistencia.configurar`), y la de un grupo, su
 * líder y sus co-líderes; el backend lo vuelve a revisar. Desde la página de un grupo llega `grupoFijo`: la
 * reunión es de ese grupo y no se pregunta.
 */
export default function ReunionFormModal({
  visible,
  reunion,
  onGuardada,
  onClose,
  grupoFijo = null,
  onQuitada,
}: {
  visible: boolean;
  /** null = nueva. */
  reunion: Reunion | null;
  onGuardada: (r: Reunion, creada: boolean) => void;
  onClose: () => void;
  grupoFijo?: { id: number; nombre: string } | null;
  /** Al editar: se quitó (solo se puede si todavía no tiene asistencia guardada). */
  onQuitada?: (r: Reunion) => void;
}) {
  const [form, setForm] = useState<ReunionPayload>(VACIO);
  const [grupos, setGrupos] = useState<GrupoOpcion[] | null>(null);
  const [verGrupos, setVerGrupos] = useState(false);
  const [verHora, setVerHora] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setForm(
      reunion
        ? {
            nombre: reunion.nombre,
            tipo: reunion.tipo,
            dia_semana: reunion.dia_semana,
            hora: horaCorta(reunion.hora),
            lugar: reunion.lugar ?? '',
            grupo: reunion.grupo,
          }
        : grupoFijo
          ? { ...VACIO, tipo: 'reunion', nombre: `Reunión de ${grupoFijo.nombre}`, grupo: grupoFijo.id }
          : VACIO
    );
    setError(null);
    setVerGrupos(false);
    setVerHora(false);
    setGrupos(null);
    if (grupoFijo) return;
    listarGrupos({ page_size: 100 })
      .then((d: any) => {
        const lista = Array.isArray(d) ? d : d?.results ?? [];
        setGrupos(lista.map((g: any) => ({ id: g.id, nombre: g.nombre })));
      })
      .catch(() => setGrupos([]));
  }, [visible, reunion, grupoFijo]);

  const nombreGrupo =
    form.grupo === null
      ? 'No, es de toda la iglesia'
      : grupos?.find((g) => g.id === form.grupo)?.nombre ?? reunion?.grupo_nombre ?? 'Grupo';

  // Al editar: pausar (deja de aparecer para pasar lista y conserva lo marcado), reactivar o quitar.
  const pausar = async () => {
    if (!reunion) return;
    setEnviando(true);
    setError(null);
    try {
      onGuardada(await editarReunion(reunion.id, { activa: reunion.activa === false }), false);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cambiar la reunión.'));
    } finally {
      setEnviando(false);
    }
  };

  const quitar = () => {
    if (!reunion) return;
    Alert.alert(
      'Quitar reunión',
      `¿Quitar «${reunion.nombre}»? Si ya tiene asistencia guardada no se puede: se pausa.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            setEnviando(true);
            setError(null);
            try {
              await eliminarReunion(reunion.id);
              onQuitada?.(reunion);
            } catch (err) {
              setError(mensajeDeError(err, 'No se pudo quitar la reunión.'));
            } finally {
              setEnviando(false);
            }
          },
        },
      ]
    );
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return;
    setEnviando(true);
    setError(null);
    const payload = { ...form, nombre: form.nombre.trim(), lugar: form.lugar.trim() };
    try {
      const r = reunion ? await editarReunion(reunion.id, payload) : await crearReunion(payload);
      onGuardada(r, !reunion);
    } catch (err) {
      setError(mensajeDeError(err, reunion ? 'No se pudo guardar la reunión.' : 'No se pudo crear la reunión.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.fondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.titulo}>
              {reunion ? 'Editar reunión' : grupoFijo ? `Reunión semanal de ${grupoFijo.nombre}` : 'Nueva reunión'}
            </Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={form.nombre}
              onChangeText={(nombre) => setForm({ ...form, nombre })}
              placeholder="Culto dominical, Escuela dominical, Reunión de varones…"
              placeholderTextColor="#AAA"
              maxLength={120}
              autoFocus={!reunion}
              testID="reunion-nombre"
            />

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.segmento}>
              {(['culto', 'reunion'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.segmentoBtn, form.tipo === t && styles.segmentoBtnActivo]}
                  onPress={() => setForm({ ...form, tipo: t })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: form.tipo === t }}
                >
                  <Text style={[styles.segmentoTexto, form.tipo === t && styles.segmentoTextoActivo]}>
                    {t === 'culto' ? 'Culto' : 'Reunión'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Día</Text>
            <View style={styles.dias}>
              {DIAS.map((d, i) => (
                <TouchableOpacity
                  key={d.largo}
                  style={[styles.dia, form.dia_semana === i && styles.segmentoBtnActivo]}
                  onPress={() => setForm({ ...form, dia_semana: i })}
                  accessibilityRole="radio"
                  accessibilityLabel={d.largo}
                  accessibilityState={{ selected: form.dia_semana === i }}
                  testID={`reunion-dia-${i}`}
                >
                  <Text style={[styles.diaTexto, form.dia_semana === i && styles.segmentoTextoActivo]}>{d.corto}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Hora</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setVerHora((v) => !v)}
              accessibilityLabel={`Hora, ${form.hora}`}
              testID="reunion-hora"
            >
              <Icon source="clock-outline" size={18} color="#666" />
              <Text style={styles.selectorTexto}>{form.hora}</Text>
              {Platform.OS === 'ios' && <Icon source={verHora ? 'chevron-up' : 'chevron-down'} size={20} color="#888" />}
            </TouchableOpacity>
            {verHora && (
              <DateTimePicker
                value={horaComoDate(form.hora)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour
                locale="es-CL"
                minuteInterval={5}
                onChange={(e, d) => {
                  if (Platform.OS !== 'ios') setVerHora(false);
                  if (d && e.type !== 'dismissed') setForm((f) => ({ ...f, hora: horaCorta(d) }));
                }}
              />
            )}

            <Text style={styles.label}>Lugar (opcional)</Text>
            <TextInput
              style={styles.input}
              value={form.lugar}
              onChangeText={(lugar) => setForm({ ...form, lugar })}
              placeholder="Templo, salón, casa de la familia…"
              placeholderTextColor="#AAA"
              maxLength={200}
            />

            {grupoFijo ? (
              <Text style={styles.ayuda} testID="reunion-grupo-fijo">
                Se pasa lista a los integrantes de {grupoFijo.nombre}, desde la página del grupo o desde Asistencia.
              </Text>
            ) : (
            <>
            <Text style={styles.label}>¿Es de un grupo?</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setVerGrupos((v) => !v)}
              accessibilityLabel={`¿Es de un grupo? ${nombreGrupo}`}
              testID="reunion-grupo"
            >
              <Text style={[styles.selectorTexto, styles.flex1]} numberOfLines={1}>{nombreGrupo}</Text>
              <Icon source={verGrupos ? 'chevron-up' : 'chevron-down'} size={20} color="#888" />
            </TouchableOpacity>
            {verGrupos &&
              (grupos === null ? (
                <ActivityIndicator style={styles.cargando} color={PANTONE_295C} />
              ) : (
                <View style={styles.opciones}>
                  {[{ id: null, nombre: 'No, es de toda la iglesia' } as { id: number | null; nombre: string }, ...grupos].map(
                    (g) => {
                      const activo = form.grupo === g.id;
                      return (
                        <TouchableOpacity
                          key={g.id ?? 'toda'}
                          style={[styles.opcion, activo && styles.opcionActiva]}
                          onPress={() => {
                            setForm({ ...form, grupo: g.id });
                            setVerGrupos(false);
                          }}
                        >
                          <Text style={styles.opcionTexto}>{g.nombre}</Text>
                          {activo && <Icon source="check" size={18} color={PANTONE_295C} />}
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>
              ))}
            <Text style={styles.ayuda}>
              Si es de un grupo, se pasa lista a sus integrantes y aparece en la página del grupo, donde su líder
              también pasa lista. Si no, a todos los hermanos activos.
            </Text>

            </>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}

            {reunion ? (
              <View style={styles.extra}>
                <TouchableOpacity onPress={pausar} disabled={enviando} testID="reunion-pausar">
                  <Text style={styles.extraPausar}>{reunion.activa === false ? 'Reactivar reunión' : 'Pausar reunión'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={quitar} disabled={enviando} testID="reunion-quitar">
                  <Text style={styles.extraQuitar}>Quitar</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>

          {/* Fuera del scroll: en un iPhone chico, Crear queda a la vista sin tener que bajar. */}
          <View style={styles.botones}>
            <TouchableOpacity style={styles.btnSecundario} onPress={onClose} disabled={enviando}>
              <Text style={styles.btnSecundarioTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimario, (enviando || !form.nombre.trim()) && styles.deshabilitado]}
              onPress={guardar}
              disabled={enviando || !form.nombre.trim()}
              testID="reunion-guardar"
            >
              <Text style={styles.btnPrimarioTexto}>
                {enviando ? 'Guardando…' : reunion ? 'Guardar' : 'Crear'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 18, paddingBottom: 28,
    maxHeight: '92%',
  },
  titulo: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 14, marginBottom: 5 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#FAFAFA', paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 15, color: '#222',
  },
  segmento: { flexDirection: 'row', gap: 8 },
  segmentoBtn: {
    flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 10,
    backgroundColor: '#FFF',
  },
  segmentoBtnActivo: { backgroundColor: PANTONE_295C, borderColor: PANTONE_295C },
  segmentoTexto: { fontSize: 14, fontWeight: '600', color: '#666' },
  segmentoTextoActivo: { color: '#FFF' },
  dias: { flexDirection: 'row', gap: 5 },
  dia: {
    flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 10,
    backgroundColor: '#FFF',
  },
  diaTexto: { fontSize: 13, fontWeight: '600', color: '#666' },
  selector: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    backgroundColor: '#FAFAFA', paddingHorizontal: 12, paddingVertical: 11,
  },
  selectorTexto: { fontSize: 15, color: '#222' },
  cargando: { marginVertical: 12 },
  opciones: { borderWidth: 1, borderColor: '#EEE', borderRadius: 8, marginTop: 6 },
  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  opcionActiva: { backgroundColor: '#F0F5FF' },
  opcionTexto: { flex: 1, fontSize: 15, color: '#222' },
  ayuda: { fontSize: 12, color: '#888', marginTop: 6, marginBottom: 14, lineHeight: 17 },
  error: { color: '#E53935', fontSize: 14, marginTop: 12, textAlign: 'center' },
  extra: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 },
  extraPausar: { color: '#E65100', fontWeight: '600', fontSize: 15, paddingVertical: 6 },
  extraQuitar: { color: '#C62828', fontWeight: '600', fontSize: 15, paddingVertical: 6 },
  botones: { flexDirection: 'row', gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
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
