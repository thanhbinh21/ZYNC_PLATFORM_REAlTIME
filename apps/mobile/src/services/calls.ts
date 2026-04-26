import { socketService } from './socket';

export const callService = {
  startCall: (targetUserId: string, conversationId?: string) => {
    socketService.getSocket()?.emit('call_invite', { targetUserId, conversationId });
  },

  startGroupCall: (conversationId: string) => {
    socketService.getSocket()?.emit('call_group_invite', { conversationId });
  },

  acceptCall: (sessionId: string, callToken: string) => {
    socketService.getSocket()?.emit('call_accept', { sessionId, callToken });
  },

  rejectCall: (sessionId: string, callToken: string, reason: 'rejected' | 'busy' = 'rejected') => {
    socketService.getSocket()?.emit('call_reject', { sessionId, callToken, reason });
  },

  endCall: (sessionId: string, callToken: string, reason: string = 'ended') => {
    socketService.getSocket()?.emit('call_end', { sessionId, callToken, reason });
  },

  sendWebRtcOffer: (sessionId: string, toUserId: string, callToken: string, sdp: unknown) => {
    socketService.getSocket()?.emit('webrtc_offer', { sessionId, toUserId, callToken, sdp });
  },

  sendWebRtcAnswer: (sessionId: string, toUserId: string, callToken: string, sdp: unknown) => {
    socketService.getSocket()?.emit('webrtc_answer', { sessionId, toUserId, callToken, sdp });
  },

  sendIceCandidate: (sessionId: string, toUserId: string, callToken: string, candidate: unknown) => {
    socketService.getSocket()?.emit('webrtc_ice_candidate', { sessionId, toUserId, callToken, candidate });
  },
};
