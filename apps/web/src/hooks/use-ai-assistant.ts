'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiAssistantItem, AiAssistantItemPayload } from '@zync/shared-types';
import {
  getUnreadConversations,
  createCatchupDigest,
  regenerateCatchup,
  type ConversationWithAiDigest,
} from '@/services/ai-assistant';
import {
  listenToAiAssistantItemUpdated,
  unlistenToAiAssistantItemUpdated,
  getRawSocket,
} from '@/services/socket';

export type AiBoxTab = 'overview' | 'catchup';

interface UseAiAssistantOptions {
  /** Số conversation hiển thị tối đa trong AI Box */
  defaultLimit?: number;
}

export function useAiAssistant(options: UseAiAssistantOptions = {}) {
  const { defaultLimit = 10 } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AiBoxTab>('catchup');
  /** Recent conversations + AI state for Catch-up. */
  const [conversations, setConversations] = useState<ConversationWithAiDigest[]>([]);
  /** Legacy AI items (dùng cho tổng hợp, không còn là nguồn chính) */
  const [items, setItems] = useState<AiAssistantItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const skipRef = useRef(0);

  // ── Socket handler ─────────────────────────────────────────────────────────────

  const handleSocketUpdate = useCallback((payload: AiAssistantItemPayload) => {
    // Cập nhật conversations state (nguồn chính cho Phase 1)
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.conversationId === payload.conversationId);
      if (idx === -1) return prev;

      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        aiStatus: payload.status as ConversationWithAiDigest['aiStatus'],
        aiTitle: payload.title ?? updated[idx].aiTitle,
        aiSummarySnippet: payload.summarySnippet ?? updated[idx].aiSummarySnippet,
        aiMetadata: payload.metadata
          ? { ...updated[idx].aiMetadata, ...payload.metadata }
          : updated[idx].aiMetadata,
      };
      return updated;
    });

    // Cập nhật legacy items state
    setItems((prev) => {
      const exists = prev.some((item) => item._id === payload.itemId);
      if (exists) {
        return prev.map((item) =>
          item._id === payload.itemId
            ? {
                ...item,
                status: payload.status,
                title: payload.title ?? item.title,
                summarySnippet: payload.summarySnippet ?? item.summarySnippet,
                metadata: payload.metadata ? { ...item.metadata, ...payload.metadata } : item.metadata,
                updatedAt: payload.updatedAt,
              }
            : item,
        );
      }
      if (payload.status === 'queued' || payload.status === 'processing') {
        return [
          {
            _id: payload.itemId,
            userId: '',
            type: payload.type,
            conversationId: payload.conversationId ?? '',
            status: payload.status,
            title: payload.title,
            summarySnippet: payload.summarySnippet,
            metadata: payload.metadata,
            trigger: 'manual',
            createdAt: payload.updatedAt,
            updatedAt: payload.updatedAt,
          },
          ...prev,
        ];
      }
      return prev;
    });

    // Clear loading khi done/failed
    if (payload.status === 'ready' || payload.status === 'failed') {
      setLoadingItems((prev) => {
        const next = new Set(prev);
        next.delete(payload.itemId);
        return next;
      });
    }
  }, []);

  // ── Load recent conversations for Catch-up ────────────────────────────────────

  const loadConversations = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoadingList(true);
      setError(null);

      try {
        const result = await getUnreadConversations({
          limit: defaultLimit,
          skip: reset ? 0 : skipRef.current,
        });

        if (reset) {
          setConversations(result.conversations);
          skipRef.current = defaultLimit;
        } else {
          setConversations((prev) => [...prev, ...result.conversations]);
          skipRef.current += defaultLimit;
        }
        setTotal(result.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        loadingRef.current = false;
        setLoadingList(false);
      }
    },
    [defaultLimit],
  );

  // Alias để layout gọi được loadItems
  const loadItems = loadConversations;

  // ── Create digest ──────────────────────────────────────────────────────────────

  const createDigest = useCallback(async (conversationId: string) => {
    setLoadingItems((prev) => new Set([...prev, conversationId]));
    try {
      const result = await createCatchupDigest({ conversationId, trigger: 'manual' });

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.conversationId === conversationId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            aiStatus: result.item.status,
            aiItemId: result.item._id,
            aiTitle: result.item.title ?? null,
            aiMetadata: result.item.metadata ?? updated[idx].aiMetadata,
          };
          return updated;
        }
        return prev;
      });

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create digest');
      throw err;
    } finally {
      setLoadingItems((prev) => {
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
    }
  }, []);

  // ── Regenerate digest ──────────────────────────────────────────────────────────

  const doRegenerate = useCallback(async (conversationId: string) => {
    setLoadingItems((prev) => new Set([...prev, conversationId]));
    try {
      const result = await regenerateCatchup(conversationId);

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.conversationId === conversationId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            aiStatus: result.item.status,
            aiItemId: result.item._id,
            aiTitle: result.item.title ?? null,
            aiMetadata: result.item.metadata ?? updated[idx].aiMetadata,
          };
          return updated;
        }
        return prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate digest');
      throw err;
    } finally {
      setLoadingItems((prev) => {
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
    }
  }, []);

  // ── Open / Close ───────────────────────────────────────────────────────────────

  const openBox = useCallback(() => {
    setIsOpen(true);
    void loadConversations(true);
  }, [loadConversations]);

  const closeBox = useCallback(() => {
    setIsOpen(false);
  }, []);

  // ── Socket lifecycle ───────────────────────────────────────────────────────────

  useEffect(() => {
    const socket = getRawSocket();
    if (!socket) return;

    listenToAiAssistantItemUpdated(handleSocketUpdate);
    return () => {
      unlistenToAiAssistantItemUpdated(handleSocketUpdate);
    };
  }, [handleSocketUpdate]);

  // ── Badge count ───────────────────────────────────────────────────────────────

  const unreadDigestCount = conversations.filter((c) => c.unreadCount > 0).length;

  return {
    isOpen,
    activeTab,
    setActiveTab,
    conversations,
    items,
    total,
    loadingList,
    loadingItems,
    error,
    unreadDigestCount,
    openBox,
    closeBox,
    loadConversations,
    loadItems,
    createDigest,
    regenerate: doRegenerate,
  };
}
