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
import { logger } from './shared/logger';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

async function bootstrap(): Promise<void> {
  // Kết nối infrastructure
  await connectDatabase();
  await connectRedis();

  // Kafka là optional khi dev local – bật bằng KAFKA_ENABLED=true trong .env
  if (process.env['KAFKA_ENABLED'] === 'true') {
    await connectKafka();
    // Task 6.2: Start Kafka consumer worker
    void startMessageWorker().catch((err: unknown) => {
      logger.error('Message worker failed', err);
    });
  } else {
    logger.warn('Kafka bị tắt (KAFKA_ENABLED != true). Workers sẽ không chạy.');
  }

  // Tạo Express app và HTTP server
  const app = createApp();
  const httpServer = http.createServer(app);

  // Khởi tạo Socket.IO gateway
  initSocketGateway(httpServer);

  // Bắt đầu lắng nghe request
  httpServer.listen(PORT, () => {
    logger.info(`Zync server khởi động trên cổng ${PORT} [${process.env['NODE_ENV']}]`);
  });

  // Tắt server an toàn khi nhận signal
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Nhận tín hiệu ${signal}, đang tắt server...`);
    
    // Task 6.2: Stop message worker gracefully
    if (process.env['KAFKA_ENABLED'] === 'true') {
      await stopMessageWorker();
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
