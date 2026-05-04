import { type Server, type Socket } from 'socket.io';
import type { StoryReactionType } from '../modules/stories/story.model';
import { getIO } from './gateway';

interface AuthSocket extends Socket {
  userId: string;
}

/**
 * StoryController - Xu ly story events tu Socket
 *
 * Cac emit functions duoc export de gateway.goi khi story thay doi.
 */
export function emitStoryReaction(
  targetUserId: string,
  payload: { storyId: string; userId: string; reactionType: StoryReactionType; displayName: string },
): void {
  const io = getIO();
  io?.to(`user:${targetUserId}`).emit('story_reaction', payload);
}

export function emitStoryReply(
  targetUserId: string,
  payload: { storyId: string; senderId: string; content: string; displayName: string },
): void {
  const io = getIO();
  io?.to(`user:${targetUserId}`).emit('story_reply', payload);
}

/**
 * StoryController - Dang ky story events cho socket
 *
 * Hien tai chua co story events tu phia socket client
 * (Story create/view/reaction di qua REST API hoac WebSocket events dac biet).
 * Module nay duoc tao san de mo rong khi can.
 */
export function registerStoryController(_io: Server, _socket: AuthSocket): void {
  // Placeholder for future story socket events
  // Ví dụ: 'story_view', 'story_reaction' từ phía client
}
