import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/auth.middleware';
import {
  getAssistantListHandler,
  getUnreadConversationsHandler,
  createCatchupDigestHandler,
  getCatchupLatestHandler,
  regenerateCatchupHandler,
  updateSettingsHandler,
} from './assistant.controller';

export const assistantRouter = Router({ mergeParams: true });

// GET /api/ai/assistant?type=catchup_digest&limit=10&skip=0
assistantRouter.get('/', authenticate, getAssistantListHandler);

// GET /api/ai/assistant/catchup/unread-conversations
assistantRouter.get('/catchup/unread-conversations', authenticate, getUnreadConversationsHandler);

// POST /api/ai/assistant/catchup
assistantRouter.post('/catchup', authenticate, createCatchupDigestHandler);

// GET /api/ai/assistant/catchup/:conversationId
assistantRouter.get('/catchup/:conversationId', authenticate, getCatchupLatestHandler);

// POST /api/ai/assistant/catchup/:conversationId/regenerate
assistantRouter.post('/catchup/:conversationId/regenerate', authenticate, regenerateCatchupHandler);

// PATCH /api/ai/assistant/conversations/:conversationId/settings
assistantRouter.patch(
  '/conversations/:conversationId/settings',
  authenticate,
  updateSettingsHandler,
);
