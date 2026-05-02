import { type Server, type Socket } from 'socket.io';
import { CallsService } from '../modules/calls/calls.service';
import { MessagesService } from '../modules/messages/messages.service';
import { BadRequestError } from '../shared/errors';
import { recordReconnectOfferAttempt } from '../modules/calls/calls.metrics';
import { logger } from '../shared/logger';

interface AuthSocket extends Socket {
  userId: string;
}

interface CallInvitePayload {
  targetUserId: string;
  conversationId?: string;
}

interface CallGroupInvitePayload {
  conversationId: string;
}

interface CallSessionPayload {
  sessionId: string;
  callToken: string;
}

interface CallRejectPayload {
  sessionId: string;
  reason?: 'rejected' | 'busy';
  callToken: string;
}

interface CallEndPayload {
  sessionId: string;
  reason?: string;
  callToken: string;
}

interface WebRtcSignalPayload {
  sessionId: string;
  toUserId: string;
  callToken: string;
  sdp?: unknown;
  candidate?: unknown;
}

const callTimeoutRegistry = new Map<string, NodeJS.Timeout>();

function registerCallTimeout(sessionId: string, task: () => Promise<void>, timeoutMs?: number): void {
  clearCallTimeout(sessionId);
  const configuredMs = Number.parseInt(process.env['CALL_RING_TIMEOUT_MS'] ?? '30000', 10);
  const resolvedMs = Number.isNaN(configuredMs) || configuredMs < 1000 ? 30_000 : configuredMs;
  const finalMs = timeoutMs ?? resolvedMs;

  const timeout = setTimeout(() => {
    callTimeoutRegistry.delete(sessionId);
    void task().catch((err) => logger.error('call timeout handler error', err));
  }, finalMs);

  callTimeoutRegistry.set(sessionId, timeout);
}

export function clearCallTimeout(sessionId: string): void {
  const timeout = callTimeoutRegistry.get(sessionId);
  if (timeout) {
    clearTimeout(timeout);
    callTimeoutRegistry.delete(sessionId);
  }
}

function emitCallStatus(
  io: Server,
  participantIds: string[],
  payload: {
    sessionId: string;
    status: 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed' | 'rejected';
    reason?: string | null;
  },
): void {
  for (const participantId of participantIds) {
    io.to(`user:${participantId}`).emit('call_status', payload);
  }
}

function formatCallDuration(durationSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return minutes <= 0 ? `${seconds}s` : `${minutes}m ${seconds}s`;
}

async function emitCallSummaryMessage(
  io: Server,
  params: {
    sessionId: string;
    status: 'ended' | 'rejected' | 'missed';
    conversationId?: string;
    senderId: string;
    endedReason?: string;
    startedAt?: string;
    endedAt?: string;
  },
): Promise<void> {
  if (!params.conversationId) return;

  let content = 'Cuoc goi da ket thuc';
  if (params.status === 'rejected') {
    content = params.endedReason === 'busy' ? 'Cuoc goi bi tu choi (ban)' : 'Cuoc goi bi tu choi';
  }
  if (params.status === 'missed') {
    content = 'Cuoc goi nho';
  }

  const startedAt = params.startedAt ? new Date(params.startedAt) : null;
  const endedAt = params.endedAt ? new Date(params.endedAt) : null;

  if (
    params.status === 'ended'
    && startedAt
    && endedAt
    && !Number.isNaN(startedAt.getTime())
    && !Number.isNaN(endedAt.getTime())
  ) {
    const durationSeconds = (endedAt.getTime() - startedAt.getTime()) / 1000;
    if (durationSeconds > 0) content = `${content} (${formatCallDuration(durationSeconds)})`;
  }

  if (params.endedReason && params.endedReason.trim().length > 0 && params.endedReason !== 'ended') {
    content = `${content} - Ly do: ${params.endedReason}`;
  }

  const idempotencyKey = `call-summary:${params.sessionId}:${params.status}`;
  const message = await MessagesService.createMessage(
    params.conversationId, params.senderId, content, 'text', idempotencyKey,
  );

  io.to(`conv:${params.conversationId}`).emit('receive_message', {
    messageId: message._id,
    conversationId: params.conversationId,
    senderId: params.senderId,
    content,
    type: 'text',
    idempotencyKey,
    createdAt: message.createdAt,
  });

  io.to(`conv:${params.conversationId}`).emit('status_update', {
    conversationId: params.conversationId,
    messageId: message._id,
    status: 'sent',
    userId: params.senderId,
  });
}

