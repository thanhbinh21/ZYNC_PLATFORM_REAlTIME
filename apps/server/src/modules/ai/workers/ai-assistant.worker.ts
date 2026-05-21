import type { Consumer, EachMessagePayload } from 'kafkajs';
import { Types } from 'mongoose';
import { createConsumer, KAFKA_TOPICS } from '../../../infrastructure/kafka';
import { logger } from '../../../shared/logger';
import { ConversationMemberModel } from '../../conversations/conversation-member.model';
import { ConversationModel } from '../../conversations/conversation.model';
import { MessageModel } from '../../messages/message.model';
import { UserModel } from '../../users/user.model';
import { AiCatchupDigestModel } from '../catchup/catchup.model';
import { AiCatchupModelOutputSchema } from '../catchup/catchup.schema';
import { createAIProvider } from '../providers';
import type { AIProvider } from '../providers';
import { AiAssistantService } from '../assistant/assistant.service';
import { AiReminderService } from '../reminders/reminder.service';

const ASSISTANT_WORKER_GROUP = 'ai-assistant-worker-group';
const WORKER_SESSION_TIMEOUT_MS = parseInt(process.env['AI_ASSISTANT_KAFKA_SESSION_TIMEOUT_MS'] ?? '120000', 10);
const WORKER_HEARTBEAT_INTERVAL_MS = parseInt(process.env['AI_ASSISTANT_KAFKA_HEARTBEAT_INTERVAL_MS'] ?? '3000', 10);
const MAX_RANGE_MESSAGES = 100;
const MAX_INPUT_CHARS = 20_000;
const CONTEXT_MESSAGE_COUNT = 5;
const MAX_RETRIES = 2;

interface AssistantJobPayload {
  itemId: string;
  digestId?: string;
  userId: string;
  conversationId: string;
  type: 'catchup_digest';
  requestedAt: string;
}

interface CatchupMessage {
  _id: unknown;
  conversationId: string;
  senderId: string;
  content?: string;
  type: string;
  idempotencyKey: string;
  createdAt: Date;
  callHistory?: {
    status?: string;
    callType?: string;
    durationSeconds?: number;
  };
}

let assistantConsumer: Consumer | null = null;

