import { MessageType } from '@zync/shared-types';
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Task 10.1: Initialize Socket.IO client with JWT auth
 * Auto-reconnect with exponential backoff
 */
export function getSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:3000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  // Auto-reconnect on disconnect
  socket.on('disconnect', () => {
    console.warn('[Socket] Disconnected from server');
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
  });

  return socket;
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
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
    idempotencyKey: string;
    createdAt: string;
  }) => void,
): void {
  if (!socket) {
    throw new Error('Socket not initialized');
  }

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
    status: 'sent' | 'delivered' | 'read';
    userId: string;
    updatedAt: string;
  }) => void,
): void {
  if (!socket) {
    throw new Error('Socket not initialized');
  }

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
    throw new Error('Socket not initialized');
  }

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
  }) => void,
): void {
  if (!socket) {
    throw new Error('Socket not initialized');
  }

  socket.on('message_deleted_for_me', callback);
}

/**
 * Stop listening to message deletion events
 */
export function unlistenToMessageDeletion(): void {
  if (socket) {
    socket.off('message_deleted_for_me');
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
  }) => void,
): void {
  if (!socket) {
    throw new Error('Socket not initialized');
  }

  socket.on('message_recalled', callback);
}

/**
 * Stop listening to message recall events
 */
export function unlistenToMessageRecall(): void {
  if (socket) {
    socket.off('message_recalled');
  }
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

// ─── Error Events ───

/**
 * Listen to socket errors
 * @param callback Handler for errors
 */
export function listenToErrors(callback: (error: { message: string }) => void): void {
  if (!socket) {
    throw new Error('Socket not initialized');
  }

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
  deleteMessageForMe,
  recallMessage,
  listenToMessageDeletion,
  unlistenToMessageDeletion,
  listenToMessageRecall,
  unlistenToMessageRecall,
  listenToErrors,
  unlistenToErrors,
};

export default socketService;
