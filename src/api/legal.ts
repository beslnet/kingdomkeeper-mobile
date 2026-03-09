import api from './api';

export interface LegalDocument {
  id: number;
  tipo: string;
  tipo_display: string;
  version: string;
  titulo: string;
  contenido_url: string | null;
  fecha_vigencia: string;
  es_vigente: boolean;
  requiere_aceptacion: boolean;
}

export interface VerificarResponse {
  todo_aceptado: boolean;
  documentos_pendientes: LegalDocument[];
}

export async function verificarTerminos(): Promise<VerificarResponse> {
  const res = await api.get('/api/core/legal-acceptance/verificar/');
  return res.data;
}

export async function aceptarTerminos(
  documento_ids: number[],
  metodo: 'login' | 'registro' | 'actualizacion' = 'login',
): Promise<void> {
  await api.post('/api/core/legal-acceptance/aceptar/', { documento_ids, metodo });
}

export async function obtenerDocumentosVigentes(): Promise<LegalDocument[]> {
  const res = await api.get('/api/core/legal/vigentes/');
  return res.data;
}
