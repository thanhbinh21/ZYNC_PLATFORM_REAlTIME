import { Types } from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import { ConversationMemberModel } from '../../conversations/conversation-member.model';
import { emitAiReminderUpdated } from '../../../socket/gateway';
import { AiReminderModel, type IAiReminder } from './reminder.model';
import type { CreateReminderInput, UpdateReminderInput } from './reminder.schema';

interface SerializedReminder {
  _id: string;
  userId: string;
  conversationId: string;
  digestId?: string;
  sourceMessageRefs: string[];
  title: string;
  description?: string;
  dueAt?: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function serialize(reminder: IAiReminder): SerializedReminder {
  return {
    _id: String(reminder._id),
    userId: reminder.userId,
    conversationId: reminder.conversationId,
    digestId: reminder.digestId ? String(reminder.digestId) : undefined,
    sourceMessageRefs: reminder.sourceMessageRefs,
    title: reminder.title,
    description: reminder.description,
    dueAt: reminder.dueAt?.toISOString(),
    status: reminder.status,
    createdBy: reminder.createdBy,
    createdAt: reminder.createdAt.toISOString(),
    updatedAt: reminder.updatedAt.toISOString(),
  };
}

async function assertMembership(conversationId: string, userId: string): Promise<void> {
  const member = await ConversationMemberModel.findOne({ conversationId, userId });
  if (!member) {
    throw new ForbiddenError('Not allowed to manage reminders for this conversation');
  }
}

export class AiReminderService {
  static async create(
    userId: string,
    input: CreateReminderInput,
  ): Promise<SerializedReminder> {
    await assertMembership(input.conversationId, userId);

    const reminder = await AiReminderModel.create({
      userId,
      conversationId: input.conversationId,
      digestId: input.digestId,
      sourceMessageRefs: input.sourceMessageRefs,
      title: input.title,
      description: input.description,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      status: 'pending',
      createdBy: 'user',
    });

    const serialized = serialize(reminder);
    emitAiReminderUpdated(userId, serialized);
    return serialized;
  }

  static async list(
    userId: string,
    filters?: { conversationId?: string; status?: string },
  ): Promise<SerializedReminder[]> {
    const query: Record<string, unknown> = { userId };
    if (filters?.conversationId) query.conversationId = filters.conversationId;
    if (filters?.status) query.status = filters.status;

    const reminders = await AiReminderModel.find(query)
      .sort({ dueAt: 1, createdAt: -1 })
      .lean<IAiReminder[]>();

    return reminders.map((r) => ({
      _id: String(r._id),
      userId: r.userId,
      conversationId: r.conversationId,
      digestId: r.digestId ? String(r.digestId) : undefined,
      sourceMessageRefs: r.sourceMessageRefs,
      title: r.title,
      description: r.description,
      dueAt: r.dueAt?.toISOString(),
      status: r.status,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  static async getById(userId: string, reminderId: string): Promise<SerializedReminder> {
    if (!Types.ObjectId.isValid(reminderId)) {
      throw new NotFoundError('Reminder not found');
    }

    const reminder = await AiReminderModel.findById(reminderId).lean<IAiReminder>();
    if (!reminder || reminder.userId !== userId) {
      throw new NotFoundError('Reminder not found');
    }

    return serialize(reminder);
  }

  static async update(
    userId: string,
    reminderId: string,
    input: UpdateReminderInput,
  ): Promise<SerializedReminder> {
    if (!Types.ObjectId.isValid(reminderId)) {
      throw new NotFoundError('Reminder not found');
    }

    const reminder = await AiReminderModel.findById(reminderId);
    if (!reminder || reminder.userId !== userId) {
      throw new NotFoundError('Reminder not found');
    }

    if (input.status !== undefined) reminder.status = input.status;
    if (input.title !== undefined) reminder.title = input.title;
    if (input.description !== undefined) reminder.description = input.description;
    if (input.dueAt !== undefined) {
      reminder.dueAt = input.dueAt ? new Date(input.dueAt) : undefined;
    }

    await reminder.save();
    const serialized = serialize(reminder);
    emitAiReminderUpdated(userId, serialized);
    return serialized;
  }

  static async delete(userId: string, reminderId: string): Promise<void> {
    if (!Types.ObjectId.isValid(reminderId)) {
      throw new NotFoundError('Reminder not found');
    }

    const reminder = await AiReminderModel.findOneAndDelete({ _id: reminderId, userId });
    if (!reminder) {
      throw new NotFoundError('Reminder not found');
    }

    emitAiReminderUpdated(userId, {
      ...serialize(reminder),
      _id: reminderId,
      status: 'deleted',
    } as SerializedReminder & { status: 'deleted' });
  }

  static async createFromActionItem(
    userId: string,
    actionItem: { text: string; sourceMessageRefs: string[] },
    conversationId: string,
    digestId?: string,
  ): Promise<SerializedReminder> {
    return this.create(userId, {
      conversationId,
      digestId,
      sourceMessageRefs: actionItem.sourceMessageRefs,
      title: actionItem.text,
    });
  }
}
