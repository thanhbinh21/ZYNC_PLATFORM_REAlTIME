# Delete & Recall Message Feature - Implementation Todo

**Date:** April 11, 2026  
**Feature:** Delete for Me + Recall Message  
**Complexity:** ⭐⭐ Medium  
**Estimated Time:** 4-6 hours

---

## Overview

Implement message deletion with two modes:
- **Delete for Me:** Message disappears only for sender (recipient still sees it)
- **Recall:** Message removed everywhere with "[Tin nhắn đã được thu hồi]" placeholder for all

---

## Backend Implementation

### Task 1: Update Message Model

**File:** `apps/server/src/modules/messages/message.model.ts`

**Status:** ✅ COMPLETED

**Changes:**

```typescript
// Keep existing imports and storyRef interface
import { Schema, model, type Document } from 'mongoose';
import { type StoryMediaType } from '../stories/story.model';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'sticker' | `file/${string}`;
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface IStoryRef {
  storyId: string;
  ownerId: string;
  mediaType: StoryMediaType;
  thumbnail?: string;
}

// ─── ADD NEW INTERFACE ───
export type DeleteType = 'unsend' | 'recall';

export interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  content?: string;
  type: MessageType;
  mediaUrl?: string;
  storyRef?: IStoryRef;  // ✅ KEEP THIS - Don't remove
  idempotencyKey: string;
  
  // ─── NEW FIELDS FOR DELETION ───
  isDeleted: boolean;                    // Soft delete flag
  deletedAt?: Date;                      // When deleted
  deletedBy?: string;                    // Who deleted (sender ID)
  deleteType?: DeleteType;               // Type of deletion: 'unsend' | 'recall'
  deletedFor?: string[];                 // Array of userIds who deleted "for me"
  
  createdAt: Date;
}

const storyRefSchema = new Schema<IStoryRef>(
  {
    storyId: { type: String, required: true },
    ownerId: { type: String, required: true },
    mediaType: { type: String, enum: ['text', 'image', 'video'], required: true },
    thumbnail: { type: String },
  },
  { _id: false },
);

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: String, required: true },
    senderId: { type: String, required: true },
    content: { type: String, required: false },
    type: {
      type: String,
      validate: {
        // ✅ KEEP ORIGINAL VALIDATION - Don't change
        validator: (v: string) => /^(text|image|video|audio|sticker|file\/.+)$/.test(v),
        message: 'Invalid message type. Must be: text, image, video, audio, sticker, or file/<filename>'
      },
      default: 'text',
    },
    mediaUrl: { type: String },
    storyRef: { type: storyRefSchema },  // ✅ KEEP THIS - Don't remove
    idempotencyKey: { type: String, required: true, unique: true },
    
    // ─── NEW DELETION FIELDS ───
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
    deleteType: { type: String, enum: ['unsend', 'recall'] },
    deletedFor: [{ type: String }],  // Array of user IDs
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ isDeleted: 1 });  // For filtering deleted messages

export const MessageModel = model<IMessage>('Message', messageSchema);
```

---

### Task 2: Add Service Methods

**File:** `apps/server/src/modules/messages/messages.service.ts`

**Status:** ✅ COMPLETED

**Add to MessagesService class:**

