import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { PANTONE_295C } from '../theme/colors';

// This screen is no longer used directly.
// The drawer now renders CasosPastoralesStack from src/navigation/CasosPastoralesStack.tsx.
export default function CasosPastoralesScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={PANTONE_295C} />
    </View>
  );
}
