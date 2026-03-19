import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { getRedis } from '../../infrastructure/redis';
import { BadRequestError } from '../../shared/errors';
import { logger } from '../../shared/logger';

const OTP_TTL_SECONDS = 5 * 60; // 5 phút

function shouldUseOtpHardcode(): boolean {
  return process.env['OTP_HARDCODE'] === 'true' && process.env['NODE_ENV'] !== 'production';
}

/** Sinh mã OTP 6 chữ số (hoặc dùng hardcode nếu môi trường dev) */
export function generateOtp(): string {
  if (shouldUseOtpHardcode()) {
    return process.env['OTP_HARDCODE_VALUE'] ?? '123456';
  }
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

/** Lưu OTP vào Redis với TTL 5 phút */
export async function storeOtp(identifier: string, otp: string): Promise<void> {
  const redis = getRedis();
  await redis.set(`otp:${identifier}`, otp, 'EX', OTP_TTL_SECONDS);
}

/** Kiểm tra OTP. Trả về true nếu hợp lệ và xóa OTP sau khi verify thành công. */
export async function verifyOtp(identifier: string, otp: string): Promise<boolean> {
  const redis = getRedis();
  const stored = await redis.get(`otp:${identifier}`);
  if (!stored || stored !== otp) return false;
  // Xóa OTP sau khi dùng (one-time use)
  await redis.del(`otp:${identifier}`);
  return true;
}

/** Gửi OTP qua SMS (Twilio) hoặc Email (Nodemailer/Resend) tuỳ identifier */
export async function sendOtp(identifier: string, otp: string): Promise<void> {
  // Môi trường non-production có thể dùng OTP hardcode để tránh phụ thuộc SMTP/SMS
  if (shouldUseOtpHardcode()) {
    logger.info(`[OTP HARDCODE] identifier=${identifier} otp=${otp}`);
    return;
  }

  const isPhone = /^\+?\d{9,15}$/.test(identifier.replace(/\s/g, ''));

  if (isPhone) {
    await sendSmsTwilio(identifier, otp);
  } else {
    await sendEmailResend(identifier, otp);
  }
}

async function sendSmsTwilio(phone: string, otp: string): Promise<void> {
  const accountSid = process.env['TWILIO_ACCOUNT_SID'];
  const authToken = process.env['TWILIO_AUTH_TOKEN'];
  const from = process.env['TWILIO_PHONE_NUMBER'];

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio credentials not configured');
  }

  const client = twilio(accountSid, authToken);
  await client.messages.create({
    body: `Mã xác thực Zync của bạn là: ${otp}. Có hiệu lực trong 5 phút.`,
    from,
    to: phone,
  });
  logger.info(`OTP SMS sent to ${phone}`);
}

async function sendEmailResend(email: string, otp: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env['SMTP_HOST'] ?? 'smtp.resend.com',
    port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
    secure: false,
    auth: {
      user: process.env['SMTP_USER'] ?? 'resend',
      pass: process.env['SMTP_PASS'],
    },
  });

  try {
    await transporter.sendMail({
      from: process.env['SMTP_FROM'] ?? 'noreply@zync.app',
      to: email,
      subject: 'Mã xác thực Zync',
      text: `Mã xác thực của bạn là: ${otp}. Có hiệu lực trong 5 phút.`,
      html: `<p>Mã xác thực của bạn là: <strong>${otp}</strong>. Có hiệu lực trong <strong>5 phút</strong>.</p>`,
    });
    logger.info(`OTP email sent to ${email}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error';
    const isResendSandboxError =
      message.includes('You can only send testing emails to your own email address') ||
      message.includes('verify a domain at resend.com/domains');

    if (isResendSandboxError) {
      throw new BadRequestError(
        'Resend đang ở chế độ test. Hãy verify domain tại resend.com/domains và đặt SMTP_FROM bằng email thuộc domain đã verify.',
      );
    }

    throw error;
  }
}
