export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Dashboard: undefined;
  ChurchSelector: undefined;
  Main: undefined;
  MessageDetail: { id: number };
};

export type GruposStackParamList = {
  GruposList: undefined;
  GrupoDetail: { id: number; nombre?: string };
  GrupoMiembros: { grupoId: number; grupoNombre: string };
  GrupoLiderazgo: { grupoId: number; grupoNombre: string };
  GrupoEventos: { grupoId: number; grupoNombre: string };
  GrupoFinanzas: { grupoId: number; grupoNombre: string };
  GrupoRecursos: { grupoId: number; grupoNombre: string };
};

export type MembresiaStackParamList = {
  MiembrosList: undefined;
  MiembroDetail: { miembroId: number; nombre?: string };
  MiembroForm: { miembro?: import('../api/miembros').Miembro };
  BitacoraMiembro: { miembroId: number; miembroNombre: string };
  FamilyMiembro: { miembroId: number; miembroNombre: string };
  MiembrosArchivados: undefined;
};

export type FinanzasStackParamList = {
  FinanzasDashboard: undefined;
  TransaccionesList: { tipoFiltro?: string; estadoFiltro?: string } | undefined;
  TransaccionDetail: { transaccionId: number };
  TransaccionForm: { transaccion?: import('../api/finanzas').Transaccion } | undefined;
  CuentasList: undefined;
  CategoriasList: undefined;
};