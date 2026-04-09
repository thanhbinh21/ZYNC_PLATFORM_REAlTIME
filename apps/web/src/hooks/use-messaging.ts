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
} from '@/services/socket';
import { getMessages } from '@/services/chat';
import { MessageType } from '@/components/home-dashboard/home-dashboard.types';

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
  isLoading: boolean;
  error: string | null;
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

  // Join conversation when it changes
  useEffect(() => {
    if (conversationId && isConnected()) {
      // Leave previous conversation if it exists and is different
      if (previousConversationId.current && previousConversationId.current !== conversationId) {
        leaveConversation(previousConversationId.current);
      }
      // Join new conversation
      joinConversation(conversationId);
      previousConversationId.current = conversationId;
    }
  }, [conversationId]);

  // Setup message listener
  useEffect(() => {
    const handleReceiveMessage = (data: {
      messageId: string;
      senderId: string;
      content: string;
      type: string;
      mediaUrl?: string;
      createdAt: string;
    }) => {
      const newMessage: Message = {
        _id: data.messageId,
        conversationId,
        senderId: data.senderId,
        content: data.content,
        type: data.type as Message['type'],
        mediaUrl: data.mediaUrl,
        idempotencyKey: '', // Will be set on send
        status: 'delivered',
        createdAt: data.createdAt,
      }; console.log(newMessage)
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

    try {
      listenToMessages(handleReceiveMessage);
      const socket = getSocket(token);
      socket.on('message_sent', handleMessageSent);
    } catch (err) {
      console.error('Failed to setup message listener:', err);
    }

    return () => {
      try {
        unlistenToMessages();
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

  return {
    messages,
    typingUsers,
    messageStatus,
    sendMessage: handleSendMessage,
    markAsRead: handleMarkAsRead,
    startTyping: handleStartTyping,
    stopTyping: handleStopTyping,
    isLoading,
    error,
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
  const [error, setError] = useState<string | null>(null);

  // Fetch messages with cursor
  const fetchMessages = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getMessages(conversationId, cursor, 20);
      const { messages, nextCursor } = response;

      if (messages && Array.isArray(messages)) {
        // Reverse to show old → new order
        const reversedMessages = messages.reverse();
        // First load: set directly, Load more: prepend to top (old messages on top)
        setMessages((prev) => (cursor ? [...reversedMessages, ...prev] : reversedMessages));
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

  // Auto-reset state when conversationId changes
  useEffect(() => {
    setMessages([]);
    setCursor(undefined);
    setHasMore(true);
    setError(null);
  }, [conversationId]);

  // Auto-fetch initial messages when conversationId changes
  useEffect(() => {
    if (conversationId && messages.length === 0 && !loading) {
      fetchMessages();
    }
  }, [conversationId]);

  // Load more (fetch with current cursor)
  const loadMore = useCallback(async () => {
    await fetchMessages();
  }, [fetchMessages]);

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
