import type { AiAssistantItem, AiCatchupDigest } from '@zync/shared-types';
import { apiClient } from './api';

interface ApiDataResponse<T> {
  success: boolean;
  data: T;
}

export interface ConversationWithAiDigest {
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

interface CreateCatchupInput {
  conversationId: string;
  trigger?: 'manual' | 'auto';
  unreadCountHint?: number;
  toMessageRef?: string;
}

export interface CatchupResponse {
  item: AiAssistantItem;
  detail: AiCatchupDigest | null;
}

/** Lấy conversations có tin chưa đọc + AI state (Phase 1) */
export async function getUnreadConversations(options: {
  limit?: number;
  skip?: number;
} = {}): Promise<{ conversations: ConversationWithAiDigest[]; total: number }> {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.skip !== undefined) params.set('skip', String(options.skip));

  const { data } = await apiClient.get<ApiDataResponse<{ conversations: ConversationWithAiDigest[]; total: number }>>(
    `/api/ai/assistant/catchup/unread-conversations?${params.toString()}`,
  );
  return data.data;
}

/** Lấy danh sách AI items cho AI Box feed (chỉ index, không load detail) */
export async function getAiAssistantList(options: {
  type?: 'catchup_digest';
  conversationId?: string;
  limit?: number;
  skip?: number;
} = {}): Promise<{ items: AiAssistantItem[]; total: number }> {
  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.conversationId) params.set('conversationId', options.conversationId);
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.skip !== undefined) params.set('skip', String(options.skip));

  const query = params.toString();
  const { data } = await apiClient.get<ApiDataResponse<{ items: AiAssistantItem[]; total: number }>>(
    `/api/ai/assistant${query ? `?${query}` : ''}`,
  );
  return data.data;
}

/** Tạo catchup digest cho một conversation */
export async function createCatchupDigest(input: CreateCatchupInput): Promise<CatchupResponse> {
  const { data } = await apiClient.post<ApiDataResponse<CatchupResponse>>(
    '/api/ai/assistant/catchup',
    input,
  );
  return data.data;
}

/** Lấy digest mới nhất của một conversation (item + detail) */
export async function getCatchupLatest(
  conversationId: string,
): Promise<CatchupResponse | null> {
  const { data } = await apiClient.get<ApiDataResponse<CatchupResponse | null>>(
    `/api/ai/assistant/catchup/${conversationId}`,
  );
  return data.data;
}

/** Tạo lại digest cho một conversation */
export async function regenerateCatchup(conversationId: string): Promise<CatchupResponse> {
  const { data } = await apiClient.post<ApiDataResponse<CatchupResponse>>(
    `/api/ai/assistant/catchup/${conversationId}/regenerate`,
  );
  return data.data;
}

/** Cập nhật settings AI cho một conversation */
export async function updateAssistantSettings(
  conversationId: string,
  catchupEnabled: boolean,
): Promise<{ catchupEnabled: boolean }> {
  const { data } = await apiClient.patch<ApiDataResponse<{ catchupEnabled: boolean }>>(
    `/api/ai/assistant/conversations/${conversationId}/settings`,
    { catchupEnabled },
  );
  return data.data;
}
