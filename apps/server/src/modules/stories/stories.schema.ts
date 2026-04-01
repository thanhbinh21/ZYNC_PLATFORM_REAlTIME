import { z } from 'zod';

export const STORY_REACTION_TYPES = ['❤️', '😂', '😢', '😡', '👍', '🔥'] as const;

export const CreateStorySchema = z
  .object({
    mediaType: z.enum(['text', 'image', 'video']),
    mediaUrl: z.string().url().optional(),
    content: z.string().min(1).max(500).optional(),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
    fontStyle: z.string().max(50).optional(),
  })
  .refine(
    (data) => {
      if (data.mediaType === 'text') return !!data.content;
      return true;
    },
    { message: 'content is required for text stories', path: ['content'] },
  )
  .refine(
    (data) => {
      if (data.mediaType === 'image' || data.mediaType === 'video') return !!data.mediaUrl;
      return true;
    },
    { message: 'mediaUrl is required for image/video stories', path: ['mediaUrl'] },
  );

export type CreateStoryDto = z.infer<typeof CreateStorySchema>;

export const ReactToStorySchema = z.object({
  type: z.enum(STORY_REACTION_TYPES),
});

export type ReactToStoryDto = z.infer<typeof ReactToStorySchema>;

export const ReplyToStorySchema = z.object({
  content: z.string().min(1, 'Reply content is required').max(1000),
});

export type ReplyToStoryDto = z.infer<typeof ReplyToStorySchema>;
