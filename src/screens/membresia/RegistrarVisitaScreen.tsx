import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { registrarVisita } from '../../api/miembros';
import { PANTONE_134C, PANTONE_295C } from '../../theme/colors';

const INITIAL_FIELDS = { nombre: '', apellidos: '', telefono: '', email: '' };

export default function RegistrarVisitaScreen() {
  const navigation = useNavigation<any>();
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fields.nombre || fields.nombre.trim().length < 2) {
      errs.nombre = 'El nombre debe tener al menos 2 caracteres.';
    }
    if (!fields.apellidos || fields.apellidos.trim().length < 2) {
      errs.apellidos = 'Los apellidos deben tener al menos 2 caracteres.';
    }
    if (fields.email && !fields.email.includes('@')) {
      errs.email = 'Ingresa un email válido.';
    }
    return errs;
  };

  const handleChange = (name: string, value: string) => {
    setFields(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      await registrarVisita({
        nombre: fields.nombre.trim(),
        apellidos: fields.apellidos.trim(),
        telefono: fields.telefono.trim() || undefined,
        email: fields.email.trim() || undefined,
      });
      Alert.alert('Visita registrada', 'El visitante ha sido registrado exitosamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo registrar la visita. Intenta de nuevo.');
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
          Registra los datos básicos del visitante. El sistema generará un identificador
          interno automáticamente.
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
