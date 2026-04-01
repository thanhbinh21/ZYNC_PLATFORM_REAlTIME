import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { CreateStorySchema, ReactToStorySchema, ReplyToStorySchema } from './stories.schema';
import {
  createStoryHandler,
  deleteStoryHandler,
  getMyStoriesHandler,
  getStoriesFeedHandler,
  getStoryReactionsHandler,
  getStoryViewersHandler,
  reactToStoryHandler,
  removeReactionHandler,
  replyToStoryHandler,
  viewStoryHandler,
} from './stories.controller';

export const storiesRouter = Router();

storiesRouter.use(authenticate);

// GET /api/stories – get stories feed from friends
storiesRouter.get('/', getStoriesFeedHandler);

// GET /api/stories/me – get my own stories
storiesRouter.get('/me', getMyStoriesHandler);

// POST /api/stories – create a new story
storiesRouter.post('/', validateBody(CreateStorySchema), createStoryHandler);

// DELETE /api/stories/:storyId – delete own story
storiesRouter.delete('/:storyId', deleteStoryHandler);

// POST /api/stories/:storyId/view – mark story as viewed
storiesRouter.post('/:storyId/view', viewStoryHandler);

// POST /api/stories/:storyId/react – react to a story
storiesRouter.post('/:storyId/react', validateBody(ReactToStorySchema), reactToStoryHandler);

// DELETE /api/stories/:storyId/react – remove reaction
storiesRouter.delete('/:storyId/react', removeReactionHandler);

// GET /api/stories/:storyId/reactions – get reaction list (owner only)
storiesRouter.get('/:storyId/reactions', getStoryReactionsHandler);

// GET /api/stories/:storyId/viewers – get viewer list (owner only)
storiesRouter.get('/:storyId/viewers', getStoryViewersHandler);

// POST /api/stories/:storyId/reply – reply to a story via DM
storiesRouter.post('/:storyId/reply', validateBody(ReplyToStorySchema), replyToStoryHandler);
