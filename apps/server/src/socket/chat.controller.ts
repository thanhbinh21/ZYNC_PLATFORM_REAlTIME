/**
 * ChatController – Socket Sub-controller cho tất cả chat events
 * Tách ra từ gateway.ts (Phase 1 Refactoring)
 *
 * Events quản lý:
 *  - send_message
 *  - message_read
 *  - message_delivered
 *  - delete_message_for_me
 *  - recall_message
 *  - forward_message
 */

import { type Server, type Socket } from 'socket.io';
import { Types } from 'mongoose';
import { MessagesService } from '../modules/messages/messages.service';
import { MessageModel, MessageType } from '../modules/messages/message.model';
import { ConversationMemberModel } from '../modules/conversations/conversation-member.model';
import { UserModel } from '../modules/users/user.model';
import { stickerService } from '../modules/stickers/sticker.service';
import { produceNotificationEvent } from '../modules/notifications/notifications.service';
import { checkMessageRateLimit } from '../infrastructure/redis';
import { runKeywordFilter } from '../modules/ai/moderation/keyword-filter';
import {
  PENALTY_BLOCK_PERCENT,
  PENALTY_WARNING_PERCENT,
  applyPenaltyScore,
  refreshPenaltyWindow,
} from '../modules/ai/moderation/penalty-policy';
import { getIO } from './gateway';
import { logger } from '../shared/logger';

export interface AuthSocket extends Socket {
  userId: string;
}

// ─── Shared: kafkaFailureMode flag accessor ──────────────────────────────────
// Imported indirectly since gateway owns this flag
let _kafkaFailureMode = false;
export function setChatKafkaFailureMode(mode: boolean): void {
  _kafkaFailureMode = mode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function produceModerationNotification(
  userId: string,
  conversationId: string,
  body: string,
): Promise<void> {
  await produceNotificationEvent({
    userId,
    type: 'new_message',
    title: 'Thong bao kiem duyet',
    body,
    conversationId,
    fromUserId: userId,
    data: { conversationId, action: 'moderation_notice' },
  });
}

async function applyRealtimeKeywordPenalty(
  conversationId: string,
  userId: string,
  amount: number,
): Promise<void> {
  try {
    const member = await ConversationMemberModel.findOne({ conversationId, userId });
    if (!member) return;

    const { mutedUntil, becameMuted } = applyPenaltyScore(member, amount);

    if (becameMuted) {
      await UserModel.findByIdAndUpdate(userId, { $inc: { globalViolationCount: 1 } });
    }

    await member.save();

    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('user_penalty_updated', {
        conversationId,
        penaltyScore: member.penaltyScore,
        mutedUntil: member.mutedUntil ?? null,
      });
    }

    if (becameMuted && mutedUntil) {
      await produceModerationNotification(
        userId,
        conversationId,
        `Ban da dat 100% vi pham va bi khoa chat 5 phut den ${mutedUntil.toLocaleTimeString('vi-VN')}.`,
      );
      logger.warn('[ChatController] User muted after keyword overflow', { conversationId, userId });
    }
  } catch (err) {
    logger.error('[ChatController] Failed to apply realtime keyword penalty', err);
  }
}

// ─── send_message ─────────────────────────────────────────────────────────────

