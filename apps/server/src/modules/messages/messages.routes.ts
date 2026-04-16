import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import {
  sendMessageHandler,
  getMessageHistoryHandler,
  updateMessageStatusHandler,
  markAsReadHandler,
  markMultipleAsReadHandler,
  reportMessageHandler,
  reactMessageHandler,
} from './messages.controller';

export const messagesRouter = Router();

// All message routes require authentication
messagesRouter.use(authenticate);

// ─── POST /api/messages/send ───────── Send a new message

messagesRouter.post('/send', sendMessageHandler);

// ─── GET /api/messages/:conversationId ──── Get message history (paginated)

messagesRouter.get('/:conversationId', getMessageHistoryHandler);

// ─── PUT /api/messages/:messageId/status ──── Update message status (sent/delivered/read)

messagesRouter.put('/:messageId/status', updateMessageStatusHandler);

// ─── POST /api/messages/:messageId/read ──── Mark single message as read

messagesRouter.post('/:messageId/read', markAsReadHandler);

// ─── POST /api/messages/batch/read ──── Batch mark multiple messages as read

messagesRouter.post('/batch/read', markMultipleAsReadHandler);

// ─── POST /api/messages/:messageId/report ──── Report a message for AI moderation

messagesRouter.post('/:messageId/report', reportMessageHandler);

// ─── POST /api/messages/:messageId/react ──── Add a reaction

messagesRouter.post('/:messageId/react', reactMessageHandler);
