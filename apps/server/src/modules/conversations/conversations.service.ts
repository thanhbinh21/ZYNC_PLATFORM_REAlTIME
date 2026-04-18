import { ConversationMemberModel } from './conversation-member.model';
import { ConversationModel } from './conversation.model';
import { UserModel } from '../users/user.model';
import { FriendshipModel } from '../friends/friendship.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { logger } from '../../shared/logger';

interface EnrichedConversation {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  createdBy?: string;
  adminIds: string[];
  memberApprovalEnabled?: boolean;
  lastMessage?: {
    content: string;
    senderId: string;
    sentAt: Date;
  };
  unreadCounts?: Record<string, number>;
  updatedAt: Date;
  users: Array<{ _id: string; displayName: string; avatarUrl?: string }>;
}

async function enrichConversationById(conversationId: string): Promise<EnrichedConversation | null> {
  const conversation = await ConversationModel.findById(conversationId).lean();
  if (!conversation) {
    return null;
  }

  const members = await ConversationMemberModel.find({ conversationId }).select('userId').lean();
  const memberIds = members.map((member) => member.userId);
  const users = await UserModel.find({ _id: { $in: memberIds } }, 'displayName avatarUrl').lean();

  return {
    ...conversation,
    _id: conversation._id.toString(),
    users: users.map((user) => ({
      _id: user._id.toString(),
      displayName: user.displayName as string,
      avatarUrl: user.avatarUrl as string | undefined,
    })),
  } as EnrichedConversation;
}

export class ConversationsService {
  /**
   * Lấy danh sách hội thoại của một user, 
   * bao gồm cả thông tin thành viên (giúp hiển thị tên/avatar cho nhóm 1-1)
   */
  static async getUserConversations(userId: string): Promise<EnrichedConversation[]> {
    const memberships = await ConversationMemberModel.find({ userId });
    const conversationIds = memberships.map((m) => m.conversationId);

    const conversations = await ConversationModel.find({ _id: { $in: conversationIds } })
      .sort({ 'lastMessage.sentAt': -1 })
      .select('_id')
      .lean();

    const enrichedConversations = await Promise.all(
      conversations.map((conv) => enrichConversationById(conv._id.toString())),
    );

    return enrichedConversations.filter((conversation): conversation is EnrichedConversation => conversation !== null);
  }

  /**
   * Task 7.1: Get or Create 1-1 Conversation
   * Check if 1-1 conversation exists between two users, create if not
   * @param userId First user ID
   * @param targetUserId Second user ID
   * @returns Conversation document
   */
  static async getOrCreateConversation(userId: string, targetUserId: string): Promise<EnrichedConversation> {
    try {
      if (!userId || !targetUserId) {
        throw new BadRequestError('Missing user id');
      }

      if (userId === targetUserId) {
        throw new BadRequestError('Cannot create conversation with yourself');
      }

      const targetExists = await UserModel.exists({ _id: targetUserId });
      if (!targetExists) {
        throw new NotFoundError('Target user not found');
      }

      const friendship = await FriendshipModel.exists({
        userId,
        friendId: targetUserId,
        status: 'accepted',
      });
      if (!friendship) {
        throw new ForbiddenError('Only friends can open direct conversation');
      }

      const existingMembers = await ConversationMemberModel.find({ userId: { $in: [userId, targetUserId] } })
        .select('conversationId userId')
        .lean();

      const conversationIdMap: Record<string, Set<string>> = {};
      for (const member of existingMembers) {
        if (!conversationIdMap[member.conversationId.toString()]) {
          conversationIdMap[member.conversationId.toString()] = new Set();
        }
        conversationIdMap[member.conversationId.toString()].add(member.userId);
      }

      for (const [convId, memberSet] of Object.entries(conversationIdMap)) {
        if (memberSet.size === 2 && memberSet.has(userId) && memberSet.has(targetUserId)) {
          const conversation = await ConversationModel.findById(convId).select('type').lean();
          if (conversation?.type === 'direct') {
            const enriched = await enrichConversationById(convId);
            if (enriched) {
              logger.debug(`Found existing 1-1 conversation: ${convId}`);
              return enriched;
            }
          }
        }
      }

      const newConversation = await ConversationModel.create({
        type: 'direct',
        adminIds: [userId],
        unreadCounts: new Map<string, number>(),
      });

      await ConversationMemberModel.insertMany([
        { userId, conversationId: newConversation._id.toString() },
        { userId: targetUserId, conversationId: newConversation._id.toString() },
      ]);

      const enriched = await enrichConversationById(newConversation._id.toString());
      if (!enriched) {
        throw new NotFoundError('Conversation not found after creation');
      }

      logger.info(`Created new 1-1 conversation: ${newConversation._id}`);
      return enriched;
    } catch (err) {
      logger.error('Error in getOrCreateConversation', err);
      throw err;
    }
  }

  /**
   * Task 7.2: Update Last Message
   * Update conversation's lastMessage and updatedAt fields
   * @param conversationId Conversation ID
   * @param messageData Message data { content, senderId, sentAt }
   */
  static async updateLastMessage(
    conversationId: string,
    messageData: { content: string; senderId: string; sentAt: Date },
  ): Promise<void> {
    try {
      await ConversationModel.findByIdAndUpdate(
        conversationId,
        {
          lastMessage: {
            content: messageData.content,
            senderId: messageData.senderId,
            sentAt: messageData.sentAt,
          },
          updatedAt: new Date(),
        },
        { new: true },
      );

      logger.debug(`Updated lastMessage for conversation: ${conversationId}`);
    } catch (err) {
      logger.error('Error updating lastMessage', err);
      throw err;
    }
  }

  /**
   * Task 7.3: Increment Unread Count
   * Increment unread count for a specific user in a conversation
   * @param conversationId Conversation ID
   * @param userId User ID to increment unread for
   */
  static async incrementUnreadCount(conversationId: string, userId: string): Promise<void> {
    try {
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        logger.warn(`Conversation not found: ${conversationId}`);
        return;
      }

      // Get current unread count (default 0)
      const currentCount = conversation.unreadCounts.get(userId) ?? 0;

      // Increment and update
      conversation.unreadCounts.set(userId, currentCount + 1);
      await conversation.save();

      logger.debug(`Incremented unread count for user ${userId} in conversation ${conversationId}`);
    } catch (err) {
      logger.error('Error incrementing unreadCount', err);
      throw err;
    }
  }

  /**
   * Task 7.3: Clear Unread Count
   * Clear unread count for a specific user in a conversation (when they read messages)
   * @param conversationId Conversation ID
   * @param userId User ID to clear unread for
   */
  static async clearUnreadCount(conversationId: string, userId: string): Promise<void> {
    try {
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        logger.warn(`Conversation not found: ${conversationId}`);
        return;
      }

      // Delete the user's unread count entry
      conversation.unreadCounts.delete(userId);
      await conversation.save();

      logger.debug(`Cleared unread count for user ${userId} in conversation ${conversationId}`);
    } catch (err) {
      logger.error('Error clearing unreadCount', err);
      throw err;
    }
  }
}
