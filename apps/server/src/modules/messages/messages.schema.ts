import { z } from 'zod';

export const SendMessageSchema = z.object({
  conversationId: z
    .string()
    .min(1, 'Conversation ID is required')
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format'),
  content: z
    .string()
    .max(1000, 'Message content must not exceed 1000 characters')
    .optional()
    .nullable(),
  type: z
    .enum(['text', 'image', 'video', 'emoji'], {
      errorMap: () => ({ message: 'Invalid message type. Must be: text, image, video, or emoji' }),
    })
    .default('text'),
  mediaUrl: z
    .string()
    .url('Invalid media URL format')
    .optional()
    .nullable(),
  idempotencyKey: z
    .string()
    .uuid('Idempotency key must be a valid UUID')
    .describe('Unique key to prevent duplicate messages on retry'),
}).refine(
  (data) => data.content || data.mediaUrl,
  { message: 'Either content or mediaUrl must be provided' }
);

export type SendMessageDto = z.infer<typeof SendMessageSchema>;

export const GetMessageHistorySchema = z.object({
  cursor: z
    .string()
    .optional()
    .describe('Base64 encoded cursor for pagination (createdAt_messageId)'),
  limit: z
    .coerce.number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .default(20),
});

export type GetMessageHistoryDto = z.infer<typeof GetMessageHistorySchema>;

export const UpdateMessageStatusSchema = z.object({
  status: z.enum(['sent', 'delivered', 'read'], {
    errorMap: () => ({ message: 'Invalid status. Must be: sent, delivered, or read' }),
  }),
});

export type UpdateMessageStatusDto = z.infer<typeof UpdateMessageStatusSchema>;

export const MarkAsReadSchema = z.object({
  messageIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format'))
    .min(1, 'At least one message ID is required'),
});

export type MarkAsReadDto = z.infer<typeof MarkAsReadSchema>;
