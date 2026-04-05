import type { Consumer, EachMessagePayload } from 'kafkajs';
import { createConsumer, KAFKA_TOPICS } from '../infrastructure/kafka';
import { MessageModel } from '../modules/messages/message.model';
import { MessagesService } from '../modules/messages/messages.service';
import { logger } from '../shared/logger';

const BATCH_SIZE = 100;
const BATCH_TIMEOUT_MS = 500; // 500ms for Phase 5 MVP
const MSG_WORKER_GROUP_ID = 'message-worker-group'; // Task 6.2 spec
const SESSION_TIMEOUT = 30000; // Task 6.2 spec

interface RawMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker';
  mediaUrl?: string;
  idempotencyKey: string;
  createdAt: string;
}

let messageWorkerConsumer: Consumer | null = null;
let kafkaInsertFailureCallback: ((messages: any[]) => Promise<void>) | null = null;

/**
 * Set callback for when Kafka batch insert fails
 * Used for fallback to direct DB insert via service
 */
export function setKafkaInsertFailureCallback(callback: (messages: any[]) => Promise<void>): void {
  kafkaInsertFailureCallback = callback;
}

/**
 * Notify gateway that Kafka batch insert has recovered
 * Used to disable fallback mode when Kafka recovers
 */
export function notifyKafkaRecovery(): void {
  try {
    // Import here to avoid circular dependency
    const { setKafkaFailureMode } = require('../socket/gateway');
    setKafkaFailureMode(false);
  } catch (err) {
    // Ignore circular dependency errors
  }
}

export async function startMessageWorker(): Promise<void> {
  try {
    // Task 6.2: Create consumer with specified groupId
    messageWorkerConsumer = createConsumer(MSG_WORKER_GROUP_ID);

    await messageWorkerConsumer.connect();
    logger.info(`Message worker connected (groupId: ${MSG_WORKER_GROUP_ID})`);

    // Subscribe to raw-messages topic
    await messageWorkerConsumer.subscribe({ topic: KAFKA_TOPICS.RAW_MESSAGES, fromBeginning: false });
    logger.info(`Message worker subscribed to topic: ${KAFKA_TOPICS.RAW_MESSAGES}`);

    // Task 6.2: Batch collection variables
    const batch: Array<{
      conversationId: string;
      senderId: string;
      content: string;
      type: string;
      mediaUrl?: string;
      idempotencyKey: string;
      createdAt: Date;
    }> = [];

    let batchTimer: NodeJS.Timeout | null = null;

    /**
     * Task 6.2: Batch insert to MongoDB with metadata
     * Calls MessagesService.insertMessageWithMetadata for each message
     * Handles all DB operations: Message + MessageStatus + conversation metadata
     */
    const processBatch = async (): Promise<void> => {
      if (batch.length === 0) return;

      const toInsert = batch.splice(0, batch.length);
      let successCount = 0;
      
      try {
        for (const msg of toInsert) {
          try {
            await MessagesService.insertMessageWithMetadata(
              msg.conversationId,
              msg.senderId,
              msg.content,
              msg.type as 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker',
              msg.idempotencyKey,
              msg.mediaUrl,
            );
            successCount++;
          } catch (err) {
            logger.error(`[Batch] Failed to insert message ${msg.idempotencyKey}`, err);
            // Continue with next message
          }
        }
        
        logger.debug(`✓ Batch inserted ${successCount}/${toInsert.length} messages`);
        
        // Kafka batch insert successful, disable fallback mode if it was enabled
        if (successCount > 0) {
          notifyKafkaRecovery();
        }
      } catch (err: unknown) {
        logger.error('Message batch processing error (triggering fallback)', err);
        
        // Trigger fallback for any failed messages
        if (kafkaInsertFailureCallback && successCount < toInsert.length) {
          const failedMessages = toInsert.slice(successCount);
          try {
            await kafkaInsertFailureCallback(failedMessages);
            logger.info(`✓ Fallback inserted ${failedMessages.length} messages via service`);
          } catch (fallbackErr) {
            logger.error('Fallback insert also failed', fallbackErr);
          }
        }
      }
    };

    /**
     * Task 6.2: Schedule batch flush with timeout
     */
    const scheduleBatchFlush = (): void => {
      if (batchTimer) return;

      batchTimer = setTimeout(async () => {
        batchTimer = null;
        if (batch.length > 0) {
          logger.debug(`Batch timeout (${BATCH_TIMEOUT_MS}ms): processing ${batch.length} messages`);
          await processBatch();
        }
      }, BATCH_TIMEOUT_MS);
    };

    /**
     * Task 6.2: Main consumer loop
     * Note: sessionTimeout (30s) and heartbeat (3s) configured in KafkaJS defaults
     */
    await messageWorkerConsumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        if (!payload.message.value) {
          logger.warn('Received empty message value');
          return;
        }

        try {
          const rawMessage = JSON.parse(payload.message.value.toString()) as RawMessage;

          batch.push({
            conversationId: rawMessage.conversationId,
            senderId: rawMessage.senderId,
            content: rawMessage.content,
            type: rawMessage.type,
            mediaUrl: rawMessage.mediaUrl,
            idempotencyKey: rawMessage.idempotencyKey,
            createdAt: new Date(rawMessage.createdAt),
          });

          logger.debug(`Buffered message ${rawMessage.messageId} (batch: ${batch.length}/${BATCH_SIZE})`);

          // Task 6.2: Check if batch is full
          if (batch.length >= BATCH_SIZE) {
            if (batchTimer) {
              clearTimeout(batchTimer);
              batchTimer = null;
            }
            logger.debug(`Batch full: processing ${batch.length} messages`);
            await processBatch();
            // Reset timer for next batch
            scheduleBatchFlush();
          } else {
            // Task 6.2: Reset timer for next potential flush
            scheduleBatchFlush();
          }
        } catch (err) {
          logger.error('Error processing Kafka message', err);
          // Task 6.2: Error handling - continue to next message
        }
      },
    });

    logger.info('✓ Message worker started – consuming raw-messages topic');
  } catch (err) {
    logger.error('Message worker failed to start', err);
    throw err;
  }
}

/**
 * Task 6.2: Graceful shutdown handler
 */
export async function stopMessageWorker(): Promise<void> {
  if (!messageWorkerConsumer) return;

  try {
    logger.info('Stopping message worker...');
    await messageWorkerConsumer.disconnect();
    logger.info('✓ Message worker consumer disconnected');
  } catch (err) {
    logger.error('Error stopping message worker', err);
  }
}
