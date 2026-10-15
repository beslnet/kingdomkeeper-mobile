import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dlog } from './debugLogger';

/**
 * Dónde vive cada token:
 *
 *  · access token (60 min) → AsyncStorage, clave `access_token`. Dura poco y lo lee cada
 *    petición; el Keychain sería lento para eso.
 *  · refresh token (30 días) → Keychain. Es la credencial larga: con él se pide un
 *    access nuevo sin contraseña, así que es la que no puede quedar en un archivo
 *    plano del teléfono (AsyncStorage no está cifrado y entra en los respaldos de iOS).
 *
 * MIGRACIÓN (1.1.3 → esta): la 1.1.3 guardaba el refresh token en AsyncStorage, clave
 * `refresh_token`. Quien actualiza con la sesión abierta NO debe quedar deslogueado:
 * `getRefreshToken` lee el Keychain y, si está vacío, el valor viejo; y
 * `migrateRefreshToken` lo mueve (y borra la copia vieja) al abrir la app.
 *
 * Si el Keychain falla (típico: simulador sin entitlements, o un Keychain bloqueado),
 * el refresh token se deja en AsyncStorage en vez de perderlo: quedar deslogueado por
 * un fallo del almacén es peor que la exposición que ya tenía la 1.1.3.
 */
const ACCESS_TOKEN_KEY = 'access_token';
/** Misma clave que usaba la 1.1.3. Hoy solo sirve para migrar o para el respaldo si falla el Keychain. */
const LEGACY_REFRESH_KEY = 'refresh_token';
const REFRESH_SERVICE = 'com.kingdomkeeper.mobile.refresh_token';
const REFRESH_USERNAME = 'refresh_token';

// ── Access token ────────────────────────────────────────────────────────────

export async function saveAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function deleteAccessToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (e) {
    dlog('deleteAccessToken falló', e);
  }
}

// ── Refresh token ───────────────────────────────────────────────────────────

async function readKeychain(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: REFRESH_SERVICE });
    return creds ? creds.password : null;
  } catch (e) {
    dlog('[Keychain] lectura falló', e);
    return null;
  }
}

/**
 * Guarda el refresh token en el Keychain y borra la copia de AsyncStorage. Si el
 * Keychain no lo acepta, lo deja en AsyncStorage (ver arriba) y devuelve false.
 */
export async function saveRefreshToken(token: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(REFRESH_USERNAME, token, {
      service: REFRESH_SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    });
    // Se confirma leyéndolo: un `set` que no lanza pero tampoco guarda dejaría sin
    // sesión al usuario justo después de borrar la copia vieja.
    if ((await readKeychain()) === token) {
      await AsyncStorage.removeItem(LEGACY_REFRESH_KEY);
      return true;
    }
  } catch (e) {
    dlog('[Keychain] guardado falló', e);
  }
  await AsyncStorage.setItem(LEGACY_REFRESH_KEY, token);
  return false;
}

export async function getRefreshToken(): Promise<string | null> {
  const fromKeychain = await readKeychain();
  if (fromKeychain) return fromKeychain;
  try {
    return await AsyncStorage.getItem(LEGACY_REFRESH_KEY);
  } catch {
    return null;
  }
}

/**
 * Mueve un refresh token que haya quedado en AsyncStorage (sesión de la 1.1.3) al
 * Keychain. Idempotente y segura: la copia vieja solo se borra tras leer el valor de
 * vuelta del Keychain.
 */
export async function migrateRefreshToken(): Promise<void> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_REFRESH_KEY);
    if (!legacy) return;
    const inKeychain = await readKeychain();
    if (inKeychain) {
      // Ya hay uno en el Keychain: es el más reciente (el interceptor lo rota y guarda
      // ahí), así que la copia vieja sobra.
      await AsyncStorage.removeItem(LEGACY_REFRESH_KEY);
      return;
    }
    await saveRefreshToken(legacy);
  } catch (e) {
    dlog('migrateRefreshToken falló', e);
  }
}

export async function deleteRefreshToken(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: REFRESH_SERVICE });
  } catch (e) {
    dlog('[Keychain] borrado falló', e);
  }
  try {
    await AsyncStorage.removeItem(LEGACY_REFRESH_KEY);
  } catch (e) {
    dlog('borrado de la copia vieja falló', e);
  }
}

/** Borra todo lo que identifica la sesión en este teléfono. */
export async function clearAllTokens(): Promise<void> {
  await deleteAccessToken();
  await deleteRefreshToken();
}
