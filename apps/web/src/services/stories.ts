import { apiClient } from './api';

export interface StoryReaction {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  type: string;
  createdAt: string;
}

export interface Story {
  _id: string;
  userId: string;
  mediaType: 'text' | 'image' | 'video';
  mediaUrl?: string;
  content?: string;
  backgroundColor?: string;
  fontStyle?: string;
  viewerIds: string[];
  reactions: StoryReaction[];
  expiresAt: string;
  createdAt: string;
}

export interface StoryFeedGroup {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  stories: Story[];
}

export interface CreateStoryPayload {
  mediaType: 'text' | 'image' | 'video';
  mediaUrl?: string;
  content?: string;
  backgroundColor?: string;
  fontStyle?: string;
}

export async function fetchStoriesFeed(): Promise<StoryFeedGroup[]> {
  const { data } = await apiClient.get<{ success: boolean; data: StoryFeedGroup[] }>('/api/stories');
  return data.data;
}

export async function fetchMyStories(): Promise<Story[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Story[] }>('/api/stories/me');
  return data.data;
}

export async function createStory(payload: CreateStoryPayload): Promise<Story> {
  const { data } = await apiClient.post<{ success: boolean; data: Story }>('/api/stories', payload);
  return data.data;
}

export async function deleteStory(storyId: string): Promise<void> {
  await apiClient.delete(`/api/stories/${storyId}`);
}

export async function viewStory(storyId: string): Promise<void> {
  await apiClient.post(`/api/stories/${storyId}/view`);
}

export async function reactToStory(storyId: string, type: string): Promise<void> {
  await apiClient.post(`/api/stories/${storyId}/react`, { type });
}

export async function removeReaction(storyId: string): Promise<void> {
  await apiClient.delete(`/api/stories/${storyId}/react`);
}

export async function fetchReactions(storyId: string): Promise<StoryReaction[]> {
  const { data } = await apiClient.get<{ success: boolean; data: StoryReaction[] }>(`/api/stories/${storyId}/reactions`);
  return data.data;
}

export async function replyToStory(storyId: string, content: string): Promise<{ conversationId: string; messageId: string }> {
  const { data } = await apiClient.post<{ success: boolean; data: { conversationId: string; messageId: string } }>(
    `/api/stories/${storyId}/reply`,
    { content },
  );
  return data.data;
}
