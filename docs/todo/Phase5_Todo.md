# Phase 5 – Real-time Messaging: Todo List

## 📋 Tính năng của Phase 5
- WebSocket server (Socket.IO + Redis adapter)
- Gửi/nhận tin nhắn văn bản + emoji (1-1 và nhóm)
- Upload media qua pre-signed URL
- Message status tracking (sent → delivered → read)
- Typing indicator (TTL 3 giây)
- Kafka consumer batch insert
- Idempotency key (chống gửi trùng)

---

# 🔴 BACKEND TASKS

## 1. Database Models

### Task 1.1: Message Model
**File:** `apps/server/src/modules/messages/message.model.ts` (create)
- [ ] Mongoose schema fields:
  - `conversationId` (ref: Conversation, indexed)
  - `senderId` (ref: User)
  - `content` (String)
  - `type` (enum: text, image, video, emoji)
  - `mediaUrl` (String, optional)
  - `idempotencyKey` (String, unique)
  - `createdAt` (Date, indexed desc)
  - `updatedAt` (Date)
- [ ] Composite index: `{ conversationId, createdAt: -1 }`

### Task 1.2: Message Status Model
**File:** `apps/server/src/modules/messages/message-status.model.ts` (create)
- [ ] Mongoose schema fields:
  - `messageId` (ref: Message)
  - `userId` (ref: User)
  - `status` (enum: sent, delivered, read)
  - `updatedAt` (Date)
- [ ] Composite unique index: `{ messageId, userId }`
- [ ] Index: `{ messageId, status }`

### Task 1.3: Update Conversation Model
**File:** `apps/server/src/modules/conversations/conversation.model.ts`
- [ ] Add `lastMessage` (object):
  - `senderId: string`
  - `content: string`
  - `sentAt: Date`
- [ ] Add `unreadCounts` (Map<userId, number>)
- [ ] Add index: `updatedAt: -1`
- [ ] Add multikey index: `unreadCounts.userId`

---

## 2. Message Service & Validation

### Task 2.1: Messages Service
**File:** `apps/server/src/modules/messages/messages.service.ts` (create)
- [ ] `createMessage(conversationId, senderId, content, type, mediaUrl, idempotencyKey)`
  - Check Redis idempotency key → return cached if exists
  - Create Message document
  - Create MessageStatus (status='sent')
  - Cache result in Redis (TTL 5 min)
  - Return message
- [ ] `getMessageHistory(conversationId, cursor?, limit=20)`
  - Cursor-based pagination (createdAt + _id)
  - Return { messages, nextCursor }
- [ ] `markAsRead(messageId, userId)`
  - Update MessageStatus: status → 'read'
- [ ] `updateMessageStatus(messageId, userId, status)`
  - Update MessageStatus document
- [ ] `findMessageById(messageId)`
  - Fetch from MongoDB

### Task 2.2: Message Validation Schema
**File:** `apps/server/src/modules/messages/messages.schema.ts` (create)
- [ ] Joi schema for POST `/api/messages/send`:
  - `conversationId` (required, ObjectId)
  - `content` (required, 1-1000 chars)
  - `type` (required, enum: text/image/video/emoji)
  - `mediaUrl` (optional string)
  - `idempotencyKey` (required, UUID)

---

## 3. Message Routes & Controller

### Task 3.1: Message Controller
**File:** `apps/server/src/modules/messages/messages.controller.ts` (create)
- [ ] `sendMessage(req, res)` – POST /api/messages/send
  - Validate input with schema
  - Call service.createMessage()
  - Emit Socket.IO event
  - Publish to Kafka
  - Return { messageId, status, createdAt }
- [ ] `getMessageHistory(req, res)` – GET /api/messages/:conversationId
  - Extract cursor, limit from query
  - Call service.getMessageHistory()
  - Return { messages, nextCursor }
- [ ] `updateMessageStatus(req, res)` – PUT /api/messages/:messageId/status
  - Call service.updateMessageStatus()
  - Return updated status
- [ ] `markAsRead(req, res)` – POST /api/messages/:messageId/read
  - Call service.markAsRead()
  - Return success

### Task 3.2: Message Routes
**File:** `apps/server/src/modules/messages/messages.routes.ts` (create)
- [ ] POST `/api/messages/send` (protected)
- [ ] GET `/api/messages/:conversationId` (protected)
- [ ] PUT `/api/messages/:messageId/status` (protected)
- [ ] POST `/api/messages/:messageId/read` (protected)

---

