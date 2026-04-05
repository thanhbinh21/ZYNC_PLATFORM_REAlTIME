import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getRedis } from '../../infrastructure/redis';
import { UserModel, type IUser } from '../users/user.model';
import { DeviceTokenModel } from '../users/device-token.model';
import { removeDeviceToken } from '../users/users.service';
import { generateOtp, storeOtp, sendOtp, verifyOtp as verifyOtpRedis } from './otp.service';
import { BadRequestError, UnauthorizedError } from '../../shared/errors';
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

function parseIdentifier(identifier: string): {
  normalized: string;
  isPhone: boolean;
} {
  const trimmed = identifier.trim();
  const compact = trimmed.replace(/\s/g, '');
  const isPhone = /^\+?\d{9,15}$/.test(compact);

  if (isPhone) {
    return { normalized: compact, isPhone: true };
  }

  return { normalized: trimmed.toLowerCase(), isPhone: false };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findUserIncludingPassword(query: { phoneNumber?: string; email?: string }): Promise<IUser | null> {
  const result = UserModel.findOne(query) as unknown as Promise<IUser | null> & {
    select?: (projection: string) => Promise<IUser | null>;
  };

  if (typeof result.select === 'function') {
    return result.select('+passwordHash');
  }

  return result;
}

async function upsertDeviceToken(
  userId: string,
  deviceInfo?: { deviceToken?: string; platform?: 'ios' | 'android' | 'web' },
): Promise<void> {
  if (!deviceInfo?.deviceToken || !deviceInfo.platform) {
    return;
  }

  await DeviceTokenModel.findOneAndUpdate(
    { deviceToken: deviceInfo.deviceToken },
    { userId, deviceToken: deviceInfo.deviceToken, platform: deviceInfo.platform },
    { upsert: true, new: true },
  );
}

function toVerifyOtpResult(user: {
  id: string;
  displayName: string;
  phoneNumber?: string;
  email?: string;
  avatarUrl?: string;
}): VerifyOtpResult {
  const { accessToken, refreshToken } = issueTokenPair(user.id);

  return {
    accessToken,
    refreshToken,
    user,
  };
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
  const { normalized } = parseIdentifier(identifier);
  const otp = generateOtp();
  await storeOtp(normalized, otp);
  await sendOtp(normalized, otp);
  logger.info(`OTP issued for ${normalized}`);
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
  password?: string,
  deviceInfo?: { deviceToken?: string; platform?: 'ios' | 'android' | 'web' },
): Promise<VerifyOtpResult> {
  const { normalized, isPhone } = parseIdentifier(identifier);

  const valid = await verifyOtpRedis(normalized, otp);
  if (!valid) throw new UnauthorizedError('Invalid or expired OTP');

  const query = isPhone
    ? { phoneNumber: normalized }
    : { email: normalized };

  // Upsert user
  let user = await findUserIncludingPassword(query);
  if (!user) {
    if (!displayName) {
      displayName = isPhone
        ? `User${normalized.slice(-4)}`
        : normalized.split('@')[0];
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    user = await UserModel.create({
      ...query,
      displayName,
      passwordHash,
    });
    logger.info(`New user created: ${user.id}`);
  } else {
    throw new UnauthorizedError('Tài khoản đã tồn tại. Vui lòng đăng nhập bằng email + mật khẩu + OTP');
  }

  await upsertDeviceToken(user.id as string, deviceInfo);

  return toVerifyOtpResult({
    id: user.id as string,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    email: user.email,
    avatarUrl: user.avatarUrl,
  });
}

// ─── Email + Password + OTP Login ───────────────────────────────────────────

export async function requestLoginOtpWithPassword(email: string, password: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const user = await findUserIncludingPassword({ email: normalizedEmail });

  if (!user?.passwordHash) {
    throw new UnauthorizedError('Email hoặc mật khẩu không đúng');
  }

  const isMatched = await bcrypt.compare(password, user.passwordHash);
  if (!isMatched) {
    throw new UnauthorizedError('Email hoặc mật khẩu không đúng');
  }

  const otp = generateOtp();
  await storeOtp(normalizedEmail, otp);
  await sendOtp(normalizedEmail, otp);
  logger.info(`Password OTP issued for ${normalizedEmail}`);
}

export async function verifyLoginWithPasswordAndOtp(
  email: string,
  password: string,
  otp: string,
  deviceInfo?: { deviceToken?: string; platform?: 'ios' | 'android' | 'web' },
): Promise<VerifyOtpResult> {
  const normalizedEmail = normalizeEmail(email);
  const user = await findUserIncludingPassword({ email: normalizedEmail });

  if (!user?.passwordHash) {
    throw new UnauthorizedError('Email hoặc mật khẩu không đúng');
  }

  const isMatched = await bcrypt.compare(password, user.passwordHash);
  if (!isMatched) {
    throw new UnauthorizedError('Email hoặc mật khẩu không đúng');
  }

  const validOtp = await verifyOtpRedis(normalizedEmail, otp);
  if (!validOtp) {
    throw new UnauthorizedError('OTP không hợp lệ hoặc đã hết hạn');
  }

  await upsertDeviceToken(user.id as string, deviceInfo);

  return toVerifyOtpResult({
    id: user.id as string,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    email: user.email,
    avatarUrl: user.avatarUrl,
  });
}

// ─── Forgot Password ────────────────────────────────────────────────────────

export async function requestForgotPasswordOtp(identifier: string): Promise<void> {
  const { normalized, isPhone } = parseIdentifier(identifier);
  const user = await findUserIncludingPassword(
    isPhone ? { phoneNumber: normalized } : { email: normalizeEmail(normalized) },
  );

  if (!user) {
    throw new UnauthorizedError('Tài khoản không tồn tại trong hệ thống');
  }

  const otp = generateOtp();
  await storeOtp(normalized, otp);
  await sendOtp(normalized, otp);
  logger.info(`Forgot password OTP issued for ${normalized}`);
}

export async function resetForgotPassword(identifier: string, otp: string, newPassword: string): Promise<void> {
  const { normalized, isPhone } = parseIdentifier(identifier);
  const user = await findUserIncludingPassword(
    isPhone ? { phoneNumber: normalized } : { email: normalizeEmail(normalized) },
  );

  if (!user) {
    throw new UnauthorizedError('Tài khoản không tồn tại trong hệ thống');
  }

  const validOtp = await verifyOtpRedis(normalized, otp);
  if (!validOtp) {
    throw new UnauthorizedError('OTP không hợp lệ hoặc đã hết hạn');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
}

// ─── Google Login ────────────────────────────────────────────────────────────

export async function loginWithGoogle(
  idToken: string,
  deviceInfo?: { deviceToken?: string; platform?: 'ios' | 'android' | 'web' },
): Promise<VerifyOtpResult> {
  const audience = process.env['GOOGLE_CLIENT_ID'];
  if (!audience) {
    throw new BadRequestError('GOOGLE_CLIENT_ID chưa được cấu hình');
  }

  let ticket: { getPayload: () => { email?: string; email_verified?: boolean; name?: string; picture?: string } | undefined };
  try {
    const { OAuth2Client } = await import('google-auth-library');
    const googleClient = new OAuth2Client();
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience,
    });
  } catch {
    throw new UnauthorizedError('Google token không hợp lệ');
  }

  const payload = ticket.getPayload();
  const email = payload?.email?.trim().toLowerCase();
  const emailVerified = payload?.email_verified;

  if (!email || !emailVerified) {
    throw new UnauthorizedError('Tài khoản Google chưa xác thực email');
  }

  const displayName = payload?.name?.trim() || email.split('@')[0] || 'Google User';
  const avatarUrl = payload?.picture;

  const user = await UserModel.findOneAndUpdate(
    { email },
    {
      email,
      displayName,
      avatarUrl,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  await upsertDeviceToken(user.id as string, deviceInfo);

  return toVerifyOtpResult({
    id: user.id as string,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    email: user.email,
    avatarUrl: user.avatarUrl,
  });
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
