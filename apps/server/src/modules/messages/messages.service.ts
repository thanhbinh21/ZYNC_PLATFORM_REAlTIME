import { MessageModel, type IMessage } from './message.model';
import { MessageStatusModel, type IMessageStatus } from './message-status.model';
import { checkIdempotencyKey, setIdempotencyKey } from '../../infrastructure/redis';
import { ConversationsService } from '../conversations/conversations.service';
import { ConversationMemberModel } from '../conversations/conversation-member.model';
import { BadRequestError } from '../../shared/errors';
import { logger } from '../../shared/logger';

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

  /**
   * Tạo tin nhắn mới với check idempotency
   * - Check Redis: nếu key exists → return cached result
   * - Insert Message + MessageStatus
   * - Cache result trong Redis (TTL 5 phút)
   */
  static async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'video' | 'emoji',
    idempotencyKey: string,
    mediaUrl?: string,
  ): Promise<IMessage> {
    // Step 1: Check idempotency cache
    const cachedMessage = await checkIdempotencyKey(idempotencyKey);
    if (cachedMessage) {
      logger.info(`[Idempotency] Found cached message for key: ${idempotencyKey}`);
      const message = await MessageModel.findById(cachedMessage.messageId).lean();
      if (message) {
        return message as unknown as IMessage;
      }
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
    logger.info(`[Message] Created message: ${savedMessage._id}`);

    // Step 3: Create MessageStatus (sent for sender)
    const messageStatus = new MessageStatusModel({
      messageId: savedMessage._id.toString(),
      userId: senderId,
      status: 'sent',
    });

    await messageStatus.save();
    logger.info(`[MessageStatus] Created initial status for message: ${savedMessage._id}`);

    // Step 4: Update conversation's lastMessage
    try {
      await ConversationsService.updateLastMessage(conversationId, {
        content,
        senderId,
        sentAt: savedMessage.createdAt,
      });
    } catch (err) {
      logger.warn('Failed to update conversation lastMessage', err);
      // Continue - don't fail message creation if conversation update fails
    }

    // Step 5: Increment unread count for other conversation members
    try {
      const members = await ConversationMemberModel.find({ conversationId });
      for (const member of members) {
        if (member.userId !== senderId) {
          // Increment unread count for non-sender members
          await ConversationsService.incrementUnreadCount(conversationId, member.userId);
        }
      }
    } catch (err) {
      logger.warn('Failed to increment unread counts', err);
      // Continue - don't fail message creation
    }

    // Step 6: Cache idempotency key with message data
    const messageObject = savedMessage.toObject() as IMessage;
    await setIdempotencyKey(idempotencyKey, {
      messageId: savedMessage._id.toString(),
      conversationId,
      senderId,
      content,
      type,
      mediaUrl,
      createdAt: messageObject.createdAt,
    });

    return messageObject;
  }

  /**
   * Lấy lịch sử tin nhắn của một hội thoại
   * - Cursor-based pagination (dùng createdAt + _id)
   * - Return { messages, nextCursor, hasMore }
   */
  static async getMessageHistory(
    conversationId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<PaginatedMessages> {
    try {
      let query: any = { conversationId };

      // Decode cursor nếu có (format: "createdAt_id")
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
        messages.pop(); // Remove extra item

        // Encode next cursor
        const lastMessage = messages[messages.length - 1];
        nextCursor = Buffer.from(
          `${lastMessage.createdAt.getTime()}_${lastMessage._id}`,
        ).toString('base64');
      }

      return {
        messages: messages as unknown as IMessage[],
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
   * - Update MessageStatus document
   */
  static async updateMessageStatus(
    messageId: string,
    userId: string,
    status: 'sent' | 'delivered' | 'read',
  ): Promise<IMessageStatus | null> {
    try {
      const messageStatus = await MessageStatusModel.findOneAndUpdate(
        { messageId, userId },
        { status, updatedAt: new Date() },
        { new: true, upsert: true }, // Create if not exists
      );

      logger.info(`[MessageStatus] Updated status for message ${messageId} user ${userId}: ${status}`);
      return messageStatus;
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

      logger.info(`[MessageStatus] Marked ${messageIds.length} messages as read for user ${userId}`);
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
   */
  static async getMessageStatus(messageId: string, userId: string): Promise<IMessageStatus | null> {
    try {
      const status = await MessageStatusModel.findOne({ messageId, userId }).lean();
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
}
