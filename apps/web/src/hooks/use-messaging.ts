"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { v4 as uuidv4 } from "uuid";
import type { CallHistory, Message, MessageStatus, SenderInMessage } from "@zync/shared-types";
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
  listenToMessageReacted,
  unlistenToMessageReacted,
} from "@/services/socket";
import { getMessages } from "@/services/chat";
import { MessageType } from "@zync/shared-types";

// ─── useChat Hook ───

interface MessageStatusMap {
  [messageId: string]: MessageStatus;
}

type MessagesByConversationId = Record<string, Message[]>;
type MessageStatusByConversationId = Record<string, MessageStatusMap>;
const EMPTY_MESSAGES: Message[] = [];
const EMPTY_MESSAGE_STATUS: MessageStatusMap = {};

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

export interface SendMessageOptions {
  idempotencyKey?: string;
  deferEmit?: boolean;
  replyTo?: Message["replyTo"];
}

interface UseChatReturn {
  messages: Message[];
  typingUsers: TypingUser[];
  messageStatus: MessageStatusMap;
  sendMessage: (
    content: string,
    type: MessageType,
    displayName: string,
    avatarUrl?: string,
    mediaUrl?: string,
    options?: SendMessageOptions,
  ) => Promise<string | null>;
  cancelPendingMessage: (idempotencyKey: string) => void;
  markAsRead: (messageIds: string[]) => void;
  startTyping: () => void;
  stopTyping: () => void;
  deleteMessageForMe: (
    messageId: string,
    idempotencyKey: string,
  ) => Promise<void>;
  recallMessage: (messageId: string, idempotencyKey: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useChat({
  conversationId,
  userId,
  token,
  displayName,
}: UseChatOptions): UseChatReturn {
  const [messagesByConversationId, setMessagesByConversationId] = useState<MessagesByConversationId>({});
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [messageStatusByConversationId, setMessageStatusByConversationId] = useState<MessageStatusByConversationId>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messages = messagesByConversationId[conversationId] ?? EMPTY_MESSAGES;
  const messageStatus = messageStatusByConversationId[conversationId] ?? EMPTY_MESSAGE_STATUS;

  // Track typing users with TTL (auto-remove after 4s)
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const previousConversationId = useRef<string>("");
  const pendingConversationByIdempotencyKey = useRef<Map<string, string>>(new Map());
  // Luu callback theo event de co the cleanup dung callback thay vi xoa tat ca.
  const socketCallbackRefs = useRef<Record<string, (...args: unknown[]) => void>>({});

  const updateMessagesForConversation = useCallback((
    targetConversationId: string,
    updater: SetStateAction<Message[]>,
  ) => {
    if (!targetConversationId) return;

    setMessagesByConversationId((prev) => {
      const currentMessages = prev[targetConversationId] ?? EMPTY_MESSAGES;
      const nextMessages = typeof updater === "function"
        ? updater(currentMessages)
        : updater;

      if (nextMessages === currentMessages) {
        return prev;
      }

      return {
        ...prev,
        [targetConversationId]: nextMessages,
      };
    });
  }, []);

  const updateMessageStatusForConversation = useCallback((
    targetConversationId: string,
    updater: SetStateAction<MessageStatusMap>,
  ) => {
    if (!targetConversationId) return;

    setMessageStatusByConversationId((prev) => {
      const currentStatus = prev[targetConversationId] ?? {};
      const nextStatus = typeof updater === "function"
        ? updater(currentStatus)
        : updater;

      if (nextStatus === currentStatus) {
        return prev;
      }

      return {
        ...prev,
        [targetConversationId]: nextStatus,
      };
    });
  }, []);

  // Initialize socket on mount or when token changes
  useEffect(() => {
    // Only initialize socket if token is available
    if (!token) {
      setError("No authentication token available");
      return;
    }

    try {
      getSocket(token);
    } catch (err) {
      console.error("Failed to initialize socket:", err);
      setError("Failed to connect to messaging service");
    }
  }, [token]);

  // Join conversation when it changes – also handles reconnect
  useEffect(() => {
    if (!conversationId || !token) return;

    const sock = getSocket(token);

    const doJoin = () => {
      // Leave previous conversation if it exists and is different
      if (
        previousConversationId.current &&
        previousConversationId.current !== conversationId
      ) {
        leaveConversation(previousConversationId.current);
      }
      joinConversation(conversationId);
      previousConversationId.current = conversationId;
    };

    if (sock.connected) {
      doJoin();
    }

    // Re-join on (re)connect so room membership survives reconnects
    sock.on("connect", doJoin);

    return () => {
      sock.off("connect", doJoin);
      if (previousConversationId.current === conversationId) {
        leaveConversation(conversationId);
        previousConversationId.current = "";
      }
    };
  }, [conversationId, token]);

  // Setup message listener
  useEffect(() => {
    if (!conversationId || !token) {
      return;
    }

    const handleReceiveMessage = (data: {
      messageId: string;
      conversationId?: string;
      senderId: string;
      sender: SenderInMessage;
      content: string;
      type: string;
      mediaUrl?: string;
      callHistory?: CallHistory;
      replyTo?: Message["replyTo"];
      idempotencyKey: string;
      createdAt: string;
    }) => {
      if (!data.conversationId || data.conversationId !== conversationId) {
        return;
      }

      const newMessage: Message = {
        _id: data.messageId,
        conversationId: data.conversationId,
        senderId: data.senderId,
      sender: data.sender,
      content: data.content,
      type: data.type as Message["type"],
      mediaUrl: data.mediaUrl,
      callHistory: data.callHistory,
      replyTo: data.replyTo,
        idempotencyKey: data.idempotencyKey, // Will be set on send
        status: "delivered",
        createdAt: data.createdAt,
      };

      updateMessagesForConversation(data.conversationId, (prev) => {
        const index = prev.findIndex(
          (msg) =>
            msg.conversationId === data.conversationId
            && (msg._id === data.messageId
              || msg.idempotencyKey === data.idempotencyKey),
        );

        if (index === -1) {
          return [...prev, newMessage];
        }

        const next = [...prev];
        next[index] = {
          ...next[index],
          ...newMessage,
          _id: data.messageId,
          createdAt: data.createdAt || next[index].createdAt,
        };
        return next;
      });

      updateMessageStatusForConversation(data.conversationId, (prev) => ({
        ...prev,
        [data.idempotencyKey]: "delivered",
        [data.messageId]: "delivered",
      }));

      if (data.senderId !== userId) {
        // Notify backend that message was delivered only for messages from other users.
        markAsDelivered(data.conversationId, [data.messageId]);

        // Auto-mark as read after 500ms
        setTimeout(() => {
          markAsRead(data.conversationId as string, [data.messageId]);
        }, 500);
      }
    };

    const handleMessageSent = (data: {
      messageId: string;
      idempotencyKey: string;
      createdAt: string;
    }) => {
      const targetConversationId = pendingConversationByIdempotencyKey.current.get(data.idempotencyKey);
      if (!targetConversationId) {
        return;
      }

      // Replace optimistic message (idempotency key) with real server message id.
      updateMessagesForConversation(targetConversationId, (prev) =>
        prev.map((msg) =>
          msg.conversationId === targetConversationId
          && (msg._id === data.idempotencyKey
            || msg.idempotencyKey === data.idempotencyKey)
            ? {
                ...msg,
                _id: data.messageId,
                createdAt: data.createdAt || msg.createdAt,
              }
            : msg,
        ),
      );

      updateMessageStatusForConversation(targetConversationId, (prev) => {
        const next = { ...prev };
        const previousStatus = next[data.idempotencyKey] ?? "sent";
        
        const currentStatus = next[data.messageId];
        if (currentStatus !== "delivered" && currentStatus !== "read") {
          next[data.messageId] = previousStatus;
        }
        
        delete next[data.idempotencyKey];
        return next;
      });
      pendingConversationByIdempotencyKey.current.delete(data.idempotencyKey);
    };

    const handleMessageReacted = (data: any) => {
      if (data.conversationId !== conversationId) return;
      updateMessagesForConversation(conversationId, (prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg,
        ),
      );
    };

    try {
      listenToMessages(handleReceiveMessage);
      listenToMessageReacted(handleMessageReacted);
      const socket = getSocket(token);
      socket.on("message_sent", handleMessageSent);
    } catch (err) {
      console.error("Failed to setup message listener:", err);
    }

    return () => {
      try {
        unlistenToMessages(handleReceiveMessage);
        unlistenToMessageReacted(handleMessageReacted);
        const socket = getSocket(token);
        socket.off("message_sent", handleMessageSent);
      } catch (err) {
        console.error("Failed to cleanup message listener:", err);
      }
    };
  }, [conversationId, token, updateMessagesForConversation, updateMessageStatusForConversation, userId]);

  // Setup status update listener
  useEffect(() => {
    if (!token) {
      return;
    }

    const handleStatusUpdate = (data: {
      messageId?: string;
      messageIds?: string[];
      idempotencyKeys?: string[];
      conversationId?: string;
      status: MessageStatus;
      userId: string;
      updatedAt: string;
      reader?: {
        userId: string;
        displayName: string;
        avatarUrl?: string;
        readAt: string;
      };
    }) => {
      if (!data.conversationId) {
        return;
      }

      const targetConversationId = data.conversationId;
      const ids = data.messageIds || [];
      const idems = data.idempotencyKeys || [];

      // Single message status update (sent event)
      if (ids.length === 0 && data.messageId) {
        const messageId = data.messageId;
        updateMessageStatusForConversation(targetConversationId, (prev) => ({
          ...prev,
          [messageId]: data.status,
        }));
        return;
      }

      // Batch status update (auto-mark from getMessageHistory)
      // Backend sends idempotencyKeys = frontend mockIds (now guaranteed to match)
      updateMessageStatusForConversation(targetConversationId, (prev) => {
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

      if (data.status === "read" && data.reader) {
        const targetRefs = new Set<string>([
          ...ids.map(String),
          ...idems.map(String),
          ...(data.messageId ? [String(data.messageId)] : []),
        ]);

        if (targetRefs.size === 0) {
          return;
        }

        updateMessagesForConversation(targetConversationId, (prev) =>
          prev.map((msg) => {
            if (msg.conversationId !== targetConversationId) {
              return msg;
            }

            const messageRefs = [
              String(msg._id),
              String(msg.idempotencyKey || ""),
            ].filter(Boolean);
            const isTarget = messageRefs.some((ref) => targetRefs.has(ref));

            if (!isTarget) {
              return msg;
            }

            const existingReadBy = Array.isArray(msg.readBy) ? msg.readBy : [];
            const mergedReadBy = [
              data.reader!,
              ...existingReadBy.filter(
                (item) => item.userId !== data.reader!.userId,
              ),
            ].sort(
              (a, b) =>
                new Date(b.readAt).getTime() - new Date(a.readAt).getTime(),
            );

            const sentTo = Array.isArray(msg.sentTo)
              ? msg.sentTo.filter((item) => item.userId !== data.reader!.userId)
              : msg.sentTo;

            return {
              ...msg,
              status: "read" as MessageStatus,
              readBy: mergedReadBy,
              readByPreview: mergedReadBy.slice(0, 3),
              sentTo,
            };
          }),
        );
      }
    };

    try {
      listenToStatusUpdates(handleStatusUpdate);
    } catch (err) {
      console.error("Failed to setup status listener:", err);
    }

    return () => {
      try {
        unlistenToStatusUpdates(handleStatusUpdate);
      } catch (err) {
        console.error("Failed to cleanup status listener:", err);
      }
    };
  }, [token, updateMessagesForConversation, updateMessageStatusForConversation]);

  // Setup typing indicator listener
  useEffect(() => {
    setTypingUsers([]);
    if (!conversationId || !token) {
      return;
    }

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
            setTypingUsers((prev) =>
              prev.filter((u) => u.userId !== data.userId),
            );
            typingTimeouts.current.delete(data.userId);
          }, 4000);

          typingTimeouts.current.set(data.userId, timeout);
        } else {
          // Remove user immediately
          const existingTimeout = typingTimeouts.current.get(data.userId);
          if (existingTimeout) clearTimeout(existingTimeout);
          setTypingUsers((prev) =>
            prev.filter((u) => u.userId !== data.userId),
          );
          typingTimeouts.current.delete(data.userId);
        }
      }
    };

    try {
      listenToTypingIndicators(handleTypingIndicator);
    } catch (err) {
      console.error("Failed to setup typing listener:", err);
    }

    return () => {
      // Cleanup all typing timeouts
      typingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeouts.current.clear();

      try {
        unlistenToTypingIndicators(handleTypingIndicator);
      } catch (err) {
        console.error("Failed to cleanup typing listener:", err);
      }
    };
  }, [conversationId, token, userId]);

  // Send message
  const handleSendMessage = useCallback(
    async (
      content: string,
      type: MessageType,
      displayName: string,
      avatarUrl?: string,
      mediaUrl?: string,
      options?: SendMessageOptions,
    ) => {
      // Kiem tra ket noi SOCKET truoc khi thuc hien bat ky thu gi
      // Neu chua ket noi, hien thong bao loi va khong tao optimistic bubble
      if (!isConnected()) {
        setError("Mat ket noi voi may chu. Vui long doi ket noi...");
        console.warn("[useChat] Cannot send: socket not connected");
        return null;
      }

      const idempotencyKey = options?.idempotencyKey || uuidv4();
      const shouldEmitNow = !options?.deferEmit;
      const timestamp = new Date().toISOString();
      // A deferred media upload can finish after the user switches chats.
      // Keep the final emit attached to the conversation where the optimistic bubble was created.
      const targetConversationId = pendingConversationByIdempotencyKey.current.get(idempotencyKey) ?? conversationId;

      if (!targetConversationId) {
        return null;
      }

      console.debug(`[useChat] handleSendMessage: content="${content.substring(0, 30)}...", type=${type}, shouldEmitNow=${shouldEmitNow}`);

      try {
        if (shouldEmitNow) {
          setIsLoading(true);
        }
        setError(null);

        // Chi tao optimistic message neu thuc su co the gui
        const optimisticMessage: Message = {
          _id: idempotencyKey,
          conversationId: targetConversationId,
          senderId: userId,
          sender: {
            senderId: userId,
            displayName: displayName,
            avatarUrl: avatarUrl
          },
          content,
          type,
          mediaUrl,
          replyTo: options?.replyTo,
          idempotencyKey,
          status: "sent",
          createdAt: timestamp,
        };

        pendingConversationByIdempotencyKey.current.set(idempotencyKey, targetConversationId);

        updateMessagesForConversation(targetConversationId, (prev) => {
          const index = prev.findIndex(
            (msg) =>
              msg.idempotencyKey === idempotencyKey ||
              msg._id === idempotencyKey,
          );

          if (index === -1) {
            return [...prev, optimisticMessage];
          }

          const next = [...prev];
          next[index] = {
            ...next[index],
            ...optimisticMessage,
            _id: next[index]._id,
            createdAt: next[index].createdAt || optimisticMessage.createdAt,
          };
          return next;
        });

        updateMessageStatusForConversation(targetConversationId, (prev) => ({
          ...prev,
          [idempotencyKey]: "sent",
        }));

        if (shouldEmitNow) {
          emitSendMessage(
            targetConversationId,
            content,
            type,
            idempotencyKey,
            mediaUrl,
            options?.replyTo,
          );

          emitClearPendingTyping(targetConversationId);
        }

        return idempotencyKey;
      } catch (err) {
        // Rollback optimistic message khi co loi
        updateMessagesForConversation(targetConversationId, (prev) =>
          prev.filter(
            (msg) =>
              msg.idempotencyKey !== idempotencyKey &&
              msg._id !== idempotencyKey,
          ),
        );
        updateMessageStatusForConversation(targetConversationId, (prev) => {
          const next = { ...prev };
          delete next[idempotencyKey];
          return next;
        });
        pendingConversationByIdempotencyKey.current.delete(idempotencyKey);

        const errorMsg =
          err instanceof Error ? err.message : "Khong the gui tin nhan";
        setError(errorMsg);
        console.error("Send message error:", err);
        return null;
      } finally {
        if (shouldEmitNow) {
          setIsLoading(false);
        }
      }
    },
    [conversationId, updateMessagesForConversation, updateMessageStatusForConversation, userId],
  );

  const handleCancelPendingMessage = useCallback((idempotencyKey: string) => {
    const targetConversationId = pendingConversationByIdempotencyKey.current.get(idempotencyKey) ?? conversationId;

    updateMessagesForConversation(targetConversationId, (prev) =>
      prev.filter(
        (msg) =>
          msg.idempotencyKey !== idempotencyKey && msg._id !== idempotencyKey,
      ),
    );

    updateMessageStatusForConversation(targetConversationId, (prev) => {
      if (!prev[idempotencyKey]) {
        return prev;
      }

      const next = { ...prev };
      delete next[idempotencyKey];
      return next;
    });
    pendingConversationByIdempotencyKey.current.delete(idempotencyKey);
  }, [conversationId, updateMessagesForConversation, updateMessageStatusForConversation]);

  // Mark as read
  const handleMarkAsRead = useCallback(
    (messageIds: string[]) => {
      try {
        markAsRead(conversationId, messageIds);
        messageIds.forEach((id) => {
          updateMessageStatusForConversation(conversationId, (prev) => ({
            ...prev,
            [id]: "read",
          }));
        });
      } catch (err) {
        console.error("Mark as read error:", err);
      }
    },
    [conversationId, updateMessageStatusForConversation],
  );

  // Start typing
  const handleStartTyping = useCallback(() => {
    try {
      emitStartTyping(conversationId);
    } catch (err) {
      console.error("Start typing error:", err);
    }
  }, [conversationId]);

  // Stop typing
  const handleStopTyping = useCallback(() => {
    try {
      emitStopTyping(conversationId);
    } catch (err) {
      console.error("Stop typing error:", err);
    }
  }, [conversationId]);

  // ─── Delete Message Listeners Setup (Status Update Only) ───
  useEffect(() => {
    if (!token) return;

    const handleMessageDeletedForMe = (data: {
      messageId: string;
      conversationId: string;
      deletedAt: string;
      idempotencyKey?: string;
    }) => {
      // Only process if this is the right conversation
      if (data.conversationId !== conversationId) return;

      // Remove from realtime message state so merge layer cannot resurrect it.
      updateMessagesForConversation(data.conversationId, (prev) =>
        prev.filter((msg) => {
          const matchesById =
            msg._id === data.messageId || msg.idempotencyKey === data.messageId;
          const matchesByKey =
            Boolean(data.idempotencyKey) &&
            (msg._id === data.idempotencyKey ||
              msg.idempotencyKey === data.idempotencyKey);

          return !(matchesById || matchesByKey);
        }),
      );

      // Remove from status map
      updateMessageStatusForConversation(data.conversationId, (prev) => {
        const newStatus = { ...prev };
        delete newStatus[data.messageId];
        if (data.idempotencyKey) {
          delete newStatus[data.idempotencyKey];
        }
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

      // Keep message body in recalled state so later realtime merges cannot resurrect content.
      updateMessagesForConversation(data.conversationId, (prev) =>
        prev.map((msg) => {
          const matches =
            msg._id === data.messageId ||
            msg.idempotencyKey === data.idempotencyKey ||
            msg._id === data.idempotencyKey ||
            msg.idempotencyKey === data.messageId;

          if (!matches) {
            return msg;
          }

          return {
            ...msg,
            content:
              data.recalledBy === "system"
                ? "[Bị chặn bởi AI Moderator]"
                : "[Tin nhắn đã được thu hồi]",
            mediaUrl: undefined,
            type: "system-recall" as Message["type"],
          };
        }),
      );

      // Update status
      updateMessageStatusForConversation(data.conversationId, (prev) => ({
        ...prev,
        [data.messageId]: "read",
      }));
    };

    // Luu vao refs de cleanup dung callback thay vi xoa tat ca.
    socketCallbackRefs.current['message_deleted_for_me'] = handleMessageDeletedForMe as (...args: unknown[]) => void;
    socketCallbackRefs.current['message_recalled'] = handleMessageRecalled as (...args: unknown[]) => void;

    try {
      // Use listener functions instead of direct socket.on
      listenToMessageDeletion(handleMessageDeletedForMe);
      listenToMessageRecall(handleMessageRecalled);
    } catch (err) {
      console.error("Failed to setup deletion listeners:", err);
    }

    return () => {
      try {
        unlistenToMessageDeletion(handleMessageDeletedForMe);
        unlistenToMessageRecall(handleMessageRecalled);
      } catch (err) {
        console.error("Failed to cleanup deletion listeners:", err);
      }
      delete socketCallbackRefs.current['message_deleted_for_me'];
      delete socketCallbackRefs.current['message_recalled'];
    };
  }, [conversationId, token, updateMessagesForConversation, updateMessageStatusForConversation]);

  // Delete for me
  const handleDeleteForMe = useCallback(
    async (messageId: string, idempotencyKey: string) => {
      if (!isConnected()) {
        setError("Not connected to messaging service");
        return;
      }

      try {
        // Optimistic remove to avoid temporary resurrection while waiting server ack.
        updateMessagesForConversation(conversationId, (prev) =>
          prev.filter(
            (msg) =>
              msg._id !== messageId &&
              msg.idempotencyKey !== messageId &&
              msg._id !== idempotencyKey &&
              msg.idempotencyKey !== idempotencyKey,
          ),
        );

        updateMessageStatusForConversation(conversationId, (prev) => {
          const next = { ...prev };
          delete next[messageId];
          delete next[idempotencyKey];
          return next;
        });

        deleteMessageForMe(conversationId, messageId, idempotencyKey);
      } catch (err) {
        console.error("Failed to delete message:", err);
        setError("Failed to delete message");
      }
    },
    [conversationId, updateMessagesForConversation, updateMessageStatusForConversation],
  );

  // Recall message
  const handleRecall = useCallback(
    async (messageId: string, idempotencyKey: string) => {
      if (!isConnected()) {
        setError("Not connected to messaging service");
        return;
      }

      try {
        recallMessage(conversationId, messageId, idempotencyKey);
      } catch (err) {
        console.error("Failed to recall message:", err);
        setError("Failed to recall message");
      }
    },
    [conversationId],
  );

  return {
    messages,
    typingUsers,
    messageStatus,
    sendMessage: handleSendMessage,
    cancelPendingMessage: handleCancelPendingMessage,
    markAsRead: handleMarkAsRead,
    startTyping: handleStartTyping,
    stopTyping: handleStopTyping,
    deleteMessageForMe: handleDeleteForMe,
    recallMessage: handleRecall,
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
  setMessages: Dispatch<SetStateAction<Message[]>>;
}

export function useMessageHistory({
  conversationId,
}: UseMessageHistoryOptions): UseMessageHistoryReturn {
  const [messagesByConversationId, setMessagesByConversationId] = useState<MessagesByConversationId>({});
  const [cursorByConversationId, setCursorByConversationId] = useState<Record<string, string | undefined>>({});
  const [hasMoreByConversationId, setHasMoreByConversationId] = useState<Record<string, boolean>>({});
  const [loadingByConversationId, setLoadingByConversationId] = useState<Record<string, boolean>>({});
  const [errorByConversationId, setErrorByConversationId] = useState<Record<string, string | null>>({});
  const activeConversationIdRef = useRef(conversationId);
  activeConversationIdRef.current = conversationId;

  const messages = messagesByConversationId[conversationId] ?? EMPTY_MESSAGES;
  const cursor = cursorByConversationId[conversationId];
  const hasMore = hasMoreByConversationId[conversationId] ?? true;
  const loading = loadingByConversationId[conversationId] ?? false;
  const error = errorByConversationId[conversationId] ?? null;

  const setMessagesForConversation = useCallback((
    targetConversationId: string,
    updater: SetStateAction<Message[]>,
  ) => {
    if (!targetConversationId) return;

    setMessagesByConversationId((prev) => {
      const currentMessages = prev[targetConversationId] ?? EMPTY_MESSAGES;
      const nextMessages = typeof updater === "function"
        ? updater(currentMessages)
        : updater;

      if (nextMessages === currentMessages) {
        return prev;
      }

      return {
        ...prev,
        [targetConversationId]: nextMessages,
      };
    });
  }, []);

  const setMessages = useCallback<Dispatch<SetStateAction<Message[]>>>((updater) => {
    setMessagesForConversation(conversationId, updater);
  }, [conversationId, setMessagesForConversation]);

  const fetchMessages = useCallback(
    async (overrideCursor?: string) => {
      const targetConversationId = conversationId;
      if (!targetConversationId || loadingByConversationId[targetConversationId]) return;

      const currentCursor = overrideCursor ?? cursorByConversationId[targetConversationId];
      if (currentCursor && hasMoreByConversationId[targetConversationId] === false) return;

      try {
        setLoadingByConversationId((prev) => ({ ...prev, [targetConversationId]: true }));
        setErrorByConversationId((prev) => ({ ...prev, [targetConversationId]: null }));

        const response = await getMessages(targetConversationId, currentCursor, 20);
        const { messages, nextCursor } = response;

        if (activeConversationIdRef.current !== targetConversationId) {
          return;
        }

        if (messages && Array.isArray(messages)) {
          const reversedMessages = [...messages]
            .filter((msg) => msg.conversationId === targetConversationId)
            .reverse();
          setMessagesForConversation(targetConversationId, (prev) => {
            const scopedPreviousMessages = prev.filter((msg) => msg.conversationId === targetConversationId);
            if (currentCursor) {
              return [...reversedMessages, ...scopedPreviousMessages];
            }
            // Merge with any real-time messages already present in prev
            const merged = new Map<string, Message>();
            reversedMessages.forEach((msg) => {
              const key = String(msg.idempotencyKey || msg._id);
              merged.set(key, msg);
            });
            scopedPreviousMessages.forEach((msg) => {
              const key = String(msg.idempotencyKey || msg._id);
              if (!merged.has(key)) {
                merged.set(key, msg);
              }
            });
            return Array.from(merged.values()).sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );
          });
          setCursorByConversationId((prev) => ({ ...prev, [targetConversationId]: nextCursor }));
          setHasMoreByConversationId((prev) => ({ ...prev, [targetConversationId]: Boolean(nextCursor) }));
        } else {
          setMessagesForConversation(targetConversationId, []);
          setCursorByConversationId((prev) => ({ ...prev, [targetConversationId]: undefined }));
          setHasMoreByConversationId((prev) => ({ ...prev, [targetConversationId]: false }));
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to fetch messages";
        if (activeConversationIdRef.current === targetConversationId) {
          setErrorByConversationId((prev) => ({ ...prev, [targetConversationId]: errorMsg }));
        }
        console.error("Fetch messages error:", err);
      } finally {
        setLoadingByConversationId((prev) => ({ ...prev, [targetConversationId]: false }));
      }
    },
    [conversationId, cursorByConversationId, hasMoreByConversationId, loadingByConversationId, setMessagesForConversation],
  );

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    setMessagesForConversation(conversationId, []);
    setCursorByConversationId((prev) => ({ ...prev, [conversationId]: undefined }));
    setHasMoreByConversationId((prev) => ({ ...prev, [conversationId]: true }));
    setErrorByConversationId((prev) => ({ ...prev, [conversationId]: null }));
    void fetchMessages("");
  }, [conversationId]);

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
      idempotencyKey?: string;
    }) => {
      // Only process if this is the right conversation
      if (data.conversationId !== conversationId) return;

      // Remove from messages state
      setMessagesForConversation(data.conversationId, (prev) =>
        prev.filter((msg) => {
          const matchesById =
            msg._id === data.messageId || msg.idempotencyKey === data.messageId;
          const matchesByKey =
            Boolean(data.idempotencyKey) &&
            (msg._id === data.idempotencyKey ||
              msg.idempotencyKey === data.idempotencyKey);

          return !(matchesById || matchesByKey);
        }),
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
      setMessagesForConversation(data.conversationId, (prev) =>
        prev.map((msg) =>
          msg.idempotencyKey === data.idempotencyKey ||
          msg._id === data.messageId ||
          msg._id === data.idempotencyKey ||
          msg.idempotencyKey === data.messageId
            ? {
                ...msg,
                content:
                  data.recalledBy === "system"
                    ? "[Bị chặn bởi AI Moderator]"
                    : "[Tin nhắn đã được thu hồi]",
                mediaUrl: undefined,
                type: "system-recall" as Message["type"],
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
      console.debug(
        `Message forwarded: ${data.idempotencyKey} to ${data.toConversationId}`,
      );
    };

    try {
      listenToMessageDeletion(handleMessageDeletedForMe);
      listenToMessageRecall(handleMessageRecalled);
      listenToMessageForwarded(handleMessageForwarded);
    } catch (err) {
      console.error("Failed to setup deletion listeners:", err);
    }

    return () => {
      try {
        unlistenToMessageDeletion(handleMessageDeletedForMe);
        unlistenToMessageRecall(handleMessageRecalled);
        unlistenToMessageForwarded(handleMessageForwarded);
      } catch (err) {
        console.error("Failed to cleanup deletion listeners:", err);
      }
    };
  }, [conversationId, setMessagesForConversation]);

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
    setTypingUsers([]);

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
          return exists
            ? prev
            : [...prev, { userId: data.userId, displayName: data.userId }];
        });

        // Auto-remove after 4s
        const timeout = setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((u) => u.userId !== data.userId),
          );
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
      console.error("Failed to setup typing listener:", err);
    }

    return () => {
      typingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeouts.current.clear();

      try {
        unlistenToTypingIndicators(handleTypingIndicator);
      } catch (err) {
        console.error("Failed to cleanup typing listener:", err);
      }
    };
  }, [conversationId]);

  return {
    typingUsers,
    isAnyoneTyping: typingUsers.length > 0,
  };
}
