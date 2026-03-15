import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getRedis } from '../../infrastructure/redis';
import { UserModel } from '../users/user.model';
import { DeviceTokenModel } from '../users/device-token.model';
import { removeDeviceToken } from '../users/users.service';
import { generateOtp, storeOtp, sendOtp, verifyOtp as verifyOtpRedis } from './otp.service';
import { UnauthorizedError } from '../../shared/errors';
import { logger } from '../../shared/logger';

const ACCESS_TOKEN_TTL = '15m';     // 15 phút
const REFRESH_TOKEN_TTL = '7d';     // 7 ngày
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;     // userId
  jti: string;     // JWT ID (dùng cho blacklist)
  iat?: number;
  exp?: number;
}

function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET not configured');
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env['JWT_REFRESH_SECRET'];
  if (!secret) throw new Error('JWT_REFRESH_SECRET not configured');
  return secret;
}

/** Phát hành cặp access + refresh token cho một userId */
function issueTokenPair(userId: string): TokenPair {
  const accessJti = uuidv4();
  const refreshJti = uuidv4();

  const accessToken = jwt.sign({ sub: userId, jti: accessJti }, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
  });

  const refreshToken = jwt.sign({ sub: userId, jti: refreshJti }, getRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_TTL,
  });

  return { accessToken, refreshToken };
}

// ─── Register ────────────────────────────────────────────────────────────────

/** Tạo và gửi OTP cho identifier (phone hoặc email) */
export async function register(identifier: string): Promise<void> {
  const otp = generateOtp();
  await storeOtp(identifier, otp);
  await sendOtp(identifier, otp);
  logger.info(`OTP issued for ${identifier}`);
}

// ─── Verify OTP ──────────────────────────────────────────────────────────────

export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    displayName: string;
    phoneNumber?: string;
    email?: string;
    avatarUrl?: string;
  };
}

/**
 * Xác thực OTP và upsert user. Nếu user chưa tồn tại, tạo mới.
 * Trả về JWT pair.
 */
export async function verifyOtpAndLogin(
  identifier: string,
  otp: string,
  displayName?: string,
  deviceInfo?: { deviceToken?: string; platform?: 'ios' | 'android' | 'web' },
): Promise<VerifyOtpResult> {
  const valid = await verifyOtpRedis(identifier, otp);
  if (!valid) throw new UnauthorizedError('Invalid or expired OTP');

  // Phân biệt phone vs email
  const isPhone = /^\+?\d{9,15}$/.test(identifier.replace(/\s/g, ''));
  const query = isPhone ? { phoneNumber: identifier } : { email: identifier };

  // Upsert user
  let user = await UserModel.findOne(query);
  if (!user) {
    if (!displayName) {
      // Tự động tạo tên hiển thị từ identifier nếu không cung cấp
      displayName = isPhone ? `User${identifier.slice(-4)}` : identifier.split('@')[0];
    }
    user = await UserModel.create({
      ...query,
      displayName,
    });
    logger.info(`New user created: ${user.id}`);
  }

  // Lưu device token nếu cung cấp
  if (deviceInfo?.deviceToken && deviceInfo?.platform) {
    await DeviceTokenModel.findOneAndUpdate(
      { deviceToken: deviceInfo.deviceToken },
      { userId: user.id, deviceToken: deviceInfo.deviceToken, platform: deviceInfo.platform },
      { upsert: true, new: true },
    );
  }

  const { accessToken, refreshToken } = issueTokenPair(user.id as string);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id as string,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  };
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

/** Refresh access token bằng refresh token hợp lệ */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  let payload: JwtPayload;
  try {
    payload = jwt.verify(refreshToken, getRefreshSecret()) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Kiểm tra refresh token không bị blacklist
  const redis = getRedis();
  const blacklisted = await redis.get(`blacklist:token:${payload.jti}`);
  if (blacklisted) throw new UnauthorizedError('Refresh token has been revoked');

  // Phát hành access token mới
  const newAccessJti = uuidv4();
  const newAccessToken = jwt.sign(
    { sub: payload.sub, jti: newAccessJti },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  return newAccessToken;
}

// ─── Logout ──────────────────────────────────────────────────────────────────

/**
 * Blacklist access token (và refresh token nếu có) trong Redis.
 * TTL = thời gian còn lại của token (hoặc max 15m).
 */
export async function logout(
  accessToken: string,
  refreshToken?: string,
  deviceToken?: string,
): Promise<void> {
  const redis = getRedis();
  let accessPayload: JwtPayload | null = null;

  // Blacklist access token
  try {
    accessPayload = jwt.decode(accessToken) as JwtPayload | null;
    if (accessPayload?.jti && accessPayload?.exp) {
      const ttl = Math.max(accessPayload.exp - Math.floor(Date.now() / 1000), 1);
      await redis.set(`blacklist:token:${accessPayload.jti}`, '1', 'EX', ttl);
    }
  } catch {
    // Nếu decode lỗi, bỏ qua
  }

  // Blacklist refresh token nếu có
  if (refreshToken) {
    try {
      const payload = jwt.decode(refreshToken) as JwtPayload | null;
      if (payload?.jti) {
        await redis.set(
          `blacklist:token:${payload.jti}`,
          '1',
          'EX',
          REFRESH_TOKEN_TTL_SECONDS,
        );
      }
    } catch {
      // Bỏ qua nếu không decode được
    }
  }

  // Thu hồi device token hiện tại để ngừng nhận push từ thiết bị vừa logout
  if (deviceToken && accessPayload?.sub) {
    await removeDeviceToken(accessPayload.sub, deviceToken);
  }

  logger.info('User logged out – tokens blacklisted');
}
