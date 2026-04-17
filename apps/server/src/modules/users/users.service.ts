import { Types } from 'mongoose';
import { UserModel, type IUser } from './user.model';
import { DeviceTokenModel } from './device-token.model';
import { BadRequestError, NotFoundError } from '../../shared/errors';
import { getFriendsCount, getMutualFriendsCount } from '../friends/friends.service';
import type { UpdateProfileDto, UpsertDeviceTokenDto } from '../auth/auth.schema';

/** Lấy profile của bản thân (đầy đủ thông tin) */
export async function getMe(userId: string): Promise<IUser> {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  return user;
}

/** Mask sensitive field: "user@example.com" → "us***@example.com" */
function maskEmail(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const [local, domain] = value.split('@');
  if (!local || !domain) return '***@***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, '').toLowerCase();
}

function isValidUsername(username: string): boolean {
  return /^[a-z0-9._]{3,30}$/.test(username);
}

export interface PublicUserProfile {
  _id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  emailMasked?: string;
  friendCount: number;
  mutualFriends: number;
  createdAt?: string;
}

/** Lấy profile công khai của người dùng khác (thông tin masked + friend count) */
export async function getUserById(
  userId: string,
  requesterId?: string,
): Promise<PublicUserProfile> {
  const user = await UserModel.findById(userId).select(
    'displayName username avatarUrl bio email createdAt',
  );
  if (!user) throw new NotFoundError('User not found');

  const [friendCount, mutualFriends] = await Promise.all([
    getFriendsCount(userId),
    requesterId && requesterId !== userId
      ? getMutualFriendsCount(requesterId, userId)
      : Promise.resolve(0),
  ]);

  return {
    _id: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    emailMasked: maskEmail(user.email),
    friendCount,
    mutualFriends,
    createdAt: (user as unknown as { createdAt?: Date }).createdAt?.toISOString(),
  };
}

/** Tìm user theo username/email cho luồng kết bạn */
export async function searchUsers(
  requesterId: string,
  keyword: string,
  limit: number,
): Promise<Array<{ id: string; username?: string; displayName: string; email?: string; avatarUrl?: string; bio?: string }>> {
  const queryText = keyword.trim();
  if (queryText.length < 2) {
    throw new BadRequestError('Query must be at least 2 characters');
  }

  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const normalizedQuery = queryText.startsWith('@') ? queryText.slice(1) : queryText;
  const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  const users = await UserModel.find({
    _id: { $ne: new Types.ObjectId(requesterId) },
    $or: [
      { username: regex },
      { email: regex },
      { displayName: regex },
    ],
  })
    .select('username displayName email avatarUrl bio')
    .limit(safeLimit)
    .lean();

  return users.map((user) => ({
    id: user._id.toString(),
    username: user.username as string | undefined,
    displayName: user.displayName as string,
    email: user.email as string | undefined,
    avatarUrl: user.avatarUrl as string | undefined,
    bio: user.bio as string | undefined,
  }));
}

/** Cập nhật profile của bản thân */
export async function updateProfile(
  userId: string,
  dto: UpdateProfileDto,
): Promise<IUser> {
  const updates: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  } = {};

  if (dto.username !== undefined) {
    const normalizedUsername = normalizeUsername(dto.username);
    if (!isValidUsername(normalizedUsername)) {
      throw new BadRequestError('Username không hợp lệ. Chỉ dùng chữ thường, số, dấu chấm và gạch dưới (3-30 ký tự).');
    }

    const existedUser = await UserModel.findOne({
      username: normalizedUsername,
      _id: { $ne: new Types.ObjectId(userId) },
    }).select('_id').lean();

    if (existedUser) {
      throw new BadRequestError('Username đã tồn tại');
    }

    updates.username = normalizedUsername;
  }

  if (dto.displayName !== undefined) {
    updates.displayName = dto.displayName.trim();
  }

  if (dto.avatarUrl !== undefined) {
    updates.avatarUrl = dto.avatarUrl;
  }

  if (dto.bio !== undefined) {
    updates.bio = dto.bio.trim();
  }

  if (Object.keys(updates).length === 0) {
    throw new BadRequestError('No valid profile fields to update');
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!user) throw new NotFoundError('User not found');
  return user;
}

/** Upsert device token cho push notification (FCM/APNs/Web Push) */
export async function upsertDeviceToken(
  userId: string,
  dto: UpsertDeviceTokenDto,
): Promise<void> {
  await DeviceTokenModel.findOneAndUpdate(
    { deviceToken: dto.deviceToken },
    { userId, deviceToken: dto.deviceToken, platform: dto.platform },
    { upsert: true, new: true },
  );
}

/** Xóa device token khi logout (dọn dẹp push subscription) */
export async function removeDeviceToken(
  userId: string,
  deviceToken: string,
): Promise<void> {
  await DeviceTokenModel.findOneAndDelete({ userId, deviceToken });
}
