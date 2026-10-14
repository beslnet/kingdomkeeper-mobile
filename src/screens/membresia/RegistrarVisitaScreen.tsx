import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button, Checkbox, Chip, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import {
  registrarVisita,
  listarMiembros,
  listarResponsablesVisita,
  COMO_LLEGO,
  QUIERE_CONTACTO,
} from '../../api/miembros';
import { usePermissionsStore } from '../../store/permissionsStore';
import PersonaPicker, { PersonaOpcion } from '../../components/PersonaPicker';
import {
  INITIAL_VISITA,
  VisitaFields,
  validarVisita,
  armarVisita,
  mensajeDeErrorVisita,
  enEliminacion,
} from '../../utils/fichaVisita';
import { PANTONE_134C, PANTONE_295C } from '../../theme/colors';

const nombreDe = (p: any): string =>
  p?.nombre_completo || `${p?.nombre ?? ''} ${p?.apellidos ?? ''}`.trim() || p?.email || '';

/** Fila de opciones de elección única; tocar la elegida la deselecciona. */
function Opciones<T extends string>({
  label,
  opciones,
  value,
  onChange,
}: {
  label: string;
  opciones: { value: T; label: string }[];
  value: T | '';
  onChange: (v: T | '') => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chips}>
        {opciones.map(o => (
          <Chip
            key={o.value}
            selected={value === o.value}
            showSelectedOverlay
            onPress={() => onChange(value === o.value ? '' : o.value)}
            style={[styles.chip, value === o.value && styles.chipActive]}
            textStyle={value === o.value ? styles.chipTextActive : undefined}
          >
            {o.label}
          </Chip>
        ))}
      </View>
    </View>
  );
}