function startHeartbeatLoop(heartbeat: () => Promise<void>): () => void {
  let inFlight = false;
  const timer = setInterval(() => {
    if (inFlight) return;
    inFlight = true;
    heartbeat()
      .catch((err) => {
        logger.warn('[AI Assistant Worker] Kafka heartbeat failed', {
          err: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => {
        inFlight = false;
      });
  }, Math.max(1000, WORKER_HEARTBEAT_INTERVAL_MS));

  timer.unref?.();
  return () => clearInterval(timer);
}

function getMessageRef(message: { _id: unknown; idempotencyKey?: string }): string {
  return message.idempotencyKey || String(message._id);
}

function buildMessageRefsQuery(refs: string[]): Record<string, unknown>[] {
  const objectIds = refs
    .filter((ref) => Types.ObjectId.isValid(ref))
    .map((ref) => new Types.ObjectId(ref));

  const clauses: Record<string, unknown>[] = [{ idempotencyKey: { $in: refs } }];
  if (objectIds.length > 0) clauses.push({ _id: { $in: objectIds } });
  return clauses;
}

function formatMessageText(message: CatchupMessage): string {
  const text = typeof message.content === 'string' ? message.content.trim() : '';
  if (message.type === 'text') return text;
  if (message.type === 'image') return text || '[image]';
  if (message.type === 'video') return text || '[video]';
  if (message.type === 'audio') return text || '[audio]';
  if (message.type === 'sticker') return text || '[sticker]';
  if (message.type === 'call_history') {
    const callType = message.callHistory?.callType ?? 'call';
    const status = message.callHistory?.status ?? 'unknown';
    const duration = typeof message.callHistory?.durationSeconds === 'number'
      ? `, ${message.callHistory.durationSeconds}s`
      : '';
    return text || `[call_history: ${callType}, ${status}${duration}]`;
  }
  if (message.type.startsWith('file/')) return text || '[file]';
  return text || `[${message.type}]`;
}

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('AI provider did not return valid JSON');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

async function callAIWithRetry(
  provider: AIProvider,
  prompt: string,
  attempt = 0,
  lastError?: string,
): Promise<{ parsed: ReturnType<typeof AiCatchupModelOutputSchema.parse>; modelId: string }> {
  if (attempt > MAX_RETRIES) {
    throw new Error(
      `AI provider failed after ${MAX_RETRIES + 1} attempts. Last error: ${lastError ?? 'unknown'}`,
    );
  }

  try {
    const result = await provider.generateJson(prompt, attempt > 0 ? lastError : undefined);
    const parsedJson = extractJson(result.text);
    const parsed = AiCatchupModelOutputSchema.parse(parsedJson);
    return { parsed, modelId: result.modelId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn(`[AI Assistant Worker] AI call attempt ${attempt + 1} failed`, { attempt, error: errorMsg });
    return callAIWithRetry(provider, prompt, attempt + 1, errorMsg.slice(0, 500));
  }
}

async function loadDigestMessages(conversationId: string, userId: string, messageRefs: string[]): Promise<CatchupMessage[]> {
  const messages = await MessageModel.find({
    conversationId,
    isDeleted: { $ne: true },
    deleteType: { $ne: 'recall' },
    deletedFor: { $nin: [userId] },
    $or: buildMessageRefsQuery(messageRefs),
  })
    .select('_id conversationId senderId content type idempotencyKey createdAt callHistory')
    .lean<CatchupMessage[]>();

  const byRef = new Map<string, CatchupMessage>();
  messages.forEach((message) => {
    byRef.set(String(message._id), message);
    if (message.idempotencyKey) byRef.set(message.idempotencyKey, message);
  });

  return messageRefs
    .map((ref) => byRef.get(ref))
    .filter((m): m is CatchupMessage => Boolean(m));
}

async function loadContextMessages(
  conversationId: string,
  userId: string,
  beforeDate: Date,
): Promise<CatchupMessage[]> {
  const context = await MessageModel.find({
    conversationId,
    createdAt: { $lt: beforeDate },
    isDeleted: { $ne: true },
    deleteType: { $ne: 'recall' },
    deletedFor: { $nin: [userId] },
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(CONTEXT_MESSAGE_COUNT)
    .select('_id conversationId senderId content type idempotencyKey createdAt callHistory')
    .lean<CatchupMessage[]>();

  return context.reverse();
}

async function buildPrompt(
  conversationId: string,
  userId: string,
  messageRefs: string[],
): Promise<{ prompt: string; omittedOlderCount: number; sourceRefs: string[] }> {
  const rangeMessages = await loadDigestMessages(conversationId, userId, messageRefs);
  if (rangeMessages.length === 0) {
    throw new Error('Digest snapshot has no visible messages');
  }

  let selectedRange = rangeMessages.slice(-MAX_RANGE_MESSAGES);
  let omittedOlderCount = Math.max(0, rangeMessages.length - selectedRange.length);

  const firstMessage = selectedRange[0];
  const contextMessages = await loadContextMessages(conversationId, userId, new Date(firstMessage.createdAt));

  const memberRows = await ConversationMemberModel.find({ conversationId })
    .select('userId')
    .lean();
  const memberIds = memberRows.map((m) => m.userId);
  const users = await UserModel.find({ _id: { $in: memberIds } }).select('displayName').lean();
  const nameById = new Map(users.map((u) => [String(u._id), u.displayName || 'Nguoi dung']));
  const currentUserName = nameById.get(userId) ?? 'Ban';
  const conversation = await ConversationModel.findById(conversationId).select('name type').lean();

  const toPromptMessage = (
    message: CatchupMessage,
    isContext = false,
  ): Record<string, unknown> => ({
    messageRef: getMessageRef(message),
    senderId: message.senderId,
    senderName: nameById.get(message.senderId) ?? 'Nguoi dung',
    createdAt: new Date(message.createdAt).toISOString(),
    type: message.type,
    text: formatMessageText(message).slice(0, 3000),
    isContext,
  });

  let promptMessages = [
    ...contextMessages.map((m) => toPromptMessage(m, true)),
    ...selectedRange.map((m) => toPromptMessage(m)),
  ];

  while (promptMessages.reduce((t, m) => t + (m.text as string).length + (m.senderName as string).length + 80, 0) > MAX_INPUT_CHARS && selectedRange.length > 1) {
    selectedRange = selectedRange.slice(1);
    omittedOlderCount += 1;
    promptMessages = [
      ...contextMessages.map((m) => toPromptMessage(m, true)),
      ...selectedRange.map((m) => toPromptMessage(m)),
    ];
  }

  const sourceRefs = selectedRange.map(getMessageRef);

  const prompt = `You are summarizing selected chat messages for one user in a private chat app.

Current user:
${JSON.stringify({ userId, displayName: currentUserName })}

Conversation:
${JSON.stringify({
  id: conversationId,
  name: conversation?.name ?? '',
  type: conversation?.type ?? 'direct',
  participantNames: memberIds.map((id) => ({
    userId: id,
    displayName: nameById.get(id) ?? 'Nguoi dung',
  })),
})}

Messages:
Each message has messageRef, senderName, createdAt, type, text, and optional isContext.
${JSON.stringify(promptMessages, null, 2)}

Rules:
- Summarize only what happened in the provided non-context messages.
- Do not invent facts, deadlines, decisions, or names.
- Keep the output concise and useful for catching up.
- If information is unclear, omit it.
- Return valid JSON only. No markdown.

JSON schema:
{
  "title": "short Vietnamese title, max 80 chars",
  "overview": "1-2 Vietnamese sentences",
  "bullets": ["3-6 concise Vietnamese bullets"],
  "mentionedUserIds": ["user ids explicitly mentioned or directly relevant"],
  "sourceMessageRefs": ["message refs used for the summary"],
  "futureSignals": {
    "decisions": ["clear decisions only, otherwise empty"],
    "questionsForUser": ["questions directed at current user, otherwise empty"],
    "actionItems": [{ "text": "task text", "sourceMessageRefs": ["messageRef"] }],
    "suggestedReplies": ["short reply suggestions, otherwise empty"]
  }
}`;

  return { prompt, omittedOlderCount, sourceRefs };
}

async function processCatchupDigestJob(payload: AssistantJobPayload): Promise<void> {
  const digest = await AiCatchupDigestModel.findById(payload.digestId);
  if (!digest) {
    logger.warn('[AI Assistant Worker] Digest not found', payload);
    const failedItem = await AiAssistantService.updateItemStatus(payload.itemId, 'failed');
    AiAssistantService.emitSocket(payload.userId, {
      itemId: payload.itemId,
      type: 'catchup_digest',
      conversationId: payload.conversationId,
      status: 'failed',
      title: failedItem?.title,
      metadata: failedItem?.metadata,
      error: 'Digest not found',
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  if (digest.status === 'ready' && digest.summary) {
    const updatedItem = await AiAssistantService.updateItemWithDetail(payload.itemId, digest);
    AiAssistantService.emitSocket(payload.userId, {
      itemId: payload.itemId,
      type: 'catchup_digest',
      conversationId: payload.conversationId,
      status: 'ready',
      title: digest.summary.title,
      summarySnippet: digest.summary.overview.slice(0, 200),
      metadata: updatedItem?.metadata,
      detail: {
        _id: String(digest._id),
        summary: digest.summary,
        futureSignals: digest.futureSignals,
        messageCount: digest.messageCount,
        omittedOlderCount: digest.omittedOlderCount,
        generatedAt: digest.generatedAt?.toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  let provider: AIProvider | null = null;

  try {
    // Update item: processing
    const processingItem = await AiAssistantService.updateItemStatus(payload.itemId, 'processing');
    AiAssistantService.emitSocket(payload.userId, {
      itemId: payload.itemId,
      type: 'catchup_digest',
      conversationId: payload.conversationId,
      status: 'processing',
      title: processingItem?.title,
      metadata: processingItem?.metadata,
      updatedAt: new Date().toISOString(),
    });

    provider = createAIProvider();
    const { prompt, omittedOlderCount, sourceRefs } = await buildPrompt(
      payload.conversationId,
      payload.userId,
      digest.messageRefs,
    );
    const result = await callAIWithRetry(provider, prompt);
    const { parsed: output, modelId } = result;

    // Update digest detail
    digest.status = 'ready';
    digest.summary = {
      title: output.title,
      overview: output.overview,
      bullets: output.bullets.slice(0, 6),
      mentionedUserIds: output.mentionedUserIds,
      sourceMessageRefs: output.sourceMessageRefs.length > 0 ? output.sourceMessageRefs : sourceRefs,
    };
    digest.futureSignals = output.futureSignals;
    digest.set('model', modelId);
    digest.omittedOlderCount = omittedOlderCount;
    digest.generatedAt = new Date();
    await digest.save();
    await AiReminderService.syncSuggestedTasksFromDigest(digest);

    // Update AIAssistantItem index
    const updatedItem = await AiAssistantService.updateItemWithDetail(payload.itemId, digest);

    // Emit socket
    AiAssistantService.emitSocket(payload.userId, {
      itemId: payload.itemId,
      type: 'catchup_digest',
      conversationId: payload.conversationId,
      status: 'ready',
      title: digest.summary.title,
      summarySnippet: digest.summary.overview.slice(0, 200),
      metadata: updatedItem?.metadata,
      detail: {
        _id: String(digest._id),
        summary: digest.summary,
        futureSignals: digest.futureSignals,
        messageCount: digest.messageCount,
        omittedOlderCount: digest.omittedOlderCount,
        generatedAt: digest.generatedAt?.toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[AI Assistant Worker] Failed to process catchup digest', {
      itemId: payload.itemId,
      digestId: payload.digestId,
      err: errorMsg,
    });

    digest.status = 'failed';
    digest.error = errorMsg.slice(0, 1000);
    await digest.save();

    const failedItem = await AiAssistantService.updateItemStatus(payload.itemId, 'failed', {
      title: digest.summary?.title,
    });

    AiAssistantService.emitSocket(payload.userId, {
      itemId: payload.itemId,
      type: 'catchup_digest',
      conversationId: payload.conversationId,
      status: 'failed',
      title: failedItem?.title,
      metadata: failedItem?.metadata,
      error: errorMsg.slice(0, 200),
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function startAssistantWorker(): Promise<void> {
  if (assistantConsumer) return;

  assistantConsumer = createConsumer(ASSISTANT_WORKER_GROUP, {
    sessionTimeout: Math.max(30000, WORKER_SESSION_TIMEOUT_MS),
    heartbeatInterval: Math.max(1000, WORKER_HEARTBEAT_INTERVAL_MS),
  });
  await assistantConsumer.connect();
  await assistantConsumer.subscribe({ topic: KAFKA_TOPICS.AI_CATCHUP_JOBS, fromBeginning: false });

  await assistantConsumer.run({
    eachMessage: async ({ message, heartbeat }: EachMessagePayload) => {
      if (!message.value) return;
      const stopHeartbeat = startHeartbeatLoop(heartbeat);

      try {
        const payload = JSON.parse(message.value.toString()) as AssistantJobPayload;
        if (!payload.itemId && !payload.type) {
          logger.debug('[AI Assistant Worker] Skipping legacy catch-up job', {
            digestId: payload.digestId,
            conversationId: payload.conversationId,
          });
          return;
        }

        if (!payload.itemId || !payload.userId || !payload.conversationId || !payload.digestId) {
          logger.warn('[AI Assistant Worker] Invalid job payload', payload);
          if (payload.itemId && payload.userId) {
            const failedItem = await AiAssistantService.updateItemStatus(payload.itemId, 'failed');
            AiAssistantService.emitSocket(payload.userId, {
              itemId: payload.itemId,
              type: payload.type ?? 'catchup_digest',
              conversationId: payload.conversationId,
              status: 'failed',
              title: failedItem?.title,
              metadata: failedItem?.metadata,
              error: 'Invalid job payload',
              updatedAt: new Date().toISOString(),
            });
          }
          return;
        }

        switch (payload.type) {
          case 'catchup_digest':
            await processCatchupDigestJob(payload);
            break;
          default:
            logger.warn('[AI Assistant Worker] Unknown job type', { type: payload.type });
        }
      } catch (err) {
        logger.error('[AI Assistant Worker] Job handling failed', err);
      } finally {
        stopHeartbeat();
      }
    },
  });

  logger.info(`[AI Assistant Worker] Started (groupId: ${ASSISTANT_WORKER_GROUP})`);
}

export async function stopAssistantWorker(): Promise<void> {
  if (!assistantConsumer) return;
  try {
    await assistantConsumer.disconnect();
    assistantConsumer = null;
    logger.info('[AI Assistant Worker] Stopped');
  } catch (err) {
    logger.error('[AI Assistant Worker] Error on stop', err);
  }
}
