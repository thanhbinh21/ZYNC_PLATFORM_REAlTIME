import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../src/infrastructure/database';
import { UserModel } from '../src/modules/users/user.model';
import { FriendshipModel } from '../src/modules/friends/friendship.model';
import { logger } from '../src/shared/logger';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DEFAULT_PASSWORD = 'anhnalanhat';

const USERS = {
  tk1: {
    email: 'anhnalanhat1@gmail.com',
    phoneNumber: '+84900000001',
    displayName: 'TK1 Group Test',
    bio: 'Tai khoan test nhom 1',
  },
  tk2: {
    email: 'anhnalanhat2@gmail.com',
    phoneNumber: '+84900000002',
    displayName: 'TK2 Group Test',
    bio: 'Tai khoan test nhom 2',
  },
  f3: {
    email: 'friend3.group.test@example.com',
    phoneNumber: '+84900000003',
    displayName: 'Friend 3',
    bio: 'Ban test so 3',
  },
  f4: {
    email: 'friend4.group.test@example.com',
    phoneNumber: '+84900000004',
    displayName: 'Friend 4',
    bio: 'Ban test so 4',
  },
  f5: {
    email: 'friend5.group.test@example.com',
    phoneNumber: '+84900000005',
    displayName: 'Friend 5',
    bio: 'Ban test so 5',
  },
  f6: {
    email: 'friend6.group.test@example.com',
    phoneNumber: '+84900000006',
    displayName: 'Friend 6',
    bio: 'Ban test so 6',
  },
};

async function upsertTestUser(
  payload: { email: string; phoneNumber: string; displayName: string; bio: string },
  passwordHash: string,
): Promise<{ _id: string; email: string }> {
  const user = await UserModel.findOneAndUpdate(
    { email: payload.email },
    {
      ...payload,
      passwordHash,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return {
    _id: user._id.toString(),
    email: user.email as string,
  };
}

async function seedFriendTestData(): Promise<void> {
  try {
    await connectDatabase();
    logger.info('Connected to DB for friend test seeding...');

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const [tk1, tk2, f3, f4, f5, f6] = await Promise.all([
      upsertTestUser(USERS.tk1, passwordHash),
      upsertTestUser(USERS.tk2, passwordHash),
      upsertTestUser(USERS.f3, passwordHash),
      upsertTestUser(USERS.f4, passwordHash),
      upsertTestUser(USERS.f5, passwordHash),
      upsertTestUser(USERS.f6, passwordHash),
    ]);

    const scopedUserIds = [tk1._id, tk2._id, f3._id, f4._id, f5._id, f6._id];

    await FriendshipModel.deleteMany({
      $or: [
        { userId: { $in: scopedUserIds } },
        { friendId: { $in: scopedUserIds } },
      ],
    });

    await FriendshipModel.insertMany([
      // tk1 co 5 ban (bao gom tk2)
      { userId: tk1._id, friendId: tk2._id, status: 'accepted' },
      { userId: tk1._id, friendId: f3._id, status: 'accepted' },
      { userId: tk1._id, friendId: f4._id, status: 'accepted' },
      { userId: tk1._id, friendId: f5._id, status: 'accepted' },
      { userId: tk1._id, friendId: f6._id, status: 'accepted' },
      // tk2 chi co 1 ban la tk1
      { userId: tk2._id, friendId: tk1._id, status: 'accepted' },
    ]);

    logger.info('Seed friend test data completed successfully');
    logger.info(`TK1: ${USERS.tk1.email} | password: ${DEFAULT_PASSWORD}`);
    logger.info(`TK2: ${USERS.tk2.email} | password: ${DEFAULT_PASSWORD}`);
    logger.info('TK1 friends = 5 (includes TK2), TK2 friends = 1 (TK1)');
  } catch (error) {
    logger.error('Seed friend test data failed', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

void seedFriendTestData();
