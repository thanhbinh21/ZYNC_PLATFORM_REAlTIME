import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RTCView } from 'react-native-webrtc';
import { useVideoCall } from '../src/hooks/useVideoCall';
import { useAuthStore } from '../src/store/useAuthStore';
import { colors } from '../src/theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function CallScreen() {
  const router = useRouter();
  const { targetUserId, conversationId, type, isGroup, incomingCallSession, callToken, fromUserId } = useLocalSearchParams<{
    targetUserId?: string;
    conversationId?: string;
    type?: 'audio' | 'video';
    isGroup?: string;
    incomingCallSession?: string;
    callToken?: string;
    fromUserId?: string;
  }>();

  const userInfo = useAuthStore((s) => s.userInfo);
  const userId = String(userInfo?._id || userInfo?.id || '');

  const {
    activeCall,
    localStream,
    remoteStream,
    isMicMuted,
    isCameraEnabled,
    startCall,
    startGroupCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
  } = useVideoCall(userId);

  const [callDuration, setCallDuration] = useState(0);
  const [hasStartedCall, setHasStartedCall] = useState(false);

  useEffect(() => {
    // Initiate outgoing call if not already active and not an incoming call pickup
    if (!activeCall && !hasStartedCall) {
      setHasStartedCall(true);
      if (incomingCallSession && callToken && fromUserId) {
        acceptCall(incomingCallSession, callToken, fromUserId);
      } else if (isGroup === 'true' && conversationId) {
        startGroupCall(conversationId, type || 'video');
      } else if (targetUserId) {
        startCall(targetUserId, type || 'video', conversationId);
      } else {
        Alert.alert('Error', 'Missing target details for call.');
        router.back();
      }
    }
  }, [activeCall, hasStartedCall, incomingCallSession, callToken, fromUserId, isGroup, conversationId, targetUserId, type, acceptCall, startCall, startGroupCall, router]);

  useEffect(() => {
    if (activeCall?.status === 'connected') {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeCall?.status]);

  useEffect(() => {
    // Auto close if ended
    if (activeCall?.status === 'ended' || activeCall?.status === 'rejected' || activeCall?.status === 'missed') {
      const timer = setTimeout(() => {
        if (router.canGoBack()) {
           router.back();
        } else {
           router.replace('/(tabs)/');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeCall?.status, router]);

  const handleEndCall = () => {
    if (activeCall?.sessionId && activeCall?.callToken) {
      if (activeCall.direction === 'incoming' && activeCall.status === 'incoming') {
        rejectCall(activeCall.sessionId, activeCall.callToken);
      } else {
        endCall(activeCall.sessionId, activeCall.callToken);
      }
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/');
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getStatusText = () => {
    if (!activeCall) return 'Đang khởi tạo...';
    switch (activeCall.status) {
      case 'idle': return 'Đang chờ...';
      case 'outgoing': return 'Đang gọi...';
      case 'incoming': return 'Cuộc gọi đến...';
      case 'connecting': return 'Đang kết nối...';
      case 'connected': return formatDuration(callDuration);
      case 'ended': return 'Cuộc gọi kết thúc';
      case 'rejected': return 'Bị từ chối';
      case 'missed': return 'Bỏ lỡ';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Remote Video */}
      {activeCall?.status === 'connected' && remoteStream && remoteStream.toURL() ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={StyleSheet.absoluteFillObject}
          objectFit="cover"
        />
      ) : (
        <View style={styles.statusContainer}>
          <View style={styles.avatarPlaceholder}>
             <Ionicons name="person" size={60} color="#94a3b8" />
          </View>
          <Text style={styles.nameText}>
            {isGroup === 'true' ? 'Gọi nhóm' : 'Người dùng'}
          </Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      )}

      {/* Local Video */}
      {localStream && isCameraEnabled && localStream.toURL() && (
        <View style={styles.localVideoContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            zOrder={1}
          />
        </View>
      )}

      {/* Controls */}
      <SafeAreaView style={styles.controlsSafeArea}>
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[styles.controlButton, isMicMuted && styles.controlButtonActive]} 
            onPress={toggleMute}
          >
            <Ionicons name={isMicMuted ? 'mic-off' : 'mic'} size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.controlButton, !isCameraEnabled && styles.controlButtonActive]} 
            onPress={toggleCamera}
          >
            <Ionicons name={!isCameraEnabled ? 'videocam-off' : 'videocam'} size={28} color="#fff" />
          </TouchableOpacity>

          {isCameraEnabled && (
            <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
              <Ionicons name="camera-reverse" size={28} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={handleEndCall}>
            <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  nameText: {
    fontSize: 24,
    color: '#fff',
    fontFamily: 'BeVietnamPro_600SemiBold',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#94a3b8',
    fontFamily: 'BeVietnamPro_400Regular',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  localVideo: {
    flex: 1,
  },
  controlsSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  endCallButton: {
    backgroundColor: '#ef4444',
  },
});
