'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSocket } from '@/services/socket';
import {
  createStory,
  deleteStory,
  fetchMyStories,
  fetchReactions,
  fetchStoriesFeed,
  reactToStory,
  removeReaction,
  replyToStory,
  viewStory,
  type CreateStoryPayload,
  type Story,
  type StoryFeedGroup,
  type StoryReaction,
} from '@/services/stories';

interface StoryReactionEvent {
  storyId: string;
  userId: string;
  reactionType: string;
  displayName: string;
}

interface StoryReplyEvent {
  storyId: string;
  senderId: string;
  content: string;
  displayName: string;
}

export function useStories() {
  const [feed, setFeed] = useState<StoryFeedGroup[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [reactions, setReactions] = useState<StoryReaction[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      setIsFeedLoading(true);
      setErrorMessage(null);
      const data = await fetchStoriesFeed();
      setFeed(data);
    } catch {
      setErrorMessage('Không thể tải stories.');
    } finally {
      setIsFeedLoading(false);
    }
  }, []);

  const loadMyStories = useCallback(async () => {
    try {
      setIsFeedLoading(true);
      setErrorMessage(null);
      const data = await fetchMyStories();
      setMyStories(data);
    } catch {
      setErrorMessage('Không thể tải stories của bạn.');
    } finally {
      setIsFeedLoading(false);
    }
  }, []);

  const onCreate = useCallback(async (payload: CreateStoryPayload) => {
    try {
      setIsActionLoading(true);
      setErrorMessage(null);
      const story = await createStory(payload);
      setMyStories((prev) => [story, ...prev]);
      return story;
    } catch {
      setErrorMessage('Không thể tạo story.');
      return null;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const onDelete = useCallback(async (storyId: string) => {
    try {
      setIsActionLoading(true);
      setErrorMessage(null);
      await deleteStory(storyId);
      setMyStories((prev) => prev.filter((s) => s._id !== storyId));
    } catch {
      setErrorMessage('Không thể xóa story.');
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const onView = useCallback(async (storyId: string) => {
    try {
      await viewStory(storyId);
    } catch {
      // silent fail for view tracking
    }
  }, []);

  const onReact = useCallback(async (storyId: string, type: string) => {
    try {
      setErrorMessage(null);
      await reactToStory(storyId, type);
    } catch {
      setErrorMessage('Không thể thả reaction.');
    }
  }, []);

  const onRemoveReaction = useCallback(async (storyId: string) => {
    try {
      setErrorMessage(null);
      await removeReaction(storyId);
    } catch {
      setErrorMessage('Không thể xóa reaction.');
    }
  }, []);

  const onLoadReactions = useCallback(async (storyId: string) => {
    try {
      setIsActionLoading(true);
      setErrorMessage(null);
      const data = await fetchReactions(storyId);
      setReactions(data);
    } catch {
      setErrorMessage('Không thể tải danh sách reactions.');
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const onReply = useCallback(async (storyId: string, content: string) => {
    try {
      setErrorMessage(null);
      const result = await replyToStory(storyId, content);
      return result;
    } catch {
      setErrorMessage('Không thể gửi reply.');
      return null;
    }
  }, []);

  useEffect(() => {
    const token = (globalThis as Record<string, unknown>)['__accessToken'] as string | undefined;
    if (!token) return;

    const socket = getSocket(token);

    const handleReaction = (event: StoryReactionEvent) => {
      setFeed((prev) =>
        prev.map((group) => ({
          ...group,
          stories: group.stories.map((story) =>
            story._id === event.storyId
              ? {
                  ...story,
                  reactions: [
                    ...story.reactions.filter((r) => r.userId !== event.userId),
                    {
                      userId: event.userId,
                      displayName: event.displayName,
                      type: event.reactionType,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : story,
          ),
        })),
      );
    };

    const handleReply = (_event: StoryReplyEvent) => {
      // Reply creates a message in DM conversation.
      // Conversation list will refresh separately.
    };

    socket.on('story_reaction', handleReaction);
    socket.on('story_reply', handleReply);

    return () => {
      socket.off('story_reaction', handleReaction);
      socket.off('story_reply', handleReply);
    };
  }, []);

  return {
    feed,
    myStories,
    reactions,
    isFeedLoading,
    isActionLoading,
    errorMessage,
    loadFeed,
    loadMyStories,
    onCreate,
    onDelete,
    onView,
    onReact,
    onRemoveReaction,
    onLoadReactions,
    onReply,
  };
}
