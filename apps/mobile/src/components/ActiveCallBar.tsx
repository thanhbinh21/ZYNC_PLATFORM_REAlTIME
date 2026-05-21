import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { socketService, CallInvitedPayload, CallStatusPayload } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

interface ActiveSession {
  sessionId: string;
  conversationId?: string;
  isGroupCall: boolean;
  callType: 'audio' | 'video';
  callToken: string;
  status: 'outgoing' | 'ringing' | 'connecting' | 'connected';
  startedAt: number;
}

/**
 * Floating bar displayed when user is in an active call but navigated away from the call screen.
 * Tapping the bar returns to the call screen.
 */
export function ActiveCallBar() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Listen for call status changes globally
  useEffect(() => {
    if (!isAuthenticated) return;

    const onCallInvited = (data: CallInvitedPayload) => {
      setActiveSession({
        sessionId: data.sessionId,
        conversationId: data.conversationId,
        isGroupCall: Boolean(data.isGroupCall),
        callType: data.callType || 'video',
        callToken: data.callToken,
        status: 'outgoing',
        startedAt: Date.now(),
      });
    };

    const onCallStatus = (data: CallStatusPayload) => {
      if (data.status === 'connected') {
        setActiveSession((prev) => {
          if (!prev || prev.sessionId !== data.sessionId) return prev;
          return { ...prev, status: 'connected', startedAt: Date.now() };
        });
      } else if (data.status === 'ringing') {
        setActiveSession((prev) => {
          if (!prev || prev.sessionId !== data.sessionId) return prev;
          return { ...prev, status: 'ringing' };
        });
      } else if (data.status === 'ended' || data.status === 'missed' || data.status === 'rejected') {
        setActiveSession((prev) => {
          if (!prev || prev.sessionId !== data.sessionId) return prev;
          return null;
        });
      }
    };

    socketService.listenToCallInvited(onCallInvited);
    socketService.listenToCallStatus(onCallStatus);

    return () => {
      socketService.unlistenToCallInvited(onCallInvited);
      socketService.unlistenToCallStatus(onCallStatus);
    };
  }, [isAuthenticated]);

  // Timer
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'connected') {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeSession.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Pulse animation
  useEffect(() => {
    if (!activeSession) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activeSession, pulseAnim]);

  if (!activeSession) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const statusText =
    activeSession.status === 'connected'
      ? formatTime(elapsed)
      : activeSession.status === 'ringing'
        ? 'Đang đổ chuông...'
        : activeSession.status === 'outgoing'
          ? 'Đang gọi...'
          : 'Đang kết nối...';

  const handlePress = () => {
    router.push({
      pathname: '/call-screen',
      params: {
        conversationId: activeSession.conversationId,
        isGroup: activeSession.isGroupCall ? 'true' : 'false',
        type: activeSession.callType,
      },
    });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.85}>
      <View style={styles.bar}>
        <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
        <Ionicons
          name={activeSession.callType === 'video' ? 'videocam' : 'call'}
          size={16}
          color="#fff"
        />
        <Text style={styles.text}>
          {activeSession.isGroupCall ? 'Cuộc gọi nhóm' : 'Cuộc gọi'} • {statusText}
        </Text>
        <Text style={styles.returnText}>Quay lại ›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    zIndex: 9998,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  returnText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_500Medium',
    opacity: 0.9,
  },
});
