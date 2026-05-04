import { MessageType } from '@zync/shared-types';
import { io, type Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

let socket: Socket | null = null;
let currentToken: string | null = null;

const ACCESS_TOKEN_COOKIE_KEY = 'accessToken';

function getTokenFromCookie(): string | null {
  if (typeof window === 'undefined') return null;
  return Cookies.get(ACCESS_TOKEN_COOKIE_KEY) ?? null;
}

function resolveWebSocketUrl(): string {
  const explicitUrl = process.env['NEXT_PUBLIC_WS_URL'];
  if (explicitUrl && typeof window === 'undefined') {
    return explicitUrl;
  }

  if (typeof window !== 'undefined') {
    if (explicitUrl) {
      try {
        const explicit = new URL(explicitUrl);
        const currentHost = window.location.hostname;
        const isExplicitLocal = explicit.hostname === 'localhost' || explicit.hostname === '127.0.0.1';
        const isCurrentLocal = currentHost === 'localhost' || currentHost === '127.0.0.1';

        if (!isExplicitLocal || isCurrentLocal) {
          return explicitUrl;
        }

        const protocol = explicit.protocol === 'wss:' ? 'wss:' : 'ws:';
        const port = explicit.port || '3000';
        return `${protocol}//${currentHost}:${port}`;
      } catch {
        return explicitUrl;
      }
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.hostname}:3000`;
  }

  return 'ws://localhost:3000';
}

/**
 * Task 10.1: Initialize Socket.IO client with JWT auth
 * Auto-reconnect with exponential backoff
 *
 * IMPORTANT: Returns existing socket if one already exists (even if still
 * connecting). Only creates a new socket when there is no instance at all
 * or when the token has changed (re-login).
 */
export function getSocket(token?: string): Socket {
  const resolvedToken = token ?? getTokenFromCookie();
  if (!resolvedToken) {
    throw new Error('No access token available. Please log in.');
  }

  // Return existing socket if it exists and token hasn't changed
  if (socket && currentToken === resolvedToken) {
    // If disconnected but instance exists, reconnect instead of creating new
    if (socket.disconnected && !socket.active) {
      socket.connect();
    }
    return socket;
  }

  // Token changed (re-login) – disconnect old socket first
  if (socket && currentToken !== resolvedToken) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = resolvedToken;

  socket = io(resolveWebSocketUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.info('[Socket] Connected to server');
  });

  // Auto-reconnect on disconnect
  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected from server:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
  });

  return socket;
}

/**
 * Get the raw socket instance if it exists (for listener registration).
 * Does NOT throw — returns null when socket hasn't been initialised yet.
 */
export function getRawSocket(): Socket | null {
  return socket;
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}

export function joinConversation(conversationId: string): void {
  if (!socket?.connected) {
    return;
  }

  socket.emit('join_conversation', { conversationId });
}

export function leaveConversation(conversationId: string): void {
  if (!socket?.connected) {
    return;
  }

  socket.emit('leave_conversation', { conversationId });
}

// ─── Message Events ───

/**
 * Send message via Socket.IO
 * @param conversationId Conversation ID
 * @param content Message content
 * @param type Message type (text, image, video, emoji)
 * @param idempotencyKey UUID for idempotency
 * @param mediaUrl Optional media URL (for image/video)
 */
export function sendMessage(
  conversationId: string,
  content: string,
  type: MessageType,
  idempotencyKey: string,
  mediaUrl?: string,
  replyTo?: {
    messageRef: string;
    messageId?: string;
    senderId?: string;
    senderDisplayName?: string;
    contentPreview?: string;
    type?: string;
  },
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('send_message', {
    conversationId,
    content,
    type,
    mediaUrl,
    idempotencyKey,
    replyToMessageRef: replyTo?.messageRef,
    replyToMessageId: replyTo?.messageId,
    replyToSenderId: replyTo?.senderId,
    replyToSenderDisplayName: replyTo?.senderDisplayName,
    replyToPreview: replyTo?.contentPreview,
    replyToType: replyTo?.type,
  });
}

/**
 * Listen to incoming messages from other users
 * @param callback Handler for new messages
 */
export function listenToMessages(
  callback: (data: {
    messageId: string;
    conversationId?: string;
    senderId: string;
    content: string;
    type: string;
    mediaUrl?: string;
      moderationWarning?: boolean;
      replyTo?: {
        messageRef: string;
        messageId?: string;
        senderId?: string;
        contentPreview?: string;
        type?: string;
        isDeleted?: boolean;
      };
    idempotencyKey: string;
    createdAt: string;
  }) => void,
): void {
  if (!socket) {
    console.warn('[Socket] listenToMessages called before socket init – skipping');
    return;
  }

  socket.off('receive_message'); // prevent duplicate listeners
  socket.on('receive_message', callback);
}

/**
 * Stop listening to messages
 */
export function unlistenToMessages(): void {
  if (socket) {
    socket.off('receive_message');
  }
}

// ─── Message Status Events ───

/**
 * Mark multiple messages as read
 * @param conversationId Conversation ID
 * @param messageIds Array of message IDs to mark as read
 */
export function markAsRead(conversationId: string, messageIds: string[]): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('message_read', {
    conversationId,
    messageIds,
  });
}

/**
 * Mark messages as delivered
 * @param conversationId Conversation ID
 * @param messageIds Array of message IDs to mark as delivered
 */
export function markAsDelivered(conversationId: string, messageIds: string[]): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('message_delivered', {
    conversationId,
    messageIds,
  });
}

/**
 * Listen to message status updates (sent, delivered, read)
 * @param callback Handler for status updates
 */
export function listenToStatusUpdates(
  callback: (data: {
    messageIds?: string[];
    messageId?: string;
    idempotencyKeys?: string[];
    conversationId?: string;
    status: 'sent' | 'delivered' | 'read';
    userId: string;
    updatedAt: string;
    reader?: {
      userId: string;
      displayName: string;
      avatarUrl?: string;
      readAt: string;
    };
  }) => void,
): void {
  if (!socket) {
    console.warn('[Socket] listenToStatusUpdates called before socket init – skipping');
    return;
  }

  socket.off('status_update'); // prevent duplicate listeners
  socket.on('status_update', (data) => callback(data));
}

/**
 * Stop listening to status updates
 */
export function unlistenToStatusUpdates(): void {
  if (socket) {
    socket.off('status_update');
  }
}

// ─── Typing Indicator Events ───

let typingTimeout: NodeJS.Timeout | null = null;

/**
 * Emit typing start event (with 3s debounce)
 * @param conversationId Conversation ID
 */
export function startTyping(conversationId: string): void {
  if (!socket?.connected) {
    return;
  }

  socket.emit('typing_start', { conversationId });

  // Debounce: clear pending stop event
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
}

/**
 * Emit typing stop event (with 3s debounce)
 * @param conversationId Conversation ID
 */
export function stopTyping(conversationId: string): void {
  if (!socket?.connected) {
    return;
  }

  // Debounce: wait 3s before sending stop
  typingTimeout = setTimeout(() => {
    socket?.emit('typing_stop', { conversationId });
    typingTimeout = null;
  }, 3000);
}

/**
 * Clear pending typing indicator immediately (e.g., when message is sent)
 * Don't wait for 3s debounce - emit typing_stop right away
 * @param conversationId Conversation ID
 */
export function clearPendingTyping(conversationId: string): void {
  if (!socket?.connected) {
    return;
  }

  // Clear timeout if pending
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }

  // Emit typing_stop immediately (don't wait 3s)
  socket.emit('typing_stop', { conversationId });
}

/**
 * Listen to typing indicators from other users
 * @param callback Handler for typing indicator updates
 */
export function listenToTypingIndicators(
  callback: (data: {
    userId: string;
    conversationId: string;
    isTyping: boolean;
  }) => void,
): void {
  if (!socket) {
    console.warn('[Socket] listenToTypingIndicators called before socket init – skipping');
    return;
  }

  socket.off('typing_indicator'); // prevent duplicate listeners
  socket.on('typing_indicator', callback);
}

/**
 * Stop listening to typing indicators
 */
export function unlistenToTypingIndicators(): void {
  if (socket) {
    socket.off('typing_indicator');
  }
}

export interface CallInvitedPayload {
  sessionId: string;
  conversationId?: string;
  targetUserId?: string;
  isGroupCall?: boolean;
  participantIds?: string[];
  callType: 'video';
  timeoutAt?: string;
  callToken: string;
  callTokenExpiresInSeconds: number;
}

export interface CallIncomingPayload {
  sessionId: string;
  conversationId?: string;
  fromUserId: string;
  isGroupCall?: boolean;
  participantIds?: string[];
  callType: 'video';
  timeoutAt?: string;
  callToken: string;
  callTokenExpiresInSeconds: number;
}

export interface CallStatusPayload {
  sessionId: string;
  status: 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed' | 'rejected';
  reason?: string;
}

export interface CallParticipantPayload {
  sessionId: string;
  userId: string;
  reason?: string;
  joinedParticipantIds?: string[];
}

export interface WebRtcOfferPayload {
  sessionId: string;
  fromUserId: string;
  sdp: unknown;
}

export interface WebRtcAnswerPayload {
  sessionId: string;
  fromUserId: string;
  sdp: unknown;
}

export interface WebRtcIceCandidatePayload {
  sessionId: string;
  fromUserId: string;
  candidate: RTCIceCandidateInit;
}

export function emitCallInvite(targetUserId: string, conversationId?: string): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('call_invite', {
    targetUserId,
    conversationId,
  });
}

export function emitCallGroupInvite(conversationId: string): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('call_group_invite', {
    conversationId,
  });
}

export function emitCallAccept(sessionId: string, callToken: string): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('call_accept', { sessionId, callToken });
}

export function emitCallReject(
  sessionId: string,
  callToken: string,
  reason: 'rejected' | 'busy' = 'rejected',
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('call_reject', { sessionId, callToken, reason });
}

export function emitCallEnd(sessionId: string, callToken: string, reason: string = 'ended'): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('call_end', { sessionId, callToken, reason });
}

export function emitWebRtcOffer(
  sessionId: string,
  toUserId: string,
  callToken: string,
  sdp: unknown,
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('webrtc_offer', {
    sessionId,
    toUserId,
    callToken,
    sdp,
  });
}

export function emitWebRtcAnswer(
  sessionId: string,
  toUserId: string,
  callToken: string,
  sdp: unknown,
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('webrtc_answer', {
    sessionId,
    toUserId,
    callToken,
    sdp,
  });
}

export function emitWebRtcIceCandidate(
  sessionId: string,
  toUserId: string,
  callToken: string,
  candidate: RTCIceCandidateInit,
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('webrtc_ice_candidate', {
    sessionId,
    toUserId,
    callToken,
    candidate,
  });
}

export function listenToCallInvited(callback: (data: CallInvitedPayload) => void): void {
  if (!socket) {
    return;
  }

  socket.off('call_invited');
  socket.on('call_invited', callback);
}

export function unlistenToCallInvited(): void {
  if (socket) {
    socket.off('call_invited');
  }
}

export function listenToCallIncoming(callback: (data: CallIncomingPayload) => void): void {
  if (!socket) {
    return;
  }

  socket.off('call_incoming');
  socket.on('call_incoming', callback);
}

export function unlistenToCallIncoming(): void {
  if (socket) {
    socket.off('call_incoming');
  }
}

export function listenToCallStatus(callback: (data: CallStatusPayload) => void): void {
  if (!socket) {
    return;
  }

  socket.off('call_status');
  socket.on('call_status', callback);
}

export function unlistenToCallStatus(): void {
  if (socket) {
    socket.off('call_status');
  }
}

export function listenToCallParticipantJoined(callback: (data: CallParticipantPayload) => void): void {
  if (!socket) {
    return;
  }

  socket.off('call_participant_joined');
  socket.on('call_participant_joined', callback);
}

export function unlistenToCallParticipantJoined(): void {
  if (socket) {
    socket.off('call_participant_joined');
  }
}

export function listenToCallParticipantLeft(callback: (data: CallParticipantPayload) => void): void {
  if (!socket) {
    return;
  }

  socket.off('call_participant_left');
  socket.on('call_participant_left', callback);
}

export function unlistenToCallParticipantLeft(): void {
  if (socket) {
    socket.off('call_participant_left');
  }
}

export function listenToWebRtcOffer(callback: (data: WebRtcOfferPayload) => void): void {
  if (!socket) {
    return;
  }

  socket.off('webrtc_offer');
  socket.on('webrtc_offer', callback);
}

export function unlistenToWebRtcOffer(): void {
  if (socket) {
    socket.off('webrtc_offer');
  }
}

export function listenToWebRtcAnswer(callback: (data: WebRtcAnswerPayload) => void): void {
  if (!socket) {
    return;
  }

  socket.off('webrtc_answer');
  socket.on('webrtc_answer', callback);
}

export function unlistenToWebRtcAnswer(): void {
  if (socket) {
    socket.off('webrtc_answer');
  }
}

export function listenToWebRtcIceCandidate(callback: (data: WebRtcIceCandidatePayload) => void): void {
  if (!socket) {
    return;
  }

  socket.off('webrtc_ice_candidate');
  socket.on('webrtc_ice_candidate', callback);
}

export function unlistenToWebRtcIceCandidate(): void {
  if (socket) {
    socket.off('webrtc_ice_candidate');
  }
}

export const listenToContentBlocked = (callback: (data: any) => void) => {
  if (socket) socket.on('content_blocked', callback);
};

export const unlistenToContentBlocked = () => {
  if (socket) socket.off('content_blocked');
};

export const listenToContentWarning = (callback: (data: any) => void) => {
  if (socket) socket.on('content_warning', callback);
};

export const unlistenToContentWarning = () => {
  if (socket) socket.off('content_warning');
};

// ─── Delete & Recall Events ───

/**
 * Delete message for sender only
 * @param conversationId Conversation ID
 * @param messageId Message ID to delete
 */
export function deleteMessageForMe(
  conversationId: string,
  messageId: string,
  idempotencyKey: string,
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('delete_message_for_me', {
    conversationId,
    messageId,
    idempotencyKey,
  });
}

/**
 * Recall message (delete everywhere)
 * @param conversationId Conversation ID
 * @param messageId Message ID to recall
 */
export function recallMessage(
  conversationId: string,
  messageId: string,
  idempotencyKey: string,
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('recall_message', {
    conversationId,
    messageId,
    idempotencyKey,
  });
}

/**
 * Listen to message deletion events (for me only)
 * @param callback Handler for deletion
 */
export function listenToMessageDeletion(
  callback: (data: {
    messageId: string;
    conversationId: string;
    deletedAt: string;
    effectiveLastMessage?: {
      content: string;
      senderId: string;
      sentAt: string;
    } | null;
    unreadCount?: number;
    lastVisibleMessage?: {
      content: string;
      senderId: string;
      senderDisplayName?: string;
      sentAt: string;
    } | null;
  }) => void,
): void {
  if (!socket) {
    console.warn('[Socket] listenToMessageDeletion called before socket init – skipping');
    return;
  }

  socket.on('message_deleted_for_me', callback);
}

/**
 * Stop listening to message deletion events
 */
export function unlistenToMessageDeletion(
  callback: (data: {
    messageId: string;
    conversationId: string;
    deletedAt: string;
    effectiveLastMessage?: {
      content: string;
      senderId: string;
      sentAt: string;
    } | null;
    unreadCount?: number;
    lastVisibleMessage?: {
      content: string;
      senderId: string;
      senderDisplayName?: string;
      sentAt: string;
    } | null;
  }) => void,
): void {
  if (socket) {
    socket.off('message_deleted_for_me', callback);
  }
}

/**
 * Listen to message recall events (for everyone)
 * @param callback Handler for recall
 */
export function listenToMessageRecall(
  callback: (data: {
    messageId: string;
    idempotencyKey: string;
    conversationId: string;
    recalledBy: string;
    recalledAt: string;
    conversationLastMessage?: {
      content: string;
      senderId: string;
      sentAt: string;
    } | null;
  }) => void,
): void {
  if (!socket) {
    console.warn('[Socket] listenToMessageRecall called before socket init – skipping');
    return;
  }

  socket.on('message_recalled', callback);
}

/**
 * Stop listening to message recall events
 */
export function unlistenToMessageRecall(
  callback: (data: {
    messageId: string;
    idempotencyKey: string;
    conversationId: string;
    recalledBy: string;
    recalledAt: string;
    conversationLastMessage?: {
      content: string;
      senderId: string;
      sentAt: string;
    } | null;
  }) => void,
): void {
  if (socket) {
    socket.off('message_recalled', callback);
  }
}

// ─── Reactions & Moderation ───

export function listenToMessageReacted(callback: (data: any) => void): void {
  if (socket) socket.on('message_reacted', callback);
}

export function unlistenToMessageReacted(): void {
  if (socket) socket.off('message_reacted');
}

export function listenToUserPenaltyUpdated(callback: (data: any) => void): void {
  if (socket) socket.on('user_penalty_updated', callback);
}

export function unlistenToUserPenaltyUpdated(): void {
  if (socket) socket.off('user_penalty_updated');
}

// ─── Forward Message ───

/**
 * Emit forward message event
 * @param originalMessageId Message ID to forward
 * @param toConversationId Target conversation
 * @param idempotencyKey Unique key for idempotency
 */
export function emitForwardMessage(
  originalMessageId: string,
  toConversationId: string,
  idempotencyKey: string,
): void {
  if (!socket?.connected) {
    console.error('[Socket] Not connected to emit forward_message');
    return;
  }

  socket.emit('forward_message', {
    originalMessageId,
    toConversationId,
    idempotencyKey,
  });
}

/**
 * Listen to message forwarded confirmation
 * Server emits this after successfully forwarding
 */
export function listenToMessageForwarded(
  callback: (data: {
    messageId: string;
    idempotencyKey: string;
    toConversationId: string;
  }) => void,
): void {
  if (!socket) {
    return;
  }

  socket.on('message_forwarded', callback);
}

/**
 * Stop listening to message forwarded events
 */
export function unlistenToMessageForwarded(): void {
  if (socket) {
    socket.off('message_forwarded');
  }
}

// ─── Message Reactions ───

export interface ReactionUpdatedPayload {
  requestId?: string;
  messageId: string;
  messageRef: string;
  conversationId: string;
  actor: {
    userId: string;
    action: 'upsert' | 'remove_all_mine';
    emoji?: string;
    delta?: 1 | 2 | 3;
  };
  summary: {
    totalCount: number;
    emojiCounts: Record<string, number>;
  };
  userState?: {
    userId: string;
    totalCount: number;
    emojiCounts: Record<string, number>;
    lastEmoji: string | null;
  };
  updatedAt: string;
}

export interface ReactionAckPayload {
  requestId: string;
  accepted: boolean;
  conversationId: string;
  messageRef: string;
  messageId: string | null;
  userId: string;
  action: 'upsert' | 'remove_all_mine';
  optimistic: boolean;
  serverTs: string;
  contractVersion: string;
}

export function emitReactionUpsert(
  conversationId: string,
  messageRef: string,
  emoji: string,
  delta: 1 | 2 | 3,
  idempotencyKey: string,
  actionSource: string,
  requestId?: string,
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('reaction_upsert', {
    requestId: requestId ?? idempotencyKey,
    conversationId,
    messageRef,
    emoji,
    delta,
    idempotencyKey,
    actionSource,
  });
}

export function emitReactionRemoveAllMine(
  conversationId: string,
  messageRef: string,
  idempotencyKey: string,
  requestId?: string,
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('reaction_remove_all_mine', {
    requestId: requestId ?? idempotencyKey,
    conversationId,
    messageRef,
    idempotencyKey,
  });
}

export function listenToReactionUpdated(
  callback: (data: ReactionUpdatedPayload) => void,
): void {
  if (!socket) {
    return;
  }

  socket.off('reaction_updated');
  socket.on('reaction_updated', callback);
}

export function unlistenToReactionUpdated(): void {
  if (socket) {
    socket.off('reaction_updated');
  }
}

export function listenToReactionAck(
  callback: (data: ReactionAckPayload) => void,
): void {
  if (!socket) {
    return;
  }

  socket.off('reaction_ack');
  socket.on('reaction_ack', callback);
}

export function unlistenToReactionAck(): void {
  if (socket) {
    socket.off('reaction_ack');
  }
}

export function listenToReactionError(
  callback: (data: {
    requestId?: string;
    conversationId?: string;
    messageRef?: string;
    code: string;
    message: string;
    contractVersion?: string;
  }) => void,
): void {
  if (!socket) {
    return;
  }

  socket.off('reaction_error');
  socket.on('reaction_error', callback);
}

export function unlistenToReactionError(): void {
  if (socket) {
    socket.off('reaction_error');
  }
}

// ─── Quick Reply (cross-conversation send without joining room) ───

export function sendQuickReply(
  conversationId: string,
  content: string,
  idempotencyKey: string,
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('send_message', {
    conversationId,
    content,
    type: 'text',
    idempotencyKey,
  });
}

// ─── Error Events ───

/**
 * Listen to socket errors
 * @param callback Handler for errors
 */
export function listenToErrors(callback: (error: { message: string }) => void): void {
  if (!socket) {
    console.warn('[Socket] listenToErrors called before socket init – skipping');
    return;
  }

  socket.off('error'); // prevent duplicate listeners
  socket.on('error', callback);
}

/**
 * Stop listening to errors
 */
export function unlistenToErrors(): void {
  if (socket) {
    socket.off('error');
  }
}

// ─── Socket Service Object (for bundled injection) ───

/**
 * Bundled socket service for dependency injection
 * Usage: socketService.sendMessage(...), socketService.listenToMessages(...)
 */
export const socketService = {
  getSocket,
  getRawSocket,
  isConnected,
  disconnectSocket,
  joinConversation,
  leaveConversation,
  sendMessage,
  listenToMessages,
  unlistenToMessages,
  markAsRead,
  markAsDelivered,
  listenToStatusUpdates,
  unlistenToStatusUpdates,
  startTyping,
  stopTyping,
  clearPendingTyping,
  listenToTypingIndicators,
  unlistenToTypingIndicators,
  emitCallInvite,
  emitCallGroupInvite,
  emitCallAccept,
  emitCallReject,
  emitCallEnd,
  emitWebRtcOffer,
  emitWebRtcAnswer,
  emitWebRtcIceCandidate,
  listenToCallInvited,
  unlistenToCallInvited,
  listenToCallIncoming,
  unlistenToCallIncoming,
  listenToCallStatus,
  unlistenToCallStatus,
  listenToCallParticipantJoined,
  unlistenToCallParticipantJoined,
  listenToCallParticipantLeft,
  unlistenToCallParticipantLeft,
  listenToWebRtcOffer,
  unlistenToWebRtcOffer,
  listenToWebRtcAnswer,
  unlistenToWebRtcAnswer,
  listenToWebRtcIceCandidate,
  unlistenToWebRtcIceCandidate,
  deleteMessageForMe,
  recallMessage,
  listenToMessageDeletion,
  unlistenToMessageDeletion,
  listenToMessageRecall,
  unlistenToMessageRecall,
  emitReactionUpsert,
  emitReactionRemoveAllMine,
  listenToReactionUpdated,
  unlistenToReactionUpdated,
  listenToReactionAck,
  unlistenToReactionAck,
  listenToReactionError,
  unlistenToReactionError,
  sendQuickReply,
  listenToErrors,
  unlistenToErrors,
  listenToContentBlocked,
  unlistenToContentBlocked,
  listenToContentWarning,
  unlistenToContentWarning,
  listenToMessageReacted,
  unlistenToMessageReacted,
  listenToUserPenaltyUpdated,
  unlistenToUserPenaltyUpdated,
};

export default socketService;
