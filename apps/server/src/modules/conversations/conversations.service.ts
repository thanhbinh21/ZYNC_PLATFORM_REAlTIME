import { ConversationMemberModel } from './conversation-member.model';
import { ConversationModel } from './conversation.model';
import { UserModel } from '../users/user.model';
import { logger } from '../../shared/logger';

export class ConversationsService {
  /**
   * Lấy danh sách hội thoại của một user, 
   * bao gồm cả thông tin thành viên (giúp hiển thị tên/avatar cho nhóm 1-1)
   */
  static async getUserConversations(userId: string): Promise<any[]> {
    const memberships = await ConversationMemberModel.find({ userId });
    const conversationIds = memberships.map((m) => m.conversationId);

    const conversations = await ConversationModel.find({ _id: { $in: conversationIds } })
      .sort({ 'lastMessage.sentAt': -1 })
      .lean();

    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Lấy danh sách thành viên của hội thoại
        const members = await ConversationMemberModel.find({ conversationId: conv._id.toString() });
        const memberIds = members.map((m) => m.userId);
        
        // Lấy thông tin user (chỉ lấy displayName, avatarUrl)
        const users = await UserModel.find({ _id: { $in: memberIds } }, 'displayName avatarUrl').lean();

        return {
          ...conv,
          users, // Attach users info into conversation
        };
      })
    );

    return enrichedConversations;
  }

  /**
   * Task 7.1: Get or Create 1-1 Conversation
   * Check if 1-1 conversation exists between two users, create if not
   * @param userId First user ID
   * @param targetUserId Second user ID
   * @returns Conversation document
   */
  static async getOrCreateConversation(userId: string, targetUserId: string): Promise<any> {
    try {
      // Check if 1-1 conversation already exists
      // For 1-1, we need to find a conversation with exactly these 2 members
      const existingMembers = await ConversationMemberModel.find({
        userId: { $in: [userId, targetUserId] },
      });

      // Group by conversationId and filter those with exactly 2 members (both users)
      const conversationIdMap: Record<string, Set<string>> = {};
      for (const member of existingMembers) {
        if (!conversationIdMap[member.conversationId.toString()]) {
          conversationIdMap[member.conversationId.toString()] = new Set();
        }
        conversationIdMap[member.conversationId.toString()].add(member.userId);
      }

      // Find 1-1 conversation
      for (const [convId, memberSet] of Object.entries(conversationIdMap)) {
        if (memberSet.size === 2 && memberSet.has(userId) && memberSet.has(targetUserId)) {
          // Found existing 1-1 conversation
          const conversation = await ConversationModel.findById(convId);
          if (conversation) {
            logger.debug(`Found existing 1-1 conversation: ${convId}`);
            return conversation;
          }
        }
      }

      // Create new 1-1 conversation if not exists
      const newConversation = await ConversationModel.create({
        type: 'direct',
        adminIds: [userId], // Initiator is admin
        unreadCounts: new Map<string, number>(),
      });

      // Add both users as members
      await ConversationMemberModel.insertMany([
        { userId, conversationId: newConversation._id.toString() },
        { userId: targetUserId, conversationId: newConversation._id.toString() },
      ]);

      logger.info(`Created new 1-1 conversation: ${newConversation._id}`);
      return newConversation;
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
