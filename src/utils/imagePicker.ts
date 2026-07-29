import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
  CameraOptions,
  ImageLibraryOptions,
  ImagePickerResponse,
} from 'react-native-image-picker';

// AndroidManifest.xml declara android.permission.CAMERA. react-native-image-picker no
// necesita ese permiso, pero si la app lo declara y no está concedido, la librería aborta
// con errorCode 'others' y la cámara nunca se abre. Por eso hay que pedirlo en runtime.
const requestAndroidCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
  if (already) return true;

  const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Permiso de cámara',
    message: 'Kingdom Keeper necesita acceso a la cámara para tomar la foto.',
    buttonPositive: 'Permitir',
    buttonNegative: 'Cancelar',
  });

  if (status === PermissionsAndroid.RESULTS.GRANTED) return true;

  if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    Alert.alert(
      'Permiso de cámara bloqueado',
      'Habilita el permiso de cámara en los ajustes del sistema para poder tomar fotos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
      ]
    );
  }

  return false;
};

// didCancel es una acción deliberada del usuario: se ignora en silencio.
// errorCode es un fallo real: se le avisa al usuario en vez de no hacer nada.
const resolveAsset = (response: ImagePickerResponse): Asset | null => {
  if (response.didCancel) return null;

  if (response.errorCode) {
    const detail =
      response.errorCode === 'camera_unavailable'
        ? 'La cámara no está disponible en este dispositivo.'
        : response.errorCode === 'permission'
        ? 'No hay permisos suficientes para acceder a la cámara o a las fotos.'
        : response.errorMessage || 'Ocurrió un error inesperado.';
    Alert.alert('No se pudo obtener la imagen', detail);
    return null;
  }

  const asset = response.assets?.[0];
  if (!asset?.uri) {
    Alert.alert('No se pudo obtener la imagen', 'No se recibió ninguna imagen válida.');
    return null;
  }

  return asset;
};

/**
 * Abre la cámara pidiendo antes el permiso CAMERA en Android.
 * Devuelve null si el usuario cancela o si hubo un error (ya avisado con un Alert).
 */
export const takePhoto = async (options: CameraOptions): Promise<Asset | null> => {
  try {
    const granted = await requestAndroidCameraPermission();
    if (!granted) return null;

    return resolveAsset(await launchCamera(options));
  } catch {
    Alert.alert('No se pudo abrir la cámara', 'Intenta de nuevo.');
    return null;
  }
};

/**
 * Abre la galería del sistema. No requiere permisos (usa PickVisualMedia).
 * Devuelve null si el usuario cancela o si hubo un error (ya avisado con un Alert).
 */
export const pickPhotoFromLibrary = async (options: ImageLibraryOptions): Promise<Asset | null> => {
  try {
    return resolveAsset(await launchImageLibrary(options));
  } catch {
    Alert.alert('No se pudo abrir la galería', 'Intenta de nuevo.');
    return null;
  }
};
