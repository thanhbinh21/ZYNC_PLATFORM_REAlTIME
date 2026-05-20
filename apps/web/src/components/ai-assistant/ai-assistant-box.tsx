'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, X, Loader2, MessageSquare } from 'lucide-react';
import type { AiBoxTab } from '@/hooks/use-ai-assistant';
import { StatusBadge } from './status-badge';

interface AiAssistantBoxProps {
  isOpen: boolean;
  activeTab: AiBoxTab;
  conversations: Array<{
    conversationId: string;
    name: string;
    avatarUrl?: string | null;
    type: 'direct' | 'group';
    unreadCount: number;
    updatedAt: string;
    aiStatus: 'not_started' | 'queued' | 'processing' | 'ready' | 'failed';
    aiItemId: string | null;
    aiItemRefId?: string | null;
    aiTitle: string | null;
    aiSummarySnippet: string | null;
    aiMetadata?: {
      unreadCount?: number;
      latestMessageAt?: string;
      lastDigestAt?: string;
      catchupMode?: 'unread' | 'since_last_digest' | 'recent';
      actionItemCount?: number;
      messageCount?: number;
    } | null;
  }>;
  items: Array<{
    _id: string;
    conversationId?: string;
    status: string;
    title?: string;
    summarySnippet?: string;
    metadata?: {
      unreadCount?: number;
      latestMessageAt?: string;
      lastDigestAt?: string;
      catchupMode?: 'unread' | 'since_last_digest' | 'recent';
      actionItemCount?: number;
      messageCount?: number;
    };
    createdAt?: string;
  }>;
  total: number;
  loadingList: boolean;
  loadingItems: Set<string>;
  onClose: () => void;
  onTabChange: (tab: AiBoxTab) => void;
  onSummarize: (conversationId: string) => void;
  onRegenerate: (conversationId: string) => void;
  onOpenChat: (conversationId: string) => void;
  onLoadMore?: () => void;
}

