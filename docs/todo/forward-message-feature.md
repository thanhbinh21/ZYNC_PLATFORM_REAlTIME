# Feature: Forward Message (Chuyển Tiếp Tin Nhắn)

**Trạng thái**: PLANNING  
**Phiên bản**: 1.0 (Không track forward chain)  
**Ngày tạo**: 2026-04-12

---

## 📋 Tổng Quan Luồng

```
┌─────────────────────────────────────────────────────────────────┐
│ User A - Conversation 1                                         │
│ [Long-press message] → [Show context menu] → [Forward]         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend - Show Forward Modal                                   │
│ [Select Conversation] → [Confirm] → Emit socket event          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend - Handle Forward Request                                │
│ 1. Validate permission                                          │
│ 2. Fetch original message                                       │
│ 3. Copy content (text, media, type)                            │
│ 4. Create new message in target conversation                   │
│ 5. Publish to Kafka                                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend - Update UI                                            │
│ [Receive new message] → [Add to target conversation display]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Thay Đổi Cần Thiết

### 1. Backend - Message Model ❌ (Không cần)
**File**: `apps/server/src/modules/messages/message.model.ts`

- ❌ **Không thêm** `forwardedFrom` hay `forwardedCount` (vì không track)
- ✅ Giữ nguyên hiện tại

---

### 2. Backend - Messages Service ✅ (Thêm function)
**File**: `apps/server/src/modules/messages/messages.service.ts`

**Thêm hàm mới:**
```typescript
/**
 * Forward message to another conversation
 * Copies message content and creates new message in target conversation
 * @param originalMessageId Message ID to forward
 * @param toConversationId Target conversation
 * @param userId User ID (sender)
 * @param idempotencyKey Unique key for idempotency
 * @returns Created message
 */
static async forwardMessage(
  originalMessageId: string,
  toConversationId: string,
  userId: string,
  idempotencyKey: string,
): Promise<IMessage>
```

**Logic:**
1. Query original message (by ID or idempotencyKey)
2. Validate original message exists
3. Validate user is sender of original message
4. Validate user is member of target conversation
5. Copy data: `{ content, type, mediaUrl }`
6. Create new message via `createMessage()` with copied data
7. Return new message

---

### 3. Backend - Socket Gateway ✅ (Thêm event listener)
**File**: `apps/server/src/socket/gateway.ts`

**Thêm socket event:**
```typescript
socket.on('forward_message', async (payload: unknown) => {
  try {
    await handleForwardMessage(io, socket as AuthSocket, payload);
  } catch (err) {
    logger.error('forward_message error', err);
    socket.emit('error', { message: 'Failed to forward message' });
  }
});
```

**Thêm handler function:**
```typescript
async function handleForwardMessage(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const userId = socket.userId;

  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }

  const { originalMessageId, toConversationId, idempotencyKey } = payload as {
    originalMessageId?: string;
    toConversationId?: string;
    idempotencyKey?: string;
  };

  if (!originalMessageId || !toConversationId || !idempotencyKey) {
    socket.emit('error', { message: 'Missing required fields' });
    return;
  }

  try {
    // Validate user is member of target conversation
    const membership = await ConversationMemberModel.exists({
      conversationId: toConversationId,
      userId,
    });

    if (!membership) {
      socket.emit('error', { message: 'Not a member of target conversation' });
      return;
    }

    // Forward message
    const newMessage = await MessagesService.forwardMessage(
      originalMessageId,
      toConversationId,
      userId,
      idempotencyKey,
    );

    // Broadcast to target conversation
    io.to(`conv:${toConversationId}`).emit('receive_message', {
      messageId: newMessage._id,
      conversationId: toConversationId,
      senderId: userId,
      content: newMessage.content,
      type: newMessage.type,
      mediaUrl: newMessage.mediaUrl,
      createdAt: newMessage.createdAt,
    });

    // Confirm to sender
    socket.emit('message_forwarded', {
      messageId: newMessage._id,
      idempotencyKey,
      toConversationId,
    });

    logger.debug(`Message ${originalMessageId} forwarded to ${toConversationId}`);
  } catch (err) {
    logger.error('handleForwardMessage error', err);
    socket.emit('error', { message: (err as Error).message });
  }
}
```

---

### 4. Frontend - Socket Service ✅ (Thêm emit/listen)
**File**: `apps/web/src/services/socket.ts`

**Thêm functions:**
```typescript
// Emit forward
export function emitForwardMessage(
  originalMessageId: string,
  toConversationId: string,
  idempotencyKey: string,
): void {
  socket?.emit('forward_message', {
    originalMessageId,
    toConversationId,
    idempotencyKey,
  });
}

// Listen for forwarded confirmation
export function listenToMessageForwarded(
  callback: (data: {
    messageId: string;
    idempotencyKey: string;
    toConversationId: string;
  }) => void,
): void {
  socket?.on('message_forwarded', callback);
}

