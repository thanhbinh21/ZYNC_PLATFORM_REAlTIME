import { Types } from 'mongoose';
import { ConversationMemberModel } from '../conversations/conversation-member.model';
import { ConversationModel, type IConversation } from '../conversations/conversation.model';
import { FriendshipModel } from '../friends/friendship.model';
import { UserModel } from '../users/user.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { getIO } from '../../socket/gateway';
import { produceNotificationEvent } from '../notifications/notifications.service';
import { logger } from '../../shared/logger';

interface GroupUpdatedPayload {
  groupId: string;
  type: 'created' | 'name_changed' | 'avatar_changed' | 'member_added' | 'member_removed' | 'role_changed' | 'disbanded';
  data: Record<string, unknown>;
}

interface GroupSummary {
  _id: string;
  type: 'group';
  name?: string;
  avatarUrl?: string;
  createdBy: string;
  adminIds: string[];
  users: Array<{ _id: string; displayName: string; avatarUrl?: string }>;
  updatedAt: Date;
}

function assertObjectId(id: string, fieldName: string): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError(`Invalid ${fieldName}`);
  }
}

async function getGroupOrThrow(groupId: string): Promise<IConversation> {
  assertObjectId(groupId, 'group id');
  const group = await ConversationModel.findById(groupId);
  if (!group || group.type !== 'group') {
    throw new NotFoundError('Group not found');
  }
  return group;
}

async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const member = await ConversationMemberModel.exists({
    conversationId: groupId,
    userId,
  });
  return Boolean(member);
}

async function ensureGroupMember(groupId: string, userId: string): Promise<void> {
  const member = await isGroupMember(groupId, userId);
  if (!member) {
    throw new ForbiddenError('You are not a member of this group');
  }
}

function getGroupCreatorId(group: IConversation): string {
  return group.createdBy ?? group.adminIds[0] ?? '';
}

function ensureGroupCreator(group: IConversation, userId: string): void {
  const creatorId = getGroupCreatorId(group);
  if (!creatorId || creatorId !== userId) {
    throw new ForbiddenError('Only group creator can perform this action');
  }
}

async function ensureUsersExist(userIds: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(userIds));
  if (uniqueIds.length === 0) {
    return;
  }

  uniqueIds.forEach((id) => assertObjectId(id, 'user id'));

  const count = await UserModel.countDocuments({ _id: { $in: uniqueIds } });
  if (count !== uniqueIds.length) {
    throw new BadRequestError('One or more users do not exist');
  }
}

async function ensureFriendship(currentUserId: string, memberIds: string[]): Promise<void> {
  if (memberIds.length === 0) {
    return;
  }

  const links = await FriendshipModel.find({
    userId: currentUserId,
    friendId: { $in: memberIds },
    status: 'accepted',
  }).select('friendId').lean();

  const friendSet = new Set(links.map((f) => f.friendId));
  const notFriends = memberIds.filter((id) => !friendSet.has(id));
  if (notFriends.length > 0) {
    throw new ForbiddenError('Only friends can be added to a group');
  }
}

async function buildGroupSummary(groupId: string): Promise<GroupSummary> {
  const group = await getGroupOrThrow(groupId);
  const members = await ConversationMemberModel.find({ conversationId: groupId }).lean();
  const memberIds = members.map((m) => m.userId);
  const users = await UserModel.find({ _id: { $in: memberIds } }, 'displayName avatarUrl').lean();

  const normalizedUsers = users.map((u) => ({
    _id: u._id.toString(),
    displayName: u.displayName as string,
    avatarUrl: u.avatarUrl as string | undefined,
  }));

  return {
    _id: group._id.toString(),
    type: 'group',
    name: group.name,
    avatarUrl: group.avatarUrl,
    createdBy: getGroupCreatorId(group),
    adminIds: group.adminIds,
    users: normalizedUsers,
    updatedAt: group.updatedAt,
  };
}

function emitGroupUpdated(memberUserIds: string[], payload: GroupUpdatedPayload): void {
  const io = getIO();
  if (!io) {
    return;
  }

  const uniqueUserIds = Array.from(new Set(memberUserIds));
  for (const memberId of uniqueUserIds) {
    io.to(`user:${memberId}`).emit('group_updated', payload);
  }
}

async function getGroupMemberIds(groupId: string): Promise<string[]> {
  const members = await ConversationMemberModel.find({ conversationId: groupId }).lean();
  return members.map((m) => m.userId);
}

