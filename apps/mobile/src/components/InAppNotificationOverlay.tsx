import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(420, SCREEN_WIDTH - 24);
const AUTO_DISMISS_MS = 5500;

export type InAppToastItem = {
  id: string;
  title: string;
  body: string;
  icon?: string;
  createdAt: number;
  variant?: 'single' | 'summary';
};

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function ToastCard({
  item,
  index,
  onPress,
  onDismiss,
}: {
  item: InAppToastItem;
  index: number;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        delay: index * 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        delay: index * 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacityAnim, slideAnim]);

  const dismissAnimated = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }, [onDismiss, opacityAnim, slideAnim]);

  // Auto dismiss
  useEffect(() => {
    const t = setTimeout(() => dismissAnimated(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [dismissAnimated]);

  const label = useMemo(() => timeLabel(item.createdAt), [item.createdAt]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable onPress={onPress} style={styles.content} android_ripple={{ color: 'rgba(48,215,171,0.12)' }}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>{item.icon ?? '🔔'}</Text>
        </View>
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.time}>{label}</Text>
          </View>
          <Text style={styles.body} numberOfLines={item.variant === 'summary' ? 1 : 2}>
            {item.body}
          </Text>
        </View>
        <Pressable onPress={dismissAnimated} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={16} color="#7cb3a1" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export function InAppNotificationOverlay({
  items,
  topOffset = 0,
  onPressItem,
  onDismissItem,
}: {
  items: InAppToastItem[];
  topOffset?: number;
  onPressItem: (id: string) => void;
  onDismissItem: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
      {items.map((item, index) => (
        <ToastCard
          key={item.id}
          item={item}
          index={index}
          onPress={() => onPressItem(item.id)}
          onDismiss={() => onDismissItem(item.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    zIndex: 999,
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(10, 59, 47, 0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 92, 74, 0.6)',
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.glassSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 92, 74, 0.55)',
  },
  icon: {
    fontSize: 16,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    color: '#e4fff5',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  time: {
    color: '#6db39e',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  body: {
    color: '#a8d8c7',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_400Regular',
    lineHeight: 17,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(13, 58, 47, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

