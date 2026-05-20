import { z } from 'zod';

export const AiItemTypeSchema = z.enum([
  'catchup_digest',
  'task',
  'search_result',
  'group_note',
  'call_summary',
]);

export const AiItemStatusSchema = z.enum([
  'not_started',
  'queued',
  'processing',
  'ready',
  'failed',
]);

// ─── Catch-up ─────────────────────────────────────────────────────────────────

export const CreateCatchupDigestSchema = z.object({
  conversationId: z.string().trim().min(1),
  trigger: z.enum(['manual', 'auto']).optional().default('manual'),
  unreadCountHint: z.coerce.number().int().min(0).max(300).optional(),
  toMessageRef: z.string().trim().min(1).max(200).optional(),
});

export const UpdateCatchupSettingsSchema = z.object({
  catchupEnabled: z.boolean(),
});

export const AssistantQuerySchema = z.object({
  type: AiItemTypeSchema.optional(),
  conversationId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  skip: z.coerce.number().int().min(0).default(0),
});

export const UnreadConversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  skip: z.coerce.number().int().min(0).default(0),
});

export type CreateCatchupDigestInput = z.infer<typeof CreateCatchupDigestSchema>;
export type AssistantQueryInput = z.infer<typeof AssistantQuerySchema>;
