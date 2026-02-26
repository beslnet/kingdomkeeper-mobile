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