async function handleSendMessage(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const { userId } = socket;

  const isWithinLimit = await checkMessageRateLimit(userId, _kafkaFailureMode);
  if (!isWithinLimit) {
    socket.emit('error', {
      message: _kafkaFailureMode
        ? 'Rate limit exceeded: max 200 messages/500ms (fallback mode)'
        : 'Rate limit exceeded: max 300 messages/500ms',
    });
    return;
  }

  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }

  const msg = payload as Record<string, unknown>;
  let {
    conversationId, content, type, mediaUrl, idempotencyKey,
    replyToMessageRef, replyToMessageId, replyToPreview,
    replyToSenderId, replyToSenderDisplayName, replyToType,
  } = msg;

  if (!conversationId || !idempotencyKey) {
    socket.emit('error', { message: 'Missing required fields: conversationId, idempotencyKey' });
    return;
  }

  if (!content && !mediaUrl) {
    socket.emit('error', { message: 'Either content or mediaUrl must be provided' });
    return;
  }

  if (content && (typeof content !== 'string' || content.length > 1000)) {
    socket.emit('error', { message: 'Content must be 1-1000 characters' });
    return;
  }

  const isValidMessageType = (t: string) =>
    ['text', 'image', 'video', 'audio', 'sticker'].includes(t) || t.startsWith('file/');
  const normalizedType = typeof type === 'string' ? type : 'text';
  if (!isValidMessageType(normalizedType)) {
    socket.emit('error', { message: 'Invalid message type' });
    return;
  }

  // ─── Resolve replyTo ───
  const normalizedReplyMessageRef = typeof replyToMessageRef === 'string' ? replyToMessageRef.trim() : '';
  const normalizedReplyMessageId = typeof replyToMessageId === 'string' ? replyToMessageId.trim() : '';
  const normalizedReplyToPreview = typeof replyToPreview === 'string' ? replyToPreview.trim().slice(0, 160) : undefined;
  const normalizedReplyToSenderId = typeof replyToSenderId === 'string' ? replyToSenderId.trim() : undefined;
  const normalizedReplyToSenderDisplayName = typeof replyToSenderDisplayName === 'string' ? replyToSenderDisplayName.trim().slice(0, 120) : undefined;
  const normalizedReplyToType = typeof replyToType === 'string' ? replyToType.trim().slice(0, 24) : undefined;

  let resolvedReplyTo: {
    messageRef: string; messageId?: string; senderId?: string;
    senderDisplayName?: string; contentPreview?: string; type?: string; isDeleted?: boolean;
  } | undefined;

  const requestedReplyRef = normalizedReplyMessageRef.length > 0 ? normalizedReplyMessageRef : normalizedReplyMessageId;
  if (requestedReplyRef.length > 0) {
    const replyFilters: Array<Record<string, unknown>> = [{ idempotencyKey: requestedReplyRef }];
    if (Types.ObjectId.isValid(requestedReplyRef)) replyFilters.push({ _id: requestedReplyRef });

    const repliedMessage = await MessageModel.findOne({
      $or: replyFilters,
      conversationId: conversationId as string,
    }).select('_id idempotencyKey senderId content type').lean();

    let resolvedReplySenderDisplayName = normalizedReplyToSenderDisplayName;
    if (repliedMessage?.senderId) {
      try {
        const replySender = await UserModel.findOne({ _id: repliedMessage.senderId }).select('displayName').lean();
        if (typeof replySender?.displayName === 'string' && replySender.displayName.trim().length > 0) {
          resolvedReplySenderDisplayName = replySender.displayName.trim();
        }
      } catch (err) {
        logger.warn('[ChatController] Failed to resolve reply sender', err);
      }
    }

    resolvedReplyTo = {
      messageRef: repliedMessage?.idempotencyKey || requestedReplyRef,
      messageId: repliedMessage?._id ? String(repliedMessage._id) : (normalizedReplyMessageId || undefined),
      senderId: repliedMessage?.senderId || normalizedReplyToSenderId,
      senderDisplayName: resolvedReplySenderDisplayName,
      contentPreview: repliedMessage?.content ? String(repliedMessage.content).slice(0, 160) : normalizedReplyToPreview,
      type: repliedMessage?.type || normalizedReplyToType,
      isDeleted: false,
    };
  }

  // ─── Membership + Penalty Check ───
  const membership = await ConversationMemberModel.findOne({
    conversationId: conversationId as string,
    userId,
  }).select('penaltyScore mutedUntil penaltyWindowStartedAt');

  if (!membership) {
    socket.emit('error', { message: 'Not allowed to send message in this conversation' });
    return;
  }

  if (refreshPenaltyWindow(membership)) await membership.save();

  if (membership.mutedUntil && membership.mutedUntil > new Date()) {
    socket.emit('error', {
      message: `Bạn đang bị tạm khóa gửi tin đến ${membership.mutedUntil.toLocaleTimeString('vi-VN')}`,
    });
    socket.emit('user_penalty_updated', {
      conversationId: conversationId as string,
      penaltyScore: membership.penaltyScore ?? 0,
      mutedUntil: membership.mutedUntil,
    });
    return;
  }

  await socket.join(`conv:${conversationId as string}`);

  let moderationWarning = false;

  // ─── Sticker Validation ───
  if (normalizedType === 'sticker') {
    if (!mediaUrl || typeof mediaUrl !== 'string') {
      socket.emit('error', { message: 'Sticker mediaUrl is required' });
      return;
    }
    if (!stickerService.validateStickerUrl(mediaUrl)) {
      socket.emit('error', { message: 'Invalid sticker URL' });
      return;
    }
    content = '';
  }

  // ─── Keyword Moderation ───
  if (normalizedType === 'text' && typeof content === 'string' && content.trim().length > 0) {
    const quickModeration = runKeywordFilter(content);

    if (quickModeration.label === 'blocked') {
      await applyRealtimeKeywordPenalty(conversationId as string, userId, PENALTY_BLOCK_PERCENT);
      socket.emit('content_warning', { conversationId, message: `Tin nhan vi pham keyword va da duoc tinh +${PENALTY_BLOCK_PERCENT}% vi pham.` });
      socket.emit('content_blocked', { messageId: idempotencyKey, conversationId, reason: 'Tin nhan cua ban vi pham tieu chuan cong dong va da bi chan.', confidence: quickModeration.confidence });
      io.to(`conv:${conversationId as string}`).emit('message_recalled', { messageId: idempotencyKey, idempotencyKey, conversationId, recalledBy: 'system', recalledAt: new Date().toISOString() });
      await produceModerationNotification(userId, conversationId as string, `Tin nhan cua ban da bi thu hoi do vi pham tieu chuan cong dong (+${PENALTY_BLOCK_PERCENT}%).`);
      return;
    }

    if (quickModeration.label === 'warning') {
      moderationWarning = true;
      await applyRealtimeKeywordPenalty(conversationId as string, userId, PENALTY_WARNING_PERCENT);
      socket.emit('content_warning', { conversationId, messageId: idempotencyKey, message: `Tin nhan cua ban co noi dung nhay cam. He thong da cong +${PENALTY_WARNING_PERCENT}% vi pham.` });
    }
  }

  // ─── Create Message ───
  try {
    const message = await MessagesService.createMessage(
      conversationId as string, userId,
      typeof content === 'string' ? content : '',
      normalizedType as MessageType,
      idempotencyKey as string,
      mediaUrl ? (mediaUrl as string) : undefined,
      moderationWarning, resolvedReplyTo,
    );

    socket.to(`conv:${conversationId}`).emit('receive_message', {
      messageId: message._id, conversationId, senderId: userId,
      content: typeof content === 'string' ? content : '',
      type: normalizedType, mediaUrl, moderationWarning,
      replyTo: message.replyTo, idempotencyKey, createdAt: message.createdAt,
    });

    io.to(`conv:${conversationId}`).emit('status_update', { conversationId, messageId: message._id, status: 'sent', userId });
    socket.emit('message_sent', { messageId: message._id, idempotencyKey, createdAt: message.createdAt });

    // Notifications async
    void (async () => {
      try {
        const members = await ConversationMemberModel.find({ conversationId: conversationId as string }).lean();
        const sender = await UserModel.findById(userId).select('displayName').lean();
        const senderName = (sender?.displayName as string) ?? 'Someone';
        const rawText = typeof content === 'string' ? content.trim() : '';
        const preview = rawText.length > 0 ? rawText.slice(0, 100) : (normalizedType === 'text' ? 'Ban co tin nhan moi' : `[${normalizedType}]`);

        for (const member of members) {
          if (member.userId === userId) continue;
          await produceNotificationEvent({ userId: member.userId, type: 'new_message', title: `Tin nhắn mới từ ${senderName}`, body: preview, conversationId: conversationId as string, fromUserId: userId, data: { conversationId: conversationId as string, action: 'open_chat' } });
        }
      } catch (err) {
        logger.error('Failed to produce message notifications', err);
      }
    })();
  } catch (err) {
    logger.error('Failed to create message', err);
    throw err;
  }
}