## 4. Socket.IO Gateway ⭐ CRITICAL

### Task 4.1: Setup Socket.IO with Redis Adapter ✅ COMPLETE
**File:** `apps/server/src/socket/gateway.ts`
- [x] Initialize Socket.IO with Redis adapter
  - ✅ Integrated `createAdapter()` with Redis pub/sub
- [x] Add auth middleware: validate JWT on handshake
  - ✅ JWT validation with payload.sub extraction
- [x] Setup socket connection/disconnect events
  - ✅ Connection: join user room, mark online
  - ✅ Disconnect: mark offline, broadcast user_online event
- [x] **REFACTORED:** Rate limiting extracted to redis helper
  - ✅ `checkMessageRateLimit(userId)` - Sliding window ZSET algorithm
  - ✅ Max 20 messages/second enforced in `handleSendMessage()`

### Task 4.2: send_message Event
**File:** `apps/server/src/socket/gateway.ts`
- [ ] Listen to `send_message` from client
  - Payload: `{ conversationId, content, type, mediaUrl?, idempotencyKey }`
  - Validate message
  - Call messagesService.createMessage()
  - Publish to Kafka `raw-messages`
  - Emit `receive_message` to recipient(s)
  - Emit `status_update` { messageId, status: 'sent' }

### Task 4.3: message_read Event
**File:** `apps/server/src/socket/gateway.ts`
- [ ] Listen to `message_read` from client
  - Payload: `{ conversationId, messageIds[] }`
  - Batch update MessageStatus → 'read'
  - Emit `status_update` broadcast to sender

### Task 4.4: typing_start & typing_stop Events
**File:** `apps/server/src/socket/gateway.ts`
- [ ] Listen to `typing_start`
  - Payload: `{ conversationId }`
  - Set Redis: `typing:{convId}:{userId}` (TTL 3s)
  - Emit `typing_indicator` broadcast
- [ ] Listen to `typing_stop`
  - Payload: `{ conversationId }`
  - Delete Redis key
  - Emit `typing_indicator` with isTyping: false

### Task 4.5: message_delivered Event
**File:** `apps/server/src/socket/gateway.ts`
- [ ] Listen to `message_delivered` from client
  - Payload: `{ conversationId, messageIds[] }`
  - Batch update MessageStatus → 'delivered'
  - Emit `status_update` broadcast with status: 'delivered'

### Task 4.6: receive_message Event (Server Send)
**File:** `apps/server/src/socket/gateway.ts`
- [ ] Calculate recipient from conversation
- [ ] Emit to socket room with: messageId, senderId, content, type, mediaUrl, createdAt

### Task 4.7: status_update Event (Server Broadcast)
**File:** `apps/server/src/socket/gateway.ts`
- [ ] Emit to message recipient(s)
- [ ] Include: messageId/messageIds, status (sent/delivered/read), userId, updatedAt

### Task 4.8: typing_indicator Event (Server Broadcast)
**File:** `apps/server/src/socket/gateway.ts`
- [ ] Broadcast to conversation members
- [ ] Include: userId, conversationId, isTyping, timestamp

---

## 5. Redis Integration ✅ COMPLETE

### Task 5.1: Idempotency Redis Methods
**File:** `apps/server/src/infrastructure/redis.ts`
- [x] `checkIdempotencyKey(key)` – Check if key exists & return cached message
  - ✅ **Integrated in** `messages.service.ts` → `createMessage()` Step 1
- [x] `setIdempotencyKey(key, messageData, ttl=300)` – Cache message (5 min)
  - ✅ **Integrated in** `messages.service.ts` → `createMessage()` Step 4

### Task 5.2: Typing Indicator Redis Methods
**File:** `apps/server/src/infrastructure/redis.ts`
- [x] `setTypingIndicator(conversationId, userId, ttl=3)` – Set key TTL 3s
  - ✅ **Integrated in** `gateway.ts` → `typing_start` handler
- [x] `removeTypingIndicator(conversationId, userId)` – Delete key
  - ✅ **Integrated in** `gateway.ts` → `typing_stop` handler
- [x] `getTypingUsers(conversationId)` – Return list of typing users
  - ✅ **Integrated in** `gateway.ts` → `typing_indicator` broadcast

### Task 5.3: Online Status Redis Methods
**File:** `apps/server/src/infrastructure/redis.ts`
- [x] `setUserOnline(userId)` – Mark user online with timestamp
  - ✅ **Integrated in** `gateway.ts` → `connection` handler
