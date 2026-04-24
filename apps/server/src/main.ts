import path from 'path';
import dotenv from 'dotenv';

// Tìm .env từ root monorepo (chạy từ apps/server/ nên cần đi lên 3 cấp)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './infrastructure/database';
import { connectRedis } from './infrastructure/redis';
import { connectKafka } from './infrastructure/kafka';
import { initSocketGateway } from './socket/gateway';
import { startMessageWorker, stopMessageWorker } from './workers/message.worker';
import { startNotificationWorker, stopNotificationWorker } from './workers/notification.worker';
import { startModerationWorker, stopModerationWorker } from './modules/ai/moderation/moderation.worker';
import { runPgvectorMigration, isNeonAvailable } from './infrastructure/neon';
import { logger } from './shared/logger';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const HOST = process.env['HOST'];

async function bootstrap(): Promise<void> {
  // Kết nối infrastructure
  await connectDatabase();
  await connectRedis();

  // Neon PostgreSQL + pgvector (AI features) – optional, skip if not configured
  if (isNeonAvailable()) {
    await runPgvectorMigration().catch((err: unknown) => {
      logger.warn('[Neon] pgvector migration failed – AI vector features disabled', err);
    });
  } else {
    logger.warn('[Neon] NEON_DATABASE_URL not set – AI vector features disabled');
  }

  // Kafka là optional khi dev local – bật bằng KAFKA_ENABLED=true trong .env
  if (process.env['KAFKA_ENABLED'] === 'true') {
    await connectKafka();
    // Task 6.2: Start Kafka consumer worker
    void startMessageWorker().catch((err: unknown) => {
      logger.error('Message worker failed', err);
    });
    void startNotificationWorker().catch((err: unknown) => {
      logger.error('Notification worker failed', err);
    });
    // AI-1: Moderation worker (passive, fail-open)
    if (process.env['AI_MODERATION_ENABLED'] !== 'false') {
      void startModerationWorker().catch((err: unknown) => {
        logger.error('Moderation worker failed to start (non-fatal)', err);
      });
    }
  } else {
    logger.warn('Kafka bị tắt (KAFKA_ENABLED != true). Workers sẽ không chạy.');
  }

  // Tạo Express app và HTTP server
  const app = createApp();
  const httpServer = http.createServer(app);

  // Khởi tạo Socket.IO gateway
  initSocketGateway(httpServer);

  // Bắt đầu lắng nghe request
  const onListen = (): void => {
    const address = HOST ? `${HOST}:${PORT}` : `${PORT}`;
    logger.info(`Zync server started at ${address} [${process.env['NODE_ENV']}]`);
  };
  if (HOST) {
    httpServer.listen(PORT, HOST, onListen);
  } else {
    httpServer.listen(PORT, onListen);
  }

  // Tắt server an toàn khi nhận signal
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Nhận tín hiệu ${signal}, đang tắt server...`);
    
    // Task 6.2: Stop message worker gracefully
    if (process.env['KAFKA_ENABLED'] === 'true') {
      await stopMessageWorker();
      await stopNotificationWorker();
      await stopModerationWorker();
    }
    
    httpServer.close(() => {
      logger.info('HTTP server đã đóng');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
}

bootstrap().catch((err: unknown) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});