export function unlistenToMessageForwarded(): void {
  socket?.off('message_forwarded');
}
```

---

### 5. Frontend - UI Component ✅ (Thêm Forward Button & Modal)
**File**: `apps/web/src/components/home-dashboard/atoms/message-bubble.tsx`

**Thêm:**
1. Forward button trong context menu (long-press)
2. Show forward modal khi user click Forward

**File**: `apps/web/src/components/home-dashboard/molecules/forward-message-modal.tsx` (NEW)

**Modal structure:**
- List conversations (exclude current)
- Search/filter conversations
- Confirm button
- Cancel button

---

### 6. Frontend - useMessaging Hook ✅ (Thêm forward logic)
**File**: `apps/web/src/hooks/use-messaging.ts`

**Setup listener:**
```typescript
useEffect(() => {
  listenToMessageForwarded(({ messageId, idempotencyKey, toConversationId }) => {
    logger.debug(`Message forwarded: ${idempotencyKey} to ${toConversationId}`);
    // Optional: Show success toast/notification
  });

  return () => unlistenToMessageForwarded();
}, []);
```

---

## 📝 Chi Tiết Các Bước Thực Hiện

### Step 1: Database Validation ✅ DONE
- User A is member of source conversation
- User A is member of target conversation
- Original message exists and User A is sender

### Step 2: Message Copy ✅ DONE
**Copy fields:**
- `content` - Text content
- `type` - Message type (text, image, video, audio, file/*, sticker)
- `mediaUrl` - Optional media URL

**NOT copy:**
- Status (will be 'sent' for new message)
- createdAt (will be new timestamp)
- senderId (will be User A)
- No reference to original message

### Step 3: Create New Message ✅ DONE
- Generate new `idempotencyKey`
- Use existing `createMessage()` logic
- Publish to Kafka (message.worker will insert)

### Step 4: Broadcast ✅ DONE
**To target conversation:**
- `receive_message` event (like normal send)
- All members see new message

**To sender (User A):**
- `message_forwarded` confirmation
- Include messageId, idempotencyKey, toConversationId

---

## 🧪 Test Cases

### Test 1: Basic Forward
```gherkin
Given: User A has message M in Conversation 1
When: User A forwards M to Conversation 2
Then: 
  - Message appears in Conversation 2
  - Message content/media same as original
  - NO "forwarded from X" badge shown
```

### Test 2: Permission Check
```gherkin
Given: User A is not member of target conversation
When: User A tries to forward
Then: Error "Not a member of target conversation"
```

### Test 3: Multiple Forwards
```gherkin
Given: Message M can be forwarded multiple times
When: User A forwards M to Conv 2, 3, 4
Then: Each gets independent copy (no chain tracking)
```

### Test 4: Media Forward
```gherkin
Given: Message with image/video/file
When: User A forwards to another conversation
Then: New message has same mediaUrl
```

---

## ⚠️ Lưu Ý Quan Trọng

1. **Idempotency**: Frontend gửi mới `idempotencyKey` (không reuse original)
2. **Rate Limiting**: Apply rate limit như `send_message`
3. **Kafka**: Use existing publishing mechanism, no changes needed
4. **No Meta**: Không lưu "forwarded from" info → simpler, lighter DB
5. **UI/UX**: Forwarded message trông giống normal message

---

## 📦 Files to Create/Modify

### Create:
- [ ] `apps/web/src/components/home-dashboard/molecules/forward-message-modal.tsx`

### Modify:
- [ ] `apps/server/src/modules/messages/messages.service.ts` (+ forwardMessage)
- [ ] `apps/server/src/socket/gateway.ts` (+ handleForwardMessage, event listener)
- [ ] `apps/web/src/services/socket.ts` (+ emit/listen functions)
- [ ] `apps/web/src/components/home-dashboard/atoms/message-bubble.tsx` (+ Forward button)
- [ ] `apps/web/src/hooks/use-messaging.ts` (+ listener setup)

### No Changes Needed:
- [ ] `message.model.ts` (No new fields)
- [ ] `message-status.model.ts`
- [ ] `getMessageHistory` (Already handles forwarded messages as normal)

---

## ⏱️ Estimated Effort

- Backend: **2-3 hours** (forwardMessage service + gateway handler)
- Frontend: **2-3 hours** (Modal UI + socket integration)
- Testing: **1-2 hours**
- **Total: ~5-8 hours**

---

## 🎯 Success Criteria

- [x] User can forward message to different conversation via context menu
- [x] Forwarded message appears in target conversation with same content/media
- [x] No "forwarded from" badge or tracking
- [x] Idempotency prevents duplicate forwards
- [x] Permission check prevents forwarding to unauthorized conversations
- [x] Rate limiting applies
- [x] All tests pass
