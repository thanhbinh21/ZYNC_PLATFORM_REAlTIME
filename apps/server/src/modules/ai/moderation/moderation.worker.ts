/**
 * Moderation Worker – AI-1 (Kafka Consumer)
 *
 * Consumes topic: `raw-messages`
 * Runs moderation async AFTER socket gateway has already broadcast the message.
 * If blocked → emits `content_blocked` socket event + publishes to `moderation-actions` topic.
 *
 * This worker is PASSIVE: it does NOT block message delivery (fail-open design).
 */

import type { Consumer, EachMessagePayload } from 'kafkajs';
import { createConsumer, produceMessage, KAFKA_TOPICS } from '../../../infrastructure/kafka';
import { moderateMessage } from './moderation.service';
import { getIO } from '../../../socket/gateway';
import { logger } from '../../../shared/logger';

const MODERATION_WORKER_GROUP_ID = 'moderation-worker-group';

interface RawMessagePayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  content?: string;
  type: string;        // text | image | video | audio | file | sticker
  mediaUrl?: string;
}

let moderationConsumer: Consumer | null = null;

// ─── Start ────────────────────────────────────────────────────────────────────

export async function startModerationWorker(): Promise<void> {
  try {
    moderationConsumer = createConsumer(MODERATION_WORKER_GROUP_ID);
    await moderationConsumer.connect();
    logger.info(`[ModerationWorker] Connected (groupId: ${MODERATION_WORKER_GROUP_ID})`);

    await moderationConsumer.subscribe({
      topic: KAFKA_TOPICS.RAW_MESSAGES,
      fromBeginning: false,
    });
    logger.info(`[ModerationWorker] Subscribed to topic: ${KAFKA_TOPICS.RAW_MESSAGES}`);

    await moderationConsumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        if (!payload.message.value) return;

        let raw: RawMessagePayload;
        try {
          raw = JSON.parse(payload.message.value.toString()) as RawMessagePayload;
        } catch {
          logger.warn('[ModerationWorker] Failed to parse message payload');
          return;
        }

        // Only moderate text and image/video content
        const isModeratableType = ['text', 'image', 'video'].includes(raw.type);
        if (!isModeratableType) return;

        try {
          const result = await moderateMessage({
            messageId:      raw.messageId,
            conversationId: raw.conversationId,
            senderId:       raw.senderId,
            contentType:    raw.type as 'text' | 'image' | 'video' | 'audio' | 'file',
            content:        raw.content,
            mediaUrl:       raw.mediaUrl,
          });

          // ── Handle blocked content ────────────────────────────────────────
          if (result.action === 'block') {
            logger.warn('[ModerationWorker] Message blocked', {
              messageId: raw.messageId,
              confidence: result.confidence,
              reason: result.reason,
            });

            // 1. Emit socket event `content_blocked` to the sender only
            const io = getIO();
            if (io) {
              io.to(`user:${raw.senderId}`).emit('content_blocked', {
                messageId:      raw.messageId,
                conversationId: raw.conversationId,
                reason:         'Tin nhắn của bạn vi phạm tiêu chuẩn cộng đồng và đã bị ẩn.',
                confidence:     result.confidence,
              });
            }

            // 2. Publish moderation action to Kafka for downstream consumers (audit, mute, etc.)
            await produceMessage(KAFKA_TOPICS.MODERATION_ACTIONS, raw.messageId, {
              messageId:      raw.messageId,
              conversationId: raw.conversationId,
              senderId:       raw.senderId,
              action:         'block',
              label:          result.label,
              confidence:     result.confidence,
              reason:         result.reason,
              source:         result.source,
              timestamp:      new Date().toISOString(),
            }).catch((err) =>
              logger.error('[ModerationWorker] Failed to produce moderation action', err),
            );
          }

          // ── Handle flagged (warning) content ──────────────────────────────
          if (result.action === 'flag') {
            logger.info('[ModerationWorker] Message flagged for admin review', {
              messageId: raw.messageId,
              confidence: result.confidence,
            });

            await produceMessage(KAFKA_TOPICS.MODERATION_ACTIONS, raw.messageId, {
              messageId:      raw.messageId,
              conversationId: raw.conversationId,
              senderId:       raw.senderId,
              action:         'flag',
              label:          result.label,
              confidence:     result.confidence,
              reason:         result.reason,
              source:         result.source,
              timestamp:      new Date().toISOString(),
            }).catch((err) =>
              logger.error('[ModerationWorker] Failed to produce flag event', err),
            );
          }
        } catch (err) {
          // Fail-open: log error but don't crash the worker
          logger.error('[ModerationWorker] Moderation failed (fail-open)', {
            messageId: raw.messageId,
            err: String(err),
          });
        }
      },
    });

    logger.info('✓ [ModerationWorker] Started — consuming raw-messages topic');
  } catch (err) {
    logger.error('[ModerationWorker] Failed to start', err);
    throw err;
  }
}

// ─── Stop ─────────────────────────────────────────────────────────────────────

export async function stopModerationWorker(): Promise<void> {
  if (!moderationConsumer) return;
  try {
    logger.info('[ModerationWorker] Stopping…');
    await moderationConsumer.disconnect();
    logger.info('✓ [ModerationWorker] Stopped');
  } catch (err) {
    logger.error('[ModerationWorker] Error on stop', err);
  }
}
