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
  createdBy: string;
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

export interface UpdateGroupMemberRolePayload {
  role: 'admin' | 'member';
}

export async function createGroup(payload: CreateGroupPayload): Promise<GroupConversation> {
  const { data } = await apiClient.post<{ success: boolean; data: GroupConversation }>('/api/groups', payload);
  return data.data;
}

export async function addGroupMembers(groupId: string, payload: AddGroupMembersPayload): Promise<GroupConversation> {
  const { data } = await apiClient.post<{ success: boolean; data: GroupConversation }>(`/api/groups/${groupId}/members`, payload);
  return data.data;
}

export async function updateGroupMemberRole(
  groupId: string,
  userId: string,
  payload: UpdateGroupMemberRolePayload,
): Promise<GroupConversation> {
  const { data } = await apiClient.patch<{ success: boolean; data: GroupConversation }>(
    `/api/groups/${groupId}/members/${userId}/role`,
    payload,
  );
  return data.data;
}

export async function removeGroupMember(groupId: string, userId: string): Promise<GroupConversation> {
  const { data } = await apiClient.delete<{ success: boolean; data: GroupConversation }>(
    `/api/groups/${groupId}/members/${userId}`,
  );
  return data.data;
}

export async function disbandGroup(groupId: string): Promise<void> {
  await apiClient.delete(`/api/groups/${groupId}`);
}
