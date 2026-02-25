import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Icon, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useAuthStore } from '../store/authStore';
import { useIglesiaStore } from '../store/iglesiaStore';
import {
  getMyProfile,
  updateProfile,
  getMyMemberData,
  updateMyMemberData,
  uploadProfilePhoto,
} from '../api/perfil';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

const TIPOS_DOCUMENTO = [
  { value: 'rut', label: 'RUT (Chile)' },
  { value: 'dni', label: 'DNI' },
  { value: 'cedula', label: 'Cédula' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'otro', label: 'Otro' },
];

const GENEROS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
];

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const iglesiaNombre = useIglesiaStore((state) => state.iglesiaNombre);
  const navigation = useNavigation<any>();

  // Form state — basic data
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  // Form state — member data
  const [telefono, setTelefono] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [genero, setGenero] = useState('');
  const [hasMemberData, setHasMemberData] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profile, memberData] = await Promise.allSettled([
        getMyProfile(),
        getMyMemberData(),
      ]);

      if (profile.status === 'fulfilled') {
        const p = profile.value;
        setNombre(p.nombre ?? '');
        setApellidos(p.apellidos ?? '');
        setEmail(p.email ?? '');
        if (p.miembro_asociado?.foto_perfil_url) {
          setFotoUrl(p.miembro_asociado.foto_perfil_url);
        }
      }

      if (memberData.status === 'fulfilled') {
        const m = memberData.value;
        setHasMemberData(true);
        setTelefono(m.telefono ?? '');
        setTipoDocumento(m.tipo_documento ?? '');
        setDocumentoIdentidad(m.documento_identidad ?? '');
        setFechaNacimiento(m.fecha_nacimiento ?? '');
        setGenero(m.genero ?? '');
        if (m.foto_perfil_url) setFotoUrl(m.foto_perfil_url);
      } else {
        // 404 or other error — no member data
        setHasMemberData(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePickPhoto = () => {
    Alert.alert('Foto de perfil', 'Elige una opción', [
      {
        text: 'Tomar foto',
        onPress: () => openCamera(),
      },
      {
        text: 'Elegir de galería',
        onPress: () => openGallery(),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const uploadPhoto = async (uri: string, type: string, fileName: string) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('foto', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        type,
        name: fileName,
      } as any);
      const result = await uploadProfilePhoto(formData);
      if (result.foto_perfil_url) setFotoUrl(result.foto_perfil_url);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400) {
        Alert.alert('Error', 'Formato de imagen no válido o el archivo supera los 5MB.');
      } else {
        Alert.alert('Error', 'No se pudo subir la foto. Verifica tu conexión e intenta de nuevo.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const openCamera = () => {
    launchCamera(
      { mediaType: 'photo', quality: 0.8, maxWidth: 800, maxHeight: 800 },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (asset?.uri) {
          uploadPhoto(asset.uri, asset.type ?? 'image/jpeg', asset.fileName ?? 'photo.jpg');
        }
      }
    );
  };

  const openGallery = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, maxWidth: 800, maxHeight: 800 },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (asset?.uri) {
          uploadPhoto(asset.uri, asset.type ?? 'image/jpeg', asset.fileName ?? 'photo.jpg');
        }
      }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tasks: Promise<any>[] = [updateProfile({ nombre, apellidos })];
      if (hasMemberData) {
        tasks.push(
          updateMyMemberData({
            telefono,
            tipo_documento: tipoDocumento,
            documento_identidad: documentoIdentidad,
            fecha_nacimiento: fechaNacimiento,
            genero,
          })
        );
      }
      await Promise.all(tasks);
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
    } catch (err: any) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        const messages = Object.values(data).flat().join('\n');
        Alert.alert('Error al guardar', messages || 'Verifica los datos e intenta de nuevo.');
      } else {
        Alert.alert('Error', 'No se pudo guardar el perfil. Verifica tu conexión e intenta de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logout();
          },
        },
      ]
    );
  };

  const initials =
    nombre || apellidos
      ? `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase()
      : user?.username?.charAt(0)?.toUpperCase() ?? '?';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Sección 1: Foto de perfil */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          {fotoUrl ? (
            <Image source={{ uri: fotoUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitials}>{initials}</Text>
          )}
          {uploadingPhoto && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickPhoto} disabled={uploadingPhoto}>
          <Text style={styles.changePhotoText}>Cambiar Foto</Text>
        </TouchableOpacity>
        {iglesiaNombre ? (
          <View style={styles.churchBadge}>
            <Icon source="church" size={14} color={PANTONE_295C} />
            <Text style={styles.churchBadgeText}>{iglesiaNombre}</Text>
          </View>
        ) : null}
      </View>

      {/* Sección 2: Datos Básicos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATOS BÁSICOS</Text>
        <Divider style={styles.divider} />

        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput
          style={styles.textInput}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.fieldLabel}>Apellidos</Text>
        <TextInput
          style={styles.textInput}
          value={apellidos}
          onChangeText={setApellidos}
          placeholder="Apellidos"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={[styles.textInput, styles.textInputDisabled]}
          value={email}
          editable={false}
          placeholderTextColor="#aaa"
        />
        <Text style={styles.fieldHint}>Para cambiar tu email, usa la versión web.</Text>
      </View>

      {/* Sección 3: Datos de Membresía */}
      {hasMemberData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATOS DE MEMBRESÍA</Text>
          <Divider style={styles.divider} />

          <Text style={styles.fieldLabel}>Teléfono</Text>
          <TextInput
            style={styles.textInput}
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            placeholder="Teléfono"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.fieldLabel}>Tipo de Documento</Text>
          <View style={styles.pickerContainer}>
            {TIPOS_DOCUMENTO.map((tipo) => (
              <TouchableOpacity
                key={tipo.value}
                style={[
                  styles.pickerOption,
                  tipoDocumento === tipo.value && styles.pickerOptionSelected,
                ]}
                onPress={() => setTipoDocumento(tipo.value)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    tipoDocumento === tipo.value && styles.pickerOptionTextSelected,
                  ]}
                >
                  {tipo.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Número de Documento</Text>
          <TextInput
            style={styles.textInput}
            value={documentoIdentidad}
            onChangeText={setDocumentoIdentidad}
            placeholder="Número de documento"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.fieldLabel}>Fecha de Nacimiento (AAAA-MM-DD)</Text>
          <TextInput
            style={styles.textInput}
            value={fechaNacimiento}
            onChangeText={setFechaNacimiento}
            placeholder="Ej: 1990-01-15"
            placeholderTextColor="#aaa"
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.fieldLabel}>Sexo</Text>
          <View style={styles.pickerContainer}>
            {GENEROS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[
                  styles.pickerOption,
                  genero === g.value && styles.pickerOptionSelected,
                ]}
                onPress={() => setGenero(g.value)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    genero === g.value && styles.pickerOptionTextSelected,
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Sección 4: Acciones */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={PANTONE_134C} size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changePasswordLink}
          onPress={() => navigation.navigate('ChangePassword')}
          activeOpacity={0.7}
        >
          <Icon source="lock-outline" size={18} color={PANTONE_295C} />
          <Text style={styles.changePasswordText}>Cambiar Contraseña</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutButton, loggingOut && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
        >
          <Icon source="logout" size={20} color="#fff" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  avatarCircle: {
    backgroundColor: '#EAF0FB',
    borderRadius: 50,
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarInitials: { fontSize: 36, fontWeight: 'bold', color: PANTONE_295C },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 10,
  },
  changePhotoText: { color: PANTONE_134C, fontWeight: '600', fontSize: 13 },
  churchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF0FB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
    gap: 4,
  },
  churchBadgeText: { fontSize: 13, color: PANTONE_295C, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 8,
  },
  divider: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 12 },
  fieldHint: { fontSize: 11, color: '#aaa', marginTop: 4 },
  textInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
  },
  textInputDisabled: { color: '#999', backgroundColor: '#EFEFEF' },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pickerOption: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F7FA',
  },
  pickerOptionSelected: { backgroundColor: PANTONE_295C, borderColor: PANTONE_295C },
  pickerOptionText: { fontSize: 13, color: '#555' },
  pickerOptionTextSelected: { color: '#fff', fontWeight: '600' },
  actionsSection: { marginHorizontal: 16, marginBottom: 16 },
  saveButton: {
    backgroundColor: PANTONE_295C,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: { color: PANTONE_134C, fontWeight: 'bold', fontSize: 16 },
  changePasswordLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginBottom: 12,
  },
  changePasswordText: { color: PANTONE_295C, fontWeight: '600', fontSize: 15 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C0392B',
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
