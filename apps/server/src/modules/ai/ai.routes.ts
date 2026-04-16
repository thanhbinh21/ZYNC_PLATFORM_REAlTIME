/**
 * AI Routes – Phase AI-0 scaffold
 *
 * Exposes:
 *   GET  /api/ai/health  — check Gemini + Neon reachability (auth required)
 *
 * Full chat + search endpoints are added in Phase AI-3.
 */

import { Router, type Request, type Response } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { isAIEnabled } from '../../infrastructure/gemini';
import { isNeonAvailable } from '../../infrastructure/neon';
import { logger } from '../../shared/logger';

export const aiRouter = Router();

/**
 * GET /api/ai/health
 * Returns current status of AI subsystems (Gemini, Neon, rate limits).
 */
aiRouter.get('/health', authenticate, (_req: Request, res: Response) => {
  const aiEnabled = isAIEnabled();
  const neonAvailable = isNeonAvailable();

  logger.debug('[AI] Health check requested');

  res.json({
    success: true,
    data: {
      ai: {
        enabled: aiEnabled,
        gemini: aiEnabled ? 'configured' : 'missing GEMINI_API_KEY',
        neon: neonAvailable ? 'configured' : 'missing NEON_DATABASE_URL',
        moderation: process.env['AI_MODERATION_ENABLED'] !== 'false',
        assistant: process.env['AI_ASSISTANT_ENABLED'] !== 'false',
        search: process.env['AI_SEARCH_ENABLED'] !== 'false',
      },
    },
  });
});

// ── Placeholder for AI-3 endpoints ────────────────────────────────────────────
// POST /api/ai/chat        → implemented in Phase AI-3 (ai.controller.ts)
// GET  /api/ai/suggestions → implemented in Phase AI-3
// GET  /api/search         → implemented in Phase AI-2 (search.routes.ts)