// ─── Payload Parsers ─────────────────────────────────────────────────────────

function parseCallInvitePayload(payload: unknown): CallInvitePayload {
  if (typeof payload !== 'object' || payload === null) throw new BadRequestError('Invalid call_invite payload');
  const data = payload as Record<string, unknown>;
  const targetUserId = data['targetUserId'];
  const conversationId = data['conversationId'];
  if (typeof targetUserId !== 'string' || targetUserId.length === 0) throw new BadRequestError('targetUserId is required');
  if (conversationId !== undefined && (typeof conversationId !== 'string' || conversationId.length === 0)) {
    throw new BadRequestError('conversationId must be a non-empty string');
  }
  return { targetUserId, conversationId: typeof conversationId === 'string' ? conversationId : undefined };
}

function parseCallGroupInvitePayload(payload: unknown): CallGroupInvitePayload {
  if (typeof payload !== 'object' || payload === null) throw new BadRequestError('Invalid call_group_invite payload');
  const data = payload as Record<string, unknown>;
  const conversationId = data['conversationId'];
  if (typeof conversationId !== 'string' || conversationId.length === 0) throw new BadRequestError('conversationId is required');
  return { conversationId };
}

function parseCallSessionPayload(payload: unknown): CallSessionPayload {
  if (typeof payload !== 'object' || payload === null) throw new BadRequestError('Invalid call payload');
  const data = payload as Record<string, unknown>;
  const sessionId = data['sessionId'];
  const callToken = data['callToken'];
  if (typeof sessionId !== 'string' || sessionId.length === 0) throw new BadRequestError('sessionId is required');
  if (typeof callToken !== 'string' || callToken.length === 0) throw new BadRequestError('callToken is required');
  return { sessionId, callToken };
}

function parseCallRejectPayload(payload: unknown): CallRejectPayload {
  if (typeof payload !== 'object' || payload === null) throw new BadRequestError('Invalid call_reject payload');
  const data = payload as Record<string, unknown>;
  const sessionId = data['sessionId'];
  const reason = data['reason'];
  const callToken = data['callToken'];
  if (typeof sessionId !== 'string' || sessionId.length === 0) throw new BadRequestError('sessionId is required');
  if (reason !== undefined && reason !== 'rejected' && reason !== 'busy') throw new BadRequestError('reason must be rejected or busy');
  if (typeof callToken !== 'string' || callToken.length === 0) throw new BadRequestError('callToken is required');
  return { sessionId, reason: reason as 'rejected' | 'busy' | undefined, callToken };
}

function parseCallEndPayload(payload: unknown): CallEndPayload {
  if (typeof payload !== 'object' || payload === null) throw new BadRequestError('Invalid call_end payload');
  const data = payload as Record<string, unknown>;
  const sessionId = data['sessionId'];
  const reason = data['reason'];
  const callToken = data['callToken'];
  if (typeof sessionId !== 'string' || sessionId.length === 0) throw new BadRequestError('sessionId is required');
  if (reason !== undefined && (typeof reason !== 'string' || reason.length === 0)) throw new BadRequestError('reason must be a non-empty string');
  if (typeof callToken !== 'string' || callToken.length === 0) throw new BadRequestError('callToken is required');
  return { sessionId, reason: reason as string | undefined, callToken };
}

