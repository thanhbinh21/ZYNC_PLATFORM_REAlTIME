'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, MessageStatus } from '@zync/shared-types';
import {
  getSocket,
  isConnected,
  joinConversation,
  leaveConversation,
  listenToMessages,
  listenToStatusUpdates,
  listenToTypingIndicators,
  markAsDelivered,
  markAsRead,
  sendMessage as emitSendMessage,
  startTyping as emitStartTyping,
  stopTyping as emitStopTyping,
  clearPendingTyping as emitClearPendingTyping,
  unlistenToMessages,
  unlistenToStatusUpdates,
  unlistenToTypingIndicators,
  deleteMessageForMe,
  recallMessage,
  listenToMessageDeletion,
  unlistenToMessageDeletion,
  listenToMessageRecall,
  unlistenToMessageRecall,
  listenToMessageForwarded,
  unlistenToMessageForwarded,
  listenToContentBlocked,
  unlistenToContentBlocked,
  listenToContentWarning,
  unlistenToContentWarning,
  listenToMessageReacted,
  unlistenToMessageReacted,
  listenToUserPenaltyUpdated,
  unlistenToUserPenaltyUpdated,
} from '@/services/socket';
import { getMessages } from '@/services/chat';
import { MessageType } from '@zync/shared-types';

// ─── useChat Hook ───

interface MessageStatusMap {
  [messageId: string]: MessageStatus;
}

export interface TypingUser {
  userId: string;
  displayName: string;
}

interface UseChatOptions {
  conversationId: string;
  userId: string;
  token: string;
  displayName: string;
}

interface UseChatReturn {
  messages: Message[];
  typingUsers: TypingUser[];
  messageStatus: MessageStatusMap;
  sendMessage: (content: string, type: MessageType, mediaUrl?: string) => Promise<void>;
  markAsRead: (messageIds: string[]) => void;
  startTyping: () => void;
  stopTyping: () => void;
  deleteMessageForMe: (messageId: string, idempotencyKey: string) => Promise<void>;
  recallMessage: (messageId: string, idempotencyKey: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  userPenaltyScore: number;
  userMutedUntil: Date | null;
}

export function useChat({
  conversationId,
  userId,
  token,
  displayName,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [messageStatus, setMessageStatus] = useState<MessageStatusMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPenaltyScore, setUserPenaltyScore] = useState<number>(0);
  const [userMutedUntil, setUserMutedUntil] = useState<Date | null>(null);

  // Track typing users with TTL (auto-remove after 4s)
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const previousConversationId = useRef<string>('');

  // Initialize socket on mount or when token changes
  useEffect(() => {
    // Only initialize socket if token is available
    if (!token) {
      setError('No authentication token available');
      return;
    }

    try {
      getSocket(token);
    } catch (err) {
      console.error('Failed to initialize socket:', err);
      setError('Failed to connect to messaging service');
    }
  }, [token]);

  // Join conversation when it changes – also handles reconnect
  useEffect(() => {
    if (!conversationId || !token) return;

    const sock = getSocket(token);

    const doJoin = () => {
      // Leave previous conversation if it exists and is different
      if (previousConversationId.current && previousConversationId.current !== conversationId) {
        leaveConversation(previousConversationId.current);
      }
      joinConversation(conversationId);
      previousConversationId.current = conversationId;
    };

    if (sock.connected) {
      doJoin();
    }

    // Re-join on (re)connect so room membership survives reconnects
    sock.on('connect', doJoin);

    return () => {
      sock.off('connect', doJoin);
    };
  }, [conversationId, token]);

  // Setup message listener
  useEffect(() => {
    const handleReceiveMessage = (data: {
      messageId: string;
      senderId: string;
      content: string;
      type: string;
      mediaUrl?: string;
      moderationWarning?: boolean;
      idempotencyKey: string;
      createdAt: string;
    }) => {
      const newMessage: Message = {
        _id: data.messageId,
        conversationId,
        senderId: data.senderId,
        content: data.content,
        type: data.type as Message['type'],
        mediaUrl: data.mediaUrl,
        moderationWarning: data.moderationWarning,
        idempotencyKey: data.idempotencyKey, // Will be set on send
        status: 'delivered',
        createdAt: data.createdAt,
      };
      setMessages((prev) => [...prev, newMessage]);
      setMessageStatus((prev) => ({
        ...prev,
        [data.messageId]: 'delivered',
      }));

      // Notify backend that message was delivered
      markAsDelivered(conversationId, [data.messageId]);

      // Auto-mark as read after 500ms
      setTimeout(() => {
        markAsRead(conversationId, [data.messageId]);
      }, 500);
    };

    const handleMessageSent = (data: {
      messageId: string;
      idempotencyKey: string;
      createdAt: string;
    }) => {
      // // Replace optimistic message (using idempotencyKey) with real message (using messageId)
      // setMessages((prev) =>
      //   prev.map((msg) =>
      //     msg._id === data.idempotencyKey
      //       ? { ...msg, _id: data.messageId, createdAt: data.createdAt }
      //       : msg,
      //   ),
      // );

      // Transfer status tracking from idempotencyKey to real messageId (keep status as is)
      // setMessageStatus((prev) => {
      //   const newStatus = { ...prev };
      //   if (prev[data.idempotencyKey]) {
      //     // Keep the same status, just move it to the real messageId
      //     newStatus[data.messageId] = prev[data.idempotencyKey];
      //     delete newStatus[data.idempotencyKey];
      //   }
      //   return newStatus;
      // });
    };

    const handleContentBlocked = (data: {
      messageId: string;
      conversationId: string;
      reason: string;
      confidence: number;
    }) => {
      if (data.conversationId !== conversationId) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId || msg.idempotencyKey === data.messageId
            ? {
                ...msg,
                content: '[Bị chặn bởi AI Moderator]',
                mediaUrl: undefined,
                type: 'system-recall' as Message['type'],
              }
            : msg,
        ),
      );

      setMessageStatus((prev) => ({
        ...prev,
        [data.messageId]: 'read',
      }));

      setError(`Tin nhắn không thể gửi - Vi phạm cộng đồng (Confidence: ${Math.round(data.confidence * 100)}%)`);
    };

    const handleContentWarning = (data: {
      conversationId: string;
      messageId?: string;
      message?: string;
    }) => {
      if (data.conversationId !== conversationId) return;

      if (data.messageId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId || msg.idempotencyKey === data.messageId
              ? { ...msg, moderationWarning: true }
              : msg,
          ),
        );
      }

