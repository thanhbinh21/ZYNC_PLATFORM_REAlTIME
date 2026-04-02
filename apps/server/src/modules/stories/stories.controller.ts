import { type NextFunction, type Request, type Response } from 'express';
import { type AuthRequest } from '../../shared/middleware/auth.middleware';
import type { CreateStoryDto, ReactToStoryDto, ReplyToStoryDto } from './stories.schema';
import {
  createStory,
  deleteStory,
  getMyStories,
  getStoriesFeed,
  getStoryReactions,
  getStoryViewers,
  reactToStory,
  removeReaction,
  replyToStory,
  viewStory,
} from './stories.service';

export async function getStoriesFeedHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    const feed = await getStoriesFeed(userId);
    res.json({ success: true, data: feed });
  } catch (err) {
    next(err);
  }
}

export async function getMyStoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    const stories = await getMyStories(userId);
    res.json({ success: true, data: stories });
  } catch (err) {
    next(err);
  }
}

export async function createStoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    const dto = req.body as CreateStoryDto;
    const story = await createStory(userId, dto);
    res.status(201).json({ success: true, data: story });
  } catch (err) {
    next(err);
  }
}

export async function deleteStoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    await deleteStory(userId, req.params['storyId'] as string);
    res.json({ success: true, message: 'Story deleted' });
  } catch (err) {
    next(err);
  }
}

export async function viewStoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    await viewStory(userId, req.params['storyId'] as string);
    res.json({ success: true, message: 'Story viewed' });
  } catch (err) {
    next(err);
  }
}

export async function reactToStoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    const { type } = req.body as ReactToStoryDto;
    await reactToStory(userId, req.params['storyId'] as string, type);
    res.json({ success: true, message: 'Reaction added' });
  } catch (err) {
    next(err);
  }
}

export async function removeReactionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    await removeReaction(userId, req.params['storyId'] as string);
    res.json({ success: true, message: 'Reaction removed' });
  } catch (err) {
    next(err);
  }
}

export async function getStoryReactionsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    const reactions = await getStoryReactions(userId, req.params['storyId'] as string);
    res.json({ success: true, data: reactions });
  } catch (err) {
    next(err);
  }
}

export async function getStoryViewersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    const viewers = await getStoryViewers(userId, req.params['storyId'] as string);
    res.json({ success: true, data: viewers });
  } catch (err) {
    next(err);
  }
}

export async function replyToStoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    const { content } = req.body as ReplyToStoryDto;
    const result = await replyToStory(userId, req.params['storyId'] as string, content);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