function parseWebRtcSignalPayload(payload: unknown): WebRtcSignalPayload {
  if (typeof payload !== 'object' || payload === null) throw new BadRequestError('Invalid WebRTC payload');
  const data = payload as Record<string, unknown>;
  const sessionId = data['sessionId'];
  const toUserId = data['toUserId'];
  const callToken = data['callToken'];
  if (typeof sessionId !== 'string' || sessionId.length === 0) throw new BadRequestError('sessionId is required');
  if (typeof toUserId !== 'string' || toUserId.length === 0) throw new BadRequestError('toUserId is required');
  if (typeof callToken !== 'string' || callToken.length === 0) throw new BadRequestError('callToken is required');
  return { sessionId, toUserId, callToken, sdp: data['sdp'], candidate: data['candidate'] };
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

async function handleCallInvite(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const { userId } = socket;
  const input = parseCallInvitePayload(payload);
  const session = await CallsService.createOneToOneSession(userId, {
    targetUserId: input.targetUserId,
    conversationId: input.conversationId,
    callType: 'video',
  });
  const [callerToken, calleeToken] = await Promise.all([
    CallsService.issueSessionTokenForUser(session.sessionId, userId),
    CallsService.issueSessionTokenForUser(session.sessionId, input.targetUserId),
  ]);

  registerCallTimeout(session.sessionId, async () => {
    const timeoutSession = await CallsService.markMissedIfNoAnswer(session.sessionId);
    if (!timeoutSession) return;
    await emitCallSummaryMessage(io, {
      sessionId: timeoutSession.sessionId,
      status: 'missed',
      conversationId: timeoutSession.conversationId ?? undefined,
      senderId: timeoutSession.initiatedBy,
      endedReason: timeoutSession.endedReason ?? undefined,
      startedAt: timeoutSession.startedAt ?? undefined,
      endedAt: timeoutSession.endedAt ?? undefined,
    });
    emitCallStatus(io, timeoutSession.participantIds, { sessionId: timeoutSession.sessionId, status: 'missed', reason: timeoutSession.endedReason });
  });

  socket.emit('call_invited', {
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    targetUserId: input.targetUserId,
    callType: session.callType,
    timeoutAt: session.timeoutAt,
    callToken: callerToken.token,
    callTokenExpiresInSeconds: callerToken.expiresInSeconds,
  });

  io.to(`user:${input.targetUserId}`).emit('call_incoming', {
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    fromUserId: userId,
    callType: session.callType,
    timeoutAt: session.timeoutAt,
    callToken: calleeToken.token,
    callTokenExpiresInSeconds: calleeToken.expiresInSeconds,
  });

  emitCallStatus(io, session.participantIds, { sessionId: session.sessionId, status: 'ringing' });
}

async function handleCallGroupInvite(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const { userId } = socket;
  const input = parseCallGroupInvitePayload(payload);
  const session = await CallsService.createGroupSession(userId, { conversationId: input.conversationId, callType: 'video' });

  const tokenEntries = await Promise.all(
    session.participantIds.map(async (participantId) => {
      const token = await CallsService.issueSessionTokenForUser(session.sessionId, participantId);
      return [participantId, token] as const;
    }),
  );
  const tokensByUserId = new Map(tokenEntries);

  registerCallTimeout(session.sessionId, async () => {
    const timeoutSession = await CallsService.markMissedIfNoAnswer(session.sessionId);
    if (!timeoutSession) return;
    await emitCallSummaryMessage(io, {
      sessionId: timeoutSession.sessionId,
      status: 'missed',
      conversationId: timeoutSession.conversationId ?? undefined,
      senderId: timeoutSession.initiatedBy,
      endedReason: timeoutSession.endedReason ?? undefined,
      startedAt: timeoutSession.startedAt ?? undefined,
      endedAt: timeoutSession.endedAt ?? undefined,
    });
    emitCallStatus(io, timeoutSession.participantIds, { sessionId: timeoutSession.sessionId, status: 'missed', reason: timeoutSession.endedReason });
  });

  const callerToken = tokensByUserId.get(userId);
  if (!callerToken) throw new BadRequestError('Caller token missing for group call');

  socket.emit('call_invited', {
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    isGroupCall: true,
    participantIds: session.participantIds,
    callType: session.callType,
    timeoutAt: session.timeoutAt,
    callToken: callerToken.token,
    callTokenExpiresInSeconds: callerToken.expiresInSeconds,
  });

  for (const participantId of session.participantIds) {
    if (participantId === userId) continue;
    const participantToken = tokensByUserId.get(participantId);
    if (!participantToken) continue;
    io.to(`user:${participantId}`).emit('call_incoming', {
      sessionId: session.sessionId,
      conversationId: session.conversationId,
      fromUserId: userId,
      isGroupCall: true,
      participantIds: session.participantIds,
      callType: session.callType,
      timeoutAt: session.timeoutAt,
      callToken: participantToken.token,
      callTokenExpiresInSeconds: participantToken.expiresInSeconds,
    });
  }

  emitCallStatus(io, session.participantIds, { sessionId: session.sessionId, status: 'ringing' });
}

async function handleCallAccept(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const { userId } = socket;
  const input = parseCallSessionPayload(payload);
  CallsService.verifySessionTokenForUser(input.sessionId, userId, input.callToken);
  const session = await CallsService.acceptCallSession(input.sessionId, userId);
  const joinedParticipantIds = await CallsService.listJoinedParticipantIds(session.sessionId);
  clearCallTimeout(session.sessionId);
  for (const participantId of session.participantIds) {
    io.to(`user:${participantId}`).emit('call_participant_joined', { sessionId: session.sessionId, userId, joinedParticipantIds });
  }
  emitCallStatus(io, session.participantIds, { sessionId: session.sessionId, status: session.status });
}

async function handleCallReject(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const { userId } = socket;
  const input = parseCallRejectPayload(payload);
  CallsService.verifySessionTokenForUser(input.sessionId, userId, input.callToken);
  const session = await CallsService.rejectCallSession(input.sessionId, userId, input.reason ?? 'rejected');

  const isSessionActive = session.status === 'ringing' || session.status === 'connecting' || session.status === 'connected';
  const isGroupPartialReject = session.mode === 'sfu' && isSessionActive;

  if (!isGroupPartialReject && session.status !== 'ringing') clearCallTimeout(session.sessionId);

  if (isGroupPartialReject) {
    for (const participantId of session.participantIds) {
      io.to(`user:${participantId}`).emit('call_participant_left', { sessionId: session.sessionId, userId, reason: input.reason ?? 'rejected' });
    }
    return;
  }

  await emitCallSummaryMessage(io, {
    sessionId: session.sessionId, status: 'rejected',
    conversationId: session.conversationId ?? undefined,
    senderId: userId, endedReason: session.endedReason ?? undefined,
    startedAt: session.startedAt ?? undefined, endedAt: session.endedAt ?? undefined,
  });

  emitCallStatus(io, session.participantIds, { sessionId: session.sessionId, status: 'rejected', reason: session.endedReason });
}

async function handleCallEnd(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const { userId } = socket;
  const input = parseCallEndPayload(payload);
  CallsService.verifySessionTokenForUser(input.sessionId, userId, input.callToken, { allowExpired: true });
  const session = await CallsService.endCallSession(input.sessionId, userId, input.reason);

  const isSessionActive = session.status === 'ringing' || session.status === 'connecting' || session.status === 'connected';
  const isGroupPartialLeave = session.mode === 'sfu' && isSessionActive && session.initiatedBy !== userId;

  if (!isGroupPartialLeave && session.status !== 'ringing') clearCallTimeout(session.sessionId);

  if (isGroupPartialLeave) {
    for (const participantId of session.participantIds) {
      io.to(`user:${participantId}`).emit('call_participant_left', { sessionId: session.sessionId, userId, reason: input.reason ?? 'left' });
    }
    return;
  }

  await emitCallSummaryMessage(io, {
    sessionId: session.sessionId, status: 'ended',
    conversationId: session.conversationId ?? undefined,
    senderId: userId, endedReason: session.endedReason ?? undefined,
    startedAt: session.startedAt ?? undefined, endedAt: session.endedAt ?? undefined,
  });

  for (const participantId of session.participantIds) {
    io.to(`user:${participantId}`).emit('call_participant_left', { sessionId: session.sessionId, userId, reason: session.endedReason });
  }

  emitCallStatus(io, session.participantIds, { sessionId: session.sessionId, status: 'ended', reason: session.endedReason });
}

async function handleWebRtcOffer(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const { userId } = socket;
  const input = parseWebRtcSignalPayload(payload);
  if (!input.sdp) throw new BadRequestError('sdp is required for webrtc_offer');
  CallsService.verifySessionTokenForUser(input.sessionId, userId, input.callToken);
  const sessionStatus = await CallsService.assertSignalRoute(input.sessionId, userId, input.toUserId);
  if (sessionStatus === 'connected') recordReconnectOfferAttempt();
  io.to(`user:${input.toUserId}`).emit('webrtc_offer', { sessionId: input.sessionId, fromUserId: userId, sdp: input.sdp });
}

async function handleWebRtcAnswer(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const { userId } = socket;
  const input = parseWebRtcSignalPayload(payload);
  if (!input.sdp) throw new BadRequestError('sdp is required for webrtc_answer');
  CallsService.verifySessionTokenForUser(input.sessionId, userId, input.callToken);
  await CallsService.assertSignalRoute(input.sessionId, userId, input.toUserId);
  const session = await CallsService.markSessionConnected(input.sessionId, userId);
  clearCallTimeout(session.sessionId);
  io.to(`user:${input.toUserId}`).emit('webrtc_answer', { sessionId: input.sessionId, fromUserId: userId, sdp: input.sdp });
  emitCallStatus(io, session.participantIds, { sessionId: session.sessionId, status: session.status });
}

async function handleWebRtcIceCandidate(io: Server, socket: AuthSocket, payload: unknown): Promise<void> {
  const { userId } = socket;
  const input = parseWebRtcSignalPayload(payload);
  if (!input.candidate) throw new BadRequestError('candidate is required for webrtc_ice_candidate');
  CallsService.verifySessionTokenForUser(input.sessionId, userId, input.callToken);
  await CallsService.assertSignalRoute(input.sessionId, userId, input.toUserId);
  io.to(`user:${input.toUserId}`).emit('webrtc_ice_candidate', { sessionId: input.sessionId, fromUserId: userId, candidate: input.candidate });
}

/**
 * CallController - Đăng ký tất cả call/WebRTC events cho một socket
 */
export function registerCallController(io: Server, socket: AuthSocket): void {
  socket.on('call_invite', async (payload: unknown) => {
    try {
      await handleCallInvite(io, socket, payload);
    } catch (err) {
      logger.error('call_invite error', err);
      socket.emit('error', { message: err instanceof Error ? err.message : 'Failed to invite call' });
    }
  });

  socket.on('call_group_invite', async (payload: unknown) => {
    try {
      await handleCallGroupInvite(io, socket, payload);
    } catch (err) {
      logger.error('call_group_invite error', err);
      socket.emit('error', { message: err instanceof Error ? err.message : 'Failed to invite group call' });
    }
  });

  socket.on('call_accept', async (payload: unknown) => {
    try {
      await handleCallAccept(io, socket, payload);
    } catch (err) {
      logger.error('call_accept error', err);
      socket.emit('error', { message: err instanceof Error ? err.message : 'Failed to accept call' });
    }
  });

  socket.on('call_reject', async (payload: unknown) => {
    try {
      await handleCallReject(io, socket, payload);
    } catch (err) {
      logger.error('call_reject error', err);
      socket.emit('error', { message: err instanceof Error ? err.message : 'Failed to reject call' });
    }
  });

  socket.on('call_end', async (payload: unknown) => {
    try {
      await handleCallEnd(io, socket, payload);
    } catch (err) {
      logger.error('call_end error', err);
      socket.emit('error', { message: err instanceof Error ? err.message : 'Failed to end call' });
    }
  });

  socket.on('webrtc_offer', async (payload: unknown) => {
    try {
      await handleWebRtcOffer(io, socket, payload);
    } catch (err) {
      logger.error('webrtc_offer error', err);
      socket.emit('error', { message: err instanceof Error ? err.message : 'Failed to relay offer' });
    }
  });

  socket.on('webrtc_answer', async (payload: unknown) => {
    try {
      await handleWebRtcAnswer(io, socket, payload);
    } catch (err) {
      logger.error('webrtc_answer error', err);
      socket.emit('error', { message: err instanceof Error ? err.message : 'Failed to relay answer' });
    }
  });

  socket.on('webrtc_ice_candidate', async (payload: unknown) => {
    try {
      await handleWebRtcIceCandidate(io, socket, payload);
    } catch (err) {
      logger.error('webrtc_ice_candidate error', err);
      socket.emit('error', { message: err instanceof Error ? err.message : 'Failed to relay ICE candidate' });
    }
  });
}