export class GroupsService {
  static async createGroup(
    creatorId: string,
    input: { name: string; avatarUrl?: string; memberIds: string[] },
  ): Promise<GroupSummary> {
    const uniqueMembers = Array.from(new Set(input.memberIds.filter((id) => id !== creatorId)));

    if (uniqueMembers.length < 2) {
      throw new BadRequestError('Group requires at least 2 selected members');
    }

    if (uniqueMembers.length > 100) {
      throw new BadRequestError('Maximum 100 selected members');
    }

    await ensureUsersExist(uniqueMembers);
    await ensureFriendship(creatorId, uniqueMembers);

    const group = await ConversationModel.create({
      type: 'group',
      name: input.name.trim(),
      avatarUrl: input.avatarUrl,
      createdBy: creatorId,
      adminIds: [creatorId],
      unreadCounts: new Map<string, number>(),
    });

    await ConversationMemberModel.insertMany([
      { conversationId: group._id.toString(), userId: creatorId, role: 'admin' },
      ...uniqueMembers.map((memberId) => ({
        conversationId: group._id.toString(),
        userId: memberId,
        role: 'member' as const,
      })),
    ]);

    const summary = await buildGroupSummary(group._id.toString());
    emitGroupUpdated(summary.users.map((u) => u._id), {
      groupId: summary._id,
      type: 'created',
      data: { group: summary },
    });

    return summary;
  }

  static async updateGroup(
    currentUserId: string,
    groupId: string,
    input: { name?: string; avatarUrl?: string | null },
  ): Promise<GroupSummary> {
    const group = await getGroupOrThrow(groupId);
    await ensureGroupMember(groupId, currentUserId);
    ensureGroupCreator(group, currentUserId);

    const changedFields: Array<'name_changed' | 'avatar_changed'> = [];

    if (input.name !== undefined) {
      group.name = input.name.trim();
      changedFields.push('name_changed');
    }

    if (input.avatarUrl !== undefined) {
      group.avatarUrl = input.avatarUrl ?? undefined;
      changedFields.push('avatar_changed');
    }

    if (changedFields.length === 0) {
      throw new BadRequestError('No changes to update');
    }

    await group.save();

    const summary = await buildGroupSummary(groupId);
    const memberIds = summary.users.map((u) => u._id);
    changedFields.forEach((eventType) => {
      emitGroupUpdated(memberIds, {
        groupId,
        type: eventType,
        data: {
          name: summary.name,
          avatarUrl: summary.avatarUrl,
          updatedBy: currentUserId,
        },
      });
    });

    return summary;
  }

  static async addMembers(
    currentUserId: string,
    groupId: string,
    memberIds: string[],
  ): Promise<GroupSummary> {
    const group = await getGroupOrThrow(groupId);
    await ensureGroupMember(groupId, currentUserId);
    ensureGroupCreator(group, currentUserId);

    const uniqueMembers = Array.from(new Set(memberIds.filter((id) => id !== currentUserId)));
    if (uniqueMembers.length === 0) {
      throw new BadRequestError('No members to add');
    }

    await ensureUsersExist(uniqueMembers);
    await ensureFriendship(currentUserId, uniqueMembers);

    const existingMembers = await ConversationMemberModel.find({
      conversationId: groupId,
      userId: { $in: uniqueMembers },
    }).select('userId').lean();

    const existingSet = new Set(existingMembers.map((m) => m.userId));
    const toInsert = uniqueMembers.filter((id) => !existingSet.has(id));

    if (toInsert.length === 0) {
      throw new BadRequestError('All selected users are already in group');
    }

    const currentMemberCount = await ConversationMemberModel.countDocuments({ conversationId: groupId });
    if (currentMemberCount + toInsert.length > 100) {
      throw new BadRequestError('Group cannot exceed 100 members');
    }

    await ConversationMemberModel.insertMany(
      toInsert.map((memberId) => ({
        conversationId: groupId,
        userId: memberId,
        role: 'member' as const,
      })),
    );

    const summary = await buildGroupSummary(groupId);
    emitGroupUpdated(summary.users.map((u) => u._id), {
      groupId,
      type: 'member_added',
      data: {
        memberIds: toInsert,
        addedBy: currentUserId,
      },
    });

    // F3.1: Produce notification for newly added members
    void (async () => {
      try {
        const admin = await UserModel.findById(currentUserId).select('displayName').lean();
        const adminName = (admin?.displayName as string) ?? 'Someone';
        const groupName = summary.name ?? 'a group';

        for (const addedUserId of toInsert) {
          await produceNotificationEvent({
            userId: addedUserId,
            type: 'group_invite',
            title: 'Được thêm vào nhóm',
            body: `${adminName} đã thêm bạn vào nhóm ${groupName}`,
            conversationId: groupId,
            fromUserId: currentUserId,
            data: { conversationId: groupId, action: 'open_chat' },
          });
        }
      } catch (err) {
        logger.error('Failed to produce group_invite notifications', err);
      }
    })();

    return summary;
  }

