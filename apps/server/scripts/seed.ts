import dotenv from 'dotenv';
import path from 'path';

// Fix dotenv path to point to monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import mongoose from 'mongoose';
import { connectDatabase } from '../src/infrastructure/database';
import { UserModel } from '../src/modules/users/user.model';
import { FriendshipModel } from '../src/modules/friends/friendship.model';
import { ConversationModel } from '../src/modules/conversations/conversation.model';
import { ConversationMemberModel } from '../src/modules/conversations/conversation-member.model';
import { MessageModel } from '../src/modules/messages/message.model';
import { faker } from '@faker-js/faker/locale/vi';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../src/shared/logger';

async function seed() {
  try {
    await connectDatabase();
    logger.info('Connected to DB for seeding...');

    // Xoá DB cũ để tránh rác
    await Promise.all([
      UserModel.deleteMany({}),
      FriendshipModel.deleteMany({}),
      ConversationModel.deleteMany({}),
      ConversationMemberModel.deleteMany({}),
      MessageModel.deleteMany({}),
    ]);
    logger.info('Cleared old data');

    // Mật khẩu chung
    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Tạo 5 Users tĩnh
    const usersData = [
      {
        email: 'test1@example.com',
        phoneNumber: '+84123456781',
        displayName: 'Nguyễn Văn A',
        avatarUrl: faker.image.avatar(),
        bio: 'Hello, this is my bio!',
        passwordHash,
      },
      {
        email: 'test2@example.com',
        phoneNumber: '+84123456782',
        displayName: 'Trần Thị B',
        avatarUrl: faker.image.avatar(),
        bio: 'Tôi yêu lập trình.',
        passwordHash,
      },
      {
        email: 'test3@example.com',
        phoneNumber: '+84123456783',
        displayName: 'Lê Hoàng C',
        avatarUrl: faker.image.avatar(),
        bio: 'Just another user',
        passwordHash,
      },
      {
        email: 'test4@example.com',
        phoneNumber: '+84123456784',
        displayName: 'Phạm D',
        avatarUrl: faker.image.avatar(),
        bio: 'Hi there!',
        passwordHash,
      },
      {
        email: 'test5@example.com',
        phoneNumber: '+84123456785',
        displayName: 'Đào Duy E',
        avatarUrl: faker.image.avatar(),
        bio: 'My first day here',
        passwordHash,
      },
    ];

    const users = await UserModel.insertMany(usersData);
    logger.info(`Created ${users.length} users`);

    const userMap = new Map();
    users.forEach((user) => userMap.set(user.email, user));

    const mainUser = userMap.get('test1@example.com'); // Đây sẽ là user bạn login để test
    const user2 = userMap.get('test2@example.com');
    const user3 = userMap.get('test3@example.com');
    const user4 = userMap.get('test4@example.com');
    const user5 = userMap.get('test5@example.com');

    // 2. Tạo Friendships (test1 là friend của test2, test3. test4 gửi request cho test1)
    await FriendshipModel.insertMany([
      { userId: mainUser._id, friendId: user2._id, status: 'accepted' },
      { userId: user2._id, friendId: mainUser._id, status: 'accepted' },
      { userId: mainUser._id, friendId: user3._id, status: 'accepted' },
      { userId: user3._id, friendId: mainUser._id, status: 'accepted' },
      { userId: user4._id, friendId: mainUser._id, status: 'pending' }, // Lời mời đến mainUser
    ]);
    logger.info('Created friendships and friend requests');

    // 3. Tạo Conversations
    // Gọi hàm helper tạo conversation (tất cả msg sẽ có createdAt lùi dần để test)
    async function createDirectConvo(u1: any, u2: any, content: string, unreadByU1: number) {
      const convoy = await ConversationModel.create({
        type: 'direct',
        adminIds: [],
        lastMessage: {
          content,
          senderId: u2._id, // u2 là người gửi tin nhắn cuối
          sentAt: new Date(),
        },
        unreadCounts: { [u1._id.toString()]: unreadByU1, [u2._id.toString()]: 0 },
      });

      await ConversationMemberModel.insertMany([
        { conversationId: convoy._id, userId: u1._id, role: 'member' },
        { conversationId: convoy._id, userId: u2._id, role: 'member' },
      ]);

      await MessageModel.create({
        conversationId: convoy._id,
        senderId: u2._id,
        content,
        type: 'text',
        idempotencyKey: uuidv4(),
        createdAt: new Date(),
      });
    }

    // Direct Convo 1: test1 và test2, test1 có 2 tin chưa đọc
    await createDirectConvo(mainUser, user2, 'Ê chiều nay đi cf không?', 2);
    // Direct Convo 2: test1 và test3, test1 không có tin chưa đọc
    await createDirectConvo(mainUser, user3, 'OK rảnh nha', 0);

    // Group Convo
    const groupConvo = await ConversationModel.create({
      type: 'group',
      name: 'Team Dự Án Zync',
      avatarUrl: faker.image.avatar(),
      adminIds: [mainUser._id],
      lastMessage: {
        content: 'Mọi người nhớ review PR nhé',
        senderId: user4._id,
        sentAt: new Date(),
      },
      unreadCounts: {
        [mainUser._id.toString()]: 5,
        [user2._id.toString()]: 0,
        [user4._id.toString()]: 0,
      },
    });

    await ConversationMemberModel.insertMany([
      { conversationId: groupConvo._id, userId: mainUser._id, role: 'admin' },
      { conversationId: groupConvo._id, userId: user2._id, role: 'member' },
      { conversationId: groupConvo._id, userId: user4._id, role: 'member' },
    ]);

    await MessageModel.create({
      conversationId: groupConvo._id,
      senderId: user4._id,
      content: 'Mọi người nhớ review PR nhé',
      type: 'text',
      idempotencyKey: uuidv4(),
      createdAt: new Date(),
    });

    logger.info('Created conversations and messages');
    logger.info('Seed completed successfully!');

    process.exit(0);
  } catch (error) {
    logger.error('Seed failed', error);
    process.exit(1);
  }
}

seed();