```typescript
import { type DeleteType } from './message.model';

export class MessagesService {
  private static readonly RECALL_TIMEOUT = 5 * 60 * 1000; // 5 minutes (like Zalo)

  /**
   * Check if message can be recalled (within time limit)
   */
  static canRecallMessage(message: IMessage): boolean {
    if (!message.senderId) return false;
    
    const now = Date.now();
    const createdTime = new Date(message.createdAt).getTime();
    
    // Cannot recall after 5 minutes
    if (now - createdTime > this.RECALL_TIMEOUT) {
      return false;
    }
    
    return true;
  }

  /**
   * Delete message for sender only (message still visible to recipients)
   * @param messageId Message ID to delete
   * @param userId User ID of sender
   * @returns Updated message document
   */
  static async deleteMessageForMe(
    messageId: string,
    userId: string,
  ): Promise<IMessage> {
    const message = await MessageModel.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    // Only sender can delete
    if (message.senderId !== userId) {
      throw new Error('Only sender can delete own messages');
    }
    
    // Initialize deletedFor array if not exists
    if (!message.deletedFor) {
      message.deletedFor = [];
    }
    
    // Add userId to deletedFor if not already there
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
    }
    
    // Mark deletedAt for audit trail (optional)
    message.updatedAt = new Date();
    
    await message.save();
    return message;
  }

  /**
   * Recall message (delete everywhere with placeholder)
   * @param messageId Message ID to recall
   * @param userId User ID of sender
   * @returns Updated message document
   */
  static async recallMessage(
    messageId: string,
    userId: string,
  ): Promise<IMessage> {
    const message = await MessageModel.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    // Only sender can recall
    if (message.senderId !== userId) {
      throw new Error('Only sender can recall own messages');
    }
    
    // Check time limit (max 5 minutes)
    if (!this.canRecallMessage(message)) {
      throw new Error('Message is too old to recall (max 5 minutes)');
    }
    
    // Mark as deleted
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = userId;
    message.deleteType = 'recall';
    message.content = undefined;  // Clear content
    message.mediaUrl = undefined;  // Clear media
    message.storyRef = undefined;  // Clear story ref
    
    await message.save();
    
    // Delete associated message status documents (optional cleanup)
    await MessageStatusModel.deleteMany({ messageId: message._id.toString() }).catch(() => {
      // Ignore if already deleted
    });
    
    return message;
  }

  /**
   * Get messages with proper visibility based on deletion status
   * Filters out messages deleted "for me" and shows placeholder for recalled messages
   */
  static async getMessagesWithVisibility(
    conversationId: string,
    requestingUserId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<PaginatedMessages> {
    // ─── Existing pagination logic (same as before) ───
    const query: Record<string, unknown> = { conversationId };
    if (cursor) {
      query['createdAt'] = { $lt: new Date(cursor) };
    }
    
    const messages = await MessageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();
    
    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();
    
    // ─── Filter based on deletion ───
    const filteredMessages = messages
      .map((msg) => {
        // If message is recalled: show placeholder
        if (msg.isDeleted && msg.deleteType === 'recall') {
          return {
            ...msg,
            content: '[Tin nhắn đã được thu hồi]',
            mediaUrl: undefined,
            storyRef: undefined,
            type: 'system-recall' as const,  // Special type for UI
            isRecalled: true,  // Flag for UI to style differently
          };
        }
        
        // If deleted for this user only: hide it
        if (msg.deletedFor?.includes(requestingUserId)) {
          return null;  // Don't include in response
        }
        
        return msg;
      })
      .filter(Boolean);  // Remove null entries
    
    // ─── Fetch status (same as original) ───
    const messageIds = filteredMessages.map(m => m._id.toString());
    const statuses = await MessageStatusModel.find({
      messageId: { $in: messageIds },
    });
    
    // ─── Aggregate status ───
    const statusByMessageId: Record<string, string> = {};
    filteredMessages.forEach((msg) => {
      const allStatuses = statuses.filter(s => s.messageId === msg._id.toString());
      statusByMessageId[msg._id] = this.aggregateMessageStatus(
        msg._id,
        msg.senderId,
        requestingUserId,
        allStatuses,
      );
    });
    
    filteredMessages.forEach((msg) => {
      msg.status = statusByMessageId[msg._id];
    });
    
    const nextCursor = hasMore ? filteredMessages[filteredMessages.length - 1]?.createdAt : null;
    
    return {
      messages: filteredMessages.reverse(),  // Chronological order
      nextCursor: nextCursor?.toString(),
      hasMore,
    };
  }
}
```

---

### Task 3: Add Socket Event Handlers

**File:** `apps/server/src/socket/gateway.ts`

**Status:** ✅ COMPLETED

**Add to socket connection handler:**

```typescript
// ─── Delete & Recall Events ───

socket.on('delete_message_for_me', async (payload: unknown) => {
  try {
    await handleDeleteMessageForMe(io, socket as AuthSocket, payload);
  } catch (err) {
    logger.error('delete_message_for_me error', err);
    socket.emit('error', { message: 'Failed to delete message' });
  }
});

socket.on('recall_message', async (payload: unknown) => {
  try {
    await handleRecallMessage(io, socket as AuthSocket, payload);
  } catch (err) {
    logger.error('recall_message error', err);
    socket.emit('error', { message: 'Failed to recall message' });
  }
});

// ─── Handler Functions (Add after existing handlers) ───

async function handleDeleteMessageForMe(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const userId = socket.userId;
  
  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }
  
  const { messageId, conversationId } = payload as {
    messageId?: string;
    conversationId?: string;
  };
  
  if (!messageId || !conversationId) {
    socket.emit('error', { message: 'Missing messageId or conversationId' });
    return;
  }
  
  // ✅ USE .then() INSTEAD OF await
  MessagesService.deleteMessageForMe(messageId, userId)
    .then((message) => {
      // Notify only this user (only they see the change)
      socket.emit('message_deleted_for_me', {
        messageId: message._id.toString(),
        conversationId,
        deletedAt: new Date().toISOString(),
      });
      
      logger.debug(`Message ${messageId} deleted for user ${userId}`);
    })
    .catch((err) => {
      logger.error('handleDeleteMessageForMe error', err);
      socket.emit('error', { message: (err as Error).message });
    });
}

async function handleRecallMessage(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const userId = socket.userId;
  
  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }
  
  const { messageId, conversationId } = payload as {
    messageId?: string;
    conversationId?: string;
  };
  
  if (!messageId || !conversationId) {
    socket.emit('error', { message: 'Missing messageId or conversationId' });
    return;
  }
  
  // ✅ USE .then() INSTEAD OF await
  MessagesService.recallMessage(messageId, userId)
    .then((message) => {
      // Broadcast to EVERYONE in conversation (sender + all recipients)
      io.to(`conv:${conversationId}`).emit('message_recalled', {
        messageId: message._id.toString(),
        conversationId,
        recalledBy: userId,
        recalledAt: new Date().toISOString(),
      });
      
      logger.info(`Message ${messageId} recalled by user ${userId}`);
    })
    .catch((err) => {
      logger.error('handleRecallMessage error', err);
      socket.emit('error', { message: (err as Error).message });
    });
}
```

