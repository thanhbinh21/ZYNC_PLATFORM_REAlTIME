import { UserModel, type IUser } from './user.model';
import { DeviceTokenModel } from './device-token.model';
import { NotFoundError } from '../../shared/errors';
import type { UpdateProfileDto, UpsertDeviceTokenDto } from '../auth/auth.schema';

/** Lấy profile của bản thân (đầy đủ thông tin) */
export async function getMe(userId: string): Promise<IUser> {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  return user;
}

/** Lấy profile của người dùng khác (thông tin công khai) */
export async function getUserById(userId: string): Promise<Partial<IUser>> {
  const user = await UserModel.findById(userId).select(
    'displayName avatarUrl bio createdAt',
  );
  if (!user) throw new NotFoundError('User not found');
  return user;
}

/** Cập nhật profile của bản thân */
export async function updateProfile(
  userId: string,
  dto: UpdateProfileDto,
): Promise<IUser> {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: dto },
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
