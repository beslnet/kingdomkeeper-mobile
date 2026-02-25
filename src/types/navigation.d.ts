export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ChurchSelector: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Grupos: undefined;
  Bandeja: undefined;
  Perfil: undefined;
};

export type DrawerParamList = {
  Inicio: undefined;
  Membresia: undefined;
  'Grupos y Células': undefined;
  Inventario: undefined;
  Finanzas: undefined;
  Comunicaciones: undefined;
  'Bandeja de Entrada': undefined;
  'Casos Pastorales': undefined;
  Soporte: undefined;
  Configuración: undefined;
  Suscripciones: undefined;
};

// Keep backward compat alias
export type RootStackParamList = AuthStackParamList;