---

### Task 4: Add REST API Endpoints (Optional)

**File:** `apps/server/src/modules/messages/messages.controller.ts`

**Status:** ⬜ TODO (Optional - for HTTP fallback)

```typescript
// Add new endpoints
router.delete(
  '/:messageId/delete-for-me',
  async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;  // From auth middleware
    
    try {
      const message = await MessagesService.deleteMessageForMe(messageId, userId);
      res.json({ success: true, message });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

router.delete(
  '/:messageId/recall',
  async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;
    
    try {
      const message = await MessagesService.recallMessage(messageId, userId);
      res.json({ success: true, message });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);
```

---

## Frontend Implementation

### Task 5: Add Socket Service Functions

**File:** `apps/web/src/services/socket.ts`

**Status:** ⬜ TODO

**Add new functions after typing indicators section:**

```typescript
// ─── Delete & Recall Events ───

/**
 * Delete message for sender only
 * @param conversationId Conversation ID
 * @param messageId Message ID to delete
 */
export function deleteMessageForMe(
  conversationId: string,
  messageId: string,
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('delete_message_for_me', {
    conversationId,
    messageId,
  });
}

/**
 * Recall message (delete everywhere)
 * @param conversationId Conversation ID
 * @param messageId Message ID to recall
 */
export function recallMessage(
  conversationId: string,
  messageId: string,
): void {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }

  socket.emit('recall_message', {
    conversationId,
    messageId,
  });
}

/**
 * Listen to message deletion events (for me only)
 * @param callback Handler for deletion
 */
export function listenToMessageDeletion(
  callback: (data: {
    messageId: string;
    conversationId: string;
    deletedAt: string;
  }) => void,
): void {
  if (!socket) {
    throw new Error('Socket not initialized');
  }

  socket.on('message_deleted_for_me', callback);
}

/**
 * Stop listening to message deletion events
 */
export function unlistenToMessageDeletion(): void {
  if (socket) {
    socket.off('message_deleted_for_me');
  }
}

/**
 * Listen to message recall events (for everyone)
 * @param callback Handler for recall
 */
export function listenToMessageRecall(
  callback: (data: {
    messageId: string;
    conversationId: string;
    recalledBy: string;
    recalledAt: string;
  }) => void,
): void {
  if (!socket) {
    throw new Error('Socket not initialized');
  }

  socket.on('message_recalled', callback);
}

/**
 * Stop listening to message recall events
 */
export function unlistenToMessageRecall(): void {
  if (socket) {
    socket.off('message_recalled');
  }
}

// Update socketService export
export const socketService = {
  // ... existing exports ...
  deleteMessageForMe,
  recallMessage,
  listenToMessageDeletion,
  unlistenToMessageDeletion,
  listenToMessageRecall,
  unlistenToMessageRecall,
};
```

---

### Task 6: Update useChat Hook

**File:** `apps/web/src/hooks/use-messaging.ts`

**Status:** ⬜ TODO

**Add to UseChatReturn interface:**

```typescript
interface UseChatReturn {
  // ... existing fields ...
  deleteMessageForMe: (messageId: string) => Promise<void>;
  recallMessage: (messageId: string) => Promise<void>;
}
```

**Add to useChat function body after message setup:**

