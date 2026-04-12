import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const redisStore = new Map<string, string>();
const redisMock = {
  get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
  set: jest.fn((key: string, value: string) => {
    redisStore.set(key, value);
    return Promise.resolve('OK');
  }),
  del: jest.fn((...keys: string[]) => {
    let deleted = 0;
    for (const key of keys) {
      if (redisStore.delete(key)) deleted += 1;
    }
    return Promise.resolve(deleted);
  }),
  keys: jest.fn((pattern: string) => {
    if (!pattern.endsWith('*')) {
      return Promise.resolve(redisStore.has(pattern) ? [pattern] : []);
    }
    const prefix = pattern.slice(0, -1);
    const matched = [...redisStore.keys()].filter((key) => key.startsWith(prefix));
    return Promise.resolve(matched);
  }),
};

jest.mock('../../src/infrastructure/redis', () => ({
  getRedis: () => redisMock,
}));

import { createApp } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { StoryModel } from '../../src/modules/stories/story.model';
import { FriendshipModel } from '../../src/modules/friends/friendship.model';
import { MessageModel } from '../../src/modules/messages/message.model';
import { ConversationModel } from '../../src/modules/conversations/conversation.model';
import { ConversationMemberModel } from '../../src/modules/conversations/conversation-member.model';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env['JWT_SECRET'] = 'stories-test-secret';
  process.env['JWT_REFRESH_SECRET'] = 'stories-test-refresh-secret';
  process.env['NODE_ENV'] = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  redisStore.clear();
  jest.clearAllMocks();
  await StoryModel.deleteMany({});
  await UserModel.deleteMany({});
  await FriendshipModel.deleteMany({});
  await MessageModel.deleteMany({});
  await ConversationModel.deleteMany({});
  await ConversationMemberModel.deleteMany({});
});

const app = createApp();

function issueToken(userId: string, jti: string): string {
  return jwt.sign(
    { sub: userId, jti },
    process.env['JWT_SECRET'] as string,
    { expiresIn: '15m' },
  );
}

async function createUser(name: string, email: string) {
  return UserModel.create({ displayName: name, email });
}

async function makeFriends(userAId: string, userBId: string) {
  await FriendshipModel.create({ userId: userAId, friendId: userBId, status: 'accepted' });
  await FriendshipModel.create({ userId: userBId, friendId: userAId, status: 'accepted' });
}

