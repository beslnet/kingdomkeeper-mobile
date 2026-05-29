import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutChangeEvent,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStore, NetworkErrorKind } from '../store/networkStore';
import api from '../api/api';

const MESSAGES: Record<NetworkErrorKind, { icon: string; title: string; subtitle: string }> = {
  offline: {
    icon: 'wifi-off',
    title: 'Sin conexión',
    subtitle: 'Verifica tu red. Si persiste, nuestros servidores pueden estar con intermitencia.',
  },
  timeout: {
    icon: 'cloud-off-outline',
    title: 'El servidor no responde',
    subtitle: 'Puede ser un problema temporal, intenta más tarde.',
  },
  server: {
    icon: 'alert-circle-outline',
    title: 'Problema en el servidor',
    subtitle: 'Estamos al tanto, intenta más tarde.',
  },
};

export function OfflineBanner() {
  const isOffline = useNetworkStore(s => s.isOffline);
  const errorKind = useNetworkStore(s => s.errorKind);
  const setOffline = useNetworkStore(s => s.setOffline);
  const insets = useSafeAreaInsets();
  const [bannerHeight, setBannerHeight] = useState(200);
  const translateY = useRef(new Animated.Value(-200)).current;
  const hasAnimatedIn = useRef(false);

  const msg = MESSAGES[errorKind];

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== bannerHeight) {
      setBannerHeight(h);
      if (!isOffline && !hasAnimatedIn.current) {
        translateY.setValue(-h);
      }
    }
  };

  useEffect(() => {
    const toValue = isOffline ? 0 : -bannerHeight;
    if (isOffline) hasAnimatedIn.current = true;
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  }, [isOffline, bannerHeight, translateY]);

  const handleRetry = async () => {
    try {
      await api.get('/api/auth/me/');
      setOffline(false);
    } catch {
      // stays showing — interceptor will clear if successful
    }
  };

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.banner,
        { paddingTop: insets.top + 8, transform: [{ translateY }] },
      ]}
      pointerEvents={isOffline ? 'auto' : 'none'}
    >
      <View style={styles.row}>
        <Icon source={msg.icon} size={20} color="#fff" />
        <View style={styles.textBlock}>
          <Text style={styles.title}>{msg.title}</Text>
          <Text style={styles.subtitle}>{msg.subtitle}</Text>
        </View>
        <TouchableOpacity onPress={handleRetry} style={styles.retryBtn} activeOpacity={0.75}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#C62828',
    zIndex: 9999,
    elevation: 99,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 16,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
