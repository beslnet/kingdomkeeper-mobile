/**
 * Peticiones de oración del culto: anotarlas rápido mientras se toman, la lista de las que siguen
 * en oración y declarar "¡respondida!" con su testimonio. Igual a la web (PeticionesPage), sin
 * imprimir.
 *
 * No son casos pastorales: un caso es para acompañar a alguien con un responsable. Esto es la
 * dinámica del domingo. Por defecto son privadas (pueden traer datos de salud); para leerlas en
 * la congregación hace falta que quien pidió lo acepte.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PANTONE_295C } from '../../theme/colors';
import {
  crearPeticion,
  eliminarPeticion,
  EstadoPeticion,
  listarPeticiones,
  PeticionOracion,
  reabrirPeticion,
  responderPeticion,
  resumenPeticiones,
  ResumenPeticiones,
} from '../../api/pastoral';
import {
  aISO,
  deISO,
  fechaCorta,
  formularioTrasAnotar,
  formularioVacio,
  hoyISO,
  mensajeDeError,
  payloadParaAnotar,
  puedeAnotar,
} from '../../utils/peticiones';
import { useRefreshOnRestore } from '../../hooks/useRefreshOnRestore';

const TABS: { key: EstadoPeticion; label: string }[] = [
  { key: 'orando', label: 'En oración' },
  { key: 'respondida', label: 'Respondidas' },
];

// ─── Campo de fecha ───────────────────────────────────────────────────────────

function CampoFecha({
  valor,
  onChange,
  minimo,
  maximo,
  testID,
}: {
  valor: string;
  onChange: (iso: string) => void;
  minimo?: string;
  maximo?: string;
  testID?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <TouchableOpacity
        testID={testID}
        style={styles.selectBtn}
        onPress={() => setAbierto((v) => !v)}
        activeOpacity={0.75}
      >
        <Text style={styles.selectBtnText}>{fechaCorta(valor)}</Text>
        <Icon source="calendar-outline" size={20} color="#888" />
      </TouchableOpacity>
      {abierto && (
        <DateTimePicker
          value={deISO(valor)}
          mode="date"
          locale="es-CL"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimo ? deISO(minimo) : undefined}
          maximumDate={maximo ? deISO(maximo) : undefined}
          onChange={(_e, date) => {
            setAbierto(Platform.OS === 'ios');
            if (date) onChange(aISO(date));
          }}
        />
      )}
    </>
  );
}

// ─── Tarjeta de una petición ──────────────────────────────────────────────────

function PeticionCard({
  item,
  onResponder,
  onReabrir,
  onEliminar,
}: {
  item: PeticionOracion;
  onResponder: () => void;
  onReabrir: () => void;
  onEliminar: () => void;
}) {
  const privada = item.visibilidad === 'privada';
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitulo}>{item.por_quien}</Text>
        <View style={[styles.chip, privada ? styles.chipPrivada : styles.chipCongregacion]}>
          <Icon
            source={privada ? 'lock-outline' : 'account-group-outline'}
            size={12}
            color={privada ? '#616161' : '#1565C0'}
          />
          <Text style={[styles.chipText, { color: privada ? '#616161' : '#1565C0' }]}>
            {privada ? 'Privada' : 'Congregación'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardMotivo}>{item.motivo}</Text>
      <Text style={styles.cardMeta}>
        {fechaCorta(item.fecha)}
        {item.registrada_por ? ` · anotó ${item.registrada_por}` : ''}
        {item.estado === 'respondida' ? ` · respondida el ${fechaCorta(item.fecha_respuesta)}` : ''}
      </Text>
      {!!item.testimonio && (
        <View style={styles.testimonio}>
          <Icon source="check-circle-outline" size={16} color="#2E7D32" />
          <Text style={styles.testimonioText}>{item.testimonio}</Text>
        </View>
      )}
      <View style={styles.cardActions}>
        {item.estado === 'orando' ? (
          <TouchableOpacity style={styles.btnRespondida} onPress={onResponder} activeOpacity={0.8}>
            <Icon source="check-circle-outline" size={16} color="#2E7D32" />
            <Text style={styles.btnRespondidaText}>¡Respondida!</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnLink} onPress={onReabrir} activeOpacity={0.7}>
            <Text style={styles.btnLinkText}>Volver a «en oración»</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.btnLink} onPress={onEliminar} activeOpacity={0.7}>
          <Text style={[styles.btnLinkText, { color: '#C62828' }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function PeticionesScreen() {
  const [tab, setTab] = useState<EstadoPeticion>('orando');
  const [peticiones, setPeticiones] = useState<PeticionOracion[]>([]);
  const [resumen, setResumen] = useState<ResumenPeticiones | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(() => formularioVacio());
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const porQuienRef = useRef<TextInput>(null);

  const [responder, setResponder] = useState<PeticionOracion | null>(null);
  const [respuesta, setRespuesta] = useState({ fecha_respuesta: hoyISO(), testimonio: '' });
  const [respondiendo, setRespondiendo] = useState(false);
  const [errorRespuesta, setErrorRespuesta] = useState<string | null>(null);

  const cargar = useCallback(async (estado: EstadoPeticion, desdeRefresh = false) => {
    if (!desdeRefresh) setLoading(true);
    setError(null);
    try {
      const [lista, res] = await Promise.all([listarPeticiones(estado), resumenPeticiones()]);
      setPeticiones(lista);
      setResumen(res);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar las peticiones.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(tab);
    }, [cargar, tab])
  );
  useRefreshOnRestore(() => cargar(tab, true));

  const cambiarTab = (nuevo: EstadoPeticion) => {
    if (nuevo === tab) return;
    setPeticiones([]);
    setTab(nuevo);
  };

  const anotar = async () => {
    if (!puedeAnotar(form) || guardando) return;
    setGuardando(true);
    setErrorForm(null);
    try {
      await crearPeticion(payloadParaAnotar(form));
      setForm((f) => formularioTrasAnotar(f));
      // Para anotar la siguiente sin tocar nada: el foco vuelve a «Por quién».
      porQuienRef.current?.focus();
      if (tab === 'orando') cargar('orando', true);
      else setTab('orando');
    } catch (err) {
      setErrorForm(mensajeDeError(err, 'No se pudo anotar la petición.'));
    } finally {
      setGuardando(false);
    }
  };

  const abrirRespuesta = (p: PeticionOracion) => {
    setRespuesta({ fecha_respuesta: hoyISO(), testimonio: '' });
    setErrorRespuesta(null);
    setResponder(p);
  };

  const confirmarRespuesta = async () => {
    if (!responder) return;
    setRespondiendo(true);
    setErrorRespuesta(null);
    try {
      await responderPeticion(responder.id, {
        fecha_respuesta: respuesta.fecha_respuesta,
        testimonio: respuesta.testimonio.trim(),
      });
      setResponder(null);
      cargar(tab, true);
    } catch (err) {
      setErrorRespuesta(mensajeDeError(err, 'No se pudo guardar la respuesta.'));
    } finally {
      setRespondiendo(false);
    }
  };

  const reabrir = async (p: PeticionOracion) => {
    try {
      await reabrirPeticion(p.id);
      cargar(tab, true);
    } catch (err) {
      Alert.alert('No se pudo reabrir', mensajeDeError(err, 'Intenta de nuevo.'));
    }
  };

  const eliminar = (p: PeticionOracion) => {
    Alert.alert('Eliminar petición', `¿Eliminar la petición por ${p.por_quien}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarPeticion(p.id);
            cargar(tab, true);
          } catch (err) {
            Alert.alert('No se pudo eliminar', mensajeDeError(err, 'Intenta de nuevo.'));
          }
        },
      },
    ]);
  };

  const paraCongregacion = form.visibilidad === 'congregacion';

  const encabezado = (
    <View>
      {resumen && (
        <View style={styles.resumenRow}>
          <View style={styles.resumenChip}>
            <Text style={styles.resumenNum}>{resumen.orando}</Text>
            <Text style={styles.resumenLabel}>En oración</Text>
          </View>
          <View style={[styles.resumenChip, styles.resumenChipOk]}>
            <Text style={[styles.resumenNum, { color: '#2E7D32' }]}>{resumen.respondidas_mes}</Text>
            <Text style={styles.resumenLabel}>Respondidas este mes</Text>
          </View>
        </View>
      )}

      <View style={styles.formCard}>
        <Text style={styles.formTitulo}>Anotar una petición</Text>

        <Text style={styles.label}>Por quién *</Text>
        <TextInput
          ref={porQuienRef}
          testID="peticion-por-quien"
          style={styles.input}
          placeholder="Ej: la mamá de la hermana Rosa"
          placeholderTextColor="#AAA"
          value={form.por_quien}
          onChangeText={(t) => setForm((f) => ({ ...f, por_quien: t }))}
          maxLength={150}
          returnKeyType="next"
        />

        <Text style={styles.label}>Motivo *</Text>
        <TextInput
          testID="peticion-motivo"
          style={[styles.input, styles.inputMultiline]}
          placeholder="Qué se pide"
          placeholderTextColor="#AAA"
          value={form.motivo}
          onChangeText={(t) => setForm((f) => ({ ...f, motivo: t }))}
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.motivoAyuda} testID="peticion-motivo-ayuda">
          Basta en términos generales: «por su salud», «por su familia». No anote diagnósticos.
        </Text>

        <Text style={styles.label}>Fecha</Text>
        <CampoFecha
          testID="peticion-fecha"
          valor={form.fecha}
          onChange={(iso) => setForm((f) => ({ ...f, fecha: iso }))}
        />

        <View style={styles.segmento}>
          <TouchableOpacity
            testID="peticion-privada"
            style={[styles.segmentoBtn, !paraCongregacion && styles.segmentoBtnActivo]}
            onPress={() => setForm((f) => ({ ...f, visibilidad: 'privada', consentimiento_publicar: false }))}
            activeOpacity={0.8}
          >
            <Icon source="lock-outline" size={16} color={!paraCongregacion ? '#FFF' : '#666'} />
            <Text style={[styles.segmentoText, !paraCongregacion && styles.segmentoTextActivo]}>Privada</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="peticion-congregacion"
            style={[styles.segmentoBtn, paraCongregacion && styles.segmentoBtnActivo]}
            onPress={() => setForm((f) => ({ ...f, visibilidad: 'congregacion', consentimiento_publicar: false }))}
            activeOpacity={0.8}
          >
            <Icon source="account-group-outline" size={16} color={paraCongregacion ? '#FFF' : '#666'} />
            <Text style={[styles.segmentoText, paraCongregacion && styles.segmentoTextActivo]}>
              Para la congregación
            </Text>
          </TouchableOpacity>
        </View>

        {paraCongregacion && (
          <TouchableOpacity
            testID="peticion-consentimiento"
            style={styles.checkRow}
            onPress={() => setForm((f) => ({ ...f, consentimiento_publicar: !f.consentimiento_publicar }))}
            activeOpacity={0.8}
          >
            <Icon
              source={form.consentimiento_publicar ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={form.consentimiento_publicar ? PANTONE_295C : '#888'}
            />
            <Text style={styles.checkText}>Quien la pidió aceptó que se lea en la congregación</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.ayuda}>
          {paraCongregacion
            ? 'Se puede leer en el culto. Sin el consentimiento de quien la pidió, déjala privada.'
            : 'Privada: la ven el pastor, la administración y quien la anotó.'}
        </Text>

        {!!errorForm && <Text style={styles.errorText}>{errorForm}</Text>}

        <TouchableOpacity
          testID="peticion-anotar"
          style={[styles.btnPrimario, (!puedeAnotar(form) || guardando) && styles.btnDisabled]}
          onPress={anotar}
          disabled={!puedeAnotar(form) || guardando}
          activeOpacity={0.85}
        >
          {guardando ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.btnPrimarioText}>Anotar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            testID={`peticiones-tab-${t.key}`}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => cambiarTab(t.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PANTONE_295C} />
        </View>
      )}
      {!loading && !!error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => cargar(tab)} activeOpacity={0.75}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={loading || error ? [] : peticiones}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={encabezado}
        renderItem={({ item }) => (
          <PeticionCard
            item={item}
            onResponder={() => abrirRespuesta(item)}
            onReabrir={() => reabrir(item)}
            onEliminar={() => eliminar(item)}
          />
        )}
        ListEmptyComponent={
          loading || error ? null : (
            <Text style={styles.vacio}>
              {tab === 'orando' ? 'No hay peticiones en oración.' : 'Todavía no hay peticiones respondidas.'}
            </Text>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              cargar(tab, true);
            }}
            colors={[PANTONE_295C]}
            tintColor={PANTONE_295C}
          />
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal visible={!!responder} animationType="slide" transparent onRequestClose={() => setResponder(null)}>
        <KeyboardAvoidingView
          style={styles.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>¡Petición respondida!</Text>
              <Text style={styles.modalResumen}>
                <Text style={{ fontWeight: '700' }}>{responder?.por_quien}</Text> — {responder?.motivo}
              </Text>

              <Text style={styles.label}>Fecha de la respuesta</Text>
              {responder && (
                <CampoFecha
                  testID="respuesta-fecha"
                  valor={respuesta.fecha_respuesta}
                  minimo={responder.fecha}
                  maximo={hoyISO()}
                  onChange={(iso) => setRespuesta((r) => ({ ...r, fecha_respuesta: iso }))}
                />
              )}

              <Text style={styles.label}>Testimonio (opcional)</Text>
              <TextInput
                testID="respuesta-testimonio"
                style={[styles.input, styles.inputMultiline]}
                placeholder="Lo que se compartió en el culto"
                placeholderTextColor="#AAA"
                value={respuesta.testimonio}
                onChangeText={(t) => setRespuesta((r) => ({ ...r, testimonio: t }))}
                multiline
                textAlignVertical="top"
              />

              {!!errorRespuesta && <Text style={styles.errorText}>{errorRespuesta}</Text>}

              <View style={styles.modalBotones}>
                <TouchableOpacity style={styles.btnSecundario} onPress={() => setResponder(null)} activeOpacity={0.8}>
                  <Text style={styles.btnSecundarioText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="respuesta-guardar"
                  style={[styles.btnPrimario, styles.btnVerde, respondiendo && styles.btnDisabled]}
                  onPress={confirmarRespuesta}
                  disabled={respondiendo}
                  activeOpacity={0.85}
                >
                  {respondiendo ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.btnPrimarioText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  listContent: { padding: 12, paddingBottom: 60 },
  resumenRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  resumenChip: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EF',
  },
  resumenChipOk: { backgroundColor: '#F1F8F2', borderColor: '#CFE6D2' },
  resumenNum: { fontSize: 22, fontWeight: '700', color: PANTONE_295C },
  resumenLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitulo: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 5 },
  motivoAyuda: { fontSize: 12, color: '#777', marginTop: 4, lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
  },
  inputMultiline: { minHeight: 76 },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  selectBtnText: { fontSize: 15, color: '#222' },
  segmento: { flexDirection: 'row', gap: 8, marginTop: 14 },
  segmentoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#FFF',
  },
  segmentoBtnActivo: { backgroundColor: PANTONE_295C, borderColor: PANTONE_295C },
  segmentoText: { fontSize: 13, fontWeight: '600', color: '#666' },
  segmentoTextActivo: { color: '#FFF' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  checkText: { flex: 1, fontSize: 14, color: '#333' },
  ayuda: { fontSize: 12, color: '#777', marginTop: 10, lineHeight: 17 },
  errorText: { color: '#E53935', fontSize: 14, marginTop: 10, textAlign: 'center' },
  btnPrimario: {
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 46,
  },
  btnVerde: { backgroundColor: '#2E7D32', flex: 1, marginTop: 0 },
  btnDisabled: { opacity: 0.4 },
  btnPrimarioText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  btnSecundario: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCC',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  btnSecundarioText: { color: '#555', fontWeight: '600', fontSize: 15 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  tabActive: { backgroundColor: PANTONE_295C, borderColor: PANTONE_295C },
  tabText: { fontSize: 13, color: '#666', fontWeight: '500' },
  tabTextActive: { color: '#FFF', fontWeight: '700' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  retryBtn: { backgroundColor: PANTONE_295C, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, marginTop: 10 },
  retryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  vacio: { color: '#999', fontSize: 15, textAlign: 'center', paddingVertical: 28 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitulo: { flex: 1, fontSize: 15, fontWeight: '700', color: '#222' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  chipPrivada: { backgroundColor: '#F5F5F5' },
  chipCongregacion: { backgroundColor: '#E3F2FD' },
  chipText: { fontSize: 11, fontWeight: '600' },
  cardMotivo: { fontSize: 14, color: '#444', lineHeight: 20, marginTop: 4 },
  cardMeta: { fontSize: 12, color: '#999', marginTop: 6 },
  testimonio: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#EDF7EE',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  testimonioText: { flex: 1, fontSize: 13, color: '#1B5E20', lineHeight: 18 },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  btnRespondida: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnRespondidaText: { color: '#2E7D32', fontWeight: '700', fontSize: 13 },
  btnLink: { paddingVertical: 8, paddingHorizontal: 4 },
  btnLinkText: { color: PANTONE_295C, fontWeight: '600', fontSize: 13 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 18,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 6 },
  modalResumen: { fontSize: 14, color: '#555', lineHeight: 20 },
  modalBotones: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
