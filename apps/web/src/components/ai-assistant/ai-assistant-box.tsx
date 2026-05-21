'use client';

import { useEffect, useRef } from 'react';
import { Bell, Check, CheckCircle2, Sparkles, X, Loader2, MessageSquare, Reply, Trash2 } from 'lucide-react';
import type { AiBoxTab } from '@/hooks/use-ai-assistant';
import { StatusBadge } from './status-badge';

type CatchupDetail = {
  _id: string;
  futureSignals?: {
    questionsForUser?: string[];
    actionItems?: Array<{ text: string; sourceMessageRefs: string[] }>;
    suggestedReplies?: string[];
  };
};

type AssistantTask = {
  _id: string;
  conversationId: string;
  title: string;
  description?: string;
  dueAt?: string;
  status: 'suggested' | 'accepted' | 'done' | 'dismissed';
  sourceMessageRefs: string[];
  conversationName?: string;
  conversationAvatarUrl?: string | null;
  conversationType?: 'direct' | 'group';
};

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
  catchupDetailsByConversationId?: Record<string, CatchupDetail>;
  tasks?: AssistantTask[];
  taskTotal?: number;
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
  loadingTasks?: boolean;
  loadingItems: Set<string>;
  pendingTaskCount?: number;
  onClose: () => void;
  onTabChange: (tab: AiBoxTab) => void;
  onSummarize: (conversationId: string) => void;
  onRegenerate: (conversationId: string) => void;
  onCreateTask?: (
    conversationId: string,
    actionItem: { text: string; sourceMessageRefs: string[] },
    digestId?: string,
  ) => void;
  onCompleteTask?: (taskId: string) => void;
  onDismissTask?: (taskId: string) => void;
  onAcceptTask?: (taskId: string) => void;
  onUseSuggestedReply?: (conversationId: string, reply: string) => void;
  onOpenChat: (conversationId: string) => void;
  onLoadMore?: () => void;
  onLoadMoreTasks?: () => void;
}

