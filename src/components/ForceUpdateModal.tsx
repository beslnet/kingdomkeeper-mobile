import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Platform,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { PANTONE_134C, PANTONE_295C } from '../theme/colors';
import { STORE_URLS } from '../version';

interface Props {
  visible: boolean;
  /** Server-provided store URL. Falls back to platform default if not provided. */
  storeUrl?: string | null;
}

export function ForceUpdateModal({ visible, storeUrl }: Props) {
  const url = storeUrl ?? (Platform.OS === 'ios' ? STORE_URLS.ios : STORE_URLS.android);

  const handleUpdate = () => {
    Linking.openURL(url).catch(() => {
      const fallback =
        Platform.OS === 'ios'
          ? 'itms-apps://itunes.apple.com/app/id0000000000'
          : 'market://details?id=com.kingdomkeeper.mobile';
      Linking.openURL(fallback);
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {/* non-dismissable */}}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon source="update" size={72} color={PANTONE_295C} />
          </View>
          <Text style={styles.title}>¡Nueva versión disponible!</Text>
          <Text style={styles.body}>
            Para continuar usando Kingdom Keeper, es necesario actualizar la aplicación a la última versión.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleUpdate} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Actualizar ahora</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8EEF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: PANTONE_295C,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    backgroundColor: PANTONE_295C,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: PANTONE_134C,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
