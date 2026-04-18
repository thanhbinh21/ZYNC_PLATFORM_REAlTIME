import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import type { Application } from 'express';
import http, { type Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';

// Mock Redis adapter de khong phu thuoc Redis thuc khi test socket gateway
jest.mock('@socket.io/redis-adapter', () => {
  const { Adapter } = jest.requireActual('socket.io-adapter') as { Adapter: any };
  class MockRedisAdapter extends (Adapter as any) {}
  return {
    createAdapter: jest.fn(() => MockRedisAdapter),
  };
});

const redisMockClient = {
  hset: jest.fn(() => Promise.resolve(1)),
  hdel: jest.fn(() => Promise.resolve(1)),
  duplicate: jest.fn(() => redisMockClient),
};

jest.mock('../../src/infrastructure/redis', () => ({
  getRedis: () => redisMockClient,
  createRedisDuplicate: () => redisMockClient,
  setTypingIndicator: jest.fn(() => Promise.resolve()),
  removeTypingIndicator: jest.fn(() => Promise.resolve()),
  setUserOnline: jest.fn(() => Promise.resolve()),
  removeUserOnline: jest.fn(() => Promise.resolve()),
  checkMessageRateLimit: jest.fn(() => Promise.resolve(true)),
}));

import { createApp } from '../../src/app';
import { initSocketGateway } from '../../src/socket/gateway';
import { UserModel } from '../../src/modules/users/user.model';
import { FriendshipModel } from '../../src/modules/friends/friendship.model';
import { CallEventModel, CallParticipantModel, CallSessionModel } from '../../src/modules/calls/calls.model';
import { ConversationModel } from '../../src/modules/conversations/conversation.model';
import { ConversationMemberModel } from '../../src/modules/conversations/conversation-member.model';

let app: Application;
let mongoServer: MongoMemoryServer;
let httpServer: HttpServer;
let baseUrl = '';

function issueAccessToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    process.env['JWT_SECRET'] as string,
    { expiresIn: '15m' },
  );
}

function waitForEvent<T>(socket: ClientSocket, eventName: string, timeoutMs: number = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for event ${eventName}`));
    }, timeoutMs);

    const onEvent = (payload: T) => {
      cleanup();
      resolve(payload);
    };

    const onConnectError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off(eventName, onEvent as (...args: any[]) => void);
      socket.off('connect_error', onConnectError as (...args: any[]) => void);
    };

    socket.on(eventName, onEvent as (...args: any[]) => void);
    socket.on('connect_error', onConnectError as (...args: any[]) => void);
  });
}

function waitForEventMatching<T>(
  socket: ClientSocket,
  eventName: string,
  predicate: (payload: T) => boolean,
  timeoutMs: number = 6000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for matching event ${eventName}`));
    }, timeoutMs);

    const onEvent = (payload: T) => {
      try {
        if (!predicate(payload)) {
          return;
        }
        cleanup();
        resolve(payload);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    const onConnectError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off(eventName, onEvent as (...args: any[]) => void);
      socket.off('connect_error', onConnectError as (...args: any[]) => void);
    };

    socket.on(eventName, onEvent as (...args: any[]) => void);
    socket.on('connect_error', onConnectError as (...args: any[]) => void);
  });
}

function expectNoMatchingEvent<T>(
  socket: ClientSocket,
  eventName: string,
  predicate: (payload: T) => boolean,
  timeoutMs: number = 1200,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    const onEvent = (payload: T) => {
      try {
        if (!predicate(payload)) {
          return;
        }
        cleanup();
        reject(new Error(`Unexpected matching event ${eventName}`));
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off(eventName, onEvent as (...args: any[]) => void);
    };

    socket.on(eventName, onEvent as (...args: any[]) => void);
  });
}

async function connectClient(token: string): Promise<ClientSocket> {
  const socket = ioClient(baseUrl, {
    transports: ['websocket'],
    auth: { token },
    forceNew: true,
    reconnection: false,
  });

  await waitForEvent(socket, 'connect', 5000);
  return socket;
}

