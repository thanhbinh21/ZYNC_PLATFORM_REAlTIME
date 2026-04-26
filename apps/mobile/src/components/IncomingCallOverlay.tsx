import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { socketService } from '../services/socket';

interface IncomingCallData {
  sessionId: string;
  conversationId?: string;
  isGroupCall: boolean;
  fromUserId: string;
  callToken: string;
  type: 'audio' | 'video';
}

export function IncomingCallOverlay() {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const userInfo = useAuthStore((s) => s.userInfo);
  const slideAnim = React.useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const onCallIncoming = (data: any) => {
      setIncomingCall({
        sessionId: data.sessionId,
        conversationId: data.conversationId,
        isGroupCall: !!data.isGroupCall,
        fromUserId: data.fromUserId,
        callToken: data.callToken,
        type: data.type || 'video',
      });
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 12,
      }).start();
    };

    const onCallStatus = (data: any) => {
      if (data.status === 'ended' || data.status === 'missed' || data.status === 'rejected') {
        setIncomingCall(prev => {
          if (prev && prev.sessionId === data.sessionId) {
            closeOverlay();
            return null;
          }
          return prev;
        });
      }
    };

    socket.on('call_incoming', onCallIncoming);
    socket.on('call_status', onCallStatus);

    return () => {
      socket.off('call_incoming', onCallIncoming);
      socket.off('call_status', onCallStatus);
    };
  }, [slideAnim]);

  const closeOverlay = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIncomingCall(null);
    });
  };

  const handleAccept = () => {
    if (!incomingCall) return;
    
    // We navigate to call screen and let call screen use the accept logic
    router.push({
      pathname: '/call-screen',
      params: {
        incomingCallSession: incomingCall.sessionId,
        type: incomingCall.type,
        callToken: incomingCall.callToken,
        fromUserId: incomingCall.fromUserId,
      }
    });
    
    closeOverlay();
  };

  const handleReject = () => {
    if (!incomingCall) return;
    const socket = socketService.getSocket();
    socket?.emit('call_reject', {
      sessionId: incomingCall.sessionId,
      callToken: incomingCall.callToken,
      reason: 'rejected'
    });
    closeOverlay();
  };

  if (!incomingCall) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.overlay}>
        <View style={styles.infoContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#94a3b8" />
          </View>
          <View>
            <Text style={styles.title}>Cuộc gọi đến</Text>
            <Text style={styles.subtitle}>{incomingCall.isGroupCall ? 'Nhóm' : 'Người dùng'}</Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={handleReject}>
            <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleAccept}>
            <Ionicons name={incomingCall.type === 'video' ? "videocam" : "call"} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  overlay: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
});