```typescript
// ─── Delete Message Listeners Setup ───
useEffect(() => {
  if (!token) return;
  
  // ✅ CREATE LISTENER FUNCTIONS (like listenToMessages in socket.ts)
  
  const handleMessageDeletedForMe = (data: {
    messageId: string;
    conversationId: string;
    deletedAt: string;
  }) => {
    // Only process if this is the right conversation
    if (data.conversationId !== conversationId) return;
    
    // Remove from messages state
    setMessages((prev) =>
      prev.filter((msg) => msg._id !== data.messageId)
    );
    
    // Remove from status map
    setMessageStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[data.messageId];
      return newStatus;
    });
  };
  
  const handleMessageRecalled = (data: {
    messageId: string;
    conversationId: string;
    recalledBy: string;
    recalledAt: string;
  }) => {
    // Only process if this is the right conversation
    if (data.conversationId !== conversationId) return;
    
    // Update message to placeholder
    setMessages((prev) =>
      prev.map((msg) =>
        msg._id === data.messageId
          ? {
              ...msg,
              content: '[Tin nhắn đã được thu hồi]',
              mediaUrl: undefined,
              type: 'system-recall' as const,
            }
          : msg,
      ),
    );
    
    // Update status
    setMessageStatus((prev) => ({
      ...prev,
      [data.messageId]: 'read',  // Recalled messages show as read
    }));
  };
  
  try {
    // Use listener functions instead of direct socket.on
    listenToMessageDeletion(handleMessageDeletedForMe);
    listenToMessageRecall(handleMessageRecalled);
  } catch (err) {
    console.error('Failed to setup deletion listeners:', err);
  }
  
  return () => {
    try {
      unlistenToMessageDeletion();
      unlistenToMessageRecall();
    } catch (err) {
      console.error('Failed to cleanup deletion listeners:', err);
    }
  };
}, [conversationId, token]);

// ─── Delete & Recall Handlers ───

const handleDeleteForMe = useCallback(
  async (messageId: string) => {
    if (!isConnected()) {
      setError('Not connected to messaging service');
      return;
    }
    
    try {
      deleteMessageForMe(conversationId, messageId);
    } catch (err) {
      console.error('Failed to delete message:', err);
      setError('Failed to delete message');
    }
  },
  [conversationId]
);

const handleRecall = useCallback(
  async (messageId: string) => {
    if (!isConnected()) {
      setError('Not connected to messaging service');
      return;
    }
    
    try {
      recallMessage(conversationId, messageId);
    } catch (err) {
      console.error('Failed to recall message:', err);
      setError('Failed to recall message');
    }
  },
  [conversationId]
);

// Add to return statement
return {
  // ... existing returns ...
  deleteMessageForMe: handleDeleteForMe,
  recallMessage: handleRecall,
};
```

**Add imports at top:**

```typescript
import {
  // ... existing imports ...
  deleteMessageForMe,
  recallMessage,
  listenToMessageDeletion,
  unlistenToMessageDeletion,
  listenToMessageRecall,
  unlistenToMessageRecall,
} from '@/services/socket';
```

---

### Task 7: Add UI Context Menu Component

**File:** `apps/web/src/components/home-dashboard/molecules/message-item.tsx`

**Status:** ⬜ TODO

**Create new component or update existing:**

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import type { Message } from '@zync/shared-types';

interface MessageItemProps {
  message: Message;
  isSender: boolean;
  canRecall: boolean;  // Calculated in parent (within 5 min)
  onDeleteForMe: (messageId: string) => void;
  onRecall: (messageId: string) => void;
}

