import { ConversationMemberModel } from './conversation-member.model';
import { ConversationModel } from './conversation.model';
import { UserModel } from '../users/user.model';

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
}