  static async removeMember(
    currentUserId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<GroupSummary> {
    const group = await getGroupOrThrow(groupId);
    await ensureGroupMember(groupId, currentUserId);
    ensureGroupCreator(group, currentUserId);

    if (targetUserId === currentUserId) {
      throw new BadRequestError('Use leave endpoint to leave group');
    }

    const targetMember = await ConversationMemberModel.findOne({
      conversationId: groupId,
      userId: targetUserId,
    });

    if (!targetMember) {
      throw new NotFoundError('Member not found in group');
    }

    await targetMember.deleteOne();

    group.adminIds = group.adminIds.filter((id) => id !== targetUserId);
    await group.save();

    const memberIds = await getGroupMemberIds(groupId);
    emitGroupUpdated([...memberIds, targetUserId], {
      groupId,
      type: 'member_removed',
      data: {
        userId: targetUserId,
        removedBy: currentUserId,
      },
    });

    return buildGroupSummary(groupId);
  }

  static async leaveGroup(currentUserId: string, groupId: string): Promise<{ disbanded: boolean; groupId: string }> {
    const group = await getGroupOrThrow(groupId);
    await ensureGroupMember(groupId, currentUserId);

    if (getGroupCreatorId(group) === currentUserId) {
      throw new ForbiddenError('Group creator cannot leave. Please disband the group instead');
    }

    await ConversationMemberModel.deleteOne({
      conversationId: groupId,
      userId: currentUserId,
    });

    const remainingMembers = await ConversationMemberModel.find({ conversationId: groupId }).sort({ joinedAt: 1 }).lean();

    if (remainingMembers.length === 0) {
      await ConversationModel.findByIdAndDelete(groupId);
      emitGroupUpdated([currentUserId], {
        groupId,
        type: 'disbanded',
        data: { by: currentUserId },
      });
      return { disbanded: true, groupId };
    }

    const wasAdmin = group.adminIds.includes(currentUserId);
    group.adminIds = group.adminIds.filter((id) => id !== currentUserId);

    if (wasAdmin && group.adminIds.length === 0) {
      const promotedMember = remainingMembers[0];
      if (promotedMember) {
        group.adminIds = [promotedMember.userId];
        await ConversationMemberModel.updateOne(
          { conversationId: groupId, userId: promotedMember.userId },
          { role: 'admin' },
        );
      }
    }

    await group.save();

    const remainingIds = remainingMembers.map((m) => m.userId);
    emitGroupUpdated([...remainingIds, currentUserId], {
      groupId,
      type: 'member_removed',
      data: {
        userId: currentUserId,
        removedBy: currentUserId,
        action: 'left',
      },
    });

    return { disbanded: false, groupId };
  }

  static async updateMemberRole(
    currentUserId: string,
    groupId: string,
    targetUserId: string,
    role: 'admin' | 'member',
  ): Promise<GroupSummary> {
    const group = await getGroupOrThrow(groupId);
    await ensureGroupMember(groupId, currentUserId);
    ensureGroupCreator(group, currentUserId);

    const targetMember = await ConversationMemberModel.findOne({
      conversationId: groupId,
      userId: targetUserId,
    });

    if (!targetMember) {
      throw new NotFoundError('Member not found in group');
    }

    if (role === 'admin') {
      if (!group.adminIds.includes(targetUserId)) {
        group.adminIds.push(targetUserId);
      }
    } else {
      const wouldRemainAdmins = group.adminIds.filter((id) => id !== targetUserId);
      if (wouldRemainAdmins.length === 0) {
        throw new BadRequestError('Group must have at least one admin');
      }

      group.adminIds = group.adminIds.filter((id) => id !== targetUserId);
    }

    targetMember.role = role;
    await targetMember.save();
    await group.save();

    const summary = await buildGroupSummary(groupId);
    emitGroupUpdated(summary.users.map((u) => u._id), {
      groupId,
      type: 'role_changed',
      data: {
        userId: targetUserId,
        role,
        updatedBy: currentUserId,
      },
    });

    return summary;
  }

  static async deleteGroup(currentUserId: string, groupId: string): Promise<void> {
    const group = await getGroupOrThrow(groupId);
    await ensureGroupMember(groupId, currentUserId);
    ensureGroupCreator(group, currentUserId);

    const memberIds = await getGroupMemberIds(groupId);
    await ConversationMemberModel.deleteMany({ conversationId: groupId });
    await ConversationModel.findByIdAndDelete(groupId);

    emitGroupUpdated(memberIds, {
      groupId,
      type: 'disbanded',
      data: {
        by: currentUserId,
      },
    });
  }
}