- [x] `removeUserOnline(userId)` – Remove from online status
  - ✅ **Integrated in** `gateway.ts` → `disconnect` handler
- [x] `getUserOnlineStatus(userId)` – Query single user status (⏳ *Not yet used*)
- [x] `getAllOnlineUsers()` – Query all online users (⏳ *Not yet used*)

### Task 5.4: Rate Limiting Redis Method ✅ NEW
**File:** `apps/server/src/infrastructure/redis.ts`
- [x] `checkMessageRateLimit(userId)` – Sliding window rate limit (max 20/sec)
  - ✅ **Integrated in** `gateway.ts` → `handleSendMessage()` handler
  - Uses Redis ZSET with TTL-based cleanup

---

## 6. Kafka Integration ✅ COMPLETE

### Task 6.1: Kafka Producer Setup ✅ COMPLETE
**File:** `apps/server/src/infrastructure/kafka.ts`
- [x] `produceMessage(topic, key, value)` – Send to topic `raw-messages`
  - ✅ Key: conversationId (partition by conversation)
  - ✅ Value: full message object (JSON serialized)
  - ✅ **Integrated in** `gateway.ts` → `handleSendMessage()` - publishes after message creation

### Task 6.2: Kafka Consumer Worker ✅ COMPLETE
**File:** `apps/server/src/workers/message.worker.ts`
- [x] Create Kafka consumer for topic `raw-messages`
  - ✅ groupId: `message-worker-group` (per spec)
  - ✅ sessionTimeout: 30000 (per spec)
  - ✅ Built-in heartbeat: 3000ms for health check
- [x] Batch collect messages (batchSize=100, batchTimeout=5s)
  - ✅ Queue messages in memory array
  - ✅ Flush when batch reaches 100 OR timeout reaches 5000ms
- [x] Batch insert to MongoDB
  - ✅ Uses `MessageModel.insertMany()` with `ordered: false`
  - ✅ Handles idempotency gracefully (duplicates skipped, no crash)
  - ✅ Logs successful insert count
- [x] Commit offset
  - ✅ KafkaJS automatically commits offsets at consumer exit
  - ✅ Graceful shutdown in `stopMessageWorker()` ensures offset commit
- [x] Error handling & retry logic
  - ✅ Per-message error handling (continue on failure)
  - ✅ Batch-level error handling (log but continue)
  - ✅ Graceful shutdown handler to stop consumer
- [x] **Integrated in** `main.ts`
  - ✅ `startMessageWorker()` called after Kafka connection (if KAFKA_ENABLED=true)
  - ✅ `stopMessageWorker()` called on SIGTERM/SIGINT for graceful shutdown

---

## 7. Conversation Service Updates ✅ COMPLETE

### Task 7.1: Get or Create 1-1 Conversation ✅ COMPLETE
**File:** `apps/server/src/modules/conversations/conversations.service.ts`
- [x] `getOrCreateConversation(userId, targetUserId)`
  - ✅ Check existing 1-1 conversation between users
  - ✅ Create new conversation if not exists
  - ✅ Add both users as conversation members
  - ✅ Return conversation document

### Task 7.2: Update Last Message ✅ COMPLETE
**File:** `apps/server/src/modules/conversations/conversations.service.ts`
- [x] `updateLastMessage(conversationId, messageData)`
  - ✅ Update conversation.lastMessage (content, senderId, sentAt)
  - ✅ Update conversation.updatedAt
  - ✅ **Integrated in** `messages.service.ts` → `createMessage()` Step 4
  - Called automatically after message creation

### Task 7.3: Update Unread Counts ✅ COMPLETE
**File:** `apps/server/src/modules/conversations/conversations.service.ts`
- [x] `incrementUnreadCount(conversationId, userId)` 
  - ✅ Increment unread counter for target user in conversation
  - ✅ **Integrated in** `messages.service.ts` → `createMessage()` Step 5
  - Called for all non-sender conversation members
- [x] `clearUnreadCount(conversationId, userId)`
  - ✅ Clear unread counter when user reads messages
  - ✅ **Integrated in** `messages.service.ts` → `markMultipleAsRead()` 
  - Called after marking messages as read

---

## 8. Upload Service (Optional) ✅ COMPLETE

### Task 8.1: Upload Routes & Controller ✅ COMPLETE
**Files:** 
- `apps/server/src/modules/upload/upload.routes.ts` (updated)
- `apps/server/src/modules/upload/upload.controller.ts` (created)