async function seedCallUsers(): Promise<{ callerId: string; calleeId: string; callerToken: string; calleeToken: string }> {
  const caller = await UserModel.create({
    email: 'caller-call@test.com',
    displayName: 'Caller Call',
  });

  const callee = await UserModel.create({
    email: 'callee-call@test.com',
    displayName: 'Callee Call',
  });

  await FriendshipModel.insertMany([
    { userId: caller._id.toString(), friendId: callee._id.toString(), status: 'accepted' },
    { userId: callee._id.toString(), friendId: caller._id.toString(), status: 'accepted' },
  ]);

  return {
    callerId: caller._id.toString(),
    calleeId: callee._id.toString(),
    callerToken: issueAccessToken(caller._id.toString()),
    calleeToken: issueAccessToken(callee._id.toString()),
  };
}

function disconnectSockets(...sockets: ClientSocket[]): void {
  for (const socket of sockets) {
    if (socket.connected) {
      socket.disconnect();
    }
  }
}

beforeAll(async () => {
  process.env['NODE_ENV'] = 'test';
  process.env['JWT_SECRET'] = 'calls-realtime-test-secret';
  process.env['JWT_REFRESH_SECRET'] = 'calls-realtime-refresh-secret';
  process.env['CALL_EPHEMERAL_TOKEN_SECRET'] = 'calls-realtime-ephemeral-secret';
  process.env['CALL_RING_TIMEOUT_MS'] = '1200';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = createApp();
  httpServer = http.createServer(app);
  initSocketGateway(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });

  const address = httpServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine test server port');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  jest.clearAllMocks();
  await Promise.all([
    CallEventModel.deleteMany({}),
    CallParticipantModel.deleteMany({}),
    CallSessionModel.deleteMany({}),
    ConversationMemberModel.deleteMany({}),
    ConversationModel.deleteMany({}),
    FriendshipModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
});

describe('Calls realtime integration (Phase 7.5 Milestone A)', () => {
  it('happy path: invite -> accept -> offer/answer -> connected -> end', async () => {
    const { callerId, calleeId, callerToken, calleeToken } = await seedCallUsers();

    const callerSocket = await connectClient(callerToken);
    const calleeSocket = await connectClient(calleeToken);

    try {
      callerSocket.emit('call_invite', { targetUserId: calleeId });

      const invited = await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_invited',
        (payload) => typeof payload['sessionId'] === 'string',
      );

      const incoming = await waitForEventMatching<Record<string, any>>(
        calleeSocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );

      expect(invited['callToken']).toBeTruthy();
      expect(incoming['callToken']).toBeTruthy();

      calleeSocket.emit('call_accept', {
        sessionId: invited['sessionId'],
        callToken: incoming['callToken'],
      });

      await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_participant_joined',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['userId'] === calleeId,
      );

      const connectedStatusPromise = waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_status',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['status'] === 'connected',
      );

      callerSocket.emit('webrtc_offer', {
        sessionId: invited['sessionId'],
        toUserId: calleeId,
        sdp: { type: 'offer', sdp: 'fake-offer-sdp' },
        callToken: invited['callToken'],
      });

      await waitForEventMatching<Record<string, any>>(
        calleeSocket,
        'webrtc_offer',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['fromUserId'] === callerId,
      );

      calleeSocket.emit('webrtc_answer', {
        sessionId: invited['sessionId'],
        toUserId: callerId,
        sdp: { type: 'answer', sdp: 'fake-answer-sdp' },
        callToken: incoming['callToken'],
      });

      await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'webrtc_answer',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['fromUserId'] === calleeId,
      );

      await connectedStatusPromise;

      const endedStatusPromise = waitForEventMatching<Record<string, any>>(
        calleeSocket,
        'call_status',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['status'] === 'ended',
      );

      callerSocket.emit('call_end', {
        sessionId: invited['sessionId'],
        reason: 'ended',
        callToken: invited['callToken'],
      });

      const endedStatus = await endedStatusPromise;
      expect(endedStatus['reason']).toBe('ended');
    } finally {
      disconnectSockets(callerSocket, calleeSocket);
    }
  });

  it('reject path: callee rejects with busy', async () => {
    const { calleeId, callerToken, calleeToken } = await seedCallUsers();
    const callerSocket = await connectClient(callerToken);
    const calleeSocket = await connectClient(calleeToken);

    try {
      callerSocket.emit('call_invite', { targetUserId: calleeId });

      const invited = await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_invited',
        (payload) => typeof payload['sessionId'] === 'string',
      );
      const incoming = await waitForEventMatching<Record<string, any>>(
        calleeSocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );

      const rejectedPromise = waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_status',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['status'] === 'rejected',
      );

      calleeSocket.emit('call_reject', {
        sessionId: invited['sessionId'],
        reason: 'busy',
        callToken: incoming['callToken'],
      });

      const rejected = await rejectedPromise;
      expect(rejected['reason']).toBe('busy');
    } finally {
      disconnectSockets(callerSocket, calleeSocket);
    }
  });

  it('missed path: timeout auto-miss when callee does not answer', async () => {
    const { calleeId, callerToken, calleeToken } = await seedCallUsers();
    const callerSocket = await connectClient(callerToken);
    const calleeSocket = await connectClient(calleeToken);

    try {
      callerSocket.emit('call_invite', { targetUserId: calleeId });

      const invited = await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_invited',
        (payload) => typeof payload['sessionId'] === 'string',
      );

      await waitForEventMatching<Record<string, any>>(
        calleeSocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );

      const missed = await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_status',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['status'] === 'missed',
        7000,
      );

      expect(missed['reason']).toBe('timeout');
    } finally {
      disconnectSockets(callerSocket, calleeSocket);
    }
  });

  it('reconnect signaling and security: second offer increments reconnect metric, missing callToken is rejected', async () => {
    const { callerId, calleeId, callerToken, calleeToken } = await seedCallUsers();
    const callerSocket = await connectClient(callerToken);
    const calleeSocket = await connectClient(calleeToken);

    try {
      callerSocket.emit('call_invite', { targetUserId: calleeId });

      const invited = await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_invited',
        (payload) => typeof payload['sessionId'] === 'string',
      );
      const incoming = await waitForEventMatching<Record<string, any>>(
        calleeSocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );

      calleeSocket.emit('call_accept', {
        sessionId: invited['sessionId'],
        callToken: incoming['callToken'],
      });

      const connectedStatusPromise = waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_status',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['status'] === 'connected',
      );

      callerSocket.emit('webrtc_offer', {
        sessionId: invited['sessionId'],
        toUserId: calleeId,
        sdp: { type: 'offer', sdp: 'offer-1' },
        callToken: invited['callToken'],
      });

      await waitForEventMatching<Record<string, any>>(
        calleeSocket,
        'webrtc_offer',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['fromUserId'] === callerId,
      );

      calleeSocket.emit('webrtc_answer', {
        sessionId: invited['sessionId'],
        toUserId: callerId,
        sdp: { type: 'answer', sdp: 'answer-1' },
        callToken: incoming['callToken'],
      });

      await connectedStatusPromise;

      callerSocket.emit('webrtc_offer', {
        sessionId: invited['sessionId'],
        toUserId: calleeId,
        sdp: { type: 'offer', sdp: 'offer-reconnect' },
        callToken: invited['callToken'],
      });

      await waitForEventMatching<Record<string, any>>(
        calleeSocket,
        'webrtc_offer',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['fromUserId'] === callerId,
      );

      const metricsRes = await request(app).get('/metrics');
      expect(metricsRes.status).toBe(200);
      const reconnectMetric = metricsRes.text.match(/^call_reconnect_offer_total\s+([0-9.]+)$/m);
      expect(reconnectMetric).toBeTruthy();
      expect(Number(reconnectMetric?.[1] ?? '0')).toBeGreaterThan(0);

      const errorPromise = waitForEventMatching<Record<string, any>>(
        callerSocket,
        'error',
        (payload) => typeof payload['message'] === 'string' && payload['message'].includes('callToken is required'),
      );

      callerSocket.emit('webrtc_offer', {
        sessionId: invited['sessionId'],
        toUserId: calleeId,
        sdp: { type: 'offer', sdp: 'offer-without-token' },
      });

      const errorPayload = await errorPromise;
      expect(errorPayload['message']).toContain('callToken is required');
    } finally {
      disconnectSockets(callerSocket, calleeSocket);
    }
  });

  it('stale ringing session is auto-missed and does not block a new invite', async () => {
    const { callerId, calleeId, callerToken, calleeToken } = await seedCallUsers();
    const staleSession = await CallSessionModel.create({
      conversationId: new mongoose.Types.ObjectId().toString(),
      callType: 'video',
      mode: 'p2p',
      status: 'ringing',
      initiatedBy: callerId,
      participantIds: [callerId, calleeId],
      timeoutAt: new Date(Date.now() - 60_000),
    });

    await CallParticipantModel.insertMany([
      {
        sessionId: staleSession._id.toString(),
        userId: callerId,
        role: 'caller',
        status: 'joined',
        joinedAt: new Date(Date.now() - 70_000),
      },
      {
        sessionId: staleSession._id.toString(),
        userId: calleeId,
        role: 'callee',
        status: 'invited',
      },
    ]);

    const callerSocket = await connectClient(callerToken);
    const calleeSocket = await connectClient(calleeToken);

    try {
      callerSocket.emit('call_invite', { targetUserId: calleeId });

      const invited = await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_invited',
        (payload) => typeof payload['sessionId'] === 'string' && payload['sessionId'] !== staleSession._id.toString(),
      );

      await waitForEventMatching<Record<string, any>>(
        calleeSocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );

      const refreshedStaleSession = await CallSessionModel.findById(staleSession._id).lean();
      expect(refreshedStaleSession?.status).toBe('missed');
      expect(refreshedStaleSession?.endedReason).toBe('timeout');
    } finally {
      disconnectSockets(callerSocket, calleeSocket);
    }
  });

  it('stale connected session is auto-ended and does not block a new invite', async () => {
    process.env['CALL_CONNECTED_STALE_MS'] = '60000';
    const { callerId, calleeId, callerToken, calleeToken } = await seedCallUsers();
    const staleConnectedSession = await CallSessionModel.create({
      conversationId: new mongoose.Types.ObjectId().toString(),
      callType: 'video',
      mode: 'p2p',
      status: 'connected',
      initiatedBy: callerId,
      participantIds: [callerId, calleeId],
      startedAt: new Date(Date.now() - 120_000),
      createdAt: new Date(Date.now() - 180_000),
    });

    await CallParticipantModel.insertMany([
      {
        sessionId: staleConnectedSession._id.toString(),
        userId: callerId,
        role: 'caller',
        status: 'joined',
        joinedAt: new Date(Date.now() - 20_000),
      },
      {
        sessionId: staleConnectedSession._id.toString(),
        userId: calleeId,
        role: 'callee',
        status: 'joined',
        joinedAt: new Date(Date.now() - 20_000),
      },
    ]);

    const callerSocket = await connectClient(callerToken);
    const calleeSocket = await connectClient(calleeToken);

    try {
      callerSocket.emit('call_invite', { targetUserId: calleeId });

      const invited = await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_invited',
        (payload) => typeof payload['sessionId'] === 'string' && payload['sessionId'] !== staleConnectedSession._id.toString(),
      );

      await waitForEventMatching<Record<string, any>>(
        calleeSocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );

      const refreshedStaleSession = await CallSessionModel.findById(staleConnectedSession._id).lean();
      expect(refreshedStaleSession?.status).toBe('ended');
      expect(refreshedStaleSession?.endedReason).toBe('superseded_reinvite');
    } finally {
      disconnectSockets(callerSocket, calleeSocket);
      delete process.env['CALL_CONNECTED_STALE_MS'];
    }
  });

  it('group call path: invite group -> multiple incoming -> participant join signaling', async () => {
    const caller = await UserModel.create({
      email: 'group-caller@test.com',
      displayName: 'Group Caller',
    });
    const participantA = await UserModel.create({
      email: 'group-a@test.com',
      displayName: 'Group Member A',
    });
    const participantB = await UserModel.create({
      email: 'group-b@test.com',
      displayName: 'Group Member B',
    });

    const conversation = await ConversationModel.create({
      type: 'group',
      name: 'Nhóm test call',
      createdBy: caller._id.toString(),
      adminIds: [caller._id.toString()],
    });

    await ConversationMemberModel.insertMany([
      {
        conversationId: conversation._id.toString(),
        userId: caller._id.toString(),
        role: 'admin',
      },
      {
        conversationId: conversation._id.toString(),
        userId: participantA._id.toString(),
        role: 'member',
      },
      {
        conversationId: conversation._id.toString(),
        userId: participantB._id.toString(),
        role: 'member',
      },
    ]);

    const callerSocket = await connectClient(issueAccessToken(caller._id.toString()));
    const participantASocket = await connectClient(issueAccessToken(participantA._id.toString()));
    const participantBSocket = await connectClient(issueAccessToken(participantB._id.toString()));

    try {
      callerSocket.emit('call_group_invite', { conversationId: conversation._id.toString() });

      const invited = await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_invited',
        (payload) => payload['isGroupCall'] === true,
      );

      expect(invited['participantIds']).toHaveLength(3);
      expect(invited['callToken']).toBeTruthy();

      const incomingA = await waitForEventMatching<Record<string, any>>(
        participantASocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );
      const incomingB = await waitForEventMatching<Record<string, any>>(
        participantBSocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );

      expect(incomingA['isGroupCall']).toBe(true);
      expect(incomingB['isGroupCall']).toBe(true);

      participantASocket.emit('call_accept', {
        sessionId: invited['sessionId'],
        callToken: incomingA['callToken'],
      });

      const joinedPayload = await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_participant_joined',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['userId'] === participantA._id.toString(),
      );
      expect(Array.isArray(joinedPayload['joinedParticipantIds'])).toBe(true);
      expect(joinedPayload['joinedParticipantIds']).toContain(caller._id.toString());
      expect(joinedPayload['joinedParticipantIds']).toContain(participantA._id.toString());

      callerSocket.emit('webrtc_offer', {
        sessionId: invited['sessionId'],
        toUserId: participantA._id.toString(),
        sdp: { type: 'offer', sdp: 'group-offer-a' },
        callToken: invited['callToken'],
      });

      await waitForEventMatching<Record<string, any>>(
        participantASocket,
        'webrtc_offer',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['fromUserId'] === caller._id.toString(),
      );

      participantASocket.emit('webrtc_answer', {
        sessionId: invited['sessionId'],
        toUserId: caller._id.toString(),
        sdp: { type: 'answer', sdp: 'group-answer-a' },
        callToken: incomingA['callToken'],
      });

      await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'webrtc_answer',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['fromUserId'] === participantA._id.toString(),
      );
    } finally {
      disconnectSockets(callerSocket, participantASocket, participantBSocket);
    }
  });

  it('group call: one participant reject does not end whole room and others can still join', async () => {
    const caller = await UserModel.create({ email: 'group2-caller@test.com', displayName: 'Group2 Caller' });
    const participantA = await UserModel.create({ email: 'group2-a@test.com', displayName: 'Group2 A' });
    const participantB = await UserModel.create({ email: 'group2-b@test.com', displayName: 'Group2 B' });

    const conversation = await ConversationModel.create({
      type: 'group',
      name: 'Nhóm test reject',
      createdBy: caller._id.toString(),
      adminIds: [caller._id.toString()],
    });

    await ConversationMemberModel.insertMany([
      { conversationId: conversation._id.toString(), userId: caller._id.toString(), role: 'admin' },
      { conversationId: conversation._id.toString(), userId: participantA._id.toString(), role: 'member' },
      { conversationId: conversation._id.toString(), userId: participantB._id.toString(), role: 'member' },
    ]);

    const callerSocket = await connectClient(issueAccessToken(caller._id.toString()));
    const participantASocket = await connectClient(issueAccessToken(participantA._id.toString()));
    const participantBSocket = await connectClient(issueAccessToken(participantB._id.toString()));

    try {
      callerSocket.emit('call_group_invite', { conversationId: conversation._id.toString() });

      const invited = await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_invited',
        (payload) => payload['isGroupCall'] === true,
      );

      const incomingA = await waitForEventMatching<Record<string, any>>(
        participantASocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );
      const incomingB = await waitForEventMatching<Record<string, any>>(
        participantBSocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );

      participantASocket.emit('call_reject', {
        sessionId: invited['sessionId'],
        reason: 'busy',
        callToken: incomingA['callToken'],
      });

      await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_participant_left',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['userId'] === participantA._id.toString(),
      );

      await expectNoMatchingEvent<Record<string, any>>(
        callerSocket,
        'call_status',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['status'] === 'rejected',
        300,
      );

      participantBSocket.emit('call_accept', {
        sessionId: invited['sessionId'],
        callToken: incomingB['callToken'],
      });

      await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_participant_joined',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['userId'] === participantB._id.toString(),
      );

      const refreshedSession = await CallSessionModel.findById(invited['sessionId']).lean();
      expect(refreshedSession?.status === 'ringing' || refreshedSession?.status === 'connecting').toBe(true);
    } finally {
      disconnectSockets(callerSocket, participantASocket, participantBSocket);
    }
  });

  it('group call: non-host end call only leaves self and does not end room', async () => {
    const caller = await UserModel.create({ email: 'group3-caller@test.com', displayName: 'Group3 Caller' });
    const participantA = await UserModel.create({ email: 'group3-a@test.com', displayName: 'Group3 A' });
    const participantB = await UserModel.create({ email: 'group3-b@test.com', displayName: 'Group3 B' });

    const conversation = await ConversationModel.create({
      type: 'group',
      name: 'Nhóm test leave',
      createdBy: caller._id.toString(),
      adminIds: [caller._id.toString()],
    });

    await ConversationMemberModel.insertMany([
      { conversationId: conversation._id.toString(), userId: caller._id.toString(), role: 'admin' },
      { conversationId: conversation._id.toString(), userId: participantA._id.toString(), role: 'member' },
      { conversationId: conversation._id.toString(), userId: participantB._id.toString(), role: 'member' },
    ]);

    const callerSocket = await connectClient(issueAccessToken(caller._id.toString()));
    const participantASocket = await connectClient(issueAccessToken(participantA._id.toString()));
    const participantBSocket = await connectClient(issueAccessToken(participantB._id.toString()));

    try {
      callerSocket.emit('call_group_invite', { conversationId: conversation._id.toString() });

      const invited = await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_invited',
        (payload) => payload['isGroupCall'] === true,
      );

      const incomingA = await waitForEventMatching<Record<string, any>>(
        participantASocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );

      await waitForEventMatching<Record<string, any>>(
        participantBSocket,
        'call_incoming',
        (payload) => payload['sessionId'] === invited['sessionId'],
      );

      participantASocket.emit('call_accept', {
        sessionId: invited['sessionId'],
        callToken: incomingA['callToken'],
      });

      await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_participant_joined',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['userId'] === participantA._id.toString(),
      );

      participantASocket.emit('call_end', {
        sessionId: invited['sessionId'],
        callToken: incomingA['callToken'],
        reason: 'left',
      });

      await waitForEventMatching<Record<string, any>>(
        callerSocket,
        'call_participant_left',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['userId'] === participantA._id.toString(),
      );

      await expectNoMatchingEvent<Record<string, any>>(
        callerSocket,
        'call_status',
        (payload) => payload['sessionId'] === invited['sessionId'] && payload['status'] === 'ended',
        300,
      );

      const refreshedSession = await CallSessionModel.findById(invited['sessionId']).lean();
      expect(refreshedSession?.status === 'ringing' || refreshedSession?.status === 'connecting').toBe(true);
    } finally {
      disconnectSockets(callerSocket, participantASocket, participantBSocket);
    }
  });
});