export default function RegistrarVisitaScreen() {
  const navigation = useNavigation<any>();
  // Elegir quién hace el seguimiento es asignar: lo hacen el pastor, la administración y quienes lideran la
  // bienvenida; un integrante registra y el líder asigna. Lo resuelve el backend (`puede` de mis-permisos).
  const puedeAsignar = usePermissionsStore(st => st.can('visitas.asignar'));
  const [fields, setFields] = useState<VisitaFields>(INITIAL_VISITA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hermanos, setHermanos] = useState<PersonaOpcion[]>([]);
  const [usuarios, setUsuarios] = useState<PersonaOpcion[]>([]);

  // Si una lista no se puede cargar (p. ej. un rol sin acceso a usuarios), ese campo
  // simplemente no aparece: la visita se registra igual.
  useEffect(() => {
    let vivo = true;
    listarMiembros({ estado: 'activo', page_size: 200 })
      .then(d => {
        if (!vivo) return;
        setHermanos(
          (d.results ?? [])
            .filter(m => !enEliminacion(m))
            .map(m => ({ id: m.id, nombre: nombreDe(m), detalle: m.email })),
        );
      })
      .catch(() => vivo && setHermanos([]));
    // No /core/usuarios/: a un pastor esa lista solo le trae su propio nombre, y no incluye al equipo de bienvenida.
    if (puedeAsignar) {
      listarResponsablesVisita()
        .then(lista => {
          if (!vivo) return;
          setUsuarios(lista.map(u => ({ id: u.id, nombre: u.nombre })));
        })
        .catch(() => vivo && setUsuarios([]));
    } else {
      setUsuarios([]);
    }
    return () => {
      vivo = false;
    };
  }, [puedeAsignar]);

  const handleChange = <K extends keyof VisitaFields>(name: K, value: VisitaFields[K]) => {
    setFields(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async () => {
    const errs = validarVisita(fields);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const cuerpo = armarVisita(fields);
      // Quien no puede asignar no manda responsable (el backend lo rechazaría): el líder de bienvenida lo asigna después.
      if (!puedeAsignar) cuerpo.ficha.responsable_id = null;
      await registrarVisita(cuerpo);
      Alert.alert('Visita registrada', 'El visitante ha sido registrado exitosamente.', [
        {
          text: 'OK',
          // Si esta es la primera pantalla de la pila (el comité entra directo aquí) no hay a dónde volver:
          // se deja la ficha limpia para la siguiente visita.
          onPress: () => (navigation.canGoBack() ? navigation.goBack() : setFields(INITIAL_VISITA)),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', mensajeDeErrorVisita(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputTheme = {
    colors: {
      primary: PANTONE_295C,
      outline: '#D3D6DB',
      background: '#fff',
    },
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.description}>
          La ficha del comité de bienvenida. Solo son obligatorios el nombre, los apellidos y la
          autorización de la visita; lo demás ayuda a acompañarla después.
        </Text>

        <TextInput
          label="Nombre *"
          value={fields.nombre}
          onChangeText={t => handleChange('nombre', t)}
          mode="outlined"
          style={styles.input}
          theme={inputTheme}
          outlineColor="#D3D6DB"
          activeOutlineColor={PANTONE_295C}
          error={!!errors.nombre}
          autoCapitalize="words"
          autoFocus
        />
        {!!errors.nombre && <Text style={styles.errorText}>{errors.nombre}</Text>}

        <TextInput
          label="Apellidos *"
          value={fields.apellidos}
          onChangeText={t => handleChange('apellidos', t)}
          mode="outlined"
          style={styles.input}
          theme={inputTheme}
          outlineColor="#D3D6DB"
          activeOutlineColor={PANTONE_295C}
          error={!!errors.apellidos}
          autoCapitalize="words"
        />
        {!!errors.apellidos && <Text style={styles.errorText}>{errors.apellidos}</Text>}

        <TextInput
          label="Teléfono (opcional)"
          value={fields.telefono}
          onChangeText={t => handleChange('telefono', t)}
          mode="outlined"
          style={styles.input}
          theme={inputTheme}
          outlineColor="#D3D6DB"
          activeOutlineColor={PANTONE_295C}
          keyboardType="phone-pad"
        />

        <TextInput
          label="Email (opcional)"
          value={fields.email}
          onChangeText={t => handleChange('email', t)}
          mode="outlined"
          style={styles.input}
          theme={inputTheme}
          outlineColor="#D3D6DB"
          activeOutlineColor={PANTONE_295C}
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!errors.email}
        />
        {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <TextInput
          label="Comuna (opcional)"
          value={fields.ciudad}
          onChangeText={t => handleChange('ciudad', t)}
          mode="outlined"
          style={styles.input}
          theme={inputTheme}
          outlineColor="#D3D6DB"
          activeOutlineColor={PANTONE_295C}
          autoCapitalize="words"
        />

        <Opciones
          label="¿Cómo llegó?"
          opciones={COMO_LLEGO}
          value={fields.como_llego}
          onChange={v => handleChange('como_llego', v)}
        />
        {fields.como_llego === 'invitado' && hermanos.length > 0 && (
          <PersonaPicker
            label="¿Quién lo invitó? (opcional)"
            opciones={hermanos}
            value={fields.invitado_por_id}
            onChange={id => handleChange('invitado_por_id', id)}
          />
        )}

        <Opciones
          label="¿Quiere que lo contacten?"
          opciones={QUIERE_CONTACTO}
          value={fields.quiere_contacto}
          onChange={v => handleChange('quiere_contacto', v)}
        />
        {!puedeAsignar && (
          <Text style={styles.helper}>Quien lidera la bienvenida asignará el seguimiento.</Text>
        )}
        {puedeAsignar && usuarios.length > 0 && (
          <PersonaPicker
            label="Seguimiento a cargo de"
            ayuda="Le llega un aviso al teléfono"
            opciones={usuarios}
            value={fields.responsable_id}
            onChange={id => handleChange('responsable_id', id)}
          />
        )}

        <TextInput
          label="Petición de oración (opcional)"
          value={fields.peticion}
          onChangeText={t => handleChange('peticion', t)}
          mode="outlined"
          style={[styles.input, styles.multiline]}
          theme={inputTheme}
          outlineColor="#D3D6DB"
          activeOutlineColor={PANTONE_295C}
          multiline
        />
        <Text style={styles.helper}>Queda privada en Peticiones de oración</Text>

        <TextInput
          label="Notas (opcional)"
          value={fields.notas}
          onChangeText={t => handleChange('notas', t)}
          mode="outlined"
          style={[styles.input, styles.multiline]}
          theme={inputTheme}
          outlineColor="#D3D6DB"
          activeOutlineColor={PANTONE_295C}
          multiline
        />

        <Divider style={styles.divider} />
        <Checkbox.Item
          label="La visita aceptó que la iglesia guarde estos datos para contactarla y acompañarla. Puede pedir que los borren cuando quiera."
          status={fields.consentimiento ? 'checked' : 'unchecked'}
          onPress={() => handleChange('consentimiento', !fields.consentimiento)}
          position="leading"
          // En iOS, Paper dibuja la casilla sin marcar como nada: el consentimiento tiene que verse.
          mode="android"
          color={PANTONE_295C}
          uncheckedColor="#666"
          labelStyle={styles.consentLabel}
          style={styles.consent}
        />
        {!!errors.consentimiento && <Text style={styles.errorText}>{errors.consentimiento}</Text>}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={styles.button}
          contentStyle={{ height: 48 }}
          labelStyle={styles.buttonLabel}
        >
          Registrar visita
        </Button>

        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={submitting}
          style={styles.cancelButton}
          contentStyle={{ height: 44 }}
          textColor={PANTONE_295C}
        >
          Cancelar
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  content: { padding: 20, paddingBottom: 40 },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: { marginBottom: 4, backgroundColor: '#fff' },
  multiline: { minHeight: 80 },
  helper: { fontSize: 12, color: '#777', marginBottom: 8, marginLeft: 4 },
  group: { marginTop: 16 },
  groupLabel: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D3D6DB' },
  chipActive: { backgroundColor: '#E8EEF7', borderColor: PANTONE_295C },
  chipTextActive: { color: PANTONE_295C, fontWeight: '600' },
  divider: { marginTop: 20, marginBottom: 4 },
  consent: { paddingHorizontal: 0 },
  consentLabel: { textAlign: 'left', fontSize: 14, color: '#333' },
  errorText: { color: '#D32F2F', fontSize: 12, marginBottom: 10, marginLeft: 4 },
  button: {
    backgroundColor: PANTONE_295C,
    borderRadius: 10,
    marginTop: 24,
    elevation: 0,
  },
  buttonLabel: { color: PANTONE_134C, fontWeight: 'bold', fontSize: 16 },
  cancelButton: {
    borderRadius: 10,
    marginTop: 12,
    borderColor: PANTONE_295C,
  },
});