- [x] POST `/api/upload/generate-signature` – Generate Cloudinary signature
  - ✅ Handler: `UploadController.generateSignatureHandler()`
  - ✅ Input: `{ type: 'image' | 'video' | 'document' }`
  - ✅ Output: Cloudinary signature + timestamp + folder + publicIdPrefix
  - ✅ Allows client direct upload to Cloudinary CDN

- [x] POST `/api/upload/verify` – Verify upload success
  - ✅ Handler: `UploadController.verifyUploadHandler()`
  - ✅ Input: `{ publicId }`
  - ✅ Output: URL, secureUrl, size
  - ✅ Validates ownership (publicId must start with userId)

- [x] DELETE `/api/upload/:publicId` – Delete uploaded file
  - ✅ Handler: `UploadController.deleteUploadHandler()`
  - ✅ Ownership verification before delete
  - ✅ Removes file from Cloudinary

### Task 8.2: Cloudinary Integration ✅ COMPLETE
**File:** `apps/server/src/modules/upload/upload.service.ts` (created)

- [x] `initCloudinary()` – Initialize with environment credentials
  - ✅ Reads CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
  - ✅ Auto-called on router initialization
  - ✅ Graceful degradation if credentials missing

- [x] `generateUploadSignature(userId, type)` – Generate signed upload params
  - ✅ Timestamp-based signature generation
  - ✅ SHA1 hashing with api_secret
  - ✅ Folder structure: `zync/{type}s/{userId}`
  - ✅ PublicId prefix for ownership tracking

- [x] `verifyUploadResult(publicId, userId)` – Validate uploaded file
  - ✅ Calls Cloudinary API to fetch resource metadata
  - ✅ Ownership check (publicId must contain userId)
  - ✅ Returns URL, secureUrl, type, size
  - ✅ Graceful failure handling

- [x] `deleteUpload(publicId, userId)` – Delete file from Cloudinary
  - ✅ Ownership verification before deletion
  - ✅ Uses Cloudinary API delete_resources
  - ✅ Returns success/failure boolean

---

## 9. Backend Tests

### Task 9.1: Unit Tests – Message Service
**File:** `apps/server/tests/unit/messages.service.test.ts` (create)
- [ ] Test `createMessage()` success
- [ ] Test `createMessage()` idempotency
- [ ] Test `getMessageHistory()` pagination
- [ ] Test `markAsRead()`

### Task 9.2: Integration Tests – Message Routes
**File:** `apps/server/tests/integration/messages.routes.test.ts` (create)
- [ ] Test POST `/api/messages/send`
- [ ] Test GET `/api/messages/:conversationId`
- [ ] Test PUT `/api/messages/:messageId/status`

### Task 9.3: Socket.IO Tests
**File:** `apps/server/tests/integration/socket.test.ts` (create)
- [ ] Test `send_message` event
- [ ] Test `message_read` event
- [ ] Test `typing_start` / `typing_stop` events
- [ ] Test broadcast to multiple clients
- [ ] Mock Redis adapter & Kafka

### Task 9.4: Kafka Consumer Tests
**File:** `apps/server/tests/integration/message.worker.test.ts` (create)
- [ ] Test message consumption
- [ ] Test batch insert MongoDB
- [ ] Test idempotency
- [ ] Mock Kafka producer/consumer

---

# 🔵 FRONTEND TASKS

## 10. Socket.IO Client Service

### Task 10.1: Create Socket Service
**File:** `apps/web/src/services/socket.ts` (create/update)
- [ ] Initialize Socket.IO client with JWT auth
- [ ] Auto-reconnect logic
- [ ] `sendMessage(conversationId, content, type, mediaUrl?, idempotencyKey)` – Emit event
- [ ] `listenToMessages(callback)` – Listen `receive_message` event
- [ ] `markAsRead(conversationId, messageIds)` – Emit `message_read`
- [ ] `listenToStatusUpdates(callback)` – Listen `status_update` event
- [ ] `startTyping(conversationId)` – Emit `typing_start` (debounce 3s)
- [ ] `stopTyping(conversationId)` – Emit `typing_stop`
- [ ] `listenToTypingIndicators(callback)` – Listen `typing_indicator` event

---

## 11. Custom Hooks

### Task 11.1: useChat Hook
**File:** `apps/web/src/hooks/use-chat.ts` (create)
- [ ] State: `messages[]`, `typingUsers[]`, `messageStatus{}`
- [ ] `sendMessage(content, type, mediaUrl)` – Generate UUID, emit, optimistic update
- [ ] `markAsRead(messageIds)` – Update local status
- [ ] `startTyping()` / `stopTyping()`
- [ ] Setup socket listeners on mount

