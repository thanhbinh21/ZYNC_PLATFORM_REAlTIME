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
function maskField(value: string | undefined, type: 'email' | 'phone'): string | undefined {
  if (!value) return undefined;
  if (type === 'email') {
    const [local, domain] = value.split('@');
    if (!local || !domain) return '***@***';
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }
  // phone: show last 3 digits
  if (value.length <= 3) return '***';
  return `${'*'.repeat(value.length - 3)}${value.slice(-3)}`;
}

export interface PublicUserProfile {
  _id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  emailMasked?: string;
  phoneMasked?: string;
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
    'displayName avatarUrl bio email phoneNumber createdAt',
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
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    emailMasked: maskField(user.email, 'email'),
    phoneMasked: maskField(user.phoneNumber, 'phone'),
    friendCount,
    mutualFriends,
    createdAt: (user as unknown as { createdAt?: Date }).createdAt?.toISOString(),
  };
}

/** Tìm user theo tên hiển thị/email/số điện thoại cho luồng kết bạn */
export async function searchUsers(
  requesterId: string,
  keyword: string,
  limit: number,
): Promise<Array<{ id: string; displayName: string; avatarUrl?: string; bio?: string }>> {
  const queryText = keyword.trim();
  if (queryText.length < 2) {
    throw new BadRequestError('Query must be at least 2 characters');
  }

  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const escaped = queryText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  const users = await UserModel.find({
    _id: { $ne: new Types.ObjectId(requesterId) },
    $or: [
      { displayName: regex },
      { email: regex },
      { phoneNumber: regex },
    ],
  })
    .select('displayName avatarUrl bio')
    .limit(safeLimit)
    .lean();

  return users.map((user) => ({
    id: user._id.toString(),
    displayName: user.displayName as string,
    avatarUrl: user.avatarUrl as string | undefined,
    bio: user.bio as string | undefined,
  }));
}

/** Cập nhật profile của bản thân */
export async function updateProfile(
  userId: string,
  dto: UpdateProfileDto,
): Promise<IUser> {
  const updates: UpdateProfileDto = {};

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
