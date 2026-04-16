import { MessageModel, MessageType, type IMessage } from './message.model';
import { MessageStatusModel, type IMessageStatus } from './message-status.model';
import { checkIdempotencyKey, setIdempotencyKey } from '../../infrastructure/redis';
import { ConversationsService } from '../conversations/conversations.service';
import { ConversationMemberModel } from '../conversations/conversation-member.model';
import { BadRequestError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { produceMessage, KAFKA_TOPICS } from '../../infrastructure/kafka';
import { getRedis } from '../../infrastructure/redis';
import { v4 as uuidv4 } from 'uuid';

export interface PaginatedMessages {
  messages: IMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MessageWithStatus extends IMessage {
  status?: string;
}

export class MessagesService {
  private static readonly IDEMPOTENCY_TTL = 5 * 60; // 5 minutes

  private static getLastMessagePreview(
    content: string,
    type: MessageType,
  ): string {
    const trimmed = content.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }

    if (type === 'image') return 'Da gui anh';
    if (type === 'video') return 'Da gui video';
    if (type?.startsWith('file/')) return 'Da gui tep dinh kem';
    if (type === 'audio') return 'Da gui am thanh';
    if (type === 'sticker') return 'Da gui sticker';
    return '';
  }

  /**
   * Aggregate message status for sender vs recipient view
   * - Sender sees: Best case among recipients (read > delivered > sent)
   * - Recipient sees: Own status only
   */
  private static aggregateMessageStatus(
    messageId: string,
    senderId: string,
    requestingUserId: string,
    allStatuses: Array<{ userId: string; status: string }>,
  ): 'sent' | 'delivered' | 'read' {
    // If requesting user is sender
    if (requestingUserId === senderId) {
      // Show best case among recipients (exclude sender)
      const recipientStatuses = allStatuses
        .filter(s => s.userId !== senderId)
        .map(s => s.status as 'sent' | 'delivered' | 'read');

      // Priority: read > delivered > sent (best case)
      if (recipientStatuses.includes('read')) return 'read';
      if (recipientStatuses.includes('delivered')) return 'delivered';
      return 'sent';
    }

    // Recipient: show own status
    const ownStatus = allStatuses.find(s => s.userId === requestingUserId);
    return (ownStatus?.status as 'sent' | 'delivered' | 'read') || 'delivered';
  }

  /**
   * Tạo tin nhắn nhanh (chỉ publish Kafka, không insert vào DB)
   * - Check Redis idempotency cache
   * - Publish to Kafka topic (for Kafka worker to insert)
   * - Cache MessageId + return mock message object
   * 
   * Note: Actual DB insert sẽ do Kafka worker (hoặc fallback nếu fail)
   */
  static async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType,
    idempotencyKey: string,
    mediaUrl?: string,
  ): Promise<IMessage> {
    // Step 1: Check idempotency cache
    const cachedMessage = await checkIdempotencyKey(idempotencyKey);
    if (cachedMessage) {
      logger.debug(`[Idempotency] Found cached message for key: ${idempotencyKey}`);
      return {
        _id: cachedMessage.messageId,
        conversationId,
        senderId,
        content: cachedMessage.content,
        type: cachedMessage.type,
        mediaUrl: cachedMessage.mediaUrl,
        idempotencyKey,
        createdAt: new Date(cachedMessage.createdAt as number),
      } as unknown as IMessage;
    }

    // Step 2: Cache idempotency key immediately (before publishing)
    const now = new Date();
    
    await setIdempotencyKey(idempotencyKey, {
      messageId: idempotencyKey,
      conversationId,
      senderId,
      content,
      type,
      mediaUrl,
      createdAt: now,
    });

    // Step 3: Publish to Kafka (worker will insert)
    try {
      await produceMessage(KAFKA_TOPICS.RAW_MESSAGES, conversationId, {
        messageId: idempotencyKey,
        conversationId,
        senderId,
        content,
        type,
        mediaUrl,
        idempotencyKey,
        createdAt: now,
      });
      logger.debug(`[Message] Published to Kafka: ${idempotencyKey}`);
    } catch (err) {
      logger.error('[Message] Failed to publish to Kafka', err);
      throw err;
    }

    // Step 4: Return mock message object (real DB insert will happen in Kafka worker)
    return {
      _id: idempotencyKey,
      conversationId,
      senderId,
      content,
      type,
      mediaUrl,
      idempotencyKey,
      createdAt: now,
    } as unknown as IMessage;
  }

  /**
   * Insert message with full metadata (MessageStatus, lastMessage, unreadCount)
   * Used by Kafka worker and fallback insert
   * Handles all DB operations after Kafka publishes message
   * 
   * @param mockId - Temporary server-generated ID (userId_timestamp) for mapping
   */
  static async insertMessageWithMetadata(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType,
    idempotencyKey: string,
    mediaUrl?: string,
    mockId?: string,
  ): Promise<IMessage> {
    // Step 1: Check if message already exists (idempotency)
    const existing = await MessageModel.findOne({ idempotencyKey }).lean();
    if (existing) {
      logger.debug(`[InsertMetadata] Message already exists: ${idempotencyKey}`);
      return existing as unknown as IMessage;
    }

    // Step 2: Create Message document
    const message = new MessageModel({
      conversationId,
      senderId,
      content,
      type,
      mediaUrl,
      idempotencyKey,
      createdAt: new Date(),
    });

    const savedMessage = await message.save();
    logger.debug(`[InsertMetadata] Created message: ${savedMessage._id}`);

    // Step 3: Create MessageStatus (sent for sender)
    // Store exact idempotencyKey from frontend for proper ID mapping
    const messageStatus = new MessageStatusModel({
      messageId: savedMessage._id.toString(),
      idempotencyKey: idempotencyKey, // Store exact frontend mockId for matching
      userId: senderId,
      status: 'sent',
    });

    await messageStatus.save();
    logger.debug(`[InsertMetadata] Created MessageStatus for: ${savedMessage._id} (mockId: ${mockId})`);

    // Step 3.5: Apply pending status updates from Redis queue
    // During Kafka processing time, frontend may have called updateMessageStatus()
    // Those updates were queued to Redis (since Message wasn't inserted yet)
    // Now that Message exists, apply all pending updates
    if (mockId) {
      try {
        const redis = getRedis();
        
        const pendingKey = `pending_status:${mockId}`;
        const pendingUpdates = await redis.hgetall(pendingKey);

        if (pendingUpdates && Object.keys(pendingUpdates).length > 0) {
          logger.debug(`[ApplyPending] Found ${Object.keys(pendingUpdates).length} pending updates for ${mockId}`);

          for (const [userId, status] of Object.entries(pendingUpdates)) {
            // Skip sender (already created above)
            if (userId === senderId) continue;

            try {
              const pendingStatus = new MessageStatusModel({
                messageId: savedMessage._id.toString(),
                idempotencyKey: idempotencyKey,
                userId,
                status,
              });
              await pendingStatus.save();
              logger.debug(`[ApplyPending] Applied pending status: ${userId}=${status} for message ${savedMessage._id}`);
            } catch (err) {
              // Ignore duplicate key errors (already created elsewhere)
              if ((err as any).code === 11000) {
                logger.debug(`[ApplyPending] Duplicate status record for ${userId}, skipping`);
              } else {
                logger.warn(`[ApplyPending] Error creating MessageStatus for ${userId}`, err);
              }
            }
          }

          // Clean up Redis queue
          await redis.del(pendingKey);
          logger.debug(`[ApplyPending] Cleaned up Redis queue: ${pendingKey}`);
        }
      } catch (err) {
        logger.warn('[InsertMetadata] Failed to apply pending status updates', err);
        // Continue anyway - pending updates will be lost but message is still created
      }
    }

    // Step 4: Update conversation's lastMessage
    try {
      const previewContent = this.getLastMessagePreview(content, type);
      await ConversationsService.updateLastMessage(conversationId, {
        content: previewContent,
        senderId,
        sentAt: savedMessage.createdAt,
      });
    } catch (err) {
      logger.warn('[InsertMetadata] Failed to update conversation lastMessage', err);
    }

    // Step 5: Increment unread count for other conversation members
    try {
      const members = await ConversationMemberModel.find({ conversationId });
      for (const member of members) {
        if (member.userId !== senderId) {
          await ConversationsService.incrementUnreadCount(conversationId, member.userId);
        }
      }
    } catch (err) {
      logger.warn('[InsertMetadata] Failed to increment unread counts', err);
    }

    return savedMessage.toObject() as unknown as IMessage;
  }

  /**
   * Fallback batch insert when Kafka batch fails
   * Inserts messages directly with all metadata
   * Used when message.worker fails to batch insert
   */
  static async fallbackBatchInsert(
    messages: Array<{
      mockId?: string;
      conversationId: string;
      senderId: string;
      content: string;
      type: string;
      mediaUrl?: string;
      idempotencyKey: string;
      createdAt: Date;
    }>
  ): Promise<void> {
    if (messages.length === 0) return;

    for (const msg of messages) {
      try {
        await this.insertMessageWithMetadata(
          msg.conversationId,
          msg.senderId,
          msg.content,
          msg.type as MessageType,
          msg.idempotencyKey,
          msg.mediaUrl,
          msg.mockId,
        );
      } catch (err) {
        logger.error(`[Fallback] Failed to insert message ${msg.idempotencyKey}`, err);
      }
    }
  }

  /**
   * Lấy lịch sử tin nhắn của một hội thoại
   * - Cursor-based pagination (dùng createdAt + _id)
   * - Populate status cho current user
   * - Filters out messages deleted "for me" and shows placeholder for recalled messages
   * - Return { messages (with status), nextCursor, hasMore }
   */
  static async getMessageHistory(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<PaginatedMessages> {
    try {
      let query: any = { conversationId };

      // Decode cursor nếu có
      if (cursor) {
        const [createdAtStr, messageId] = Buffer.from(cursor, 'base64').toString().split('_');
        const cursorDate = new Date(parseInt(createdAtStr));

        query = {
          ...query,
          $or: [
            { createdAt: { $lt: cursorDate } },
            { createdAt: cursorDate, _id: { $lt: messageId } },
          ],
        };
      }

      // Fetch limit + 1 để check hasMore
      const messages = await MessageModel
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1)
        .lean();

      let hasMore = false;
      let nextCursor: string | null = null;

      if (messages.length > limit) {
        hasMore = true;
        messages.pop();

        // Encode next cursor
        const lastMessage = messages[messages.length - 1];
        nextCursor = Buffer.from(
          `${(lastMessage.createdAt as any).getTime()}_${lastMessage._id}`,
        ).toString('base64');
      }

      // ─── Filter based on deletion ───
      const filteredMessages = messages
        .map((msg) => {
          // If message is recalled: show placeholder
          if (msg.isDeleted && msg.deleteType === 'recall') {
            return {
              ...msg,
              content: '[Tin nhắn đã được thu hồi]',
              mediaUrl: undefined,
              storyRef: undefined,
              type: 'system-recall' as const,
              isRecalled: true,
            };
          }

          // If deleted for this user only: hide it
          if (msg.deletedFor?.includes(userId)) {
            return null;
          }

          return msg;
        })
        .filter(Boolean);

      // ─── Fetch status ───
      const messageIds = filteredMessages.map((m: any) => m._id.toString());
      const allStatuses = await MessageStatusModel.find({
        messageId: { $in: messageIds },
      }).lean();

      // ─── Aggregate status ───
      const statusByMessageId = new Map<string, Array<{ userId: string; status: string }>>();
      for (const status of allStatuses) {
        const msgId = status.messageId.toString();
        if (!statusByMessageId.has(msgId)) {
          statusByMessageId.set(msgId, []);
        }
        statusByMessageId.get(msgId)!.push({
          userId: status.userId,
          status: status.status,
        });
      }

      // Add status to messages
      const messagesWithStatus = filteredMessages.map((msg: any) => {
        const msgId = msg._id.toString();
        const msgStatuses = statusByMessageId.get(msgId) || [];

        const status = this.aggregateMessageStatus(
          msgId,
          msg.senderId,
          userId,
          msgStatuses,
        );

        return {
          ...msg,
          status,
        };
      });

      return {
        messages: messagesWithStatus as unknown as IMessage[],
        nextCursor,
        hasMore,
      };
    } catch (error) {
      logger.error('[MessagesService] Error in getMessageHistory:', error);
      throw error;
    }
  }

  /**
   * Cập nhật status của một tin nhắn cho một user
   * - Optimized: 2 paths
   * - Path A (fast): MessageStatus exists → update immediately
   * - Path B (pending): MessageStatus NOT found → queue to Redis, Kafka worker applies later
   * - Support both real messageId AND idempotencyKey (temp) lookup
   */
  static async updateMessageStatus(
    messageId: string,
    userId: string,
    status: 'sent' | 'delivered' | 'read',
  ): Promise<IMessageStatus | null> {
    try {
      // Step 1: Try find existing MessageStatus
      // (handles case where Message already inserted)
      const existingStatus = await MessageStatusModel.findOne({
        userId,
        $or: [
          { messageId },           // Real MongoDB ID
          { idempotencyKey: messageId }, // Temp ID
        ],
      });

      if (existingStatus) {
        // Status record exists → update immediately (fast path)
        existingStatus.status = status;
        await existingStatus.save();
        logger.info(
          `[MessageStatus] Updated existing: ${messageId}:${userId}=${status}`
        );
        return existingStatus;
      }

      // Step 2: Not found → Queue to Redis pending (Message still inserting)
      // Kafka worker will apply this after insertMessageWithMetadata() completes
      const pendingKey = `pending_status:${messageId}`;
      const redis = getRedis();
      
      await redis.hset(pendingKey, userId, status);
      await redis.expire(pendingKey, 300); // 5 min TTL auto-cleanup
      
      logger.info(
        `[PendingQueue] Queued status update: ${pendingKey}:${userId}=${status}`
      );
      
      // Return null for pending (consistent with "not yet stored in DB")
      // Frontend will be updated via Socket.io status_update event later
      return null;

    } catch (error) {
      logger.error('[MessagesService] Error in updateMessageStatus:', error);
      throw error;
    }
  }

  /**
   * Đánh dấu một tin nhắn là đã đọc cho user hiện tại
   * - Update MessageStatus: status → 'read'
   */
  static async markAsRead(messageId: string, userId: string): Promise<IMessageStatus | null> {
    return this.updateMessageStatus(messageId, userId, 'read');
  }

  /**
   * Batch đánh dấu nhiều tin nhắn là đã đọc
   * - Task 7.3: Clear unread count for user in conversation
   */
  static async markMultipleAsRead(messageIds: string[], userId: string): Promise<void> {
    try {
      // Get all messages to find conversation
      const messages = await MessageModel.find({ _id: { $in: messageIds } }).lean();
      const conversationId = messages[0]?.conversationId;

      // Update message statuses to read
      await MessageStatusModel.updateMany(
        { messageId: { $in: messageIds }, userId },
        { status: 'read', updatedAt: new Date() },
      );

      // Clear unread count for this conversation
      if (conversationId) {
        try {
          await ConversationsService.clearUnreadCount(conversationId, userId);
        } catch (err) {
          logger.warn('Failed to clear unread count', err);
        }
      }

      logger.debug(`[MessageStatus] Marked ${messageIds.length} messages as read for user ${userId}`);
    } catch (error) {
      logger.error('[MessagesService] Error in markMultipleAsRead:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin chi tiết của một tin nhắn
   */
  static async findMessageById(messageId: string): Promise<IMessage | null> {
    try {
      const message = await MessageModel.findById(messageId).lean();
      return message as IMessage | null;
    } catch (error) {
      logger.error('[MessagesService] Error in findMessageById:', error);
      throw error;
    }
  }

  /**
   * Lấy status của một tin nhắn cho user
   * - Support both real messageId AND idempotencyKey lookup
   */
  static async getMessageStatus(messageId: string, userId: string): Promise<IMessageStatus | null> {
    try {
      const status = await MessageStatusModel.findOne({
        userId,
        $or: [
          { messageId },           // Real ID
          { idempotencyKey: messageId }, // Temp ID
        ],
      }).lean();
      return status as IMessageStatus | null;
    } catch (error) {
      logger.error('[MessagesService] Error in getMessageStatus:', error);
      throw error;
    }
  }

  /**
   * Xóa tin nhắn (soft delete by bỏ content, hoặc hard delete)
   * Note: Tùy thiết kế, hiện chưa implement
   */
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      // Verify user is sender
      const message = await MessageModel.findById(messageId);
      if (!message) {
        throw new BadRequestError('Message not found');
      }

      if (message.senderId !== userId) {
        throw new BadRequestError('Cannot delete message sent by another user');
      }

      // Hard delete
      await MessageModel.deleteOne({ _id: messageId });
      await MessageStatusModel.deleteMany({ messageId });

      logger.info(`[Message] Deleted message: ${messageId}`);
    } catch (error) {
      logger.error('[MessagesService] Error in deleteMessage:', error);
      throw error;
    }
  }

  /**
   * Tìm các tin nhắn chưa được deliver cho user trong conversation
   * - Lấy tất cả messages trong conversation
   * - Filter: senderId !== userId (không phải tin nhắn của user này gửi)
   * - Filter: MessageStatus không tồn tại hoặc status != 'read'
   * - Return: Array of {id, idempotencyKey} để có thể match với mockId ở frontend
   */
  static async findUndeliveredForUser(
    conversationId: string,
    userId: string,
  ): Promise<Array<{ id: string; idempotencyKey: string }>> {
    try {
      // Get all messages in conversation sent by others
      const messages = await MessageModel
        .find({
          conversationId,
          senderId: { $ne: userId },
        })
        .select('_id idempotencyKey')
        .lean();

      if (messages.length === 0) {
        return [];
      }

      const messageIds = messages.map(m => m._id.toString());

      // Get all MessageStatus for these messages + user combination
      const statuses = await MessageStatusModel
        .find({
          messageId: { $in: messageIds },
          userId,
        })
        .select('messageId status')
        .lean();

      // Build set of already-read message IDs
      const readMessageIds = new Set<string>();
      for (const status of statuses) {
        if (status.status === 'read') {
          readMessageIds.add(status.messageId.toString());
        }
      }

      // Build map of messageId -> status
      const statusByMessageId = new Map<string, string>();
      for (const status of statuses) {
        statusByMessageId.set(status.messageId.toString(), status.status);
      }

      // Return messages where:
      // - No status exists (never marked), OR
      // - Status exists but is not 'read' (still sent/delivered only)
      const undeliveredIds = messages
        .filter((msg) => {
          const msgId = msg._id.toString();
          const currentStatus = statusByMessageId.get(msgId);
          return !currentStatus || currentStatus !== 'read';
        })
        .map((msg) => ({
          id: msg._id.toString(),
          idempotencyKey: msg.idempotencyKey,
        }));

      logger.info(
        `[MessagesService] Found ${undeliveredIds.length} undelivered messages for user ${userId} in conversation ${conversationId}`,
      );

      return undeliveredIds;
    } catch (error) {
      logger.error('[MessagesService] Error in findUndeliveredForUser:', error);
      throw error;
    }
  }

  /**
   * Check if message can be recalled (within 5 minute time limit)
   */
  private static readonly RECALL_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  static canRecallMessage(message: IMessage): boolean {
    if (!message.senderId) return false;

    const now = Date.now();
    const createdTime = new Date(message.createdAt).getTime();

    // Cannot recall after 5 minutes
    return now - createdTime <= this.RECALL_TIMEOUT;
  }

  /**
   * Delete message for sender only (message still visible to recipients)
   * @param idempotencyKey Message ID or idempotencyKey to delete (supports both synced and pending messages)
   * @param userId User ID of sender
   * @returns Updated message document
   */
  static async deleteMessageForMe(
    idempotencyKey: string,
    userId: string,
  ): Promise<IMessage> {
    const message = await MessageModel.findOne({
      idempotencyKey: idempotencyKey
    });

    if (!message) {
      throw new BadRequestError('Message not found');
    }

    // Only sender can delete
    if (message.senderId !== userId) {
      throw new BadRequestError('Only sender can delete own messages');
    }

    // Initialize deletedFor array if not exists
    if (!message.deletedFor) {
      message.deletedFor = [];
    }

    // Add userId to deletedFor if not already there
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
    }

    await message.save();
    logger.info(`[Delete] Message ${idempotencyKey} deleted for me by user ${userId}`);
    return message.toObject() as unknown as IMessage;
  }

  /**
   * Recall message (delete everywhere with placeholder)
   * @param idempotencyKey Message ID or idempotencyKey to recall (supports both synced and pending messages)
   * @param userId User ID of sender
   * @returns Updated message document
   */
  static async recallMessage(
    idempotencyKey: string,
    userId: string,
  ): Promise<IMessage> {
    const message = await MessageModel.findOne({
      idempotencyKey: idempotencyKey
    });

    if (!message) {
      throw new BadRequestError('Message not found');
    }

    // Only sender can recall
    if (message.senderId !== userId) {
      throw new BadRequestError('Only sender can recall own messages');
    }

    // Check time limit (max 5 minutes)
    if (!this.canRecallMessage(message)) {
      throw new BadRequestError('Message is too old to recall (max 5 minutes)');
    }

    // Mark as deleted
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = userId;
    message.deleteType = 'recall';
    message.content = undefined; // Clear content
    message.mediaUrl = undefined; // Clear media
    message.storyRef = undefined; // Clear story ref

    await message.save();

    // Delete associated message status documents (optional cleanup)
    await MessageStatusModel.deleteMany({ idempotencyKey: message.idempotencyKey }).catch(() => {
      // Ignore if already deleted
    });

    logger.info(`[Recall] Message ${idempotencyKey} recalled by user ${userId}`);
    return message.toObject() as unknown as IMessage;
  }

  /**
   * Forward message to another conversation
   * Copies message content (text, media, type) and creates new message in target conversation
   * @param originalMessageId Message ID to forward
   * @param toConversationId Target conversation
   * @param userId User ID (sender/forwarder)
   * @param idempotencyKey Unique key for idempotency
   * @returns Created message
   */
  static async forwardMessage(
    originalMessageId: string,
    toConversationId: string,
    userId: string,
    idempotencyKey: string,
  ): Promise<IMessage> {
    // Step 1: Find original message
    const originalMessage = await MessageModel.findOne({
      idempotencyKey: idempotencyKey
    });

    if (!originalMessage) {
      throw new BadRequestError('Original message not found');
    }

    if (originalMessage.isDeleted) {
      throw new BadRequestError('Cannot forward deleted message');
    }

    // Step 2: Validate user is member of target conversation
    const isMember = await ConversationMemberModel.exists({
      conversationId: toConversationId,
      userId,
    });

    if (!isMember) {
      throw new BadRequestError('You are not a member of target conversation');
    }

    // Step 3: Copy message data (content, type, mediaUrl)
    const forwardedMessage = await this.createMessage(
      toConversationId,
      userId,
      originalMessage.content || '',
      originalMessage.type,
      uuidv4(),
      originalMessage.mediaUrl,
    );

    logger.info(`[Forward] Message ${originalMessageId} forwarded to ${toConversationId} by user ${userId}`);
    return forwardedMessage;
  }

}