export function MessageItem({
  message,
  isSender,
  canRecall,
  onDeleteForMe,
  onRecall,
}: MessageItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hide menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Show placeholder if recalled
  if (message.type === 'system-recall') {
    return (
      <div className="my-2 flex items-center justify-center">
        <span className="text-gray-400 italic text-sm">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isSender ? 'justify-end' : 'justify-start'} my-2 group`}
      onContextMenu={(e) => {
        e.preventDefault();
        if (isSender) {
          setShowMenu(!showMenu);
        }
      }}
      ref={menuRef}
    >
      <div className="relative">
        {/* Message bubble */}
        <div className={`
          max-w-xs px-4 py-2 rounded-lg
          ${isSender ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}
          break-words
        `}>
          {message.content && <p>{message.content}</p>}
          {message.mediaUrl && (
            <img
              src={message.mediaUrl}
              alt="message"
              className="max-w-xs max-h-64 rounded"
            />
          )}
          <span className="text-xs opacity-70 mt-1 block">
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
        </div>

        {/* Context Menu */}
        {showMenu && isSender && (
          <div className="absolute top-0 right-0 mt-8 bg-white border border-gray-200 rounded shadow-lg z-50">
            {/* Delete for me - always available */}
            <button
              onClick={() => {
                onDeleteForMe(message._id);
                setShowMenu(false);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
            >
              🗑️ Xóa ở bản thân
            </button>

            {/* Recall - only within time limit */}
            {canRecall && (
              <>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    onRecall(message._id);
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                >
                  ↩️ Thu hồi tin nhắn
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Task 8: Update Home Dashboard Component

**File:** `apps/web/src/components/home-dashboard/organisms/home-dashboard.tsx` (or wherever messages are rendered)

**Status:** ⬜ TODO

**Update message rendering:**

```typescript
const RECALL_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Calculate canRecall for each message
const canRecallMessage = (message: Message): boolean => {
  if (message.senderId !== userId) return false;
  
  const now = Date.now();
  const createdTime = new Date(message.createdAt).getTime();
  
  return now - createdTime < RECALL_TIMEOUT;
};

// In render:
{messages.map((message) => (
  <MessageItem
    key={message._id}
    message={message}
    isSender={message.senderId === userId}
    canRecall={canRecallMessage(message)}
    onDeleteForMe={deleteMessageForMe}
    onRecall={recallMessage}
  />
))}
```

---

## Testing Checklist

### Backend Tests
- [ ] Can only sender delete/recall
- [ ] Cannot recall after 5 minutes
- [ ] Delete for me doesn't broadcast to other users
- [ ] Recall broadcasts to everyone
- [ ] Message shows placeholder after recall
- [ ] Deleted messages filtered from getMessages
- [ ] Status aggregation works with deleted messages

### Frontend Tests
- [ ] Context menu appears on right-click (sender only)
- [ ] Delete immediately removes message from sender
- [ ] Recall shows placeholder on all clients
- [ ] Time check prevents recall option after 5 min
- [ ] Socket listeners setup/cleanup correctly
- [ ] No memory leaks from event listeners

### Integration Tests
- [ ] E2E: Send → Delete for me → Verify only sender sees removal
- [ ] E2E: Send → Recall → Verify all see placeholder
- [ ] E2E: Recall button disabled after 5 minutes
- [ ] E2E: Multiple users in group conversation recall works

---

## Database Migration (if needed)

```typescript
// Add to migration script
db.messages.updateMany(
  {},
  {
    $set: {
      isDeleted: false,
      deleteType: null,
      deletedFor: [],
    }
  }
);

// Add indexes
db.messages.createIndex({ isDeleted: 1 });
db.messages.createIndex({ deletedAt: 1 });
```

---

## API Response Examples

### Delete for Me Response
```json
{
  "messageId": "msg-123",
  "conversationId": "conv-456",
  "deletedAt": "2026-04-11T10:30:00Z"
}
```

### Recall Message Response
```json
{
  "messageId": "msg-123",
  "conversationId": "conv-456",
  "recalledBy": "user-789",
  "recalledAt": "2026-04-11T10:30:00Z"
}
```

---

## Error Handling

| Error | Status | Message |
|-------|--------|---------|
| Message not found | 404 | "Message not found" |
| Not sender | 403 | "Only sender can delete own messages" |
| Too old to recall | 400 | "Message is too old to recall (max 5 minutes)" |
| Not connected | 500 | "Socket not connected" |
| Invalid payload | 400 | "Invalid payload" |

---

## Performance Considerations

1. **Soft Delete:** Don't hard-delete, use `isDeleted` flag
2. **Indexing:** Index `{ isDeleted: 1, conversationId: 1 }` for filtering
3. **Broadcasting:** Use Socket.io rooms to broadcast efficiently
4. **Memory:** Cleanup listeners in useEffect return
5. **Query Performance:** Filter deleted in query, not in app code

---

## Future Enhancements

- [ ] Edit message (within time limit)
- [ ] Message reactions (emoji)
- [ ] Message forwarding
- [ ] Message pinning
- [ ] Drafts/unsent messages
- [ ] Message expiration (auto-delete after X days)
- [ ] Message encryption
- [ ] Message backups

---

## Notes

✅ **Preserved:** 
- Message model `storyRef` field - kept for future story features
- Type validation regex - maintains flexibility for file types
- Existing message flow - deletion is non-breaking

✅ **Optimizations:**
- Using `.then()` instead of `await` in handlers for fire-and-forget operations
- Listener functions in socket.ts for proper cleanup and reusability
- Soft deletes for audit trail and recovery

✅ **Best Practices:**
- Proper error handling and logging
- Clean event listener setup/cleanup
- Frontend-backend consistency
- Time constraints prevent abuse
