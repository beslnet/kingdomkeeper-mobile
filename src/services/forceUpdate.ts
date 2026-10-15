import { Platform } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../api/api';
import { APP_VERSION, STORE_URLS } from '../version';
import { appStoreLookupUrl, decideFromLookup, isVersionOutdated } from '../utils/versionCheck';
import { useAppStore } from '../store/appStore';
import { dlog } from '../utils/debugLogger';

/** Espera máxima de la consulta: si tarda más, se abandona y la app sigue normal. */
const TIMEOUT_MS = 8000;

/**
 * Chequeo de versión al abrir (y al volver a primer plano). Nunca bloquea la app por
 * un fallo: SOLO activa la pantalla de actualización cuando recibió una respuesta
 * legible que dice que la versión instalada es menor. Todos los demás casos —sin red,
 * timeout, HTTP de error, JSON roto, respuesta vacía, versión aún no propagada, endpoint
 * inexistente en un backend viejo— terminan en silencio y la app abre normal.
 *
 * Es una función aparte, y no un efecto de App.tsx, para poder probarla.
 */
export async function checkForUpdate(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      const res = await fetchWithTimeout(appStoreLookupUrl());
      if (!res.ok) return;
      const decision = decideFromLookup(await res.json());
      if (decision.force) {
        useAppStore.getState().setForceUpdate(true, STORE_URLS.ios);
      }
    } else {
      const res = await axios.get(`${API_BASE_URL}/api/public/app-version/`, {
        timeout: TIMEOUT_MS,
      });
      const android = res.data?.data?.android;
      if (android && isVersionOutdated(APP_VERSION, android.minimum_version)) {
        useAppStore.getState().setForceUpdate(true, android.store_url || STORE_URLS.android);
      }
    }
  } catch (e) {
    dlog('checkForUpdate: sin respuesta útil, no se fuerza', e);
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Mínimo entre dos chequeos al volver a primer plano. */
export const RECHECK_INTERVAL_MS = 10 * 60 * 1000;
