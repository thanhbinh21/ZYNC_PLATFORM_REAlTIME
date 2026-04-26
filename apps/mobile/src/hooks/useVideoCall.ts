import { useState, useEffect, useRef, useCallback } from 'react';
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStream } from 'react-native-webrtc';
import { socketService } from '../services/socket';
import { callService } from '../services/calls';
import { useKeepAwake } from 'expo-keep-awake';
import { AppState, AppStateStatus } from 'react-native';

export type CallUiStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected' | 'ended' | 'missed' | 'rejected';

export interface ActiveCallState {
  sessionId: string;
  conversationId?: string;
  isGroupCall: boolean;
  initiatedBy: string;
  participantIds: string[];
  direction: 'incoming' | 'outgoing';
  status: CallUiStatus;
  callToken: string;
  reason?: string;
}

export function useVideoCall(userId: string) {
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const activeCallRef = useRef<ActiveCallState | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  useKeepAwake(); // Keep screen awake during call

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // AppState listener for background/foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background - keep audio, disable video
        if (localStreamRef.current) {
           localStreamRef.current.getVideoTracks().forEach(track => {
             track.enabled = false;
           });
        }
      } else if (nextAppState === 'active') {
        // App in foreground - resume video if it was enabled
        if (localStreamRef.current) {
           localStreamRef.current.getVideoTracks().forEach(track => {
             track.enabled = isCameraEnabled;
           });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isCameraEnabled]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const resetCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setActiveCall(null);
    setIsMicMuted(false);
    setIsCameraEnabled(true);
  }, [remoteStream]);

  const initLocalStream = useCallback(async (videoEnabled = true) => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: videoEnabled
      }) as MediaStream;
      setLocalStream(stream);
      setIsCameraEnabled(videoEnabled);
      return stream;
    } catch (e) {
      console.error('Failed to get local stream', e);
      return null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraEnabled(videoTrack.enabled);
      }
    }
  }, []);

  const switchCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0] as any;
      if (videoTrack && typeof videoTrack._switchCamera === 'function') {
        videoTrack._switchCamera();
      }
    }
  }, []);

  const getIceServers = useCallback(() => {
    const stunServers = {
      urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
    };
    
    // TURN URLs logic could be here if EXPO_PUBLIC_ variables are set
    const turnUrlsRaw = process.env.EXPO_PUBLIC_TURN_URLS ?? '';
    const turnUrls = turnUrlsRaw.split(',').map(u => u.trim()).filter(Boolean);
    
    if (turnUrls.length > 0) {
       return [
         stunServers,
         {
           urls: turnUrls,
           username: process.env.EXPO_PUBLIC_TURN_USERNAME,
           credential: process.env.EXPO_PUBLIC_TURN_PASSWORD,
         }
       ];
    }
    return [stunServers];
  }, []);

  const createPeerConnection = useCallback((peerUserId: string, callState: ActiveCallState) => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
    });

    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && callState.sessionId && callState.callToken) {
        callService.sendIceCandidate(callState.sessionId, peerUserId, callState.callToken, event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0] as MediaStream);
      }
    };

    return pc;
  }, [getIceServers]);

  const startCall = useCallback(async (targetUserId: string, type: 'audio' | 'video' = 'video', conversationId?: string) => {
    await initLocalStream(type === 'video');
    callService.startCall(targetUserId, conversationId);
  }, [initLocalStream]);

  const startGroupCall = useCallback(async (conversationId: string, type: 'audio' | 'video' = 'video') => {
    await initLocalStream(type === 'video');
    callService.startGroupCall(conversationId);
  }, [initLocalStream]);

  const acceptCall = useCallback(async (sessionId: string, callToken: string, callerId: string) => {
    await initLocalStream(true);
    callService.acceptCall(sessionId, callToken);
    
    setActiveCall(prev => prev ? { ...prev, status: 'connecting' } : {
      sessionId,
      callToken,
      initiatedBy: callerId,
      participantIds: [callerId, userId],
      isGroupCall: false, // will be corrected by call_status if needed
      direction: 'incoming',
      status: 'connecting'
    });
  }, [initLocalStream, userId]);

  const rejectCall = useCallback((sessionId: string, callToken: string) => {
    callService.rejectCall(sessionId, callToken);
    resetCall();
  }, [resetCall]);

  const endCall = useCallback((sessionId: string, callToken: string) => {
    callService.endCall(sessionId, callToken);
    resetCall();
  }, [resetCall]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on('call_incoming', (data) => {
      if (activeCallRef.current) return;
      setActiveCall({
        sessionId: data.sessionId,
        conversationId: data.conversationId,
        isGroupCall: !!data.isGroupCall,
        initiatedBy: data.fromUserId,
        participantIds: data.participantIds || [data.fromUserId, userId],
        direction: 'incoming',
        status: 'incoming',
        callToken: data.callToken,
      });
    });

    socket.on('call_invited', (data) => {
      setActiveCall({
        sessionId: data.sessionId,
        conversationId: data.conversationId,
        isGroupCall: !!data.isGroupCall,
        initiatedBy: userId,
        participantIds: data.participantIds || [data.targetUserId, userId],
        direction: 'outgoing',
        status: 'outgoing',
        callToken: data.callToken,
      });
    });

    socket.on('call_status', async (data) => {
      const currentCall = activeCallRef.current;
      if (!currentCall || currentCall.sessionId !== data.sessionId) return;

      setActiveCall(prev => prev ? { ...prev, status: data.status, reason: data.reason } : null);

      if (data.status === 'connected') {
        if (currentCall.direction === 'outgoing') {
           const peerUserId = currentCall.participantIds.find(id => id !== userId);
           if (peerUserId) {
             const pc = createPeerConnection(peerUserId, currentCall);
             if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
             }
             const offer = await pc.createOffer();
             await pc.setLocalDescription(offer);
             callService.sendWebRtcOffer(currentCall.sessionId, peerUserId, currentCall.callToken, offer);
           }
        }
      } else if (data.status === 'ended' || data.status === 'missed' || data.status === 'rejected') {
        setTimeout(() => resetCall(), 1500);
      }
    });

    socket.on('webrtc_offer', async (data) => {
      const currentCall = activeCallRef.current;
      if (!currentCall || currentCall.sessionId !== data.sessionId) return;
      
      const pc = createPeerConnection(data.fromUserId, currentCall);
      if (localStreamRef.current) {
         localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      callService.sendWebRtcAnswer(currentCall.sessionId, data.fromUserId, currentCall.callToken, answer);
    });

    socket.on('webrtc_answer', async (data) => {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    });

    socket.on('webrtc_ice_candidate', async (data) => {
      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });

    return () => {
      socket.off('call_incoming');
      socket.off('call_invited');
      socket.off('call_status');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
    };
  }, [userId, createPeerConnection, resetCall, initLocalStream]);

  return {
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
  };
}
