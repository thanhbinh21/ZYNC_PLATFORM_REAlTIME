import { z } from 'zod';

export const SendFriendRequestSchema = z.object({
  toUserId: z.string().min(1, 'toUserId is required'),
});

export type SendFriendRequestDto = z.infer<typeof SendFriendRequestSchema>;

export const ListFriendsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListFriendsQueryDto = z.infer<typeof ListFriendsQuerySchema>;