// ─── message_read ─────────────────────────────────────────────────────────────

async function handleMessageRead(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const { userId } = socket;

  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' }); return;
  }

  const data = payload as Record<string, unknown>;
  const { conversationId, messageIds } = data;

  if (!conversationId || !messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    socket.emit('error', { message: 'Missing required fields: conversationId, messageIds (non-empty array)' }); return;
  }

  const membership = await ConversationMemberModel.exists({ conversationId: conversationId as string, userId });
  if (!membership) { socket.emit('error', { message: 'Not allowed to update read status' }); return; }

  await socket.join(`conv:${conversationId as string}`);

  const refs = messageIds.map((v) => String(v));
  for (const messageId of messageIds) {
    await MessagesService.markAsRead(messageId as string, userId);
  }
  await MessagesService.refreshReadByPreviewForReadEvents(conversationId as string, refs);

  const readerProfile = await UserModel.findById(userId).select('displayName avatarUrl').lean();
  const readAt = new Date();

  io.to(`conv:${conversationId}`).emit('status_update', {
    conversationId, messageIds: refs, status: 'read', userId, updatedAt: readAt,
    reader: { userId, displayName: readerProfile?.displayName || 'Nguoi dung', avatarUrl: readerProfile?.avatarUrl, readAt },
  });
}

