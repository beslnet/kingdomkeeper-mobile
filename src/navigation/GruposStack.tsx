import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

import GruposListScreen from '../screens/grupos/GruposList';
import GrupoDetailScreen from '../screens/grupos/GrupoDetail';
import GrupoFormScreen from '../screens/grupos/GrupoForm';
import GrupoMiembrosScreen from '../screens/grupos/GrupoMiembros';
import GrupoLiderazgoScreen from '../screens/grupos/GrupoLiderazgo';
import GrupoEventosScreen from '../screens/grupos/GrupoEventos';
import GrupoEventoFormScreen from '../screens/grupos/GrupoEventoForm';
import GrupoEventoDetailScreen from '../screens/grupos/GrupoEventoDetail';
import RegistrarAsistenciaScreen from '../screens/grupos/RegistrarAsistencia';
import VerAsistenciaScreen from '../screens/grupos/VerAsistencia';
import GrupoFinanzasScreen from '../screens/grupos/GrupoFinanzas';
import TransaccionDetailScreen from '../screens/grupos/TransaccionDetail';
import GrupoRecursosScreen from '../screens/grupos/GrupoRecursos';

const Stack = createStackNavigator();

export default function GruposStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: PANTONE_295C },
        headerTintColor: PANTONE_134C,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="GruposList" component={GruposListScreen} options={{ title: 'Grupos' }} />
      <Stack.Screen
        name="GrupoDetail"
        component={GrupoDetailScreen}
        options={({ route }: { route: any }) => ({ title: route.params?.nombre || 'Grupo' })}
      />
      <Stack.Screen
        name="GrupoForm"
        component={GrupoFormScreen}
        options={({ route }: { route: any }) => ({ title: route.params?.grupo ? 'Editar Grupo' : 'Nuevo Grupo' })}
      />
      <Stack.Screen name="GrupoMiembros" component={GrupoMiembrosScreen} options={{ title: 'Miembros' }} />
      <Stack.Screen name="GrupoLiderazgo" component={GrupoLiderazgoScreen} options={{ title: 'Liderazgo' }} />
      <Stack.Screen name="GrupoEventos" component={GrupoEventosScreen} options={{ title: 'Eventos' }} />
      <Stack.Screen
        name="GrupoEventoForm"
        component={GrupoEventoFormScreen}
        options={({ route }: { route: any }) => ({ title: route.params?.evento ? 'Editar Evento' : 'Nuevo Evento' })}
      />
      <Stack.Screen
        name="GrupoEventoDetail"
        component={GrupoEventoDetailScreen}
        options={({ route }: { route: any }) => ({ title: route.params?.titulo || 'Detalle Evento' })}
      />
      <Stack.Screen name="RegistrarAsistencia" component={RegistrarAsistenciaScreen} options={{ title: 'Registrar Asistencia' }} />
      <Stack.Screen
        name="VerAsistencia"
        component={VerAsistenciaScreen}
        options={({ route }: { route: any }) => ({ title: route.params?.titulo || 'Ver Asistencia' })}
      />
      <Stack.Screen name="GrupoFinanzas" component={GrupoFinanzasScreen} options={{ title: 'Finanzas' }} />
      <Stack.Screen
        name="TransaccionDetail"
        component={TransaccionDetailScreen}
        options={{ title: 'Detalle Transacción' }}
      />
      <Stack.Screen name="GrupoRecursos" component={GrupoRecursosScreen} options={{ title: 'Recursos' }} />
    </Stack.Navigator>
  );
}

