import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { changePassword } from '../api/perfil';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  const validate = () => {
    const errs: typeof errors = {};
    if (!currentPassword) errs.current = 'La contraseña actual es obligatoria.';
    if (!newPassword) errs.new = 'La nueva contraseña es obligatoria.';
    else if (newPassword.length < 8) errs.new = 'La nueva contraseña debe tener al menos 8 caracteres.';
    if (!confirmPassword) errs.confirm = 'Confirma la nueva contraseña.';
    else if (newPassword !== confirmPassword) errs.confirm = 'Las contraseñas no coinciden.';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Éxito', 'Contraseña cambiada exitosamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.current_password) {
        setErrors({ current: data.current_password[0] });
      } else if (data?.new_password) {
        setErrors({ new: data.new_password[0] });
      } else {
        Alert.alert('Error', 'No se pudo cambiar la contraseña. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Cambiar Contraseña</Text>

      {/* Contraseña actual */}
      <Text style={styles.label}>Contraseña actual</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry={!showCurrent}
          placeholder="Ingresa tu contraseña actual"
          autoCapitalize="none"
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
          <Icon source={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
        </TouchableOpacity>
      </View>
      {errors.current ? <Text style={styles.errorText}>{errors.current}</Text> : null}

      {/* Nueva contraseña */}
      <Text style={styles.label}>Nueva contraseña</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNew}
          placeholder="Mínimo 8 caracteres"
          autoCapitalize="none"
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
          <Icon source={showNew ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
        </TouchableOpacity>
      </View>
      {errors.new ? <Text style={styles.errorText}>{errors.new}</Text> : null}

      {/* Confirmar contraseña */}
      <Text style={styles.label}>Confirmar nueva contraseña</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          placeholder="Repite la nueva contraseña"
          autoCapitalize="none"
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
          <Icon source={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
        </TouchableOpacity>
      </View>
      {errors.confirm ? <Text style={styles.errorText}>{errors.confirm}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Cambiar Contraseña</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: 'bold', color: PANTONE_295C, marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 16 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#222' },
  eyeBtn: { padding: 6 },
  errorText: { fontSize: 12, color: '#C0392B', marginTop: 4, marginLeft: 2 },
  button: {
    backgroundColor: PANTONE_295C,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: { color: PANTONE_134C, fontWeight: 'bold', fontSize: 16 },
});