// ─── message_delivered ───────────────────────────────────────────────────────

async function handleMessageDelivered(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const { userId } = socket;

  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' }); return;
  }

  const data = payload as Record<string, unknown>;
  const { conversationId, messageIds } = data;

  if (!conversationId || !messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    socket.emit('error', { message: 'Missing required fields: conversationId, messageIds' }); return;
  }

  const membership = await ConversationMemberModel.exists({ conversationId: conversationId as string, userId });
  if (!membership) { socket.emit('error', { message: 'Not allowed to update delivery status' }); return; }

  await socket.join(`conv:${conversationId as string}`);

  for (const messageId of messageIds) {
    await MessagesService.updateMessageStatus(messageId as string, userId, 'delivered');
  }

  io.to(`conv:${conversationId}`).emit('status_update', { conversationId, messageIds, status: 'delivered', userId, updatedAt: new Date() });
}

// ─── delete_message_for_me ────────────────────────────────────────────────────

async function handleDeleteMessageForMe(_io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const userId = socket.userId;

  if (typeof payload !== 'object' || payload === null) { socket.emit('error', { message: 'Invalid payload' }); return; }

  const { messageId, idempotencyKey, conversationId } = payload as { messageId?: string; idempotencyKey?: string; conversationId?: string };
  if (!messageId || !idempotencyKey || !conversationId) { socket.emit('error', { message: 'Missing messageId or conversationId' }); return; }

  MessagesService.deleteMessageForMeWithConversationSync(idempotencyKey, userId)
    .then(({ effectiveLastMessage, unreadCount, lastVisibleMessage }) => {
      socket.emit('message_deleted_for_me', { messageId, conversationId, deletedAt: new Date().toISOString(), effectiveLastMessage: effectiveLastMessage || null, unreadCount, lastVisibleMessage: lastVisibleMessage || null });
    })
    .catch((err) => {
      logger.error('handleDeleteMessageForMe error', err);
      socket.emit('error', { message: (err as Error).message });
    });
}

