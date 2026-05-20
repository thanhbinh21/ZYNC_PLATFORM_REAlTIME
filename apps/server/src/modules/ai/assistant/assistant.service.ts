import { createHash } from 'crypto';
import { Types } from 'mongoose';
import { getRedis } from '../../../infrastructure/redis';
import { KAFKA_TOPICS, produceMessage } from '../../../infrastructure/kafka';
import { logger } from '../../../shared/logger';
import { BadRequestError, ForbiddenError, NotFoundError, TooManyRequestsError } from '../../../shared/errors';
import { ConversationMemberModel } from '../../conversations/conversation-member.model';
import { MessageModel } from '../../messages/message.model';
import { MessageStatusModel } from '../../messages/message-status.model';
import { ConversationModel } from '../../conversations/conversation.model';
import { UserModel } from '../../users/user.model';
import { emitAiAssistantItemUpdated } from '../../../socket/gateway';
import {
  AiAssistantItemModel,
  type IAiAssistantItem,
  type AiItemType,
  type AiItemStatus,
} from './assistant.model';
import {
  AiCatchupDigestModel,
  type IAiCatchupDigest,
  type AiCatchupMode,
} from '../catchup/catchup.model';
import type { CreateCatchupDigestInput } from './assistant.schema';

// Reuse logic from catchup service for snapshot creation
const DEBOUNCE_SECONDS = parseInt(process.env['AI_CATCHUP_DEBOUNCE_SECONDS'] ?? '45', 10);
const SNAPSHOT_LOOKBACK_LIMIT = 300;
const RECENT_SNAPSHOT_LIMIT = Math.min(
  50,
  Math.max(20, parseInt(process.env['AI_CATCHUP_RECENT_LIMIT'] ?? '30', 10)),
);
const staleAssistantJobSeconds = parseInt(process.env['AI_ASSISTANT_STALE_JOB_SECONDS'] ?? '180', 10);
const STALE_ASSISTANT_JOB_MS = (
  Number.isFinite(staleAssistantJobSeconds)
    ? Math.max(30, staleAssistantJobSeconds)
    : 180
) * 1000;

type CatchupMember = {
  conversationId: string;
  userId: string;
  unreadCount?: number;
  lastVisibleMessageRef?: string;
  aiPreferences?: {
    catchupEnabled?: boolean;
    smartSearchEnabled?: boolean;
  };
};

type CatchupConversation = {
  _id: unknown;
  type?: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  unreadCounts?: unknown;
  lastMessage?: {
    sentAt?: Date | string | null;
  };
  updatedAt?: Date | string;
};

type CatchupUser = {
  _id: unknown;
  displayName?: string;
  avatarUrl?: string;
};

type CatchupMessageRef = {
  _id: unknown;
  idempotencyKey?: string;
  createdAt: Date;
};

type CatchupSnapshot = {
  mode: AiCatchupMode;
  messageRefs: string[];
  fromMessageRef: string;
  toMessageRef: string;
  messageCount: number;
  omittedOlderCount: number;
};

// ─── Serializers ───────────────────────────────────────────────────────────────