      setError(data.message ?? 'Tin nhắn có dấu hiệu vi phạm. Hệ thống đã ghi nhận cảnh báo.');
    };

    const handleMessageReacted = (data: any) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) => 
        prev.map((msg) => msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg)
      );
    };

    const handleUserPenaltyUpdated = (data: any) => {
      if (data.conversationId !== conversationId) return;
      setUserPenaltyScore(data.penaltyScore);
      setUserMutedUntil(data.mutedUntil ? new Date(data.mutedUntil) : null);
    };

    try {
      listenToMessages(handleReceiveMessage);
      listenToContentBlocked(handleContentBlocked);
      listenToContentWarning(handleContentWarning);
      listenToMessageReacted(handleMessageReacted);
      listenToUserPenaltyUpdated(handleUserPenaltyUpdated);
      const socket = getSocket(token);
      socket.on('message_sent', handleMessageSent);
    } catch (err) {
      console.error('Failed to setup message listener:', err);
    }

    return () => {
      try {
        unlistenToMessages();
        unlistenToContentBlocked();
        unlistenToContentWarning();
        unlistenToMessageReacted();
        unlistenToUserPenaltyUpdated();
        const socket = getSocket(token);
        socket.off('message_sent', handleMessageSent);
      } catch (err) {
        console.error('Failed to cleanup message listener:', err);
      }
    };
  }, [conversationId, token]);

  // Setup status update listener
  useEffect(() => {
    const handleStatusUpdate = (data: {
      messageId?: string;
      messageIds?: string[];
      idempotencyKeys?: string[];
      status: MessageStatus;
      userId: string;
      updatedAt: string;
    }) => {
      const ids = data.messageIds || [];
      const idems = data.idempotencyKeys || [];

      // Single message status update (sent event)
      if (ids.length === 0 && data.messageId) {
        const messageId = data.messageId;
        setMessageStatus((prev) => ({
          ...prev,
          [messageId]: data.status,
        }));
        return;
      }

      // Batch status update (auto-mark from getMessageHistory)
      // Backend sends idempotencyKeys = frontend mockIds (now guaranteed to match)
      setMessageStatus((prev) => {
        const updated = { ...prev };
        ids.forEach((id, i) => {
          if (updated[idems[i]]) {
            updated[idems[i]] = data.status;
          } else {
            updated[id] = data.status;
          }
        });
        // [...idems, ...ids].forEach((key) => {
        //   if (key) updated[key] = data.status;
        // });
        return updated;
      });
    };

    try {
      listenToStatusUpdates(handleStatusUpdate);
    } catch (err) {
      console.error('Failed to setup status listener:', err);
    }

    return () => {
      try {
        unlistenToStatusUpdates();
      } catch (err) {
        console.error('Failed to cleanup status listener:', err);
      }
    };
  }, [conversationId, token]);

  // Setup typing indicator listener
  useEffect(() => {
    const handleTypingIndicator = (data: {
      userId: string;
      conversationId: string;
      isTyping: boolean;
    }) => {
      if (data.conversationId === conversationId && data.userId !== userId) {
        if (data.isTyping) {
          // Clear existing timeout for this user
          const existingTimeout = typingTimeouts.current.get(data.userId);
          if (existingTimeout) clearTimeout(existingTimeout);

          // Add user to typing list
          setTypingUsers((prev) => {
            const exists = prev.find((u) => u.userId === data.userId);
            if (exists) return prev;
            return [...prev, { userId: data.userId, displayName: data.userId }]; // Note: displayName will be set elsewhere
          });

          // Set auto-remove after 4s
          const timeout = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
            typingTimeouts.current.delete(data.userId);
          }, 4000);

          typingTimeouts.current.set(data.userId, timeout);
        } else {
          // Remove user immediately
          const existingTimeout = typingTimeouts.current.get(data.userId);
          if (existingTimeout) clearTimeout(existingTimeout);
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
          typingTimeouts.current.delete(data.userId);
        }
      }
    };

    try {
      listenToTypingIndicators(handleTypingIndicator);
    } catch (err) {
      console.error('Failed to setup typing listener:', err);
    }

    return () => {
      // Cleanup all typing timeouts
      typingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeouts.current.clear();

      try {
        unlistenToTypingIndicators();
      } catch (err) {
        console.error('Failed to cleanup typing listener:', err);
      }
    };
  }, [conversationId, userId]);

  // Send message
  const handleSendMessage = useCallback(
    async (content: string, type: MessageType, mediaUrl?: string) => {
      if (!isConnected()) {
        setError('Not connected to messaging service');
        return;
      }

      const idempotencyKey = uuidv4();
      const timestamp = new Date().toISOString();

      try {
        setIsLoading(true);
        setError(null);

        // Optimistic update
        const optimisticMessage: Message = {
          _id: idempotencyKey, // Temporary ID
          conversationId,
          senderId: userId,
          content,
          type,
          mediaUrl,
          idempotencyKey,
          status: 'sent',
          createdAt: timestamp,
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setMessageStatus((prev) => ({
          ...prev,
          [idempotencyKey]: 'sent',
        }));

        // Send via socket
        emitSendMessage(conversationId, content, type, idempotencyKey, mediaUrl);

        // Clear pending typing indicator immediately (don't wait 3s)
        emitClearPendingTyping(conversationId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMsg);
        console.error('Send message error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, userId],
  );

  // Mark as read
  const handleMarkAsRead = useCallback(
    (messageIds: string[]) => {
      try {
        markAsRead(conversationId, messageIds);
        messageIds.forEach((id) => {
          setMessageStatus((prev) => ({
            ...prev,
            [id]: 'read',
          }));
        });
      } catch (err) {
        console.error('Mark as read error:', err);
      }
    },
    [conversationId],
  );

  // Start typing
  const handleStartTyping = useCallback(() => {
    try {
      emitStartTyping(conversationId);
    } catch (err) {
      console.error('Start typing error:', err);
    }
  }, [conversationId]);

  // Stop typing
  const handleStopTyping = useCallback(() => {
    try {
      emitStopTyping(conversationId);
    } catch (err) {
      console.error('Stop typing error:', err);
    }
  }, [conversationId]);

  // ─── Delete Message Listeners Setup (Status Update Only) ───
  useEffect(() => {
    if (!token) return;

    const handleMessageDeletedForMe = (data: {
      messageId: string;
      conversationId: string;
      deletedAt: string;
    }) => {
      // Only process if this is the right conversation
      if (data.conversationId !== conversationId) return;

      // Remove from status map
      setMessageStatus((prev) => {
        const newStatus = { ...prev };
        delete newStatus[data.messageId];
        return newStatus;
      });
    };

    const handleMessageRecalled = (data: {
      messageId: string;
      idempotencyKey: string;
      conversationId: string;
      recalledBy: string;
      recalledAt: string;
    }) => {
      // Only process if this is the right conversation
      if (data.conversationId !== conversationId) return;

      // Update status
      setMessageStatus((prev) => ({
        ...prev,
        [data.messageId]: 'read',
      }));
    };

    try {
      // Use listener functions instead of direct socket.on
      listenToMessageDeletion(handleMessageDeletedForMe);
      listenToMessageRecall(handleMessageRecalled);
    } catch (err) {
      console.error('Failed to setup deletion listeners:', err);
    }

    return () => {
      try {
        unlistenToMessageDeletion();
        unlistenToMessageRecall();
      } catch (err) {
        console.error('Failed to cleanup deletion listeners:', err);
      }
    };
  }, [conversationId, token]);

  // Delete for me
  const handleDeleteForMe = useCallback(
    async (messageId: string, idempotencyKey: string) => {
      if (!isConnected()) {
        setError('Not connected to messaging service');
        return;
      }

      try {
        deleteMessageForMe(conversationId, messageId, idempotencyKey);
      } catch (err) {
        console.error('Failed to delete message:', err);
        setError('Failed to delete message');
      }
    },
    [conversationId]
  );

  // Recall message
  const handleRecall = useCallback(
    async (messageId: string, idempotencyKey: string) => {
      if (!isConnected()) {
        setError('Not connected to messaging service');
        return;
      }

      try {
        recallMessage(conversationId, messageId, idempotencyKey);
      } catch (err) {
        console.error('Failed to recall message:', err);
        setError('Failed to recall message');
      }
    },
    [conversationId]
  );

  return {
    messages,
    typingUsers,
    messageStatus,
    sendMessage: handleSendMessage,
    markAsRead: handleMarkAsRead,
    startTyping: handleStartTyping,
    stopTyping: handleStopTyping,
    deleteMessageForMe: handleDeleteForMe,
    recallMessage: handleRecall,
    isLoading,
    error,
    userPenaltyScore,
    userMutedUntil,
  };
}

// ─── useMessageHistory Hook ───

interface UseMessageHistoryOptions {
  conversationId: string;
}

interface UseMessageHistoryReturn {
  messages: Message[];
  cursor: string | undefined;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  fetchMessages: () => Promise<void>;
  loadMore: () => Promise<void>;
  setMessages: (messages: Message[]) => void;
}

export function useMessageHistory({
  conversationId,
}: UseMessageHistoryOptions): UseMessageHistoryReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkChange, setCheckChange] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async (overrideCursor?: string) => {
    if (!conversationId || loading) return;

    const currentCursor = overrideCursor ?? cursor;
    if (currentCursor && !hasMore) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getMessages(conversationId, cursor, 20);
      const { messages, nextCursor } = response;

      if (messages && Array.isArray(messages)) {
        const reversedMessages = messages.reverse();
        setMessages((prev) => (currentCursor ? [...reversedMessages, ...prev] : reversedMessages));
        setCursor(nextCursor);
        setHasMore(nextCursor ? messages.length === 20 : false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(errorMsg);
      console.error('Fetch messages error:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, cursor, hasMore, loading]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setCursor(undefined);
      setHasMore(true);
      setError(null);
      return;
    }

    setMessages([]);
    setCursor(undefined);
    setHasMore(true);
    setError(null);
    setCheckChange(prev => !prev);
  }, [conversationId]);

  // Auto-fetch initial messages when conversationId changes
  useEffect(() => {
    if (conversationId && !loading) {
      fetchMessages('');
    }
  }, [checkChange]);

  // Load more (fetch with current cursor)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) {
      return;
    }
    await fetchMessages();
  }, [fetchMessages, hasMore, loading]);

  // ─── Handle Message Deletion & Recall ───
  useEffect(() => {
    const handleMessageDeletedForMe = (data: {
      messageId: string;
      conversationId: string;
      deletedAt: string;
    }) => {
      // Only process if this is the right conversation
      if (data.conversationId !== conversationId) return;

      // Remove from messages state
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== data.messageId)
      );
    };

    const handleMessageRecalled = (data: {
      messageId: string;
      idempotencyKey: string;
      conversationId: string;
      recalledBy: string;
      recalledAt: string;
    }) => {
      // Only process if this is the right conversation
      if (data.conversationId !== conversationId) return;

      // Update message to placeholder
      setMessages((prev) =>
        prev.map((msg) =>
          msg.idempotencyKey === data.idempotencyKey
            ? {
                ...msg,
                content: data.recalledBy === 'system' ? '[Bị chặn bởi AI Moderator]' : '[Tin nhắn đã được thu hồi]',
                mediaUrl: undefined,
                type: 'system-recall' as Message['type'],
              }
            : msg,
        ),
      );
    };

    const handleMessageForwarded = (data: {
      messageId: string;
      idempotencyKey: string;
      toConversationId: string;
    }) => {
      // Just log forward confirmation - message appears in target conversation via receive_message
      console.debug(`Message forwarded: ${data.idempotencyKey} to ${data.toConversationId}`);
    };

    try {
      listenToMessageDeletion(handleMessageDeletedForMe);
      listenToMessageRecall(handleMessageRecalled);
      listenToMessageForwarded(handleMessageForwarded);
    } catch (err) {
      console.error('Failed to setup deletion listeners:', err);
    }

    return () => {
      try {
        unlistenToMessageDeletion();
        unlistenToMessageRecall();
        unlistenToMessageForwarded();
      } catch (err) {
        console.error('Failed to cleanup deletion listeners:', err);
      }
    };
  }, [conversationId]);

  return {
    messages,
    cursor,
    hasMore,
    loading,
    error,
    fetchMessages,
    loadMore,
    setMessages,
  };
}

