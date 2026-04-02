import { v4 as uuidv4 } from 'uuid';
import { StoryModel, type IStory, type StoryReactionType } from './story.model';
import { FriendshipModel } from '../friends/friendship.model';
import { ConversationModel } from '../conversations/conversation.model';
import { ConversationMemberModel } from '../conversations/conversation-member.model';
import { MessageModel } from '../messages/message.model';
import { UserModel } from '../users/user.model';
import { ForbiddenError, NotFoundError } from '../../shared/errors';
import { emitStoryReaction, emitStoryReply } from '../../socket/gateway';
import type { CreateStoryDto } from './stories.schema';

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export async function createStory(
  userId: string,
  dto: CreateStoryDto,
): Promise<IStory> {
  const story = await StoryModel.create({
    userId,
    mediaType: dto.mediaType,
    mediaUrl: dto.mediaUrl,
    content: dto.content,
    backgroundColor: dto.backgroundColor,
    fontStyle: dto.fontStyle,
    viewerIds: [],
    reactions: [],
    expiresAt: new Date(Date.now() + STORY_TTL_MS),
  });

  return story;
}

export async function deleteStory(
  userId: string,
  storyId: string,
): Promise<void> {
  const story = await StoryModel.findById(storyId);
  if (!story) throw new NotFoundError('Story not found');
  if (story.userId !== userId) throw new ForbiddenError('Only the owner can delete this story');

  await story.deleteOne();
}