function serializeItem(item: IAiAssistantItem): Record<string, unknown> {
  return {
    _id: String(item._id),
    userId: item.userId,
    type: item.type,
    conversationId: item.conversationId,
    refId: item.refId,
    status: item.status,
    title: item.title,
    summarySnippet: item.summarySnippet,
    metadata: item.metadata,
    trigger: item.trigger,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// ─── Rate limit / Debounce ────────────────────────────────────────────────────

async function checkDebounce(userId: string, conversationId: string): Promise<void> {
  const redis = getRedis();
  const key = `ai:assistant:debounce:${userId}:${conversationId}`;
  const result = await redis.set(key, '1', 'EX', DEBOUNCE_SECONDS, 'NX');
  if (result !== 'OK') {
    throw new TooManyRequestsError('AI request is already queued recently');
  }
}

// ─── Membership check ────────────────────────────────────────────────────────

async function assertMembership(conversationId: string, userId: string): Promise<void> {
  const member = await ConversationMemberModel.findOne({ conversationId, userId });
  if (!member) {
    throw new ForbiddenError('Not allowed to use AI Assistant for this conversation');
  }
  if (member.aiPreferences?.catchupEnabled === false) {
    throw new ForbiddenError('AI Catch-up is disabled for this conversation');
  }
}

// ─── Conversation metadata helpers ─────────────────────────────────────────────

function getMessageRef(message: { _id: unknown; idempotencyKey?: string }): string {
  return message.idempotencyKey || String(message._id);
}

function hashParts(parts: string[]): string {
  return createHash('sha256').update(parts.join('\u001f')).digest('hex');
}

function normalizeUnreadCounts(unreadCounts: unknown): Record<string, number> {
  if (!unreadCounts) return {};
  if (unreadCounts instanceof Map) return Object.fromEntries(unreadCounts.entries());
  return unreadCounts as Record<string, number>;
}

function getUnreadCount(unreadCounts: unknown, userId: string): number {
  const value = normalizeUnreadCounts(unreadCounts)[userId];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function getMemberUnreadOverride(member?: CatchupMember): number {
  if (
    !member?.lastVisibleMessageRef
    || typeof member.unreadCount !== 'number'
    || !Number.isFinite(member.unreadCount)
  ) {
    return 0;
  }

  return Math.max(0, member.unreadCount);
}

function getDateTime(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' && value.length > 0) {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }
  return 0;
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.length > 0) {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

function buildMessageRefsQuery(refs: string[]): Record<string, unknown>[] {
  const objectIds = refs
    .filter((ref) => Types.ObjectId.isValid(ref))
    .map((ref) => new Types.ObjectId(ref));

  const clauses: Record<string, unknown>[] = [{ idempotencyKey: { $in: refs } }];
  if (objectIds.length > 0) clauses.push({ _id: { $in: objectIds } });
  return clauses;
}

function getDigestTimestamp(digest?: IAiCatchupDigest | null): string | null {
  const generatedAt = digest?.generatedAt;
  if (generatedAt instanceof Date) return generatedAt.toISOString();
  if (digest?.updatedAt instanceof Date) return digest.updatedAt.toISOString();
  if (digest?.createdAt instanceof Date) return digest.createdAt.toISOString();
  return null;
}

function visibleMessageFilter(conversationId: string, userId: string): Record<string, unknown> {
  return {
    conversationId,
    isDeleted: { $ne: true },
    deleteType: { $ne: 'recall' },
    deletedFor: { $nin: [userId] },
  };
}

async function findMessageByRef(
  conversationId: string,
  ref: string,
): Promise<CatchupMessageRef | null> {
  const clauses = buildMessageRefsQuery([ref]);
  return MessageModel.findOne({
    conversationId,
    $or: clauses,
  })
    .select('_id idempotencyKey createdAt')
    .lean<CatchupMessageRef | null>();
}

function afterMessageQuery(message: CatchupMessageRef): Record<string, unknown> {
  const objectId = Types.ObjectId.isValid(String(message._id))
    ? new Types.ObjectId(String(message._id))
    : message._id;

  return {
    $or: [
      { createdAt: { $gt: message.createdAt } },
      { createdAt: message.createdAt, _id: { $gt: objectId } },
    ],
  };
}

async function hasMessagesAfterDigest(
  conversationId: string,
  userId: string,
  digest?: IAiCatchupDigest | null,
): Promise<boolean> {
  if (!digest?.toMessageRef) return false;

  const boundary = await findMessageByRef(conversationId, digest.toMessageRef);
  if (!boundary) {
    return false;
  }

  const nextMessage = await MessageModel.exists({
    ...visibleMessageFilter(conversationId, userId),
    ...afterMessageQuery(boundary),
  });

  return Boolean(nextMessage);
}

// ─── Service Methods ──────────────────────────────────────────────────────────

export class AiAssistantService {
  /**
   * Tạo catchup digest cho một conversation.
   * 1. Tạo/verify AiAssistantItem (index)
   * 2. Tạo AiCatchupDigest (detail)
   * 3. Update AiAssistantItem.refId
   * 4. Publish Kafka job
   */
  static async createCatchupDigest(
    userId: string,
    input: CreateCatchupDigestInput,
  ): Promise<Record<string, unknown>> {
    const { conversationId } = input;
    await assertMembership(conversationId, userId);

    // ── Check existing digest (cache hit) ──────────────────────────────────────
    const runningItem = await AiAssistantItemModel.findOne({
      userId,
      type: 'catchup_digest',
      conversationId,
      status: { $in: ['queued', 'processing'] },
    }).sort({ createdAt: -1 });

    if (runningItem) {
      const reconciledRunningItem = await this._reconcileAssistantItem(runningItem);
      if (reconciledRunningItem.status === 'queued' || reconciledRunningItem.status === 'processing') {
        const detail = reconciledRunningItem.refId
          ? await AiCatchupDigestModel.findById(reconciledRunningItem.refId)
          : null;
        return {
          item: serializeItem(reconciledRunningItem),
          detail: detail ? this._serializeDigest(detail) : null,
        };
      }
    }


    // ── Create snapshot from messages (reuse from catchup service) ─────────────
    const latestReadyItem = await AiAssistantItemModel.findOne({
      userId,
      type: 'catchup_digest',
      conversationId,
      status: 'ready',
    }).sort({ createdAt: -1 });
    const latestReadyDetail = latestReadyItem?.refId
      ? await AiCatchupDigestModel.findById(latestReadyItem.refId)
      : await AiCatchupDigestModel.findOne({
        userId,
        conversationId,
        status: 'ready',
      }).sort({ createdAt: -1 });

    const { mode, messageRefs, fromMessageRef, toMessageRef, messageCount, omittedOlderCount } =
      await this._createCatchupSnapshot(userId, conversationId, input, latestReadyDetail);

    if (mode === 'recent' && latestReadyItem && latestReadyDetail) {
      return { item: serializeItem(latestReadyItem), detail: this._serializeDigest(latestReadyDetail) };
    }

    const cacheKey = hashParts([userId, conversationId, mode, fromMessageRef, toMessageRef]);

    const cachedDigest = await AiCatchupDigestModel.findOne({
      cacheKey,
      status: { $in: ['queued', 'processing', 'ready'] },
    }).sort({ createdAt: -1 });

    if (cachedDigest) {
      const cachedItem = await AiAssistantItemModel.findOne({
        userId,
        type: 'catchup_digest',
        conversationId,
        refId: String(cachedDigest._id),
      }).sort({ createdAt: -1 });

      if (cachedItem) {
        return { item: serializeItem(cachedItem), detail: this._serializeDigest(cachedDigest) };
      }

      const item = await AiAssistantItemModel.create({
        userId,
        type: 'catchup_digest',
        conversationId,
        refId: String(cachedDigest._id),
        status: cachedDigest.status,
        title: cachedDigest.summary?.title ?? 'Tóm tắt hội thoại',
        summarySnippet: cachedDigest.summary?.overview?.slice(0, 200),
        metadata: {
          unreadCount: cachedDigest.messageCount,
          messageCount: cachedDigest.messageCount,
          catchupMode: cachedDigest.catchupMode ?? mode,
          lastDigestAt: getDigestTimestamp(cachedDigest) ?? undefined,
        },
        trigger: input.trigger ?? 'manual',
      });
      return { item: serializeItem(item), detail: this._serializeDigest(cachedDigest) };
    }

    await checkDebounce(userId, conversationId);

    // Check failed digest for regeneration
    const failedItem = await AiAssistantItemModel.findOne({
      userId,
      type: 'catchup_digest',
      conversationId,
      status: 'failed',
    }).sort({ createdAt: -1 });

    if (failedItem) {
      // Regenerate: update existing item + detail
      return this._regenerateItem(userId, failedItem, {
        messageRefs,
        fromMessageRef,
        toMessageRef,
        messageCount,
        omittedOlderCount,
        cacheKey,
        mode,
        trigger: input.trigger,
      });
    }

    // ── Create new AiAssistantItem + AiCatchupDigest ────────────────────────
    const digest = await AiCatchupDigestModel.create({
      userId,
      conversationId,
      cacheKey,
      fromMessageRef,
      toMessageRef,
      messageRefs,
      messageCount,
      omittedOlderCount,
      catchupMode: mode,
      trigger: input.trigger ?? 'manual',
      status: 'queued',
      inputHash: hashParts([mode, ...messageRefs]),
    });

    const conv = await AiAssistantItemModel.findOne({ userId, type: 'catchup_digest', conversationId });
    const title = conv?.title || 'Tóm tắt hội thoại';

    const item = await AiAssistantItemModel.create({
      userId,
      type: 'catchup_digest',
      conversationId,
      refId: String(digest._id),
      status: 'queued',
      title,
      metadata: {
        unreadCount: messageCount,
        messageCount,
        catchupMode: mode,
        latestMessageAt: new Date().toISOString(),
        lastDigestAt: getDigestTimestamp(latestReadyDetail) ?? undefined,
      },
      trigger: input.trigger ?? 'manual',
    });

    // Publish Kafka job
    await this._publishJob(item, digest);

    return { item: serializeItem(item), detail: this._serializeDigest(digest) };
  }

  /**
   * Lấy danh sách conversations có tin chưa đọc cho AI Box.
   * Gộp với AI item đã có (nếu có) để UI hiển thị đúng trạng thái.
   */
  static async getUnreadConversations(
    userId: string,
    options: { limit?: number; skip?: number } = {},
  ): Promise<{ conversations: Array<Record<string, unknown>>; total: number }> {
    const limit = options.limit ?? 20;
    const skip = options.skip ?? 0;

    // Lấy tất cả conversation members của user, có unread
    const memberships = await ConversationMemberModel.find({ userId })
      .select('conversationId userId unreadCount lastVisibleMessageRef aiPreferences')
      .lean<CatchupMember[]>();

    const enabledMemberships = memberships.filter((member) => member.aiPreferences?.catchupEnabled !== false);

    if (enabledMemberships.length === 0) {
      return { conversations: [], total: 0 };
    }

    // Lấy conversationIds
    const memberByConversationId = new Map(
      enabledMemberships.map((member) => [String(member.conversationId), member]),
    );
    const conversationIds = Array.from(memberByConversationId.keys());

    const unreadConversationDocs = await ConversationModel.find({
      _id: { $in: conversationIds },
    })
      .select('_id type name avatarUrl unreadCounts lastMessage updatedAt')
      .lean<CatchupConversation[]>();

    const sortedUnreadConversations = unreadConversationDocs
      .map((conversation) => {
        const conversationId = String(conversation._id);
        const member = memberByConversationId.get(conversationId);
        const unreadCount = Math.max(
          getUnreadCount(conversation.unreadCounts, userId),
          getMemberUnreadOverride(member),
        );
        const latestMessageAt = conversation.lastMessage?.sentAt ?? conversation.updatedAt;

        return {
          conversation,
          conversationId,
          unreadCount,
          latestMessageAt,
          sortAt: getDateTime(latestMessageAt),
        };
      })
      .filter((entry) => entry.sortAt > 0)
      .sort((a, b) => {
        if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
        return b.sortAt - a.sortAt;
      });

    const total = sortedUnreadConversations.length;
    const pageConversations = sortedUnreadConversations.slice(skip, skip + limit);

    if (pageConversations.length === 0) {
      return { conversations: [], total };
    }

    const pageConversationIds = pageConversations.map((entry) => entry.conversationId);

    // Lấy AI items đã có cho các conversations này
    const [aiItemDocs, pageMembers] = await Promise.all([
      AiAssistantItemModel.find({
        userId,
        type: 'catchup_digest',
        conversationId: { $in: pageConversationIds },
      }).sort({ createdAt: -1 }),
      ConversationMemberModel.find({ conversationId: { $in: pageConversationIds } })
        .select('conversationId userId')
        .lean<CatchupMember[]>(),
    ]);
    const aiItems = await Promise.all(
      aiItemDocs.map((item) => this._reconcileAssistantItem(item)),
    );

    const membersByConversationId = new Map<string, CatchupMember[]>();
    pageMembers.forEach((member) => {
      const conversationId = String(member.conversationId);
      const existing = membersByConversationId.get(conversationId) ?? [];
      existing.push(member);
      membersByConversationId.set(conversationId, existing);
    });

    const directPeerIds = Array.from(new Set(
      pageConversations
        .filter((entry) => entry.conversation.type !== 'group')
        .flatMap((entry) => membersByConversationId.get(entry.conversationId) ?? [])
        .map((member) => String(member.userId))
        .filter((memberUserId) => memberUserId !== userId),
    ));

    const users = directPeerIds.length > 0
      ? await UserModel.find({ _id: { $in: directPeerIds } })
        .select('displayName avatarUrl')
        .lean<CatchupUser[]>()
      : [];

    const userById = new Map(users.map((user) => [String(user._id), user]));

    // Map AI item theo conversationId
    const aiItemByConv = new Map<string, typeof aiItems[0]>();
    aiItems.forEach((item) => {
      if (item.conversationId) {
        const existing = aiItemByConv.get(item.conversationId);
        if (!existing || item.createdAt > existing.createdAt) {
          aiItemByConv.set(item.conversationId, item);
        }
      }
    });

    const digestIds = Array.from(new Set(
      aiItems
        .map((item) => item.refId)
        .filter((refId): refId is string => typeof refId === 'string' && refId.length > 0),
    ));
    const digestDocs = digestIds.length > 0
      ? await AiCatchupDigestModel.find({ _id: { $in: digestIds } }).lean<IAiCatchupDigest[]>()
      : [];
    const digestById = new Map(digestDocs.map((digest) => [String(digest._id), digest]));

    const conversations = await Promise.all(
      pageConversations.map(async (entry) => {
        const aiItem = aiItemByConv.get(entry.conversationId);
        const digest = aiItem?.refId ? digestById.get(String(aiItem.refId)) : null;
        const lastDigestAt = getDigestTimestamp(digest);
        const hasNewAfterDigest = entry.unreadCount === 0
          ? await hasMessagesAfterDigest(entry.conversationId, userId, digest)
          : false;
        const catchupMode: AiCatchupMode = entry.unreadCount > 0
          ? 'unread'
          : hasNewAfterDigest
            ? 'since_last_digest'
            : 'recent';
        const conversationMembers = membersByConversationId.get(entry.conversationId) ?? [];
        const peerMember = conversationMembers.find((member) => String(member.userId) !== userId);
        const peerUser = peerMember ? userById.get(String(peerMember.userId)) : undefined;
        const isGroup = entry.conversation.type === 'group';

        return {
          conversationId: entry.conversationId,
          name: isGroup
            ? entry.conversation.name ?? 'Nhóm'
            : peerUser?.displayName ?? entry.conversation.name ?? 'Cuộc trò chuyện',
          avatarUrl: isGroup
            ? entry.conversation.avatarUrl ?? null
            : peerUser?.avatarUrl ?? entry.conversation.avatarUrl ?? null,
          type: isGroup ? 'group' : 'direct',
          unreadCount: entry.unreadCount,
          updatedAt: toIsoString(entry.latestMessageAt),
          // AI state: not_started nếu chưa có digest, ngược lại lấy từ AI item
          aiStatus: aiItem ? aiItem.status : 'not_started',
          aiItemId: aiItem ? String(aiItem._id) : null,
          aiItemRefId: aiItem?.refId ?? null,
          aiTitle: aiItem?.title ?? null,
          aiSummarySnippet: aiItem?.summarySnippet ?? null,
          aiMetadata: {
            ...(aiItem?.metadata ?? {}),
            unreadCount: entry.unreadCount,
            latestMessageAt: toIsoString(entry.latestMessageAt),
            lastDigestAt: lastDigestAt ?? undefined,
            catchupMode,
          },
        };
      }),
    );
    return { conversations, total };
  }

  /**
   * Lấy danh sách items cho AI Box feed.
   * Chỉ load index, không load detail.
   */
  static async getItemList(
    userId: string,
    options: {
      type?: AiItemType;
      conversationId?: string;
      limit?: number;
      skip?: number;
    },
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const query: Record<string, unknown> = { userId };
    if (options.type) query.type = options.type;
    if (options.conversationId) query.conversationId = options.conversationId;

    const [items, total] = await Promise.all([
      AiAssistantItemModel.find(query)
        .sort({ updatedAt: -1 })
        .skip(options.skip ?? 0)
        .limit(options.limit ?? 10)
        .lean(),
      AiAssistantItemModel.countDocuments(query),
    ]);

    return { items: items.map((item) => serializeItem(item as unknown as IAiAssistantItem)), total };
  }

  /**
   * Lấy digest mới nhất của một conversation (item + detail merged).
   */
  static async getCatchupLatest(
    userId: string,
    conversationId: string,
  ): Promise<{ item: Record<string, unknown>; detail: Record<string, unknown> } | null> {
    await assertMembership(conversationId, userId);

    const item = await AiAssistantItemModel.findOne({
      userId,
      type: 'catchup_digest',
      conversationId,
    }).sort({ createdAt: -1 });

    if (!item) return null;

    const detail = item.refId
      ? await AiCatchupDigestModel.findById(item.refId)
      : null;

    return { item: serializeItem(item as unknown as IAiAssistantItem), detail: detail ? this._serializeDigest(detail) : null as unknown as Record<string, unknown> };
  }

  /**
   * Regenerate digest cho một conversation.
   */
  static async regenerateCatchup(
    userId: string,
    conversationId: string,
  ): Promise<Record<string, unknown>> {
    await assertMembership(conversationId, userId);

    const existingItem = await AiAssistantItemModel.findOne({
      userId,
      type: 'catchup_digest',
      conversationId,
    }).sort({ createdAt: -1 });

    if (!existingItem) {
      throw new NotFoundError('No digest found to regenerate');
    }

    const detail = existingItem.refId
      ? await AiCatchupDigestModel.findById(existingItem.refId)
      : null;
    const snapshot = await this._createCatchupSnapshot(userId, conversationId, {}, detail);
    const cacheKey = hashParts([userId, conversationId, snapshot.mode, snapshot.fromMessageRef, snapshot.toMessageRef]);

    const updated = await this._regenerateItem(userId, existingItem, {
      messageRefs: snapshot.messageRefs,
      fromMessageRef: snapshot.fromMessageRef,
      toMessageRef: snapshot.toMessageRef,
      messageCount: snapshot.messageCount,
      omittedOlderCount: snapshot.omittedOlderCount,
      cacheKey,
      mode: snapshot.mode,
      trigger: 'manual',
    });

    return updated;
  }

  /**
   * Cập nhật settings cho một conversation.
   */
  static async updateSettings(
    userId: string,
    conversationId: string,
    catchupEnabled: boolean,
  ): Promise<{ catchupEnabled: boolean }> {
    const member = await ConversationMemberModel.findOneAndUpdate(
      { conversationId, userId },
      { $set: { 'aiPreferences.catchupEnabled': catchupEnabled } },
      { new: true },
    ).select('aiPreferences');

    if (!member) {
      throw new ForbiddenError('Not allowed to update settings for this conversation');
    }

    return { catchupEnabled: member.aiPreferences?.catchupEnabled !== false };
  }

  // ── Worker helpers ──────────────────────────────────────────────────────────

  static async updateItemStatus(
    itemId: string,
    status: AiItemStatus,
    extra?: Partial<IAiAssistantItem>,
  ): Promise<IAiAssistantItem | null> {
    return AiAssistantItemModel.findByIdAndUpdate(
      itemId,
      { $set: { status, ...extra } },
      { new: true },
    );
  }

  static async updateItemWithDetail(
    itemId: string,
    detail: IAiCatchupDigest,
    extra?: Partial<IAiAssistantItem>,
  ): Promise<IAiAssistantItem | null> {
    const title = detail.summary?.title ?? 'Tóm tắt hội thoại';
    const summarySnippet = detail.summary?.overview?.slice(0, 200);

    return AiAssistantItemModel.findByIdAndUpdate(
      itemId,
      {
        $set: {
          status: detail.status,
          title,
          summarySnippet,
          refId: String(detail._id),
          metadata: {
            messageCount: detail.messageCount,
            unreadCount: detail.messageCount,
            latestMessageAt: detail.generatedAt?.toISOString() ?? new Date().toISOString(),
            lastDigestAt: detail.generatedAt?.toISOString() ?? detail.updatedAt?.toISOString(),
            catchupMode: detail.catchupMode,
            actionItemCount: detail.futureSignals?.actionItems?.length ?? 0,
          },
          ...extra,
        },
      },
      { new: true },
    );
  }

  static emitSocket(userId: string, payload: Record<string, unknown>): void {
    emitAiAssistantItemUpdated(userId, payload);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private static async _reconcileAssistantItem(item: IAiAssistantItem): Promise<IAiAssistantItem> {
    if (item.status !== 'queued' && item.status !== 'processing') {
      return item;
    }

    const updatedAtTime = getDateTime(item.updatedAt);
    const isStale = updatedAtTime === 0 || Date.now() - updatedAtTime > STALE_ASSISTANT_JOB_MS;
    const digest = item.refId
      ? await AiCatchupDigestModel.findById(item.refId)
      : null;

    if (digest?.status === 'ready' && digest.summary) {
      return await this.updateItemWithDetail(String(item._id), digest) ?? item;
    }

    if (digest?.status === 'processing' && item.status !== 'processing') {
      return await this.updateItemStatus(String(item._id), 'processing', { title: item.title }) ?? item;
    }

    if (digest?.status === 'failed') {
      return await this.updateItemStatus(String(item._id), 'failed', {
        title: digest.summary?.title ?? item.title,
      }) ?? item;
    }

    if (!isStale) {
      return item;
    }

    logger.warn('[AI Assistant] Marking stale job as failed', {
      itemId: String(item._id),
      digestId: item.refId,
      status: item.status,
      updatedAt: item.updatedAt?.toISOString(),
    });

    if (digest && (digest.status === 'queued' || digest.status === 'processing')) {
      digest.status = 'failed';
      digest.error = 'AI Assistant job timed out before completion';
      await digest.save();
    }

    return await this.updateItemStatus(String(item._id), 'failed', { title: item.title }) ?? item;
  }

  private static _serializeDigest(digest: IAiCatchupDigest): Record<string, unknown> {
    return {
      _id: String(digest._id),
      userId: digest.userId,
      conversationId: digest.conversationId,
      cacheKey: digest.cacheKey,
      fromMessageRef: digest.fromMessageRef,
      toMessageRef: digest.toMessageRef,
      messageRefs: digest.messageRefs,
      messageCount: digest.messageCount,
      omittedOlderCount: digest.omittedOlderCount,
      catchupMode: digest.catchupMode,
      trigger: digest.trigger,
      status: digest.status,
      summary: digest.summary,
      futureSignals: digest.futureSignals,
      model: digest.get('model') as string | undefined,
      inputHash: digest.inputHash,
      error: digest.error,
      generatedAt: digest.generatedAt?.toISOString(),
      createdAt: digest.createdAt.toISOString(),
      updatedAt: digest.updatedAt.toISOString(),
    };
  }

  private static async _createCatchupSnapshot(
    userId: string,
    conversationId: string,
    _input: { unreadCountHint?: number; toMessageRef?: string },
    latestDigest?: IAiCatchupDigest | null,
  ): Promise<CatchupSnapshot> {
    const member = await ConversationMemberModel.findOne({ conversationId, userId });
    if (!member) throw new NotFoundError('Conversation not found');

    const conv = await ConversationModel.findById(conversationId).select('unreadCounts').lean();
    if (!conv) throw new NotFoundError('Conversation not found');

    const baseFilter = visibleMessageFilter(conversationId, userId);
    const unreadCount = Math.max(
      getUnreadCount(conv.unreadCounts, userId),
      getMemberUnreadOverride(member as unknown as CatchupMember),
    );

    const recentMessages = await MessageModel.find({
      ...baseFilter,
      senderId: { $ne: userId },
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(SNAPSHOT_LOOKBACK_LIMIT)
      .select('_id idempotencyKey createdAt')
      .lean<CatchupMessageRef[]>();

    const messageIds = recentMessages.map((message) => String(message._id));
    const idempotencyKeys = recentMessages
      .map((message) => message.idempotencyKey)
      .filter(Boolean) as string[];
    const statuses = await MessageStatusModel.find({
      userId,
      $or: [
        { messageId: { $in: messageIds } },
        { idempotencyKey: { $in: idempotencyKeys } },
      ],
    }).select('messageId idempotencyKey status').lean();

    const readRefs = new Set<string>();
    statuses
      .filter((status) => status.status === 'read')
      .forEach((status) => {
        if (status.messageId) readRefs.add(String(status.messageId));
        if (status.idempotencyKey) readRefs.add(status.idempotencyKey);
      });

    const unreadMessages = recentMessages.filter(
      (message) => !readRefs.has(String(message._id)) && !readRefs.has(message.idempotencyKey ?? ''),
    );

    if (unreadMessages.length > 0) {
      const targetUnreadCount = unreadCount > 0
        ? Math.min(unreadCount, unreadMessages.length)
        : unreadMessages.length;
      const selected = unreadMessages
        .slice(0, targetUnreadCount)
        .reverse();
      const messageRefs = selected.map(getMessageRef);
      return {
        mode: 'unread',
        messageRefs,
        fromMessageRef: messageRefs[0],
        toMessageRef: messageRefs[messageRefs.length - 1],
        messageCount: messageRefs.length,
        omittedOlderCount: Math.max(0, unreadMessages.length - selected.length),
      };
    }

    if (latestDigest?.toMessageRef) {
      const boundary = await findMessageByRef(conversationId, latestDigest.toMessageRef);
      if (boundary) {
        const messagesAfterDigest = await MessageModel.find({
          ...baseFilter,
          ...afterMessageQuery(boundary),
        })
          .sort({ createdAt: 1, _id: 1 })
          .limit(SNAPSHOT_LOOKBACK_LIMIT)
          .select('_id idempotencyKey createdAt')
          .lean<CatchupMessageRef[]>();

        if (messagesAfterDigest.length > 0) {
          const messageRefs = messagesAfterDigest.map(getMessageRef);
          return {
            mode: 'since_last_digest',
            messageRefs,
            fromMessageRef: messageRefs[0],
            toMessageRef: messageRefs[messageRefs.length - 1],
            messageCount: messageRefs.length,
            omittedOlderCount: 0,
          };
        }
      }
    }

    const latestVisibleMessages = await MessageModel.find(baseFilter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(RECENT_SNAPSHOT_LIMIT)
      .select('_id idempotencyKey createdAt')
      .lean<CatchupMessageRef[]>();

    if (latestVisibleMessages.length === 0) throw new BadRequestError('No visible messages');

    const selected = latestVisibleMessages.reverse();
    const messageRefs = selected.map(getMessageRef);
    return {
      mode: 'recent',
      messageRefs,
      fromMessageRef: messageRefs[0],
      toMessageRef: messageRefs[messageRefs.length - 1],
      messageCount: messageRefs.length,
      omittedOlderCount: 0,
    };
  }

  private static async _regenerateItem(
    userId: string,
    item: IAiAssistantItem,
    snapshot: {
      messageRefs: string[];
      fromMessageRef: string;
      toMessageRef: string;
      messageCount: number;
      omittedOlderCount: number;
      cacheKey: string;
      mode: AiCatchupMode;
      trigger: string;
    },
  ): Promise<Record<string, unknown>> {
    item.status = 'queued';
    item.trigger = snapshot.trigger as 'manual' | 'auto';
    item.refId = undefined;
    await item.save();

    const digest = await AiCatchupDigestModel.create({
      userId,
      conversationId: item.conversationId,
      cacheKey: snapshot.cacheKey,
      fromMessageRef: snapshot.fromMessageRef,
      toMessageRef: snapshot.toMessageRef,
      messageRefs: snapshot.messageRefs,
      messageCount: snapshot.messageCount,
      omittedOlderCount: snapshot.omittedOlderCount,
      catchupMode: snapshot.mode,
      trigger: snapshot.trigger as 'manual' | 'auto_suggested',
      status: 'queued',
      inputHash: hashParts([snapshot.mode, ...snapshot.messageRefs]),
    });

    item.refId = String(digest._id);
    item.metadata = {
      ...(item.metadata ?? {}),
      messageCount: snapshot.messageCount,
      unreadCount: snapshot.messageCount,
      catchupMode: snapshot.mode,
    };
    await item.save();

    await this._publishJob(item, digest);

    return { item: serializeItem(item), detail: this._serializeDigest(digest) };
  }

  private static async _publishJob(item: IAiAssistantItem, digest: IAiCatchupDigest): Promise<void> {
    const topic = KAFKA_TOPICS.AI_CATCHUP_JOBS;
    try {
      await produceMessage(topic, String(item._id), {
        itemId: String(item._id),
        digestId: String(digest._id),
        userId: item.userId,
        conversationId: item.conversationId!,
        type: 'catchup_digest',
        requestedAt: new Date().toISOString(),
      });
      emitAiAssistantItemUpdated(item.userId, {
        itemId: String(item._id),
        type: item.type,
        conversationId: item.conversationId,
        status: 'queued',
        title: item.title,
        metadata: item.metadata,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('[AI Assistant] Failed to publish Kafka job', { err: String(err) });
      digest.status = 'failed';
      digest.error = 'Failed to queue job';
      await digest.save();
      item.status = 'failed';
      await item.save();
      emitAiAssistantItemUpdated(item.userId, {
        itemId: String(item._id),
        type: item.type,
        conversationId: item.conversationId,
        status: 'failed',
        title: item.title,
        metadata: item.metadata,
        error: 'Failed to queue job',
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