// ─── useTypingIndicator Hook ───

interface UseTypingIndicatorOptions {
  conversationId: string;
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  isAnyoneTyping: boolean;
}

export function useTypingIndicator({
  conversationId,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const handleTypingIndicator = (data: {
      userId: string;
      conversationId: string;
      isTyping: boolean;
    }) => {
      if (data.conversationId !== conversationId) return;

      if (data.isTyping) {
        // Clear existing timeout
        const existingTimeout = typingTimeouts.current.get(data.userId);
        if (existingTimeout) clearTimeout(existingTimeout);

        // Add user
        setTypingUsers((prev) => {
          const exists = prev.find((u) => u.userId === data.userId);
          return exists ? prev : [...prev, { userId: data.userId, displayName: data.userId }];
        });

        // Auto-remove after 4s
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
          typingTimeouts.current.delete(data.userId);
        }, 4000);

        typingTimeouts.current.set(data.userId, timeout);
      } else {
        // Remove user
        const existingTimeout = typingTimeouts.current.get(data.userId);
        if (existingTimeout) clearTimeout(existingTimeout);
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        typingTimeouts.current.delete(data.userId);
      }
    };

    try {
      listenToTypingIndicators(handleTypingIndicator);
    } catch (err) {
      console.error('Failed to setup typing listener:', err);
    }

    return () => {
      typingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeouts.current.clear();

      try {
        unlistenToTypingIndicators();
      } catch (err) {
        console.error('Failed to cleanup typing listener:', err);
      }
    };
  }, [conversationId]);

  return {
    typingUsers,
    isAnyoneTyping: typingUsers.length > 0,
  };
}