export async function getStoriesFeed(
  userId: string,
) {
  const friendships = await FriendshipModel.find({
    userId,
    status: 'accepted',
  }).lean();

  const friendIds = friendships.map((f) => f.friendId);
  if (friendIds.length === 0) return [];

  const stories = await StoryModel.find({
    userId: { $in: friendIds },
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (stories.length === 0) return [];

  const uniqueUserIds = [...new Set(stories.map((s) => s.userId))];
  const users = await UserModel.find({ _id: { $in: uniqueUserIds } })
    .select('displayName avatarUrl')
    .lean();

  const userMap = new Map(
    users.map((u) => [u._id.toString(), { displayName: u.displayName as string, avatarUrl: u.avatarUrl as string | undefined }]),
  );

  const grouped = new Map<string, (typeof stories)[number][]>();
  for (const story of stories) {
    const list = grouped.get(story.userId) ?? [];
    list.push(story);
    grouped.set(story.userId, list);
  }

  const feed: { userId: string; displayName: string; avatarUrl?: string; stories: (typeof stories)[number][] }[] = [];
  for (const [uid, userStories] of grouped) {
    const info = userMap.get(uid);
    feed.push({
      userId: uid,
      displayName: info?.displayName ?? 'Unknown',
      avatarUrl: info?.avatarUrl,
      stories: userStories,
    });
  }

  return feed;
}

export async function getMyStories(userId: string): Promise<IStory[]> {
  return StoryModel.find({
    userId,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
}

export async function viewStory(
  userId: string,
  storyId: string,
): Promise<void> {
  const result = await StoryModel.findOneAndUpdate(
    { _id: storyId, expiresAt: { $gt: new Date() } },
    { $addToSet: { viewerIds: userId } },
  );

  if (!result) throw new NotFoundError('Story not found or expired');
}

export async function reactToStory(
  userId: string,
  storyId: string,
  type: StoryReactionType,
): Promise<void> {
  const story = await StoryModel.findOne({
    _id: storyId,
    expiresAt: { $gt: new Date() },
  });

  if (!story) throw new NotFoundError('Story not found or expired');

  const existingIdx = story.reactions.findIndex((r) => r.userId === userId);

  if (existingIdx !== -1) {
    story.reactions[existingIdx]!.type = type;
    story.reactions[existingIdx]!.createdAt = new Date();
  } else {
    story.reactions.push({ userId, type, createdAt: new Date() });
  }

  await story.save();

  if (story.userId !== userId) {
    const reactor = await UserModel.findById(userId).select('displayName').lean();
    emitStoryReaction(story.userId, {
      storyId,
      userId,
      reactionType: type,
      displayName: (reactor?.displayName as string) ?? 'Unknown',
    });
  }
}

export async function removeReaction(
  userId: string,
  storyId: string,
): Promise<void> {
  const result = await StoryModel.findOneAndUpdate(
    { _id: storyId, expiresAt: { $gt: new Date() } },
    { $pull: { reactions: { userId } } },
  );

  if (!result) throw new NotFoundError('Story not found or expired');
}

export async function getStoryReactions(
  userId: string,
  storyId: string,
): Promise<{ userId: string; displayName: string; avatarUrl?: string; type: StoryReactionType; createdAt: Date }[]> {
  const story = await StoryModel.findById(storyId);
  if (!story) throw new NotFoundError('Story not found');
  if (story.userId !== userId) throw new ForbiddenError('Only the owner can view reactions');

  if (story.reactions.length === 0) return [];

  const reactorIds = story.reactions.map((r) => r.userId);
  const users = await UserModel.find({ _id: { $in: reactorIds } })
    .select('displayName avatarUrl')
    .lean();

  const userMap = new Map(
    users.map((u) => [u._id.toString(), { displayName: u.displayName as string, avatarUrl: u.avatarUrl as string | undefined }]),
  );

  return story.reactions.map((r) => {
    const info = userMap.get(r.userId);
    return {
      userId: r.userId,
      displayName: info?.displayName ?? 'Unknown',
      avatarUrl: info?.avatarUrl,
      type: r.type,
      createdAt: r.createdAt,
    };
  });
}

export async function getStoryViewers(
  userId: string,
  storyId: string,
): Promise<{ userId: string; displayName: string; avatarUrl?: string }[]> {
  const story = await StoryModel.findById(storyId);
  if (!story) throw new NotFoundError('Story not found');
  if (story.userId !== userId) throw new ForbiddenError('Only the owner can view viewers list');

  if (story.viewerIds.length === 0) return [];

  const users = await UserModel.find({ _id: { $in: story.viewerIds } })
    .select('displayName avatarUrl')
    .lean();

  return users.map((u) => ({
    userId: u._id.toString(),
    displayName: u.displayName as string,
    avatarUrl: u.avatarUrl as string | undefined,
  }));
}

async function findOrCreateDirectConversation(
  userA: string,
  userB: string,
): Promise<string> {
  const membershipsA = await ConversationMemberModel.find({ userId: userA }).lean();
  const convIdsA = membershipsA.map((m) => m.conversationId);

  if (convIdsA.length > 0) {
    const existing = await ConversationMemberModel.findOne({
      conversationId: { $in: convIdsA },
      userId: userB,
    }).lean();

    if (existing) {
      const conv = await ConversationModel.findOne({
        _id: existing.conversationId,
        type: 'direct',
      });
      if (conv) return conv._id.toString();
    }
  }

  const conversation = await ConversationModel.create({
    type: 'direct',
    adminIds: [],
  });

  const convId = conversation._id.toString();
  await ConversationMemberModel.insertMany([
    { conversationId: convId, userId: userA, role: 'member' },
    { conversationId: convId, userId: userB, role: 'member' },
  ]);

  return convId;
}

export async function replyToStory(
  userId: string,
  storyId: string,
  content: string,
): Promise<{ conversationId: string; messageId: string }> {
  const story = await StoryModel.findOne({
    _id: storyId,
    expiresAt: { $gt: new Date() },
  });

  if (!story) throw new NotFoundError('Story not found or expired');
  if (userId === story.userId) throw new ForbiddenError('Cannot reply to your own story');

  const conversationId = await findOrCreateDirectConversation(userId, story.userId);

  const message = await MessageModel.create({
    conversationId,
    senderId: userId,
    content,
    type: 'text',
    storyRef: {
      storyId: story._id.toString(),
      ownerId: story.userId,
      mediaType: story.mediaType,
      thumbnail: story.mediaUrl,
    },
    idempotencyKey: uuidv4(),
  });

  await ConversationModel.findByIdAndUpdate(conversationId, {
    lastMessage: {
      content,
      senderId: userId,
      sentAt: new Date(),
    },
  });

  if (story.userId !== userId) {
    const sender = await UserModel.findById(userId).select('displayName').lean();
    emitStoryReply(story.userId, {
      storyId,
      senderId: userId,
      content,
      displayName: (sender?.displayName as string) ?? 'Unknown',
    });
  }

  return {
    conversationId,
    messageId: message._id.toString(),
  };
}