describe('Stories routes', () => {
  // ── Test 1: Create text story ──
  it('should create a text story with expiresAt ~24h', async () => {
    const user = await createUser('Alice', 'alice@test.com');
    const token = issueToken(user.id as string, 'st-1');

    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ mediaType: 'text', content: 'Hello world!', backgroundColor: '#ff0000' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mediaType).toBe('text');
    expect(res.body.data.content).toBe('Hello world!');

    const expiresAt = new Date(res.body.data.expiresAt).getTime();
    const diff = expiresAt - Date.now();
    expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000);
  });

  // ── Test 2: Create image story ──
  it('should create an image story with mediaUrl', async () => {
    const user = await createUser('Bob', 'bob@test.com');
    const token = issueToken(user.id as string, 'st-2');

    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ mediaType: 'image', mediaUrl: 'https://cdn.example.com/photo.jpg' });

    expect(res.status).toBe(201);
    expect(res.body.data.mediaType).toBe('image');
    expect(res.body.data.mediaUrl).toBe('https://cdn.example.com/photo.jpg');
  });

  // ── Test 3: Create video story ──
  it('should create a video story', async () => {
    const user = await createUser('Carol', 'carol@test.com');
    const token = issueToken(user.id as string, 'st-3');

    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ mediaType: 'video', mediaUrl: 'https://cdn.example.com/clip.mp4' });

    expect(res.status).toBe(201);
    expect(res.body.data.mediaType).toBe('video');
  });

  // ── Test 4: Missing content for text type → 400 ──
  it('should reject text story without content', async () => {
    const user = await createUser('Dan', 'dan@test.com');
    const token = issueToken(user.id as string, 'st-4');

    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ mediaType: 'text' });

    expect(res.status).toBe(400);
  });

  // ── Test 5: Missing mediaUrl for image type → 400 ──
  it('should reject image story without mediaUrl', async () => {
    const user = await createUser('Eve', 'eve@test.com');
    const token = issueToken(user.id as string, 'st-5');

    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ mediaType: 'image' });

    expect(res.status).toBe(400);
  });

  // ── Test 6: Delete own story ──
  it('should delete own story', async () => {
    const user = await createUser('Frank', 'frank@test.com');
    const token = issueToken(user.id as string, 'st-6');

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ mediaType: 'text', content: 'To be deleted' });

    const storyId = createRes.body.data._id as string;

    const deleteRes = await request(app)
      .delete(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    const deleted = await StoryModel.findById(storyId);
    expect(deleted).toBeNull();
  });

  // ── Test 7: Delete another user's story → 403 ──
  it('should forbid deleting another user\'s story', async () => {
    const owner = await createUser('Grace', 'grace@test.com');
    const other = await createUser('Hank', 'hank@test.com');
    const ownerToken = issueToken(owner.id as string, 'st-7a');
    const otherToken = issueToken(other.id as string, 'st-7b');

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mediaType: 'text', content: 'My story' });

    const storyId = createRes.body.data._id as string;

    const deleteRes = await request(app)
      .delete(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(deleteRes.status).toBe(403);
  });

  // ── Test 8: View story ──
  it('should add viewer to viewerIds', async () => {
    const owner = await createUser('Ivy', 'ivy@test.com');
    const viewer = await createUser('Jack', 'jack@test.com');
    const ownerToken = issueToken(owner.id as string, 'st-8a');
    const viewerToken = issueToken(viewer.id as string, 'st-8b');

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mediaType: 'text', content: 'View me' });

    const storyId = createRes.body.data._id as string;

    const viewRes = await request(app)
      .post(`/api/stories/${storyId}/view`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(viewRes.status).toBe(200);

    const story = await StoryModel.findById(storyId);
    expect(story!.viewerIds).toContain(viewer.id as string);
  });

  // ── Test 9: React to story ──
  it('should add reaction to story', async () => {
    const owner = await createUser('Kate', 'kate@test.com');
    const reactor = await createUser('Leo', 'leo@test.com');
    const ownerToken = issueToken(owner.id as string, 'st-9a');
    const reactorToken = issueToken(reactor.id as string, 'st-9b');

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mediaType: 'text', content: 'React me' });

    const storyId = createRes.body.data._id as string;

    const reactRes = await request(app)
      .post(`/api/stories/${storyId}/react`)
      .set('Authorization', `Bearer ${reactorToken}`)
      .send({ type: '❤️' });

    expect(reactRes.status).toBe(200);

    const story = await StoryModel.findById(storyId);
    expect(story!.reactions).toHaveLength(1);
    expect(story!.reactions[0]!.type).toBe('❤️');
    expect(story!.reactions[0]!.userId).toBe(reactor.id as string);
  });

  // ── Test 10: React twice → update, no duplicate ──
  it('should update reaction on second react (no duplicate)', async () => {
    const owner = await createUser('Mia', 'mia@test.com');
    const reactor = await createUser('Nick', 'nick@test.com');
    const ownerToken = issueToken(owner.id as string, 'st-10a');
    const reactorToken = issueToken(reactor.id as string, 'st-10b');

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mediaType: 'text', content: 'Double react' });

    const storyId = createRes.body.data._id as string;

    await request(app)
      .post(`/api/stories/${storyId}/react`)
      .set('Authorization', `Bearer ${reactorToken}`)
      .send({ type: '❤️' });

    await request(app)
      .post(`/api/stories/${storyId}/react`)
      .set('Authorization', `Bearer ${reactorToken}`)
      .send({ type: '😂' });

    const story = await StoryModel.findById(storyId);
    const userReactions = story!.reactions.filter((r) => r.userId === (reactor.id as string));
    expect(userReactions).toHaveLength(1);
    expect(userReactions[0]!.type).toBe('😂');
  });

  // ── Test 11: Remove reaction ──
  it('should remove reaction', async () => {
    const owner = await createUser('Olivia', 'olivia@test.com');
    const reactor = await createUser('Pete', 'pete@test.com');
    const ownerToken = issueToken(owner.id as string, 'st-11a');
    const reactorToken = issueToken(reactor.id as string, 'st-11b');

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mediaType: 'text', content: 'Remove react' });

    const storyId = createRes.body.data._id as string;

    await request(app)
      .post(`/api/stories/${storyId}/react`)
      .set('Authorization', `Bearer ${reactorToken}`)
      .send({ type: '🔥' });

    const removeRes = await request(app)
      .delete(`/api/stories/${storyId}/react`)
      .set('Authorization', `Bearer ${reactorToken}`);

    expect(removeRes.status).toBe(200);

    const story = await StoryModel.findById(storyId);
    expect(story!.reactions).toHaveLength(0);
  });

  // ── Test 12: Get reactions (owner) ──
  it('should return reactions list to story owner', async () => {
    const owner = await createUser('Quinn', 'quinn@test.com');
    const reactor = await createUser('Rita', 'rita@test.com');
    const ownerToken = issueToken(owner.id as string, 'st-12a');
    const reactorToken = issueToken(reactor.id as string, 'st-12b');

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mediaType: 'text', content: 'Get reactions' });

    const storyId = createRes.body.data._id as string;

    await request(app)
      .post(`/api/stories/${storyId}/react`)
      .set('Authorization', `Bearer ${reactorToken}`)
      .send({ type: '👍' });

    const res = await request(app)
      .get(`/api/stories/${storyId}/reactions`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('👍');
    expect(res.body.data[0].displayName).toBe('Rita');
  });

  // ── Test 13: Get reactions (non-owner) → 403 ──
  it('should forbid non-owner from viewing reactions', async () => {
    const owner = await createUser('Sam', 'sam@test.com');
    const other = await createUser('Tina', 'tina@test.com');
    const ownerToken = issueToken(owner.id as string, 'st-13a');
    const otherToken = issueToken(other.id as string, 'st-13b');

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mediaType: 'text', content: 'Private reactions' });

    const storyId = createRes.body.data._id as string;

    const res = await request(app)
      .get(`/api/stories/${storyId}/reactions`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  // ── Test 14: Reply to story → creates message with storyRef ──
  it('should reply to story and create message with storyRef', async () => {
    const owner = await createUser('Uma', 'uma@test.com');
    const replier = await createUser('Vince', 'vince@test.com');
    const ownerToken = issueToken(owner.id as string, 'st-14a');
    const replierToken = issueToken(replier.id as string, 'st-14b');

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mediaType: 'image', mediaUrl: 'https://cdn.example.com/reply.jpg' });

    const storyId = createRes.body.data._id as string;

    const replyRes = await request(app)
      .post(`/api/stories/${storyId}/reply`)
      .set('Authorization', `Bearer ${replierToken}`)
      .send({ content: 'Nice photo!' });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.success).toBe(true);
    expect(replyRes.body.data.conversationId).toBeDefined();
    expect(replyRes.body.data.messageId).toBeDefined();

    const message = await MessageModel.findById(replyRes.body.data.messageId);
    expect(message).toBeTruthy();
    expect(message!.storyRef).toBeTruthy();
    expect(message!.storyRef!.storyId).toBe(storyId);
    expect(message!.storyRef!.ownerId).toBe(owner.id as string);
    expect(message!.storyRef!.mediaType).toBe('image');
    expect(message!.content).toBe('Nice photo!');
  });

  // ── Test 15: Get stories feed (friends) ──
  it('should return stories feed grouped by friend', async () => {
    const me = await createUser('Wendy', 'wendy@test.com');
    const friendA = await createUser('Xander', 'xander@test.com');
    const friendB = await createUser('Yara', 'yara@test.com');

    await makeFriends(me.id as string, friendA.id as string);
    await makeFriends(me.id as string, friendB.id as string);

    await StoryModel.create({
      userId: friendA.id as string,
      mediaType: 'text',
      content: 'Friend A story',
      viewerIds: [],
      reactions: [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await StoryModel.create({
      userId: friendB.id as string,
      mediaType: 'text',
      content: 'Friend B story',
      viewerIds: [],
      reactions: [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const token = issueToken(me.id as string, 'st-15');

    const res = await request(app)
      .get('/api/stories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    const userIds = res.body.data.map((g: any) => g.userId);
    expect(userIds).toContain(friendA.id as string);
    expect(userIds).toContain(friendB.id as string);

    for (const group of res.body.data) {
      expect(group.displayName).toBeDefined();
      expect(Array.isArray(group.stories)).toBe(true);
      expect(group.stories.length).toBeGreaterThan(0);
    }
  });

  // ── Test 16: Get my stories ──
  it('should return only my own stories', async () => {
    const me = await createUser('Zara', 'zara@test.com');
    const other = await createUser('Adam', 'adam@test.com');
    const token = issueToken(me.id as string, 'st-16');

    await StoryModel.create({
      userId: me.id as string,
      mediaType: 'text',
      content: 'My story',
      viewerIds: [],
      reactions: [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await StoryModel.create({
      userId: other.id as string,
      mediaType: 'text',
      content: 'Not mine',
      viewerIds: [],
      reactions: [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .get('/api/stories/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].content).toBe('My story');
  });
});
