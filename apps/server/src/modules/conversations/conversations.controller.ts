import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { ConversationsService } from './conversations.service';
import { logger } from '../../shared/logger';

export const listConversationsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const conversations = await ConversationsService.getUserConversations(userId);

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    logger.error('Error in listConversationsHandler', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
