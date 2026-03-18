import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Icon, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DeviceInfo from 'react-native-device-info';
import { useAuthStore } from '../store/authStore';
import { useIglesiaStore } from '../store/iglesiaStore';
const APP_VERSION = DeviceInfo.getVersion();
import {
  getMyProfile,
  updateProfile,
  getMyMemberData,
  updateMyMemberData,
  uploadProfilePhoto,
} from '../api/perfil';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';
import { GOOGLE_MAPS_API_KEY } from '../config/maps';

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
  const setUser = useAuthStore((state) => state.setUser);
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

  // Form state — address
  const [direccionFormateada, setDireccionFormateada] = useState('');
  const [pais, setPais] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [region, setRegion] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const placesRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
        setDireccionFormateada(m.direccion_formateada ?? '');
        setPais(m.pais ?? '');
        setCiudad(m.ciudad ?? '');
        setRegion(m.region ?? '');
        setCodigoPostal(m.codigo_postal ?? '');
        setLatitud(m.latitud ?? '');
        setLongitud(m.longitud ?? '');
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
      if (result.foto_perfil_url) {
        const url = result.foto_perfil_url;
        const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
        setFotoUrl(cacheBustedUrl);
        // Actualiza el store global para refrescar el avatar en otros componentes
        if (user) {
          setUser({
            ...user,
            miembro_asociado: {
              ...(user.miembro_asociado ?? {}),
              foto_perfil_url: url,
            },
          });
        }
      }
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
            direccion_formateada: direccionFormateada,
            pais,
            ciudad,
            region,
            codigo_postal: codigoPostal,
            latitud: latitud || undefined,
            longitud: longitud || undefined,
          })
        );
      }
      await Promise.all(tasks);
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
    } catch (err: any) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        // Traducir mensajes técnicos del backend a mensajes amigables
        const friendlyMessages = Object.entries(data).flatMap(([field, msgs]) => {
          const rawMsgs = (Array.isArray(msgs) ? msgs : [msgs]) as string[];
          return rawMsgs.map((msg) => {
            if (
              field === 'documento_identidad' &&
              tipoDocumento === 'rut' &&
              /rut|dígito verificador|verificador/i.test(msg)
            ) {
              return 'El RUT ingresado no es válido. Revisa que los números ingresados sean correctos.';
            }
            return msg;
          });
        });
        Alert.alert('Error al guardar', friendlyMessages.join('\n') || 'Verifica los datos e intenta de nuevo.');
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

          <Text style={styles.fieldLabel}>Fecha de Nacimiento</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={fechaNacimiento ? styles.datePickerText : styles.datePickerPlaceholder}>
              {fechaNacimiento
                ? (() => {
                    const [y, m, d] = fechaNacimiento.split('-');
                    return `${d}/${m}/${y}`;
                  })()
                : 'Selecciona tu fecha de nacimiento'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            Platform.OS === 'ios' ? (
              <Modal transparent animationType="slide" visible={showDatePicker}>
                <View style={styles.dateModalOverlay}>
                  <View style={styles.dateModalContent}>
                    <View style={styles.dateModalHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.dateModalDone}>Listo</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={fechaNacimiento ? new Date(fechaNacimiento) : new Date(1990, 0, 1)}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      locale="es-CL"
                      onChange={(_event, date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, '0');
                          const d = String(date.getDate()).padStart(2, '0');
                          setFechaNacimiento(`${y}-${m}-${d}`);
                        }
                      }}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={fechaNacimiento ? new Date(fechaNacimiento) : new Date(1990, 0, 1)}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(_event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    setFechaNacimiento(`${y}-${m}-${d}`);
                  }
                }}
              />
            )
          )}

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
          {tipoDocumento === 'rut' && (
            <Text style={styles.fieldHint}>Formato: 12.345.678-9 (con o sin puntos, con guión y dígito verificador)</Text>
          )}

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

      {/* Sección 4: Dirección */}
      {hasMemberData && (
        <View style={[styles.section, { zIndex: 10 }]}>
          <Text style={styles.sectionTitle}>DIRECCIÓN</Text>
          <Divider style={styles.divider} />

          {direccionFormateada ? (
            <View style={styles.addressDisplay}>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressText}>{direccionFormateada}</Text>
                {pais ? <Text style={styles.addressMeta}>{[ciudad, region, pais].filter(Boolean).join(', ')}</Text> : null}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setDireccionFormateada('');
                  setPais(''); setCiudad(''); setRegion('');
                  setCodigoPostal(''); setLatitud(''); setLongitud('');
                  setTimeout(() => placesRef.current?.focus(), 100);
                }}
              >
                <Text style={styles.addressChangeLink}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!direccionFormateada && (
            <>
              <Text style={styles.fieldLabel}>Buscar dirección</Text>
              <GooglePlacesAutocomplete
                ref={placesRef}
                placeholder="Escribe tu dirección..."
                onPress={(data, details = null) => {
                  const components = details?.address_components ?? [];
                  const get = (type: string) =>
                    components.find((c: any) => c.types.includes(type))?.long_name ?? '';
                  setDireccionFormateada(data.description);
                  setPais(get('country'));
                  setCiudad(get('locality') || get('administrative_area_level_2'));
                  setRegion(get('administrative_area_level_1'));
                  setCodigoPostal(get('postal_code'));
                  if (details?.geometry?.location) {
                    setLatitud(parseFloat(details.geometry.location.lat.toFixed(6)).toString());
                    setLongitud(parseFloat(details.geometry.location.lng.toFixed(6)).toString());
                  }
                }}
                query={{ key: GOOGLE_MAPS_API_KEY, language: 'es' }}
                fetchDetails={true}
                enablePoweredByContainer={false}
                styles={{
                  textInput: {
                    backgroundColor: '#F5F7FA',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#DDD',
                    paddingHorizontal: 12,
                    fontSize: 15,
                    color: '#222',
                    height: 44,
                  },
                  row: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12 },
                  description: { fontSize: 14, color: '#333' },
                  listView: {
                    borderWidth: 1,
                    borderColor: '#DDD',
                    borderRadius: 8,
                    marginTop: 2,
                  },
                }}
                textInputProps={{ placeholderTextColor: '#aaa' }}
              />
            </>
          )}
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
          onPress={() => navigation.navigate('FamilyRelationships')}
          activeOpacity={0.7}
        >
          <Icon source="account-group-outline" size={18} color={PANTONE_295C} />
          <Text style={styles.changePasswordText}>Relaciones Familiares</Text>
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
          style={styles.deleteAccountLink}
          onPress={() => navigation.navigate('DeleteAccount')}
          activeOpacity={0.7}
        >
          <Icon source="account-remove-outline" size={18} color="#C0392B" />
          <Text style={styles.deleteAccountText}>Eliminar mi cuenta</Text>
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
        <Text style={styles.versionLabel}>v{APP_VERSION}</Text>
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
  datePickerButton: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  datePickerText: { fontSize: 15, color: '#222' },
  datePickerPlaceholder: { fontSize: 15, color: '#aaa' },
  dateModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dateModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  dateModalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  dateModalDone: { color: PANTONE_295C, fontWeight: '700', fontSize: 16 },
  addressDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 12,
    gap: 8,
  },
  addressText: { fontSize: 14, color: '#222', flexShrink: 1 },
  addressMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  addressChangeLink: { color: PANTONE_295C, fontWeight: '600', fontSize: 13, paddingTop: 2 },
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
  deleteAccountLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginBottom: 12,
  },
  deleteAccountText: { color: '#C0392B', fontWeight: '600', fontSize: 15 },
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
  versionLabel: { textAlign: 'center', fontSize: 12, color: '#BBB', marginTop: 16, marginBottom: 4 },
});
