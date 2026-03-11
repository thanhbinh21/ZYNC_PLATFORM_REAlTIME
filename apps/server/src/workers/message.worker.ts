import { createConsumer, KAFKA_TOPICS } from '../infrastructure/kafka';
import { MessageModel } from '../modules/messages/message.model';
import { logger } from '../shared/logger';

const BATCH_SIZE = 100;
const BATCH_INTERVAL_MS = 500;

export async function startMessageWorker(): Promise<void> {
  const consumer = createConsumer(`${process.env['KAFKA_GROUP_ID'] ?? 'zync-server'}-messages`);

  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPICS.RAW_MESSAGES, fromBeginning: false });

  const batch: Array<{
    conversationId: string;
    senderId: string;
    content: string;
    type: string;
    mediaUrl?: string;
    idempotencyKey: string;
    createdAt: Date;
  }> = [];

  let flushTimer: NodeJS.Timeout | null = null;

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    const toInsert = batch.splice(0, batch.length);
    try {
      await MessageModel.insertMany(toInsert, { ordered: false });
      logger.debug(`Batch inserted ${toInsert.length} messages`);
    } catch (err: unknown) {
      // ordered: false – lỗi duplicate không chặn các bản ghi còn lại
      logger.error('Message batch insert error', err);
    }
  };

  const scheduleFlush = (): void => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, BATCH_INTERVAL_MS);
  };

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const payload = JSON.parse(message.value.toString()) as {
          conversationId: string;
          senderId: string;
          content: string;
          type: string;
          mediaUrl?: string;
          idempotencyKey: string;
          createdAt: string;
        };

        batch.push({ ...payload, createdAt: new Date(payload.createdAt) });

        if (batch.length >= BATCH_SIZE) {
          if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
          }
          await flush();
        } else {
          scheduleFlush();
        }
      } catch (err) {
        logger.error('Failed to process raw-messages event', err);
      }
    },
  });

  logger.info('Message worker started – consuming raw-messages');
}
