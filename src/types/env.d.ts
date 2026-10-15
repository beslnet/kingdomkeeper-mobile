declare module '@env' {
  export const GOOGLE_MAPS_API_KEY: string;
}

// react-native-vector-icons no trae tipos y @types/react-native-vector-icons no está instalado; MainTabs
// es el único que lo usa (el resto de la app usa <Icon> de react-native-paper). Se declara solo lo que
// se usa: un ícono de la familia Material Community, por nombre.
declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import type { ComponentType } from 'react';
  import type { TextProps } from 'react-native';

  const MaterialCommunityIcons: ComponentType<TextProps & { name: string; size?: number; color?: string }>;
  export default MaterialCommunityIcons;
}
