import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';

export const storiesRouter = Router();

storiesRouter.use(authenticate);

// GET /api/stories – get stories from friends
storiesRouter.get('/', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// POST /api/stories – create story
storiesRouter.post('/', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// POST /api/stories/:storyId/view – mark as viewed
storiesRouter.post('/:storyId/view', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// DELETE /api/stories/:storyId – delete own story
storiesRouter.delete('/:storyId', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});
