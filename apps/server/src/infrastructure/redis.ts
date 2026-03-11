import Redis from 'ioredis';
import { logger } from '../shared/logger';

let redisClient: Redis | null = null;

export async function connectRedis(): Promise<void> {
  const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

  redisClient = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });

  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('error', (err) => logger.error('Redis error', err));
  redisClient.on('close', () => logger.warn('Redis connection closed'));

  await redisClient.connect();
}

export function getRedis(): Redis {
  if (!redisClient) throw new Error('Redis client not initialized. Call connectRedis() first.');
  return redisClient;
}

/** Tạo connection Redis riêng cho subscriber – Pub/Sub yêu cầu connection độc lập, không dùng chung với publisher */
export function createRedisDuplicate(): Redis {
  return getRedis().duplicate();
}
