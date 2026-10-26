import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useFocusEffect } from '@react-navigation/native';
import {
  AsistenciaDelDia,
  PersonaAsistencia,
  Reunion,
  guardarAsistenciaDelDia,
  listarReunionesActivas,
  obtenerAsistenciaDelDia,
} from '../../api/asistencia';
import {
  Familia,
  alternarFamilia,
  armarFamilias,
  avisoOtroDia,
  deIso,
  estadoFamilia,
  etiquetaFamilia,
  fechaLarga,
  aIso,
  mismosPresentes,
  normalizar,
  reunionPorDefecto,
  sumarDias,
  ultimaFecha,
  visitasComoNumero,
  visitasParaEnviar,
} from '../../utils/asistencia';
import { PANTONE_295C } from '../../theme/colors';
import { usePermissionsStore } from '../../store/permissionsStore';
import AusentesTab from './AusentesTab';
import ReunionFormModal from './ReunionFormModal';

type Fila =
  | { tipo: 'familia'; key: string; familia: Familia }
  | { tipo: 'persona'; key: string; persona: PersonaAsistencia; enFamilia: boolean };

const mensajeDeError = (err: any, porDefecto: string): string => {
  if (err?.response?.status === 403) {
    return 'La asistencia la llevan el pastor, los líderes y la administración.';
  }
  const data = err?.response?.data;
  if (!data) return porDefecto;
  if (typeof data.detail === 'string') return data.detail;
  const primero: any = Object.values(data)[0];
  return String(Array.isArray(primero) ? primero[0] : primero ?? porDefecto);
};