export function AiAssistantBox({
  isOpen,
  activeTab,
  conversations,
  catchupDetailsByConversationId = {},
  tasks = [],
  taskTotal = 0,
  items,
  total,
  loadingList,
  loadingTasks = false,
  loadingItems,
  pendingTaskCount = 0,
  onClose,
  onTabChange,
  onSummarize,
  onRegenerate,
  onCreateTask = () => {},
  onCompleteTask = () => {},
  onDismissTask = () => {},
  onAcceptTask = () => {},
  onUseSuggestedReply = () => {},
  onOpenChat,
  onLoadMore,
  onLoadMoreTasks,
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
          <button
            type="button"
            onClick={() => onTabChange('tasks')}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'tasks'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Tasks
            {pendingTaskCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                {pendingTaskCount > 9 ? '9+' : pendingTaskCount}
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
              catchupDetailsByConversationId={catchupDetailsByConversationId}
              total={total}
              loadingList={loadingList}
              loadingItems={loadingItems}
              onSummarize={onSummarize}
              onRegenerate={onRegenerate}
              onCreateTask={onCreateTask}
              onUseSuggestedReply={onUseSuggestedReply}
              onOpenChat={onOpenChat}
              onLoadMore={onLoadMore}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksTab
              tasks={tasks}
              total={taskTotal}
              loadingTasks={loadingTasks}
              onCompleteTask={onCompleteTask}
              onDismissTask={onDismissTask}
              onAcceptTask={onAcceptTask}
              onOpenChat={onOpenChat}
              onLoadMore={onLoadMoreTasks}
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
  catchupDetailsByConversationId = {},
  total,
  loadingList,
  loadingItems,
  onSummarize,
  onRegenerate,
  onCreateTask,
  onUseSuggestedReply,
  onOpenChat,
  onLoadMore,
}: {
  conversations: CatchupConversation[];
  catchupDetailsByConversationId?: Record<string, CatchupDetail>;
  total: number;
  loadingList: boolean;
  loadingItems: Set<string>;
  onSummarize: (id: string) => void;
  onRegenerate: (id: string) => void;
  onCreateTask: (
    conversationId: string,
    actionItem: { text: string; sourceMessageRefs: string[] },
    digestId?: string,
  ) => void;
  onUseSuggestedReply: (conversationId: string, reply: string) => void;
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
        const isProcessing = conv.aiStatus === 'queued' || conv.aiStatus === 'processing';
        const isLoading = isProcessing || loadingItems.has(conv.conversationId) || loadingItems.has(conv.aiItemId ?? '');
        const isReady = conv.aiStatus === 'ready';
        const catchupMode = conv.aiMetadata?.catchupMode ?? (conv.unreadCount > 0 ? 'unread' : 'recent');
        const latestMessageAt = conv.aiMetadata?.latestMessageAt ?? conv.updatedAt;
        const lastDigestAt = conv.aiMetadata?.lastDigestAt;
        const detail = catchupDetailsByConversationId[conv.conversationId];
        const actionItems = Array.from(
          new Map((detail?.futureSignals?.actionItems ?? []).map((item) => [item.text, item])).values(),
        );
        const suggestedReplies = Array.from(new Set(detail?.futureSignals?.suggestedReplies ?? []));

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

            {isReady && actionItems.length > 0 && (
              <div className="mt-3 space-y-2 rounded-lg border border-sky-200 bg-sky-50/80 p-3 dark:border-sky-800 dark:bg-sky-950/30">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                  <Bell className="h-3.5 w-3.5" aria-hidden />
                  Action items
                </div>
                {actionItems.slice(0, 3).map((actionItem, index) => (
                  <div key={`${actionItem.text}-${index}`} className="flex items-start gap-2 rounded-md bg-white/80 p-2 dark:bg-sky-950/40">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
                    <p className="min-w-0 flex-1 text-xs font-medium leading-relaxed text-sky-950 dark:text-sky-100">
                      {actionItem.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => onCreateTask(conv.conversationId, actionItem, detail?._id)}
                      className="shrink-0 rounded-md border border-sky-300 bg-sky-100 px-2 py-1 text-[11px] font-bold text-sky-800 transition hover:bg-sky-200 dark:border-sky-700 dark:bg-sky-900 dark:text-sky-100"
                    >
                      Nhắc tôi
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isReady && suggestedReplies.length > 0 && (
              <div className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/90 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                  <Reply className="h-3.5 w-3.5" aria-hidden />
                  Suggested replies
                </div>
                {suggestedReplies.slice(0, 2).map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => onUseSuggestedReply(conv.conversationId, reply)}
                    className="block w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-left text-xs font-semibold leading-relaxed text-emerald-950 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-50 dark:hover:bg-emerald-900"
                  >
                    {reply}
                  </button>
                ))}
              </div>
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
                  {isProcessing ? 'Đang tóm tắt' : conv.aiStatus === 'failed' ? 'Thử lại' : 'Tóm tắt'}
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

function TasksTab({
  tasks,
  total,
  loadingTasks,
  onAcceptTask,
  onCompleteTask,
  onDismissTask,
  onOpenChat,
  onLoadMore,
}: {
  tasks: AssistantTask[];
  total: number;
  loadingTasks: boolean;
  onAcceptTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onDismissTask: (taskId: string) => void;
  onOpenChat: (conversationId: string) => void;
  onLoadMore?: () => void;
}) {
  if (loadingTasks && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden />
        <p className="mt-3 text-sm text-text-secondary">Đang tải...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Bell className="h-14 w-14 text-text-tertiary" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-text-primary">Không có task đang mở</p>
        <p className="mt-1 text-center text-xs text-text-secondary">
          Action item từ Catch-up sẽ xuất hiện ở đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task._id}
          className="rounded-2xl border border-border bg-[var(--surface-card)] p-4 transition hover:border-border-strong"
        >
          <div className="flex items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              task.status === 'suggested'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
            }`}>
              {task.status === 'suggested' ? (
                <Bell className="h-4 w-4" aria-hidden />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-text-primary">{task.title}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  task.status === 'suggested'
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                }`}>
                  {task.status === 'suggested' ? 'Suggested' : 'Reminder'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
                <span>{task.conversationName ?? 'Cuộc trò chuyện'}</span>
                {task.dueAt && (
                  <>
                    <span>·</span>
                    <span>{formatDueLabel(task.dueAt)}</span>
                  </>
                )}
              </div>
              {task.description && (
                <p className="mt-2 line-clamp-2 text-xs text-text-secondary">{task.description}</p>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {task.status === 'suggested' ? (
              <button
                type="button"
                onClick={() => onAcceptTask(task._id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700"
              >
                <Bell className="h-3 w-3" aria-hidden />
                Nhắc tôi
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCompleteTask(task._id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                <Check className="h-3 w-3" aria-hidden />
                Xong
              </button>
            )}
            <button
              type="button"
              onClick={() => onDismissTask(task._id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[var(--surface-glass)] px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-[var(--surface-glass-strong)]"
            >
              <Trash2 className="h-3 w-3" aria-hidden />
              Bỏ qua
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => onOpenChat(task.conversationId)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[var(--surface-glass)] px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-[var(--surface-glass-strong)]"
            >
              Mở chat
            </button>
          </div>
        </div>
      ))}

      {tasks.length < total && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingTasks}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-[var(--surface-glass)] px-4 py-3 text-sm font-medium text-text-secondary transition hover:bg-[var(--surface-glass-strong)] disabled:opacity-50"
        >
          {loadingTasks ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Tải thêm ({tasks.length}/{total})
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

function formatDueLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) return '';
  return `Hạn ${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
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