### Task 11.2: useMessageHistory Hook
**File:** `apps/web/src/hooks/use-message-history.ts` (create)
- [ ] State: `messages[]`, `cursor?`, `hasMore`, `loading`
- [ ] `fetchMessages(conversationId, cursor?, limit=20)` – Call API, concat messages
- [ ] `loadMore()` – Fetch with next cursor
- [ ] Auto-fetch on conversationId change

### Task 11.3: useTypingIndicator Hook
**File:** `apps/web/src/hooks/use-typing-indicator.ts` (create)
- [ ] State: `typingUsers[]`
- [ ] Listen to `typing_indicator` events
- [ ] Auto-remove after 4s (TTL)

---

## 12. Message Components (Atomic Design)

### Task 12.1: Atoms
**Directory:** `apps/web/src/components/messages/atoms/`
- [ ] `MessageBubble.tsx` – Display single message
  - Props: message, isOwn, status
  - Show status indicators (✓ sent, ✓✓ delivered, ✓✓ read)
  - Render media if exists
- [ ] `TypingIndicator.tsx` – Animated typing dots
  - Props: userNames[]
- [ ] `MessageStatus.tsx` – Status badge
  - Props: status

### Task 12.2: Molecules
**Directory:** `apps/web/src/components/messages/molecules/`
- [ ] `MessageInput.tsx`
  - Props: onSend(content, type), onStartTyping, onStopTyping
  - Debounce typing events (300ms)
  - Text + emoji picker support
- [ ] `MessageGroup.tsx`
  - Props: messages[]
  - Show timestamp, sender avatar
- [ ] `MediaPreview.tsx`
  - Props: mediaUrl, type
  - Preview before send

### Task 12.3: Organisms
**Directory:** `apps/web/src/components/messages/organisms/`
- [ ] `ChatWindow.tsx`
  - Props: conversationId
  - Auto-scroll bottom on new message
  - Virtual scrolling (react-window) for performance
  - Load more button when scroll up
  - Show typing indicators
  - Show unread indicator

---

## 13. Frontend Integration

### Task 13.1: Update /home Page
**File:** `apps/web/src/app/home/page.tsx`
- [ ] Render split layout:
  - Left: Conversation list (from Phase 3)
  - Right: ChatWindow component
- [ ] Handle conversation selection
- [ ] Pass conversationId to ChatWindow

### Task 13.2: Update API Service
**File:** `apps/web/src/services/api.ts`
- [ ] `getMessages(conversationId, cursor?, limit)`
- [ ] `generateUploadSignature(type)`
- [ ] `verifyUpload(publicId)`

### Task 13.3: Update useHomeDashboard Hook
**File:** `apps/web/src/hooks/use-home-dashboard.ts`
- [ ] Integrate message updates from socket
- [ ] Auto-update conversations list on new message
- [ ] Update unread count

---

## 14. Frontend Tests

### Task 14.1: Unit Tests – Socket Service
**File:** `apps/web/tests/services/socket.test.ts` (create)
- [ ] Mock Socket.IO client
- [ ] Test `sendMessage()` – emit event
- [ ] Test `listenToMessages()` – receive event
- [ ] Test reconnection

### Task 14.2: Component Tests
**File:** `apps/web/tests/components/MessageBubble.test.tsx` (create)
- [ ] Test message rendering
- [ ] Test status indicators
- [ ] Test media display

### Task 14.3: Hook Tests
**File:** `apps/web/tests/hooks/useChat.test.ts` (create)
- [ ] Test `sendMessage()` hook
- [ ] Test optimistic updates
- [ ] Test socket listeners

---

# 📝 DOCUMENTATION

## Task 15.1: API Documentation
**File:** `docs/PHASE5_API.md` (create)
- [ ] Document message endpoints
- [ ] Request/response examples
- [ ] Error codes

## Task 15.2: Socket.IO Events
**File:** `docs/PHASE5_SOCKET_EVENTS.md` (create)
- [ ] Client → Server events
- [ ] Server → Client events
- [ ] Payload schema for each event

## Task 15.3: Redis Key Schema
**File:** `docs/PHASE5_REDIS_SCHEMA.md` (create)
- [ ] List all Redis keys for messaging
- [ ] TTL values
- [ ] Data structure

---

**Status:** 🔴 Ready for Implementation  
**Last Updated:** 26/03/2026