export default function AsistenciaScreen() {
  // Todo el equipo marca; ver a quienes no han venido y asignarles seguimiento es de quien lidera.
  // Lo resuelve el backend (rol + función del ministerio): la app solo lo pregunta, como la web.
  const puedeSeguimiento = usePermissionsStore((s) => s.can('asistencia.seguimiento'));
  // Crear y editar las reuniones: el pastor, la administración y quienes lideran la asistencia.
  const puedeConfigurar = usePermissionsStore((s) => s.can('asistencia.configurar'));
  const [tab, setTab] = useState<'marcar' | 'ausentes'>('marcar');
  const [reuniones, setReuniones] = useState<Reunion[] | null>(null);
  const [reunion, setReunion] = useState<Reunion | null>(null);
  const [fecha, setFecha] = useState<string>('');
  const [datos, setDatos] = useState<AsistenciaDelDia | null>(null);
  const [original, setOriginal] = useState<Set<number>>(new Set());
  const [presentes, setPresentes] = useState<Set<number>>(new Set());
  const [visitasSinFicha, setVisitasSinFicha] = useState('');
  const [visitasOriginal, setVisitasOriginal] = useState<number | null>(null);
  const [buscar, setBuscar] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectorReunion, setSelectorReunion] = useState(false);
  const [selectorFecha, setSelectorFecha] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // null = cerrado; { reunion: null } = nueva.
  const [formulario, setFormulario] = useState<{ reunion: Reunion | null } | null>(null);
  const [confirmarOtroDia, setConfirmarOtroDia] = useState(false);
  // Descarta respuestas de una reunión/fecha que el usuario ya cambió.
  const pedido = useRef(0);
  const reunionRef = useRef<Reunion | null>(null);
  reunionRef.current = reunion;

  const hoy = aIso(new Date());
  const sucio =
    !!datos &&
    (!mismosPresentes(presentes, original) || visitasComoNumero(visitasSinFicha) !== visitasOriginal);

  const cargarReuniones = useCallback(async () => {
    setError(null);
    try {
      const lista = await listarReunionesActivas();
      setReuniones(lista);
      const vigente = lista.find((r) => r.id === reunionRef.current?.id);
      if (vigente) {
        setReunion(vigente);
      } else {
        const primera = reunionPorDefecto(lista);
        setReunion(primera);
        if (primera) setFecha(ultimaFecha(primera.dia_semana));
      }
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar las reuniones.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarReuniones();
    }, [cargarReuniones])
  );

  const reunionId = reunion?.id;
  // Si se edita la reunión y cambia de grupo, cambia a quién se marca: se vuelve a pedir.
  const reunionGrupo = reunion?.grupo;
  const cargarAsistencia = useCallback(async () => {
    if (reunionId === undefined || !fecha) return;
    const mio = ++pedido.current;
    setCargando(true);
    setError(null);
    try {
      const d = await obtenerAsistenciaDelDia(reunionId, fecha);
      if (mio !== pedido.current) return;
      const ya = new Set(d.personas.filter((p) => p.presente).map((p) => p.id));
      setDatos(d);
      setOriginal(ya);
      setPresentes(new Set(ya));
      setVisitasOriginal(d.visitas_sin_ficha);
      setVisitasSinFicha(d.visitas_sin_ficha === null ? '' : String(d.visitas_sin_ficha));
    } catch (err) {
      if (mio !== pedido.current) return;
      setDatos(null);
      setError(mensajeDeError(err, 'No se pudo cargar la asistencia.'));
    } finally {
      if (mio === pedido.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reunionId, reunionGrupo, fecha]);

  useEffect(() => {
    cargarAsistencia();
  }, [cargarAsistencia]);

  // La confirmación de «fue una reunión especial» vale para esa reunión y esa fecha, no para la siguiente.
  useEffect(() => {
    setConfirmarOtroDia(false);
  }, [reunionId, fecha]);

  // Cambiar de reunión o de fecha con marcas sin guardar pide confirmación.
  const confirmarDescarte = (seguir: () => void) => {
    if (!sucio) return seguir();
    Alert.alert('Hay cambios sin guardar', 'Si cambias de reunión o de fecha se pierden las marcas de ahora.', [
      { text: 'Quedarme', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: seguir },
    ]);
  };

  const elegirReunion = (r: Reunion) => {
    setSelectorReunion(false);
    if (r.id === reunion?.id) return;
    confirmarDescarte(() => {
      setBuscar('');
      setReunion(r);
      setFecha(ultimaFecha(r.dia_semana));
    });
  };

  const abrirFormulario = (r: Reunion | null) => {
    setSelectorReunion(false);
    confirmarDescarte(() => setFormulario({ reunion: r }));
  };

  const reunionGuardada = (r: Reunion, creada: boolean) => {
    setFormulario(null);
    setAviso(creada ? 'Reunión creada' : 'Reunión guardada');
    setTimeout(() => setAviso(null), 3000);
    if (creada || r.id === reunion?.id) {
      // La nueva queda elegida, con su último día; la editada, en su último día si se cambió el día.
      const cambioDia = !reunion || creada || r.dia_semana !== reunion.dia_semana;
      setBuscar('');
      setReunion(r);
      if (cambioDia) setFecha(ultimaFecha(r.dia_semana));
    }
    cargarReuniones();
  };

  const cambiarFecha = (nueva: string) => {
    if (nueva === fecha || nueva > hoy) return;
    confirmarDescarte(() => setFecha(nueva));
  };

  const familias = useMemo(() => armarFamilias(datos?.personas ?? []).familias, [datos]);

  const filas = useMemo<Fila[]>(() => {
    const q = normalizar(buscar);
    const coincide = (p: PersonaAsistencia) => !q || normalizar(p.nombre).includes(q);
    const porId = new Map<number, Familia>();
    familias.forEach((f) => f.personas.forEach((p) => porId.set(p.id, f)));
    const vistas = new Set<string>();
    const out: Fila[] = [];
    for (const p of datos?.personas ?? []) {
      const f = porId.get(p.id);
      if (!f) {
        if (coincide(p)) out.push({ tipo: 'persona', key: `p${p.id}`, persona: p, enFamilia: false });
        continue;
      }
      if (vistas.has(f.clave) || !f.personas.some(coincide)) continue;
      vistas.add(f.clave);
      out.push({ tipo: 'familia', key: `f${f.clave}`, familia: f });
      // Si se busca por un nombre, la familia se muestra entera: se marca de un toque.
      f.personas.forEach((m) => out.push({ tipo: 'persona', key: `p${m.id}`, persona: m, enFamilia: true }));
    }
    return out;
  }, [datos, familias, buscar]);

  const alternar = (id: number) =>
    setPresentes((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const otroDia = reunion ? avisoOtroDia(reunion, fecha) : null;

  const guardar = async () => {
    if (!reunion || !datos || (otroDia && !confirmarOtroDia)) return;
    setGuardando(true);
    try {
      const d = await guardarAsistenciaDelDia(reunion.id, {
        fecha,
        presentes: [...presentes],
        ...visitasParaEnviar(visitasSinFicha, visitasOriginal),
        ...(otroDia ? { confirmar_otro_dia: confirmarOtroDia } : {}),
      });
      const ya = new Set(d.personas.filter((p) => p.presente).map((p) => p.id));
      setDatos(d);
      setOriginal(ya);
      setPresentes(new Set(ya));
      setVisitasOriginal(d.visitas_sin_ficha);
      setVisitasSinFicha(d.visitas_sin_ficha === null ? '' : String(d.visitas_sin_ficha));
      setAviso(`Asistencia guardada: ${ya.size} presente${ya.size === 1 ? '' : 's'}`);
      setTimeout(() => setAviso(null), 3000);
    } catch (err) {
      Alert.alert('No se pudo guardar', mensajeDeError(err, 'Revisa tu conexión e inténtalo de nuevo.'));
    } finally {
      setGuardando(false);
    }
  };

  // ── Estados sin lista ────────────────────────────────────────────────────────
  if (reuniones === null && cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }
  if (reuniones === null || (error && !reunion)) {
    return (
      <TouchableOpacity
        style={styles.centered}
        onPress={() => {
          setCargando(true);
          cargarReuniones();
        }}
      >
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error ?? 'No se pudo cargar.'} Toca para reintentar.</Text>
      </TouchableOpacity>
    );
  }
  const formularioModal = (
    <ReunionFormModal
      visible={formulario !== null}
      reunion={formulario?.reunion ?? null}
      onGuardada={reunionGuardada}
      onClose={() => setFormulario(null)}
    />
  );

  if (reuniones.length === 0) {
    return (
      <View style={styles.centered}>
        <Icon source="calendar-blank-outline" size={44} color="#BBB" />
        <Text style={styles.emptyTitle}>Aún no hay reuniones</Text>
        <Text style={styles.emptyText}>
          {puedeConfigurar
            ? 'Crea la primera: el culto del domingo, la escuela dominical, la reunión de varones…'
            : 'Las crean el pastor, la administración o quienes lideran la asistencia.'}
        </Text>
        {puedeConfigurar && (
          <TouchableOpacity
            style={[styles.saveBtn, styles.crearPrimera]}
            onPress={() => setFormulario({ reunion: null })}
            testID="crear-primera-reunion"
          >
            <Icon source="plus" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Nueva reunión</Text>
          </TouchableOpacity>
        )}
        {formularioModal}
      </View>
    );
  }

  const verAusentes = puedeSeguimiento && tab === 'ausentes';
  // Con una sola reunión no hay que elegir, pero quien configura entra por ahí a crear o editar.
  const abreSelector = reuniones.length > 1 || puedeConfigurar;
  const total = datos?.personas.length ?? 0;
  const esHoyOFuturo = sumarDias(fecha || hoy, 7) > hoy;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Reunión y fecha */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.reunionBtn}
          onPress={() => (abreSelector ? setSelectorReunion(true) : undefined)}
          activeOpacity={abreSelector ? 0.7 : 1}
          accessibilityRole="button"
          accessibilityLabel="Elegir reunión"
        >
          <View style={styles.flex1}>
            <Text style={styles.reunionNombre} numberOfLines={1}>{reunion?.nombre}</Text>
            <Text style={styles.reunionSub} numberOfLines={1}>
              {reunion?.dia_semana_display} {reunion?.hora?.slice(0, 5)}
              {reunion?.grupo_nombre ? ` · ${reunion.grupo_nombre}` : ''}
            </Text>
          </View>
          {abreSelector && <Icon source="chevron-down" size={22} color="#fff" />}
        </TouchableOpacity>

        {!verAusentes && (
        <View style={styles.fechaRow}>
          <TouchableOpacity onPress={() => cambiarFecha(sumarDias(fecha, -7))} hitSlop={10} accessibilityLabel="Semana anterior">
            <Icon source="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fechaBtn} onPress={() => setSelectorFecha(true)} accessibilityLabel="Cambiar fecha">
            <Icon source="calendar" size={18} color="#fff" />
            <Text style={styles.fechaTexto}>{fecha ? fechaLarga(fecha) : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => cambiarFecha(sumarDias(fecha, 7))}
            disabled={esHoyOFuturo}
            hitSlop={10}
            accessibilityLabel="Semana siguiente"
          >
            <Icon source="chevron-right" size={28} color={esHoyOFuturo ? 'rgba(255,255,255,0.3)' : '#fff'} />
          </TouchableOpacity>
        </View>
        )}
      </View>

      {puedeSeguimiento && (
        <View style={styles.tabs} accessibilityRole="tablist">
          {(['marcar', 'ausentes'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActiva]}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              testID={`tab-${t}`}
            >
              <Text style={[styles.tabTexto, tab === t && styles.tabTextoActivo]}>
                {t === 'marcar' ? 'Marcar' : 'No han venido'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {verAusentes && reunion ? (
        <AusentesTab
          reunion={reunion}
          onAviso={(m) => {
            setAviso(m);
            setTimeout(() => setAviso(null), 3500);
          }}
        />
      ) : (
      <>

      {selectorFecha && (
        <DateTimePicker
          value={fecha ? deIso(fecha) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          locale="es-CL"
          onChange={(_, d) => {
            setSelectorFecha(Platform.OS === 'ios');
            if (d) cambiarFecha(aIso(d));
          }}
        />
      )}
      {selectorFecha && Platform.OS === 'ios' && (
        <TouchableOpacity style={styles.cerrarPicker} onPress={() => setSelectorFecha(false)}>
          <Text style={styles.cerrarPickerTexto}>Listo</Text>
        </TouchableOpacity>
      )}

      {otroDia && (
        <View style={styles.otroDia} testID="aviso-otro-dia">
          <Text style={styles.otroDiaTexto}>{otroDia}</Text>
          <TouchableOpacity
            style={styles.otroDiaCheck}
            onPress={() => setConfirmarOtroDia((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirmarOtroDia }}
            testID="confirmar-otro-dia"
          >
            <Icon
              source={confirmarOtroDia ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={22}
              color={confirmarOtroDia ? PANTONE_295C : '#8A4B00'}
            />
            <Text style={styles.otroDiaCheckTexto}>Fue una reunión especial</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Buscador y contador */}
      <View style={styles.searchBar}>
        <Icon source="magnify" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          value={buscar}
          onChangeText={setBuscar}
          placeholder="Buscar por nombre…"
          placeholderTextColor="#AAA"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {buscar.length > 0 && (
          <TouchableOpacity onPress={() => setBuscar('')} accessibilityLabel="Borrar búsqueda">
            <Icon source="close-circle" size={18} color="#AAA" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.contador}>
        <Text style={styles.contadorTexto}>
          Presentes: <Text style={styles.negrita}>{presentes.size}</Text> de {total}
        </Text>
        {datos?.guardada && !sucio && <Text style={styles.guardadaTag}>Ya guardada</Text>}
        {sucio && <Text style={styles.sucioTag}>Sin guardar</Text>}
      </View>

      {error && datos === null ? (
        <TouchableOpacity style={styles.centered} onPress={cargarAsistencia}>
          <Icon source="alert-circle-outline" size={40} color="#E53935" />
          <Text style={styles.errorText}>{error} Toca para reintentar.</Text>
        </TouchableOpacity>
      ) : cargando && !datos ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PANTONE_295C} />
        </View>
      ) : (
        <FlatList
          data={filas}
          keyExtractor={(f) => f.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={filas.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Icon source="account-search-outline" size={40} color="#CCC" />
              <Text style={styles.emptyText}>
                {buscar
                  ? 'Sin resultados'
                  : reunion?.grupo
                    ? 'El grupo no tiene integrantes todavía.'
                    : 'No hay hermanos activos.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            reunion?.grupo ? null : (
              <View style={styles.visitasBox}>
                {datos && datos.visitas.length > 0 && (
                  <View style={styles.visitasFichas}>
                    <Text style={styles.visitasLabel}>
                      Visitas que dejaron ficha ({datos.visitas.length})
                    </Text>
                    {datos.visitas.map((v) => (
                      <Text key={v.id} style={styles.visitaNombre}>
                        {v.nombre}
                      </Text>
                    ))}
                  </View>
                )}
                <Text style={styles.visitasLabel}>Visitas que no dejaron ficha (opcional)</Text>
                <TextInput
                  style={styles.visitasInput}
                  value={visitasSinFicha}
                  onChangeText={(t) => setVisitasSinFicha(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                  maxLength={3}
                  accessibilityLabel="Visitas que no dejaron ficha"
                />
              </View>
            )
          }
          renderItem={({ item }) => {
            if (item.tipo === 'familia') {
              const est = estadoFamilia(item.familia, presentes);
              return (
                <TouchableOpacity
                  style={[styles.familiaRow, est === 'todos' && styles.rowChecked]}
                  onPress={() => setPresentes((s) => alternarFamilia(s, item.familia))}
                  activeOpacity={0.7}
                  accessibilityLabel={`${etiquetaFamilia(item.familia.nombre)}, marcar a todos`}
                >
                  <Icon
                    source={est === 'todos' ? 'checkbox-marked-circle' : est === 'algunos' ? 'minus-circle' : 'checkbox-blank-circle-outline'}
                    size={26}
                    color={est === 'ninguno' ? '#BBB' : PANTONE_295C}
                  />
                  <View style={styles.flex1}>
                    <Text style={styles.familiaNombre}>{etiquetaFamilia(item.familia.nombre)}</Text>
                    <Text style={styles.familiaSub}>
                      {item.familia.personas.filter((p) => presentes.has(p.id)).length} de {item.familia.personas.length} ·{' '}
                      {est === 'todos' ? 'toca para desmarcar' : 'toca para marcar a todos'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
            const marcado = presentes.has(item.persona.id);
            return (
              <TouchableOpacity
                style={[styles.row, item.enFamilia && styles.rowEnFamilia, marcado && styles.rowChecked]}
                onPress={() => alternar(item.persona.id)}
                activeOpacity={0.7}
              >
                <Icon
                  source={marcado ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={26}
                  color={marcado ? PANTONE_295C : '#CCC'}
                />
                <Text style={styles.nombre}>{item.persona.nombre}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      </>
      )}

      {aviso && (
        <View style={styles.toast} pointerEvents="none">
          <Icon source="check-circle" size={18} color="#fff" />
          <Text style={styles.toastTexto}>{aviso}</Text>
        </View>
      )}

      {!verAusentes && (
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, (guardando || !datos || (!!otroDia && !confirmarOtroDia)) && styles.saveBtnDisabled]}
          onPress={guardar}
          disabled={guardando || !datos || (!!otroDia && !confirmarOtroDia)}
          activeOpacity={0.85}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Icon source="clipboard-check-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Guardar asistencia ({presentes.size})</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      )}

      {/* Selector de reunión */}
      <Modal visible={selectorReunion} transparent animationType="fade" onRequestClose={() => setSelectorReunion(false)}>
        <TouchableOpacity style={styles.modalFondo} activeOpacity={1} onPress={() => setSelectorReunion(false)}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Elegir reunión</Text>
            <ScrollView>
              {reuniones.map((r) => (
                <TouchableOpacity key={r.id} style={styles.modalItem} onPress={() => elegirReunion(r)}>
                  <View style={styles.flex1}>
                    <Text style={styles.modalItemNombre}>{r.nombre}</Text>
                    <Text style={styles.modalItemSub}>
                      {r.dia_semana_display} {r.hora?.slice(0, 5)}
                      {r.grupo_nombre ? ` · ${r.grupo_nombre}` : ''}
                    </Text>
                  </View>
                  {r.id === reunion?.id && <Icon source="check" size={20} color={PANTONE_295C} />}
                  {puedeConfigurar && (
                    <TouchableOpacity
                      style={styles.editarBtn}
                      onPress={() => abrirFormulario(r)}
                      hitSlop={8}
                      accessibilityLabel={`Editar ${r.nombre}`}
                      testID={`editar-reunion-${r.id}`}
                    >
                      <Icon source="pencil-outline" size={20} color="#666" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
              {puedeConfigurar && (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => abrirFormulario(null)}
                  testID="nueva-reunion"
                >
                  <Icon source="plus" size={20} color={PANTONE_295C} />
                  <Text style={[styles.modalItemNombre, styles.nuevaTexto]}>Nueva reunión</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      {formularioModal}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  flex1: { flex: 1 },
  negrita: { fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: '700', color: '#444' },
  emptyText: { marginTop: 8, color: '#888', fontSize: 14, textAlign: 'center' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyInner: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  header: { backgroundColor: PANTONE_295C, paddingHorizontal: 16, paddingBottom: 10 },
  reunionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  reunionNombre: { fontSize: 18, fontWeight: '700', color: '#fff' },
  reunionSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActiva: { borderBottomColor: PANTONE_295C },
  tabTexto: { fontSize: 14, fontWeight: '600', color: '#777' },
  tabTextoActivo: { color: PANTONE_295C },
  fechaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fechaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  fechaTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cerrarPicker: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8 },
  cerrarPickerTexto: { color: PANTONE_295C, fontWeight: '700', fontSize: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E0E0E0', gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 2 },
  contador: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 2, gap: 10 },
  contadorTexto: { fontSize: 14, color: '#555', flex: 1 },
  guardadaTag: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  sucioTag: { fontSize: 12, color: '#E65100', fontWeight: '600' },
  listContent: { padding: 12, paddingBottom: 110 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    gap: 12, borderWidth: 1.5, borderColor: 'transparent',
  },
  rowEnFamilia: { marginLeft: 22 },
  rowChecked: { borderColor: PANTONE_295C, backgroundColor: '#F0F5FF' },
  nombre: { flex: 1, fontSize: 15, fontWeight: '600', color: '#222' },
  familiaRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    marginTop: 4, gap: 12, borderWidth: 1.5, borderColor: 'transparent',
  },
  familiaNombre: { fontSize: 15, fontWeight: '700', color: PANTONE_295C },
  familiaSub: { fontSize: 12, color: '#888', marginTop: 2 },
  visitasBox: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginTop: 8 },
  visitasFichas: { marginBottom: 14 },
  visitaNombre: { fontSize: 14, color: '#222', fontWeight: '600', marginBottom: 4 },
  visitasLabel: { fontSize: 14, color: '#444', marginBottom: 8 },
  visitasInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 16, width: 90 },
  toast: {
    position: 'absolute', bottom: 92, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2E7D32', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxWidth: '92%',
  },
  toastTexto: { color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#F5F7FA', padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: '#E0E0E0',
  },
  saveBtn: {
    backgroundColor: PANTONE_295C, borderRadius: 25, paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCaja: { backgroundColor: '#fff', borderRadius: 14, maxHeight: '70%', padding: 8 },
  modalTitulo: { fontSize: 16, fontWeight: '700', color: '#222', padding: 12 },
  modalItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  modalItemNombre: { fontSize: 15, fontWeight: '600', color: '#222' },
  modalItemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  editarBtn: { paddingLeft: 14, paddingVertical: 4 },
  nuevaTexto: { color: PANTONE_295C, marginLeft: 10 },
  crearPrimera: { marginTop: 20, paddingHorizontal: 28 },
  otroDia: { backgroundColor: '#FFF4E5', marginHorizontal: 16, marginTop: 10, borderRadius: 10, padding: 12 },
  otroDiaTexto: { fontSize: 13, color: '#8A4B00', lineHeight: 18 },
  otroDiaCheck: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  otroDiaCheckTexto: { fontSize: 14, fontWeight: '600', color: '#5C3300' },
});
