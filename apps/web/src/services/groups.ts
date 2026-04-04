import { apiClient } from './api';

export interface GroupMemberUser {
  _id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface GroupConversation {
  _id: string;
  type: 'group';
  name?: string;
  avatarUrl?: string;
  adminIds: string[];
  users: GroupMemberUser[];
  updatedAt: string;
}

export interface CreateGroupPayload {
  name: string;
  memberIds: string[];
  avatarUrl?: string;
}

export interface AddGroupMembersPayload {
  memberIds: string[];
}

export async function createGroup(payload: CreateGroupPayload): Promise<GroupConversation> {
  const { data } = await apiClient.post<{ success: boolean; data: GroupConversation }>('/api/groups', payload);
  return data.data;
}

export async function addGroupMembers(groupId: string, payload: AddGroupMembersPayload): Promise<GroupConversation> {
  const { data } = await apiClient.post<{ success: boolean; data: GroupConversation }>(`/api/groups/${groupId}/members`, payload);
  return data.data;
}
