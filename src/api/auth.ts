import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface MiembroAsociado {
  id: number;
  nombre_completo: string;
  foto_url?: string;
  telefono?: string;
  direccion?: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  miembro_asociado?: MiembroAsociado | null;
  iglesias?: Array<{ id: number; nombre: string; roles: string[] }>;
}

export interface Iglesia {
  id: number;
  nombre: string;
  logo_url?: string;
}

export interface PermissionsResponse {
  permisos: Record<string, string[]> | 'all';
  roles: string[];
  roles_iglesia_actual?: string[];
  modulos_accesibles: string[];
  es_super_admin: boolean;
  iglesia?: Iglesia | null;
  usuario?: Partial<UserProfile>;
}

export async function loginRequest(username: string, password: string): Promise<TokenResponse> {
  const response = await axios.post<TokenResponse>(
    `${API_BASE_URL}${ENDPOINTS.token}`,
    { username, password },
  );
  return response.data;
}

export async function refreshTokenRequest(refresh: string): Promise<TokenResponse> {
  const response = await axios.post<TokenResponse>(
    `${API_BASE_URL}${ENDPOINTS.tokenRefresh}`,
    { refresh },
  );
  return response.data;
}

export async function fetchUserProfile(accessToken?: string): Promise<UserProfile> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await axios.get<UserProfile>(
    `${API_BASE_URL}${ENDPOINTS.me}`,
    { headers },
  );
  return response.data;
}

export async function fetchMisIglesias(accessToken?: string): Promise<Iglesia[]> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await axios.get<Iglesia[]>(
    `${API_BASE_URL}${ENDPOINTS.misIglesias}`,
    { headers },
  );
  return response.data;
}

export async function fetchMisPermisos(): Promise<PermissionsResponse> {
  const { default: api } = await import('./api');
  const response = await api.get<PermissionsResponse>(ENDPOINTS.misPermisos);
  return response.data;
}

export async function solicitarRestablecerPassword(email: string): Promise<void> {
  await axios.post(
    `${API_BASE_URL}${ENDPOINTS.solicitarRestablecerPassword}`,
    { email },
  );
}
