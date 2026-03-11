import { createConsumer, KAFKA_TOPICS } from '../infrastructure/kafka';
import { logger } from '../shared/logger';

// TODO: import SDK FCM/APNs khi triển khai Phase 7

export async function startNotificationWorker(): Promise<void> {
  const consumer = createConsumer(`${process.env['KAFKA_GROUP_ID'] ?? 'zync-server'}-notifications`);

  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPICS.NOTIFICATIONS, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const payload = JSON.parse(message.value.toString()) as {
          userId: string;
          title: string;
          body: string;
          data?: Record<string, string>;
        };

        logger.debug(`Processing notification for user ${payload.userId}`);
        // TODO: lấy device token và gửi push notification qua FCM/APNs (Phase 7)
      } catch (err) {
        logger.error('Failed to process notification event', err);
      }
    },
  });

  logger.info('Notification worker started – consuming notifications');
}
