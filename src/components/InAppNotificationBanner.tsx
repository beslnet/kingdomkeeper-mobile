import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PANTONE_295C } from '../theme/colors';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  remoteMessage?: any; // full FCM message for navigation on tap
}

interface Props {
  notification: InAppNotification | null;
  onDismiss: () => void;
  onNavigate?: (remoteMessage: any) => void;
}

const AUTO_DISMISS_MS = 4500;

export function InAppNotificationBanner({ notification, onDismiss, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (notification) {
      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start();

      // Auto-dismiss
      timerRef.current = setTimeout(() => {
        slideOut();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification?.id]);

  const slideOut = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.spring(translateY, {
      toValue: -120,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start(() => onDismiss());
  };

  const handleTap = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.spring(translateY, {
      toValue: -120,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start(() => {
      onDismiss();
      if (notification?.remoteMessage && onNavigate) {
        onNavigate(notification.remoteMessage);
      }
    });
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + 10, transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity onPress={handleTap} activeOpacity={0.85} style={styles.row}>
        <Icon source="bell" size={20} color="#fff" />
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
        </View>
        <TouchableOpacity onPress={slideOut} style={styles.closeBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon source="close" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: PANTONE_295C,
    zIndex: 9998,
    elevation: 98,
    paddingBottom: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
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
  body: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
});
