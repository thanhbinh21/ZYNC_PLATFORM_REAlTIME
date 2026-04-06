import { Types } from 'mongoose';
import { getRedis } from '../../infrastructure/redis';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors';
import { FriendshipModel, type IFriendship } from './friendship.model';
import { UserModel } from '../users/user.model';

const FRIENDS_CACHE_TTL_SECONDS = 10 * 60;

interface FriendListItem {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

export interface FriendRequestItem {
  requestId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface ListFriendsResult {
  friends: FriendListItem[];
  nextCursor: string | null;
}

export interface ListFriendRequestsResult {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
}

function buildCursor(item: IFriendship): string {
  const createdAt = item.createdAt;
  return Buffer.from(`${createdAt.toISOString()}|${item._id.toString()}`).toString('base64');
}

function parseCursor(cursor: string): { createdAt: Date; id: string } {
  const decoded = Buffer.from(cursor, 'base64').toString('utf8');
  const [createdAtRaw, id] = decoded.split('|');

  if (!createdAtRaw || !id) {
    throw new BadRequestError('Invalid cursor');
  }

  const createdAt = new Date(createdAtRaw);
  if (Number.isNaN(createdAt.getTime())) {
    throw new BadRequestError('Invalid cursor');
  }

  return { createdAt, id };
}

async function invalidateFriendsCache(userIds: string[]): Promise<void> {
  const redis = getRedis();
  for (const userId of userIds) {
    const keys = await redis.keys(`friends:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

async function ensureUserExists(userId: string): Promise<void> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestError('Invalid user id');
  }

  const exists = await UserModel.exists({ _id: userId });
  if (!exists) {
    throw new NotFoundError('User not found');
  }
}

export async function sendFriendRequest(
  requesterId: string,
  toUserId: string,
): Promise<IFriendship> {
  if (requesterId === toUserId) {
    throw new BadRequestError('Cannot send friend request to yourself');
  }

  await ensureUserExists(toUserId);

  const blockRelation = await FriendshipModel.findOne({
    $or: [
      { userId: requesterId, friendId: toUserId, status: 'blocked' },
      { userId: toUserId, friendId: requesterId, status: 'blocked' },
    ],
  });

  if (blockRelation) {
    throw new ForbiddenError('Friend request is blocked');
  }

  const existing = await FriendshipModel.findOne({
    userId: requesterId,
    friendId: toUserId,
  });

  if (existing?.status === 'pending') {
    throw new ConflictError('Friend request already sent');
  }
  if (existing?.status === 'accepted') {
    throw new ConflictError('Users are already friends');
  }

  const reversePending = await FriendshipModel.findOne({
    userId: toUserId,
    friendId: requesterId,
    status: 'pending',
  });

  if (reversePending) {
    throw new ConflictError('You already have an incoming request from this user');
  }

  const request = await FriendshipModel.create({
    userId: requesterId,
    friendId: toUserId,
    status: 'pending',
  });

  await invalidateFriendsCache([requesterId, toUserId]);
  return request;
}

export async function acceptFriendRequest(
  currentUserId: string,
  requestId: string,
): Promise<void> {
  const request = await FriendshipModel.findOne({
    _id: requestId,
    friendId: currentUserId,
    status: 'pending',
  });

  if (!request) {
    throw new NotFoundError('Friend request not found');
  }

  request.status = 'accepted';
  await request.save();

  await FriendshipModel.findOneAndUpdate(
    { userId: currentUserId, friendId: request.userId },
    { status: 'accepted' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await invalidateFriendsCache([currentUserId, request.userId]);
}

export async function rejectFriendRequest(
  currentUserId: string,
  requestId: string,
): Promise<void> {
  const deleted = await FriendshipModel.findOneAndDelete({
    _id: requestId,
    friendId: currentUserId,
    status: 'pending',
  });

  if (!deleted) {
    throw new NotFoundError('Friend request not found');
  }

  await invalidateFriendsCache([currentUserId, deleted.userId]);
}

export async function unfriend(currentUserId: string, friendId: string): Promise<void> {
  const result = await FriendshipModel.deleteMany({
    status: 'accepted',
    $or: [
      { userId: currentUserId, friendId },
      { userId: friendId, friendId: currentUserId },
    ],
  });

  if (result.deletedCount === 0) {
    throw new NotFoundError('Friendship not found');
  }

  await invalidateFriendsCache([currentUserId, friendId]);
}

export async function blockUser(currentUserId: string, targetUserId: string): Promise<void> {
  if (currentUserId === targetUserId) {
    throw new BadRequestError('Cannot block yourself');
  }

  await ensureUserExists(targetUserId);

  await FriendshipModel.deleteMany({
    $or: [
      { userId: currentUserId, friendId: targetUserId },
      { userId: targetUserId, friendId: currentUserId },
    ],
  });

  await FriendshipModel.findOneAndUpdate(
    { userId: currentUserId, friendId: targetUserId },
    { status: 'blocked' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await invalidateFriendsCache([currentUserId, targetUserId]);
}

export async function unblockUser(currentUserId: string, targetUserId: string): Promise<void> {
  const deleted = await FriendshipModel.findOneAndDelete({
    userId: currentUserId,
    friendId: targetUserId,
    status: 'blocked',
  });

  if (!deleted) {
    throw new NotFoundError('Blocked relationship not found');
  }

  await invalidateFriendsCache([currentUserId]);
}

export async function listFriends(
  currentUserId: string,
  cursor: string | undefined,
  limit: number,
): Promise<ListFriendsResult> {
  const cacheKey = `friends:${currentUserId}:${cursor ?? 'first'}:${limit}`;
  const redis = getRedis();
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached) as ListFriendsResult;
  }

  const query: Record<string, unknown> = {
    userId: currentUserId,
    status: 'accepted',
  };

  if (cursor) {
    const parsed = parseCursor(cursor);
    query['$or'] = [
      { createdAt: { $lt: parsed.createdAt } },
      { createdAt: parsed.createdAt, _id: { $lt: parsed.id } },
    ];
  }

  const rows = await FriendshipModel.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageItems = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? buildCursor(pageItems[pageItems.length - 1] as IFriendship) : null;

  const friendIds = pageItems.map((item) => item.friendId);
  const users = await UserModel.find({ _id: { $in: friendIds } })
    .select('displayName avatarUrl bio')
    .lean();

  const userMap = new Map<string, { displayName: string; avatarUrl?: string; bio?: string }>();
  for (const user of users) {
    userMap.set(user._id.toString(), {
      displayName: user.displayName as string,
      avatarUrl: user.avatarUrl as string | undefined,
      bio: user.bio as string | undefined,
    });
  }

  const friends: FriendListItem[] = [];
  for (const item of pageItems) {
    const detail = userMap.get(item.friendId);
    if (!detail) {
      continue;
    }

    friends.push({
      id: item.friendId,
      displayName: detail.displayName,
      avatarUrl: detail.avatarUrl,
      bio: detail.bio,
    });
  }

  const result: ListFriendsResult = {
    friends,
    nextCursor,
  };

  await redis.set(cacheKey, JSON.stringify(result), 'EX', FRIENDS_CACHE_TTL_SECONDS);
  return result;
}

export async function listFriendRequests(currentUserId: string): Promise<ListFriendRequestsResult> {
  const rows = await FriendshipModel.find({ status: 'pending' })
    .or([{ friendId: currentUserId }, { userId: currentUserId }])
    .sort({ createdAt: -1 })
    .lean();

  const partnerIds = rows.map((row) => (
    row.userId === currentUserId ? row.friendId : row.userId
  ));

  const users = await UserModel.find({ _id: { $in: partnerIds } })
    .select('displayName avatarUrl')
    .lean();

  const userMap = new Map<string, { displayName: string; avatarUrl?: string }>();
  for (const user of users) {
    userMap.set(user._id.toString(), {
      displayName: user.displayName as string,
      avatarUrl: user.avatarUrl as string | undefined,
    });
  }

  const incoming: FriendRequestItem[] = [];
  const outgoing: FriendRequestItem[] = [];

  for (const row of rows) {
    const partnerId = row.userId === currentUserId ? row.friendId : row.userId;
    const partner = userMap.get(partnerId);
    if (!partner) {
      continue;
    }

    const item: FriendRequestItem = {
      requestId: row._id.toString(),
      userId: partnerId,
      displayName: partner.displayName,
      avatarUrl: partner.avatarUrl,
      createdAt: row.createdAt.toISOString(),
    };

    if (row.friendId === currentUserId) {
      incoming.push(item);
    } else {
      outgoing.push(item);
    }
  }

  return { incoming, outgoing };
}

/** Đếm tổng số bạn bè đang accepted của một user */
export async function getFriendsCount(userId: string): Promise<number> {
  return FriendshipModel.countDocuments({ userId, status: 'accepted' });
}

/** Đếm số bạn chung giữa hai user */
export async function getMutualFriendsCount(
  userA: string,
  userB: string,
): Promise<number> {
  const [friendsA, friendsB] = await Promise.all([
    FriendshipModel.find({ userId: userA, status: 'accepted' })
      .select('friendId')
      .lean(),
    FriendshipModel.find({ userId: userB, status: 'accepted' })
      .select('friendId')
      .lean(),
  ]);

  const setB = new Set(friendsB.map((f) => f.friendId));
  let count = 0;
  for (const f of friendsA) {
    if (setB.has(f.friendId)) count++;
  }
  return count;
}