export function AiAssistantBox({
  isOpen,
  activeTab,
  conversations,
  items,
  total,
  loadingList,
  loadingItems,
  onClose,
  onTabChange,
  onSummarize,
  onRegenerate,
  onOpenChat,
  onLoadMore,
}: AiAssistantBoxProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Trap scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 md:hidden"
        onClick={onClose}
        aria-hidden
      />

      {/* Side panel */}
      <aside
        ref={panelRef}
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col bg-[var(--surface-card)] shadow-2xl transition-transform duration-300 ease-out md:w-[min(90vw,460px)]"
        style={{ transform: 'translateX(0)' }}
        role="dialog"
        aria-label="Zync AI Assistant"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" aria-hidden />
            <h2 className="font-ui-title text-lg font-bold text-text-primary">
              Zync AI Assistant
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-[var(--surface-glass)] text-text-secondary transition hover:bg-[var(--surface-glass-strong)]"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4">
          <button
            type="button"
            onClick={() => onTabChange('overview')}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'overview'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => onTabChange('catchup')}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'catchup'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Catch-up
            {conversations.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                {conversations.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeTab === 'overview' && <OverviewTab items={items} total={total} />}

          {activeTab === 'catchup' && (
            <CatchupTab
              conversations={conversations}
              total={total}
              loadingList={loadingList}
              loadingItems={loadingItems}
              onSummarize={onSummarize}
              onRegenerate={onRegenerate}
              onOpenChat={onOpenChat}
              onLoadMore={onLoadMore}
            />
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────────

function OverviewTab({
  items,
  total,
}: {
  items: AiAssistantBoxProps['items'];
  total: number;
}) {
  const readyCount = items.filter((i) => i.status === 'ready').length;
  const processingCount = items.filter((i) => i.status === 'queued' || i.status === 'processing').length;
  const notStartedCount = items.filter((i) => i.status === 'not_started').length;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 font-ui-title text-sm font-semibold text-text-primary">Trạng thái AI</p>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Đã tóm tắt" value={readyCount} color="text-green-600" />
          <StatCard label="Đang xử lý" value={processingCount} color="text-blue-500" />
          <StatCard label="Chưa bắt đầu" value={notStartedCount} color="text-gray-400" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-[var(--surface-glass)] p-4">
        <p className="mb-2 font-ui-title text-sm font-semibold text-text-primary">AI Assistant Box</p>
        <p className="text-sm text-text-secondary">
          Tóm tắt nhanh các cuộc trò chuyện chưa đọc, gợi ý trả lời và nhắc nhở việc cần làm — tất cả ở một nơi.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-text-primary">Các tính năng sắp tới</p>
        <ul className="space-y-2">
          <FeatureItem label="Tasks & Action Items" phase="Phase 2" done />
          <FeatureItem label="Smart Search" phase="Phase 3" />
          <FeatureItem label="Group Notes" phase="Phase 4" />
          <FeatureItem label="Call Summary" phase="Phase 5" />
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-[var(--surface-glass)] p-3">
      <span className={`font-ui-title text-2xl font-bold ${color}`}>{value}</span>
      <span className="mt-1 text-xs text-text-tertiary">{label}</span>
    </div>
  );
}

function FeatureItem({ label, phase, done = false }: { label: string; phase: string; done?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 shrink-0 rounded-full ${done ? 'bg-green-500' : 'bg-gray-400'}`} aria-hidden />
      <span className={done ? 'text-text-secondary line-through' : 'text-text-primary'}>{label}</span>
      <span className="ml-auto text-[11px] text-text-tertiary">{phase}</span>
    </li>
  );
}

// ─── Catch-up Tab ────────────────────────────────────────────────────────────────

interface CatchupConversation {
  conversationId: string;
  name: string;
  avatarUrl?: string | null;
  type: 'direct' | 'group';
  unreadCount: number;
  updatedAt: string;
  aiStatus: 'not_started' | 'queued' | 'processing' | 'ready' | 'failed';
  aiItemId: string | null;
  aiItemRefId?: string | null;
  aiTitle: string | null;
  aiSummarySnippet: string | null;
  aiMetadata?: {
    unreadCount?: number;
    latestMessageAt?: string;
    lastDigestAt?: string;
    catchupMode?: 'unread' | 'since_last_digest' | 'recent';
    actionItemCount?: number;
    messageCount?: number;
  } | null;
}

function CatchupTab({
  conversations,
  total,
  loadingList,
  loadingItems,
  onSummarize,
  onRegenerate,
  onOpenChat,
  onLoadMore,
}: {
  conversations: CatchupConversation[];
  total: number;
  loadingList: boolean;
  loadingItems: Set<string>;
  onSummarize: (id: string) => void;
  onRegenerate: (id: string) => void;
  onOpenChat: (id: string) => void;
  onLoadMore?: () => void;
}) {
  if (loadingList && conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden />
        <p className="mt-3 text-sm text-text-secondary">Đang tải...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Sparkles className="h-14 w-14 text-text-tertiary" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-text-primary">Không có cuộc trò chuyện nào</p>
        <p className="mt-1 text-center text-xs text-text-secondary">
          Các cuộc trò chuyện gần đây sẽ xuất hiện ở đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv) => {
        const isLoading = loadingItems.has(conv.conversationId) || loadingItems.has(conv.aiItemId ?? '');
        const isReady = conv.aiStatus === 'ready';
        const catchupMode = conv.aiMetadata?.catchupMode ?? (conv.unreadCount > 0 ? 'unread' : 'recent');
        const latestMessageAt = conv.aiMetadata?.latestMessageAt ?? conv.updatedAt;
        const lastDigestAt = conv.aiMetadata?.lastDigestAt;

        return (
          <div
            key={conv.conversationId}
            className="rounded-2xl border border-border bg-[var(--surface-card)] p-4 transition hover:border-border-strong"
          >
            {/* Header row */}
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--surface-glass)]">
                {conv.avatarUrl ? (
                  <img src={conv.avatarUrl} alt={conv.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-text-secondary">
                    {conv.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                {conv.type === 'group' && (
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] text-white">
                    G
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate font-semibold text-text-primary">{conv.name}</p>
                  <StatusBadge status={conv.aiStatus} />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
                  <span>{conv.unreadCount > 0 ? `${conv.unreadCount} tin chưa đọc` : 'Đã đọc gần đây'}</span>
                  <span>·</span>
                  <span>{getCatchupModeLabel(catchupMode)}</span>
                  {latestMessageAt && (
                    <>
                      <span>·</span>
                      <span>Tin mới {formatTimeAgo(latestMessageAt)}</span>
                    </>
                  )}
                  {lastDigestAt && (
                    <>
                      <span>·</span>
                      <span>Tóm tắt {formatTimeAgo(lastDigestAt)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Digest snippet (nếu đã có) */}
            {isReady && conv.aiSummarySnippet && (
              <p className="mt-2 text-xs text-text-secondary line-clamp-2">{conv.aiSummarySnippet}</p>
            )}

            {/* Action buttons */}
            <div className="mt-3 flex items-center gap-2">
              {catchupMode ? (
                <button
                  type="button"
                  onClick={() => onSummarize(conv.conversationId)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : (
                    <MessageSquare className="h-3 w-3" aria-hidden />
                  )}
                  {conv.aiStatus === 'failed' ? 'Thử lại' : 'Tóm tắt'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onRegenerate(conv.conversationId)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : null}
                  Tạo lại
                </button>
              )}

              <div className="flex-1" />

              <button
                type="button"
                onClick={() => onOpenChat(conv.conversationId)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[var(--surface-glass)] px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-[var(--surface-glass-strong)]"
              >
                Mở chat
              </button>
            </div>
          </div>
        );
      })}

      {/* Load more */}
      {conversations.length < total && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingList}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-[var(--surface-glass)] px-4 py-3 text-sm font-medium text-text-secondary transition hover:bg-[var(--surface-glass-strong)] disabled:opacity-50"
        >
          {loadingList ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          Tải thêm ({conversations.length}/{total})
        </button>
      )}
    </div>
  );
}

function getCatchupModeLabel(mode?: 'unread' | 'since_last_digest' | 'recent'): string {
  if (mode === 'unread') return 'Tin chưa đọc';
  if (mode === 'since_last_digest') return 'Tin mới sau tóm tắt';
  return 'Tóm tắt gần đây';
}

function formatTimeAgo(isoDate?: string): string {
  if (!isoDate) return '';
  const now = Date.now();
  const date = new Date(isoDate).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}