// ─── recall_message ───────────────────────────────────────────────────────────

async function handleRecallMessage(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const userId = socket.userId;

  if (typeof payload !== 'object' || payload === null) { socket.emit('error', { message: 'Invalid payload' }); return; }

  const { messageId, idempotencyKey, conversationId } = payload as { messageId?: string; idempotencyKey?: string; conversationId?: string };
  if (!messageId || !idempotencyKey || !conversationId) { socket.emit('error', { message: 'Missing messageId or conversationId' }); return; }

  MessagesService.recallMessageWithConversationSync(idempotencyKey, userId)
    .then(({ conversationLastMessage }) => {
      io.to(`conv:${conversationId}`).emit('message_recalled', { messageId, idempotencyKey, conversationId, recalledBy: userId, recalledAt: new Date().toISOString(), conversationLastMessage: conversationLastMessage || null });
    })
    .catch((err) => {
      logger.error('handleRecallMessage error', err);
      socket.emit('error', { message: (err as Error).message });
    });
}

// ─── forward_message ──────────────────────────────────────────────────────────

async function handleForwardMessage(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const userId = socket.userId;

  if (typeof payload !== 'object' || payload === null) { socket.emit('error', { message: 'Invalid payload' }); return; }

  const { originalMessageId, toConversationId, idempotencyKey } = payload as { originalMessageId?: string; toConversationId?: string; idempotencyKey?: string };
  if (!originalMessageId || !toConversationId || !idempotencyKey) { socket.emit('error', { message: 'Missing required fields' }); return; }

  MessagesService.forwardMessage(originalMessageId, toConversationId, userId, idempotencyKey)
    .then((newMessage) => {
      io.to(`conv:${toConversationId}`).emit('receive_message', { messageId: newMessage._id, conversationId: toConversationId, senderId: userId, content: newMessage.content, type: newMessage.type, mediaUrl: newMessage.mediaUrl, status: 'sent', createdAt: newMessage.createdAt, idempotencyKey: newMessage.idempotencyKey });
      socket.emit('message_forwarded', { messageId: newMessage._id, idempotencyKey, toConversationId });
    })
    .catch((err) => {
      logger.error('handleForwardMessage error', err);
      socket.emit('error', { message: (err as Error).message });
    });
}

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Đăng ký tất cả Chat events cho một socket connection.
 * Gọi từ gateway.ts trong block `io.on('connection', ...)`.
 */
export function registerChatController(io: Server, socket: AuthSocket): void {
  socket.on('send_message', async (payload: unknown) => {
    try { await handleSendMessage(io, socket, payload); }
    catch (err) { logger.error('send_message error', err); socket.emit('error', { message: 'Failed to send message' }); }
  });

  socket.on('message_read', async (payload: unknown) => {
    try { await handleMessageRead(io, socket, payload); }
    catch (err) { logger.error('message_read error', err); socket.emit('error', { message: 'Failed to update message status' }); }
  });

  socket.on('message_delivered', async (payload: unknown) => {
    try { await handleMessageDelivered(io, socket, payload); }
    catch (err) { logger.error('message_delivered error', err); socket.emit('error', { message: 'Failed to mark message as delivered' }); }
  });

  socket.on('delete_message_for_me', async (payload: unknown) => {
    try { await handleDeleteMessageForMe(io, socket, payload); }
    catch (err) { logger.error('delete_message_for_me error', err); socket.emit('error', { message: 'Failed to delete message' }); }
  });

  socket.on('recall_message', async (payload: unknown) => {
    try { await handleRecallMessage(io, socket, payload); }
    catch (err) { logger.error('recall_message error', err); socket.emit('error', { message: 'Failed to recall message' }); }
  });

  socket.on('forward_message', async (payload: unknown) => {
    try { await handleForwardMessage(io, socket, payload); }
    catch (err) { logger.error('forward_message error', err); socket.emit('error', { message: 'Failed to forward message' }); }
  });
}
