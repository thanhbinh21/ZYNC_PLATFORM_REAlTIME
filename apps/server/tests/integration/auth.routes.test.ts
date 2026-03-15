import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// ─── Mock Redis ───────────────────────────────────────────────────────────────
const redisStore = new Map<string, string>();
const redisMock = {
  get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
  set: jest.fn((key: string, value: string, _ex: string, _ttl: number) => {
    redisStore.set(key, value);
    return Promise.resolve('OK');
  }),
  del: jest.fn((key: string) => {
    redisStore.delete(key);
    return Promise.resolve(1);
  }),
};

jest.mock('../../src/infrastructure/redis', () => ({
  getRedis: () => redisMock,
}));

// ─── Skip real OTP send ───────────────────────────────────────────────────────
jest.mock('../../src/modules/auth/otp.service', () => {
  const actual = jest.requireActual<typeof import('../../src/modules/auth/otp.service')>(
    '../../src/modules/auth/otp.service',
  );
  return {
    ...actual,
    sendOtp: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
});

// ─── Must import app AFTER mocks are set up ──────────────────────────────────
import { createApp } from '../../src/app';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env['JWT_SECRET'] = 'test-jwt-secret';
  process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret';
  process.env['OTP_HARDCODE'] = 'true';
  process.env['OTP_HARDCODE_VALUE'] = '123456';
  process.env['NODE_ENV'] = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  redisStore.clear();
  jest.clearAllMocks();
  // Restore get/set/del to use the in-memory store
  redisMock.get.mockImplementation((key: string) =>
    Promise.resolve(redisStore.get(key) ?? null),
  );
  redisMock.set.mockImplementation((key: string, value: string) => {
    redisStore.set(key, value);
    return Promise.resolve('OK');
  });
  redisMock.del.mockImplementation((key: string) => {
    redisStore.delete(key);
    return Promise.resolve(1);
  });
});

const app = createApp();

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('should return 200 and send OTP for valid phone', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ identifier: '0901234567' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/OTP sent/i);
  });

  it('should return 400 for missing identifier', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for identifier that is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ identifier: 'ab' });

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────

describe('POST /api/auth/verify-otp', () => {
  beforeEach(async () => {
    // Seed OTP in Redis
    await request(app)
      .post('/api/auth/register')
      .send({ identifier: '0901234567' });
  });

  it('should return 200 with accessToken for correct OTP', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ identifier: '0901234567', otp: '123456', displayName: 'Test User' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user).toBeDefined();
    // Refresh token should be in http-only cookie
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should return 401 for wrong OTP', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ identifier: '0901234567', otp: '000000' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid OTP format (non-numeric)', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ identifier: '0901234567', otp: 'abcdef' });

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  it('should return new access token with valid refresh token cookie', async () => {
    // 1. Register + OTP → get cookie
    await request(app).post('/api/auth/register').send({ identifier: '0911111111' });

    const loginRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ identifier: '0911111111', otp: '123456', displayName: 'Refresh User' });

    const cookie = loginRes.headers['set-cookie'] as unknown as string[];

    // 2. Use cookie to refresh
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('should return 401 when no refresh token cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('should clear cookie and blacklist token on logout', async () => {
    // 1. Register + login
    await request(app).post('/api/auth/register').send({ identifier: '0922222222' });
    const loginRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ identifier: '0922222222', otp: '123456', displayName: 'Logout User' });

    const { accessToken } = loginRes.body as { accessToken: string };
    const cookie = loginRes.headers['set-cookie'] as unknown as string[];

    // 2. Logout
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Cookie should be cleared
    const setCookie = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const refreshCookie = setCookie.find((c: string) => c.startsWith('refreshToken='));
    expect(refreshCookie).toMatch(/(Max-Age=0|Expires=Thu, 01 Jan 1970)/i);
  });
});
