import { Kafka, type Producer, type Consumer, type Admin, logLevel } from 'kafkajs';
import { logger } from '../shared/logger';

export const KAFKA_TOPICS = {
  RAW_MESSAGES: 'raw-messages',
  NOTIFICATIONS: 'notifications',
  MODERATION_ACTIONS: 'moderation-actions',   // AI-1: content moderation results
  MESSAGE_EMBEDDINGS: 'message-embeddings',    // AI-2: async embed worker
  // ─── Dead Letter Queue (DLQ) Topics ────────────────────────────────────────
  // Khi worker xử lý thất bại, message sẽ được đẩy vào DLQ để xử lý lại sau
  RAW_MESSAGES_RETRY: 'raw-messages.retry',    // Retry topic (1-3 lần)
  RAW_MESSAGES_DLQ: 'raw-messages.dlq',        // Dead Letter Queue (quá retry)
  NOTIFICATIONS_RETRY: 'notifications.retry',
  NOTIFICATIONS_DLQ: 'notifications.dlq',
} as const;

let kafka: Kafka | null = null;
let producer: Producer | null = null;

export async function connectKafka(): Promise<void> {
  const brokers = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

  kafka = new Kafka({
    clientId: 'zync-server',
    brokers,
    logLevel: logLevel.WARN,
    retry: { initialRetryTime: 200, retries: 10 },
  });

  producer = kafka.producer({ idempotent: true });

  await producer.connect();
  logger.info('Kafka producer connected');

  // Tạo topic nếu chưa tồn tại
  const admin: Admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({
    topics: [
      { topic: KAFKA_TOPICS.RAW_MESSAGES, numPartitions: 3, replicationFactor: 1 },
      { topic: KAFKA_TOPICS.NOTIFICATIONS, numPartitions: 3, replicationFactor: 1 },
      { topic: KAFKA_TOPICS.MODERATION_ACTIONS, numPartitions: 1, replicationFactor: 1 },
      { topic: KAFKA_TOPICS.MESSAGE_EMBEDDINGS, numPartitions: 3, replicationFactor: 1 },
      // DLQ & Retry topics
      { topic: KAFKA_TOPICS.RAW_MESSAGES_RETRY, numPartitions: 1, replicationFactor: 1 },
      { topic: KAFKA_TOPICS.RAW_MESSAGES_DLQ, numPartitions: 1, replicationFactor: 1 },
      { topic: KAFKA_TOPICS.NOTIFICATIONS_RETRY, numPartitions: 1, replicationFactor: 1 },
      { topic: KAFKA_TOPICS.NOTIFICATIONS_DLQ, numPartitions: 1, replicationFactor: 1 },
    ],
    waitForLeaders: true,
  });
  await admin.disconnect();
}

export function getProducer(): Producer {
  if (!producer) throw new Error('Kafka producer not initialized. Call connectKafka() first.');
  return producer;
}

export function createConsumer(groupId: string): Consumer {
  if (!kafka) throw new Error('Kafka not initialized. Call connectKafka() first.');
  return kafka.consumer({ groupId });
}

export async function produceMessage(
  topic: string,
  key: string,
  value: Record<string, unknown>,
): Promise<void> {
  const producer = getProducer();
  await producer.send({
    topic,
    messages: [{ key, value: JSON.stringify(value) }],
  });
}
