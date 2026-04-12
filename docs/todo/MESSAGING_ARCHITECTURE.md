# ZYNC Platform - Real-Time Messaging Architecture

**Document Date:** April 11, 2026  
**Status:** Architecture Overview - Phase 5 MVP

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [Data Models](#data-models)
5. [Message Flow](#message-flow)
6. [Key Design Patterns](#key-design-patterns)
7. [Infrastructure Components](#infrastructure-components)

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────┐
│   Web Client (Next.js)  │
├─────────────────────────┤
│ useChat Hook            │
│ useMessageHistory Hook  │
│ useHomeDashboard Hook   │
│                         │
│ Services:               │
│ - socket.ts             │
│ - chat.ts               │
│ - upload.ts             │
│                         │
│ Components:             │
│ - message-input.tsx     │
│ - home-dashboard/*      │
└────────────┬────────────┘
             │ Socket.IO + REST API
             ▼
┌─────────────────────────┐
│   Backend (Node.js)     │
├─────────────────────────┤
│ Socket Gateway          │
│ - Message Events        │
│ - Status Events         │
│ - Typing Indicators     │
│ - Rate Limiting         │
│                         │
│ Services:               │
│ - MessagesService       │
│ - MessageWorker         │
└────────────┬────────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
┌────────┬──────┬──────────┐
│ Kafka  │Redis │ MongoDB  │
└────────┴──────┴──────────┘
```

### Data Flow

```
Frontend User Input
    ↓
Socket.IO Event (real-time)
    ↓
Gateway Processing (validate, rate limit, broadcast)
    ↓
Kafka Queue (async persistence)
    ↓
Message Worker (batch insert)
    ↓
MongoDB (persistent storage)
    ↓
Socket.IO Broadcast (to clients)
```

---

## Frontend Implementation

### 1. Custom Hooks Directory

**Location:** `apps/web/src/hooks/`

#### `useChat()` Hook
**File:** `use-messaging.ts` (lines 1-100+)

**Purpose:** Core real-time messaging state management

**Key Functions:**
```typescript
interface UseChatOptions {
  conversationId: string;
  userId: string;
  token: string;
  displayName: string;
}

interface UseChatReturn {
  messages: Message[];
  typingUsers: TypingUser[];
  messageStatus: MessageStatusMap;
  sendMessage: (content: string, type: MessageType, mediaUrl?: string) => Promise<void>;
  markAsRead: (messageIds: string[]) => void;
  startTyping: () => void;
  stopTyping: () => void;
  isLoading: boolean;
  error: string | null;
}
```

**Lifecycle:**
1. Initialize socket on mount (check token)
2. Join conversation when it changes
3. Setup message listener (receive_message event)
4. Setup status listener (status_update event)
5. Setup typing listener (typing_indicator event)
6. Send message via socket.emit()
7. Cleanup listeners on unmount

**Event Handlers:**
- `handleReceiveMessage()` - Add message to state, auto-mark as delivered/read
- `handleMessageSent()` - Track sent status (commented out in current version)
- `handleStatusUpdate()` - Update message status map (sent/delivered/read)
- `handleTypingIndicator()` - Add/remove typing user with 4s auto-remove
- `handleSendMessage()` - Client-side send with idempotency key

---

#### `useMessageHistory()` Hook
**File:** `use-messaging.ts`

**Purpose:** Paginated message history loading

**Features:**
- Cursor-based pagination
- Lazy load older messages
- Combine with real-time messages

---

#### `useHomeDashboard()` Hook
**File:** `use-home-dashboard.ts` (lines 1-100+)

**Purpose:** Dashboard state management (conversations, groups, users)

**Key Features:**
1. Fetch user profile and conversations
2. Initialize useChat for selected conversation
3. Initialize useMessageHistory
4. Combine message status from both real-time and history
5. Handle group operations (create, disband, add/remove members)
6. Update conversation list with last message

**Integration Pattern:**
```typescript
const { messages, typingUsers, messageStatus, sendMessage, ... } = useChat({
  conversationId: selectedConversationId,
  userId,
  token,
  displayName,
});

const messageHistory = useMessageHistory({
  conversationId: selectedConversationId,
});

// Combine both sources
useEffect(() => {
  const statusMap = { ...messageStatus };
  messageHistory.messages.forEach((msg) => {
    if (msg.status && !statusMap[msg._id]) {
      statusMap[msg._id] = msg.status;
    }
  });
  setCombinedMessageStatus(statusMap);
}, [messageHistory.messages, messageStatus]);
```

---

### 2. Services Directory

**Location:** `apps/web/src/services/`

#### `socket.ts`
**Purpose:** Socket.IO client wrapper with authentication and event handling

**Key Exports:**

```typescript
// Connection Management
getSocket(token: string): Socket
  → Initialize Socket.IO with JWT auth
  → Auto-reconnect: exponential backoff (1s-5s, max 5 attempts)
  → Transports: websocket + polling fallback

isConnected(): boolean
disconnectSocket(): void

// Conversation Management
joinConversation(conversationId: string): void
  → socket.emit('join_conversation', { conversationId })
  → Subscribe to conv:{conversationId} room

leaveConversation(conversationId: string): void
  → socket.emit('leave_conversation', { conversationId })
  → Unsubscribe from room

// Message Events
sendMessage(
  conversationId: string,
  content: string,
  type: MessageType,
  idempotencyKey: string,
  mediaUrl?: string
): void
  → socket.emit('send_message', {...})

listenToMessages(callback): void
  → socket.on('receive_message', callback)
  → Callback receives: {messageId, senderId, content, type, mediaUrl, createdAt}

unlistenToMessages(): void

// Message Status Events
markAsRead(conversationId: string, messageIds: string[]): void
  → socket.emit('message_read', {...})

markAsDelivered(conversationId: string, messageIds: string[]): void
  → socket.emit('message_delivered', {...})

listenToStatusUpdates(callback): void
  → socket.on('status_update', callback)
  → Callback receives: {messageId(s), idempotencyKey(s), status, userId, updatedAt}

// Typing Indicators
startTyping(conversationId: string): void
  → socket.emit('typing_start', { conversationId })
  → 3s debounce (emit every 2s to refresh Redis TTL)

stopTyping(conversationId: string): void
  → socket.emit('typing_stop', { conversationId })

listenToTypingIndicators(callback): void
  → socket.on('typing_indicator', callback)
  → Callback receives: {userId, conversationId, isTyping}
```

**Configuration:**
```typescript
const socket = io(process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:3000', {
  auth: { token },
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});
```

---

#### `chat.ts`
**Purpose:** REST API client for non-real-time operations

**Key Functions:**

```typescript
// Message Endpoints
getMessages(
  conversationId: string,
  cursor?: string,
  limit?: number = 20
): Promise<GetMessagesResponse>
  → GET /api/messages/{conversationId}?cursor={cursor}&limit={limit}
  → Returns: {messages: Message[], nextCursor?: string}
  → Cursor-based pagination for efficient history loading

markMessagesAsRead(messageIds: string[]): Promise<{ success: boolean }>
  → POST /api/messages/batch/read
  → Batch mark messages as read (REST fallback)

markMessagesAsDelivered(
  conversationId: string,
  messageIds: string[]
): Promise<{ success: boolean }>
  → PUT /api/messages/{messageId}/status (multiple calls)
  → Set status to 'delivered'

// Upload Endpoints
generateUploadSignature(type: 'image' | 'video' | 'document')
  → POST /api/upload/generate-signature
  → Returns: {signature, timestamp, cloudName, apiKey, folder, publicIdPrefix}
  → For Cloudinary direct upload

verifyUpload(publicId: string, type: 'image' | 'video' | 'document')
  → POST /api/upload/verify
  → Returns: {url, secureUrl, size}
  → Verify upload completion and get final URL
```

---

#### `upload.ts`
**Purpose:** Direct client-side upload to Cloudinary

**Key Function:**

```typescript
uploadFile(
  file: File,
  folder?: string = 'stories',
  options?: UploadFileOptions
): Promise<string>
  → Fetch Cloudinary signature from backend
  → Direct POST to Cloudinary API with XHR
  → Support progress tracking: options.onProgress(percent)
  → Return secure_url
  → Detect resource type: video/ → 'video', else 'image'
```

**Advantages:**
- Backend not bottleneck for media
- Progress tracking possible
- Secure signature validation

---

### 3. Components Directory

**Location:** `apps/web/src/components/home-dashboard/`

#### `message-input.tsx` (molecules)
**Purpose:** Message composition UI component

**Key Features:**

1. **Input Management:**
   - Text input field
   - Emoji picker
   - Quick emoji buttons: ['😀', '😂', '😍', '👍', '❤️', '🔥', '👏', '🎉']

2. **Typing Indicators:**
   ```typescript
   handleInputChange(value):
     - If value.length > 0:
       * Emit typing_start (first keystroke)
       * Set interval: re-emit every 2s (refresh Redis TTL)
     - Clear timeout if exists (reset debounce)
     - Set new timeout: 3s after last keystroke → emit typing_stop
   ```

3. **Media Upload:**
   - File attachment button (paperclip icon)
   - Image upload support
   - Upload progress tracking
   - Preview before send
   - Uploaded media state with: {previewUrl, remoteUrl, type, isReady, fileName}

4. **Event Handlers:**
   - `onSend(content, type, mediaUrl?)` - Called when user clicks send
   - `onStartTyping()` - Called on input change
   - `onStopTyping()` - Called after 3s inactivity
   - `onProgress(percent)` - Called during file upload

5. **Keyboard Events:**
   - Enter to send
   - Shift+Enter for multiline

---

### 4. Types Definition

**Location:** `apps/web/src/components/home-dashboard/`

**File:** `home-dashboard.types.ts`

```typescript
type MessageType = 'text' | 'image' | 'video' | 'emoji' | ...

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  type: MessageType;
  mediaUrl?: string;
  idempotencyKey: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}
```

---

## Backend Implementation

### 1. Infrastructure Layer

**Location:** `apps/server/src/infrastructure/`

#### `kafka.ts`
**Purpose:** Message queue for async persistence

**Key Components:**

```typescript
// Initialization
connectKafka(): void
  → Create Kafka client
  → Initialize producer (idempotent: true)
  → Create topics if not exist:
    ├─ raw-messages: 3 partitions, replication 1
    └─ notifications: 3 partitions, replication 1

// Producer
getProducer(): Producer
produceMessage(topic, key, value): Promise<void>
  → Send message to Kafka topic
  → Key for partitioning and idempotency

// Consumer
createConsumer(groupId): Consumer
  → Create consumer with specified group ID
  → For workers to process messages
```

**Topics:**
- `raw-messages`: Raw message events from gateway (consumed by message worker)
- `notifications`: Notification events (consumed by notification worker)

---

#### `redis.ts`
**Purpose:** Transient data cache and real-time state

**Key Functions:**

```typescript
// Connection
connectRedis(): void
getRedis(): Redis
createRedisDuplicate(): Redis (for Pub/Sub)

// Idempotency Cache (5 min TTL)
checkIdempotencyKey(key: string): Promise<MessageData | null>
  → Check if message was already sent
  → Return: {messageId, content, type, mediaUrl, createdAt}

setIdempotencyKey(
  key: string,
  messageData: Record<string, unknown>,
  ttl: number = 300
): Promise<void>
  → Cache message data for idempotency (prevent duplicates)
  → TTL: 5 minutes default

// Typing Indicators (3 sec TTL)
setTypingIndicator(conversationId: string, userId: string, ttl = 3): void
  → Key: typing:{convId}:{userId}
  → Broadcast to other users

removeTypingIndicator(conversationId: string, userId: string): void

getTypingUsers(conversationId: string): Promise<string[]>
  → Get all users currently typing in conversation

// Online Status
setUserOnline(userId: string): Promise<void>
removeUserOnline(userId: string): Promise<void>
isUserOnline(userId: string): Promise<boolean>

// Rate Limiting
checkMessageRateLimit(userId: string, fallbackMode?: boolean): Promise<boolean>
  → Normal: 300 messages per 500ms
  → Fallback (Kafka fail): 200 messages per 500ms
  → Returns: true if within limit, false otherwise
```

**Key Design:**
- Auto-expiring keys via TTL
- String keys for simple data
- Separate connections for Pub/Sub (Redis constraint)

---

#### `database.ts`
**Purpose:** MongoDB connection

```typescript
connectDatabase(): Promise<void>
  → Connect Mongoose
  → Initialize indexes for collection models
```

---

### 2. Socket Gateway

**Location:** `apps/server/src/socket/`

**File:** `gateway.ts`

#### Connection Flow

```typescript
initSocketGateway(httpServer: Server): Server
  ├─ Create Socket.IO server with CORS
  ├─ Setup Redis adapter (for multi-instance pub/sub)
  ├─ JWT middleware for authentication
  ├─ Connection handler
  └─ Return io instance
```

#### Authentication Middleware

```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token 
    || socket.handshake.headers['authorization']?.replace('Bearer ', '')
  
  if (!token) return next(new Error('Missing auth token'))
  
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    socket.userId = payload.sub
    next()
  } catch {
    next(new Error('Invalid auth token'))
  }
})
```

#### Connection Handler

```typescript
io.on('connection', (socket) => {
  const userId = socket.userId
  
  // Join personal room
  socket.join(`user:${userId}`)
  
  // Set online status in Redis
  setUserOnline(userId)
  
  // Notify others
  io.emit('user_online', { userId, online: true })
})
```

#### Event Handlers

**1. Conversation Management:**

```typescript
socket.on('join_conversation', async (payload) => {
  const { conversationId } = payload
  
  // Check membership
  const member = await ConversationMemberModel.exists({
    conversationId,
    userId,
  })
  
  if (!member) {
    socket.emit('error', 'Not allowed to join this conversation')
    return
  }
  
  // Join room
  socket.join(`conv:${conversationId}`)
})

socket.on('leave_conversation', async (payload) => {
  const { conversationId } = payload
  socket.leave(`conv:${conversationId}`)
})
```

**2. Send Message:**

```typescript
socket.on('send_message', async (payload) => {
  await handleSendMessage(io, socket, payload)
})

async function handleSendMessage(io, socket, payload) {
  const userId = socket.userId
  
  // ─── Rate Limit Check ───
  const isWithinLimit = await checkMessageRateLimit(
    userId,
    kafkaFailureMode
  )
  if (!isWithinLimit) {
    const msg = kafkaFailureMode
      ? 'Rate limit: 200 msg/500ms (fallback)'
      : 'Rate limit: 300 msg/500ms'
    socket.emit('error', { message: msg })
    return
  }
  
  // ─── Validation ───
  const {
    conversationId,
    content,
    type,
    mediaUrl,
    idempotencyKey,
  } = payload
  
  if (!conversationId || !idempotencyKey) {
    socket.emit('error', 'Missing conversationId, idempotencyKey')
    return
  }
  
  if (!content && !mediaUrl) {
    socket.emit('error', 'Content or mediaUrl required')
    return
  }
  
  if (content && (typeof content !== 'string' || content.length > 1000)) {
    socket.emit('error', 'Content must be 1-1000 characters')
    return
  }
  
  // ─── Process ───
  try {
    // Create message (Kafka publish, NOT DB insert yet)
    const message = await MessagesService.createMessage(
      conversationId,
      userId,
      content,
      type,
      idempotencyKey,
      mediaUrl,
    )
    
    // Send confirmation to sender
    socket.emit('message_sent', {
      messageId: message._id,
      idempotencyKey,
      createdAt: message.createdAt,
    })
    
    // Broadcast to conversation room
    io.to(`conv:${conversationId}`).emit('receive_message', {
      messageId: message._id,
      conversationId,
      senderId: userId,
      content,
      type,
      mediaUrl,
      createdAt: message.createdAt,
    })
    
  } catch (err) {
    logger.error('send_message error', err)
    socket.emit('error', 'Failed to send message')
  }
}
```

**3. Message Status Updates:**

```typescript
socket.on('message_read', async (payload) => {
  await handleMessageRead(io, socket, payload)
})

async function handleMessageRead(io, socket, payload) {
  const userId = socket.userId
  const { conversationId, messageIds } = payload
  
  // Update status in DB
  await MessageStatusModel.updateMany(
    { messageId: { $in: messageIds }, userId },
    { status: 'read' }
  )
  
  // Broadcast status update
  io.to(`conv:${conversationId}`).emit('status_update', {
    messageIds,
    status: 'read',
    userId,
    updatedAt: new Date().toISOString(),
  })
}

socket.on('message_delivered', async (payload) => {
  await handleMessageDelivered(io, socket, payload)
})
```

**4. Typing Indicators:**

```typescript
socket.on('typing_start', async (payload) => {
  const { conversationId } = payload
  
  // Check membership
  const membership = await ConversationMemberModel.exists({
    conversationId,
    userId,
  })
  if (!membership) return
  
  // Set Redis flag (3 sec TTL)
  await setTypingIndicator(conversationId, userId)
  
  // Broadcast
  socket.to(`conv:${conversationId}`).emit('typing_indicator', {
    userId,
    conversationId,
    isTyping: true,
  })
})

socket.on('typing_stop', async (payload) => {
  const { conversationId } = payload
  
  // Remove Redis flag
  await removeTypingIndicator(conversationId, userId)
  
  // Broadcast
  socket.to(`conv:${conversationId}`).emit('typing_indicator', {
    userId,
    conversationId,
    isTyping: false,
  })
})
```

**5. Disconnect:**

```typescript
socket.on('disconnect', () => {
  removeUserOnline(userId)
  io.emit('user_online', {
    userId,
    online: false,
    lastSeen: new Date().toISOString(),
  })
})
```

---

### 3. Messages Service

**Location:** `apps/server/src/modules/messages/`

**File:** `messages.service.ts`

#### Core Methods

**1. `createMessage()` - Fast Path (Send)**

```typescript
static async createMessage(
  conversationId: string,
  senderId: string,
  content: string,
  type: MessageType,
  idempotencyKey: string,
  mediaUrl?: string,
): Promise<IMessage> {
  // Step 1: Check idempotency cache
  const cachedMessage = await checkIdempotencyKey(idempotencyKey)
  if (cachedMessage) {
    logger.info(`[Idempotency] Found cached: ${idempotencyKey}`)
    return cachedMessage as unknown as IMessage
  }
  
  // Step 2: Generate message ID
  const messageId = uuidv4()
  
  // Step 3: Publish to Kafka (async DB insert)
  await produceMessage(KAFKA_TOPICS.RAW_MESSAGES, idempotencyKey, {
    messageId,
    conversationId,
    senderId,
    content,
    type,
    mediaUrl,
    idempotencyKey,
    createdAt: new Date().toISOString(),
  })
  
  // Step 4: Cache in Redis for idempotency (5 min)
  const messageData = {
    messageId,
    conversationId,
    senderId,
    content,
    type,
    mediaUrl,
    idempotencyKey,
    createdAt: Date.now(),
  }
  await setIdempotencyKey(idempotencyKey, messageData)
  
  // Step 5: Return mock message object
  return {
    _id: messageId,
    conversationId,
    senderId,
    content,
    type,
    mediaUrl,
    idempotencyKey,
    createdAt: new Date(),
  } as unknown as IMessage
}
```

**Why Async?**
- Backend returns immediately (perceived speed)
- Kafka worker batches db inserts (reduce load)
- If Kafka fails → Fallback service handles

---

**2. `insertMessageWithMetadata()` - Kafka Worker Calls**

```typescript
static async insertMessageWithMetadata(
  conversationId: string,
  senderId: string,
  content: string,
  type: MessageType,
  idempotencyKey: string,
  mediaUrl?: string,
  mockId?: string,
): Promise<void> {
  // Step 1: Insert message document
  const message = new MessageModel({
    conversationId,
    senderId,
    content,
    type,
    mediaUrl,
    idempotencyKey,
  })
  await message.save()
  
  // Step 2: Get all conversation members
  const members = await ConversationMemberModel.find({ conversationId })
  
  // Step 3: Create MessageStatus for each member (sent)
  const statuses = members.map(m => ({
    messageId: message._id.toString(),
    idempotencyKey,
    userId: m.userId,
    status: 'sent',
  }))
  await MessageStatusModel.insertMany(statuses)
  
  // Step 4: Update conversation lastMessage
  await ConversationModel.updateOne(
    { _id: conversationId },
    {
      lastMessage: {
        content: this.getLastMessagePreview(content, type),
        senderId,
        sentAt: new Date(),
      },
      updatedAt: new Date(),
    }
  )
}
```

---

**3. `getMessages()` - REST Endpoint**

```typescript
static async getMessages(
  conversationId: string,
  requestingUserId: string,
  cursor?: string,
  limit: number = 20,
): Promise<PaginatedMessages> {
  // Step 1: Query messages (cursor-based)
  const query = { conversationId }
  if (cursor) {
    query['createdAt'] = { $lt: new Date(cursor) }
  }
  
  const messages = await MessageModel
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1) // Fetch one extra to check hasMore
    .lean()
  
  const hasMore = messages.length > limit
  if (hasMore) messages.pop()
  
  // Step 2: Fetch status for requesting user
  const messageIds = messages.map(m => m._id.toString())
  const statuses = await MessageStatusModel.find({
    messageId: { $in: messageIds },
  })
  
  // Step 3: Aggregate status
  const statusByMessageId = {}
  messages.forEach(msg => {
    const allStatuses = statuses.filter(s => s.messageId === msg._id.toString())
    statusByMessageId[msg._id] = this.aggregateMessageStatus(
      msg._id,
      msg.senderId,
      requestingUserId,
      allStatuses,
    )
  })
  
  // Step 4: Build response
  messages.forEach(msg => {
    msg.status = statusByMessageId[msg._id]
  })
  
  const nextCursor = hasMore ? messages[messages.length - 1].createdAt : null
  
  return {
    messages: messages.reverse(), // Chronological order
    nextCursor,
    hasMore,
  }
}
```

---

**4. `aggregateMessageStatus()` - Status Logic**

```typescript
private static aggregateMessageStatus(
  messageId: string,
  senderId: string,
  requestingUserId: string,
  allStatuses: Array<{ userId: string; status: string }>,
): 'sent' | 'delivered' | 'read' {
  // If requesting user is sender
  if (requestingUserId === senderId) {
    // Show best case among recipients (exclude sender)
    const recipientStatuses = allStatuses
      .filter(s => s.userId !== senderId)
      .map(s => s.status as 'sent' | 'delivered' | 'read')
    
    // Priority: read > delivered > sent (best case)
    if (recipientStatuses.includes('read')) return 'read'
    if (recipientStatuses.includes('delivered')) return 'delivered'
    return 'sent'
  }
  
  // Recipient: show own status
  const ownStatus = allStatuses.find(s => s.userId === requestingUserId)
  return (ownStatus?.status as 'sent' | 'delivered' | 'read') || 'delivered'
}
```

**Logic:**
- **Sender** sees: best case among all recipients (highest status)
- **Recipient** sees: own status only
- Example: If 3 recipients, one read, two delivered, sender sees "read"

---

### 4. Message Worker

**Location:** `apps/server/src/workers/`

**File:** `message.worker.ts`

#### Batch Processing Pipeline

```typescript
export async function startMessageWorker(): Promise<void> {
  const messageWorkerConsumer = createConsumer(
    'message-worker-group'
  )
  
  await messageWorkerConsumer.connect()
  await messageWorkerConsumer.subscribe({
    topic: KAFKA_TOPICS.RAW_MESSAGES,
    fromBeginning: false,
  })
  
  // Batch variables
  const batch: RawMessage[] = []
  let batchTimer: NodeJS.Timeout | null = null
  const BATCH_SIZE = 100
  const BATCH_TIMEOUT_MS = 500
  
  // Process batch function
  const processBatch = async (): Promise<void> => {
    if (batch.length === 0) return
    
    const toInsert = batch.splice(0, batch.length)
    let successCount = 0
    
    try {
      for (const msg of toInsert) {
        try {
          await MessagesService.insertMessageWithMetadata(
            msg.conversationId,
            msg.senderId,
            msg.content,
            msg.type,
            msg.idempotencyKey,
            msg.mediaUrl,
            msg.messageId,
          )
          successCount++
        } catch (err) {
          logger.error(`[Batch] Failed: ${msg.idempotencyKey}`, err)
          // Continue with next message
        }
      }
      
      logger.info(`[Batch] Processed: ${successCount}/${toInsert.length}`)
      
      // Notify success
      if (successCount === toInsert.length) {
        notifyKafkaRecovery()
      }
      
    } catch (err) {
      logger.error('[Batch] Fatal error', err)
      
      // Call fallback
      if (kafkaInsertFailureCallback) {
        await kafkaInsertFailureCallback(toInsert)
      }
    }
  }
  
  // Consume messages
  await messageWorkerConsumer.run({
    eachMessage: async ({ message }: EachMessagePayload) => {
      const data = JSON.parse(message.value as string) as RawMessage
      batch.push(data)
      
      // Check if batch should be processed
      if (batch.length >= BATCH_SIZE) {
        if (batchTimer) clearTimeout(batchTimer)
        await processBatch()
      } else if (!batchTimer) {
        // Start timer for timeout
        batchTimer = setTimeout(async () => {
          await processBatch()
          batchTimer = null
        }, BATCH_TIMEOUT_MS)
      }
    },
  })
}
```

#### Fallback Mode

When Kafka fails:
1. `kafkaInsertFailureCallback` triggers
2. Call `MessagesService.fallbackBatchInsert()` (direct DB insert)
3. Set `kafkaFailureMode = true`
4. Gateway reduces rate limit to 200/500ms
5. When Kafka recovers: Reset to 300/500ms

---

## Data Models

### 1. Message Model

**File:** `apps/server/src/modules/messages/message.model.ts`

```typescript
interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  content?: string;
  type: MessageType;
  mediaUrl?: string;
  storyRef?: IStoryRef;
  idempotencyKey: string;
  createdAt: Date;
}

// Schema
{
  conversationId: { type: String, required: true },
  senderId: { type: String, required: true },
  content: { type: String },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'sticker', 'file/*'],
    required: true,
  },
  mediaUrl: { type: String },
  storyRef: StoryRefSchema,
  idempotencyKey: { type: String, required: true, unique: true },
  timestamps: true,
}

// Indexes
- { conversationId: 1, createdAt: -1 } (for pagination)
- { idempotencyKey: 1 } (for idempotency lookups)
```

---

### 2. MessageStatus Model

**File:** `apps/server/src/modules/messages/message-status.model.ts`

```typescript
interface IMessageStatus extends Document {
  messageId: string;
  idempotencyKey?: string;
  userId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamps: true;
}

// Schema
{
  messageId: { type: String, required: true },
  idempotencyKey: { type: String },
  userId: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'read'], required: true },
}

// Indexes
- { messageId: 1, userId: 1 } (unique - one status per user per message)
- { idempotencyKey: 1, userId: 1 } (temp ID mapping)
- { messageId: 1, status: 1 } (query for status)
```

---

### 3. Conversation Model

**File:** `apps/server/src/modules/conversations/conversation.model.ts`

```typescript
interface IConversation extends Document {
  type: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  createdBy?: string;
  adminIds: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    sentAt: Date;
  };
  unreadCounts: Map<string, number>;
  updatedAt: Date;
}

// Schema
{
  type: { type: String, enum: ['direct', 'group'], required: true },
  name: { type: String },
  avatarUrl: { type: String },
  createdBy: { type: String },
  adminIds: [{ type: String }],
  lastMessage: {
    content: { type: String },
    senderId: { type: String },
    sentAt: { type: Date },
  },
  unreadCounts: { type: Map, of: Number, default: {} },
  timestamps: true,
}

// Indexes
- { unreadCounts: 1 } (for unread filter)
- { lastMessage.sentAt: -1 } (sort conversations)
- { updatedAt: -1 } (sort by update time)
```

---

## Message Flow

### Complete Message Send Flow

```
FRONTEND:
1. User types message in message-input.tsx
2. User clicks Send button
3. handleSendMessage() called in useChat hook
   ├─ Generate: idempotencyKey = UUID()
   ├─ Generate: mockMessageId = UUID()
   ├─ Add to messages state (optimistic)
   ├─ Set status to 'pending'
   └─ socket.emit('send_message', {
        conversationId,
        content,
        type,
        idempotencyKey,
        mediaUrl,
      })

BACKEND - GATEWAY:
4. socket.on('send_message') handler triggers
5. handleSendMessage() called
   ├─ checkMessageRateLimit(userId)
   │  ├─ Get counter from Redis
   │  ├─ Normal: 300/500ms limit
   │  ├─ Fallback: 200/500ms limit
   │  └─ If exceeded: emit error, return
   ├─ Validate payload
   │  ├─ Check conversationId, idempotencyKey exist
   │  ├─ Check content || mediaUrl (at least one)
   │  └─ If validation fails: emit error, return
   ├─ MessagesService.createMessage()
   │  ├─ Redis.checkIdempotencyKey() - duplicate check
   │  ├─ Generate UUID messageId
   │  ├─ Kafka.produceMessage('raw-messages', idempotencyKey, {...})
   │  ├─ Redis.setIdempotencyKey() - cache for 5min
   │  └─ Return mock message object
   ├─ socket.emit('message_sent', {
   │    messageId,
   │    idempotencyKey,
   │    createdAt,
   │  }) ← BACK TO SENDER
   └─ io.to('conv:{id}').emit('receive_message', {
        messageId,
        conversationId,
        senderId,
        content,
        type,
        mediaUrl,
        createdAt,
      }) ← BROADCAST TO ROOM

BACKEND - MESSAGE WORKER (Async):
6. Kafka topic 'raw-messages' receives message
7. Message worker consumes from topic
   ├─ Batch collection (100 messages or 500ms timeout)
   ├─ processBatch() called
   └─ For each message:
      ├─ MessagesService.insertMessageWithMetadata()
      │  ├─ MessageModel.insertOne({...})
      │  ├─ Get conversation members
      │  ├─ MessageStatusModel.insertMany([{sent} per member])
      │  └─ ConversationModel.updateOne({lastMessage, updatedAt})
      └─ On error: fallback to direct insert

FRONTEND - SENDER:
8. Receive 'message_sent' event
   ├─ Update status from 'pending' to 'sent'
   └─ (or update mockId mapping if needed)

FRONTEND - RECIPIENTS:
9. Receive 'receive_message' event
   ├─ Add message to messages state
   ├─ Auto-mark as delivered:
   │  └─ socket.emit('message_delivered', {...})
   ├─ Auto-mark as read after 500ms:
   │  ├─ setTimeout(500)
   │  └─ socket.emit('message_read', {...})
   └─ Update UI with new message

BACKEND - STATUS UPDATES:
10. socket.on('message_delivered') handler
    ├─ MessageStatusModel.updateOne({status: 'delivered'})
    ├─ io.to('conv:{id}').emit('status_update', {...})
    └─ Broadcast to conversation room

11. socket.on('message_read') handler
    ├─ MessageStatusModel.updateOne({status: 'read'})
    ├─ aggregateMessageStatus()
    │  ├─ If sender: best case (read > delivered > sent)
    │  └─ If recipient: own status
    ├─ io.to('conv:{id}').emit('status_update', {...})
    └─ Broadcast to conversation room

FRONTEND - ALL USERS:
12. Receive 'status_update' event
    ├─ Update messageStatus state
    ├─ UI reflects new status
    └─ Sender sees checkmarks based on recipients' status
```

---

### Typing Indicator Flow

```
FRONTEND - SENDER:
1. User starts typing in message-input
2. handleInputChange() called
   ├─ First keystroke:
   │  └─ onStartTyping() → socket.emit('typing_start', {conversationId})
   ├─ Set interval: re-emit every 2s (refresh Redis TTL)
   ├─ Reset debounce timeout: 3s after last keystroke
   ├─ On 3s timeout:
   │  └─ onStopTyping() → socket.emit('typing_stop', {conversationId})
   └─ Clear interval

BACKEND - GATEWAY:
3. socket.on('typing_start', {conversationId})
   ├─ Check membership: ConversationMemberModel.exists()
   ├─ If not member: return error
   ├─ Redis.setTypingIndicator(convId, userId, 3s) [key expires]
   └─ socket.to('conv:{id}').emit('typing_indicator', {
        userId,
        conversationId,
        isTyping: true,
      }) ← BROADCAST TO ROOM (not sender)

4. socket.on('typing_stop', {conversationId})
   ├─ Redis.removeTypingIndicator(convId, userId)
   └─ socket.to('conv:{id}').emit('typing_indicator', {
        userId,
        conversationId,
        isTyping: false,
      })

FRONTEND - OTHER USERS:
5. Receive 'typing_indicator' event
   ├─ If isTyping true:
   │  ├─ Check if already in typingUsers
   │  ├─ Add to typingUsers array
   │  ├─ Set timeout: auto-remove after 4s
   │  └─ Update UI
   └─ If isTyping false:
      ├─ Remove from typingUsers
      ├─ Cancel timeout
      └─ Update UI
```

---

### Message Status Aggregation Logic

```
Example: Group conversation with 4 members (Alice, Bob, Charlie, Sender)
Message sent by Sender to [Alice, Bob, Charlie]

Initial state (from worker):
MessageStatus docs:
- {messageId: "msg-1", userId: "alice", status: "sent"}
- {messageId: "msg-1", userId: "bob", status: "sent"}
- {messageId: "msg-1", userId: "charlie", status: "sent"}
- {messageId: "msg-1", userId: "sender", status: "sent"}

User Actions:
1. Alice receives → auto-marks delivered
   MessageStatus: {alice: delivered}

2. Bob receives → auto-marks delivered
   MessageStatus: {bob: delivered}

3. Alice reads
   MessageStatus: {alice: read}

Current state:
- {alice: read}
- {bob: delivered}
- {charlie: sent}
- {sender: sent}

Aggregation:

When Sender views:
  ├─ Filter out sender status
  ├─ Get recipient statuses: [read, delivered, sent]
  ├─ Take best: read > delivered > sent
  └─ Result: SHOW "read" ✓✓

When Alice views:
  ├─ Get own status
  └─ Result: SHOW "read" ✓✓

When Bob views:
  ├─ Get own status
  └─ Result: SHOW "delivered" ✓

When Charlie views:
  ├─ Get own status
  └─ Result: SHOW "sent" ✓
```

---

## Key Design Patterns

### 1. **Idempotency**
- **Problem:** Network retry → duplicate messages
- **Solution:** `idempotencyKey` (UUID) → same key always returns same `messageId`
- **Implementation:** Redis cache (5 min TTL) + unique index on Message.idempotencyKey
- **Benefit:** Safe to retry without worrying about duplicates

### 2. **Optimistic Updates**
- **Problem:** Message must be sent fast, but DB insert is slow
- **Solution:** Show message on sender immediately, update if needed when confirmed
- **Implementation:**
  - Client adds message to state with mockId
  - Backend generates real messageId
  - When confirmation arrives, update mockId → real messageId
- **Benefit:** Perceived speed, better UX

### 3. **Async Persistence (Kafka)**
- **Problem:** Direct DB insert would be bottleneck if many messages
- **Solution:** Publish to Kafka topic, worker batches inserts
- **Implementation:**
  - Gateway publishes to `raw-messages` topic
  - Worker consumes, batches (100 or 500ms)
  - Worker inserts batches to DB
- **Benefit:** Scale message throughput without DB bottleneck
- **Trade-off:** Slight delay (500ms max) before message in DB

### 4. **Graceful Degradation (Fallback Mode)**
- **Problem:** What if Kafka fails?
- **Solution:** Fallback to direct DB insert with reduced rate limit
- **Implementation:**
  - Worker calls fallback callback on failure
  - Gateway sets `kafkaFailureMode = true`
  - Rate limit reduced: 300/500ms → 200/500ms
  - When Kafka recovers: back to 300/500ms
- **Benefit:** Service continues even if Kafka fails

### 5. **Rate Limiting**
- **Problem:** Prevent spam/abuse
- **Solution:** Per-user counter in Redis (500ms window)
- **Implementation:**
  - Counter increments on each message
  - Check against limit before processing
  - Key expires after 500ms
- **Benefit:** Fair resource allocation

### 6. **Event Broadcasting (Socket.io Rooms)**
- **Problem:** How to efficiently send events to subset of users?
- **Solution:** Socket.io rooms group users by conversation
- **Implementation:**
  - `socket.join('conv:{id}')` subscribes
  - `io.to('conv:{id}').emit()` broadcasts to room
- **Benefit:** Efficient multicast, supports multi-instance via Redis adapter

### 7. **Transient State (Redis TTL)**
- **Problem:** Typing indicators should expire automatically
- **Solution:** Redis keys with TTL
- **Implementation:**
  - `Redis.setex('typing:{convId}:{userId}', 3, '1')`
  - Key expires after 3 seconds
- **Benefit:** No manual cleanup needed

### 8. **Status Aggregation**
- **Problem:** Sender wants to know if ANY recipient failed
- **Solution:** Different views for sender vs recipient
- **Implementation:**
  - Sender: sees best status (read > delivered > sent)
  - Recipient: sees own status
- **Benefit:** Accurate status representation

### 9. **Upload Integration (Cloudinary)**
- **Problem:** Large media files would bottleneck backend
- **Solution:** Client-side direct upload with signed credentials
- **Implementation:**
  - Backend generates signed upload token
  - Client uploads directly to Cloudinary
  - Backend stores URL
- **Benefit:** Backend not involved in media transfer

### 10. **Cursor Pagination**
- **Problem:** Efficient loading of old messages
- **Solution:** Cursor-based pagination (not offset)
- **Implementation:**
  - Query: `{createdAt: {$lt: cursor}}`
  - Cursor = `createdAt` of last message
- **Benefit:** Handles concurrent updates better than offset

---

## Configuration & Environment Variables

**Backend (.env):**
```
# Socket.IO
WS_URL=http://localhost:3000

# Kafka
KAFKA_BROKERS=localhost:9092

# Redis
REDIS_URL=redis://localhost:6379

# MongoDB
MONGODB_URI=mongodb://localhost:27017/zync

# JWT
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGINS=http://localhost:3001,http://localhost:3000

# Upload
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

---

## Testing Considerations

### Unit Tests
- `MessagesService.createMessage()` - Idempotency
- `MessagesService.aggregateMessageStatus()` - Status logic
- `useChat()` hook - Event listeners, state updates

### Integration Tests
- End-to-end message send
- Status update flow
- Typing indicators
- Message history pagination

### Load Tests
- Rate limiting under high load
- Kafka batch processing
- Redis cache eviction
- Fallback mode activation

---

## Performance Optimization

### Indexes
- Message: `{conversationId: 1, createdAt: -1}` for pagination
- Message: `{idempotencyKey: 1}` for duplicate check
- MessageStatus: `{messageId: 1, userId: 1}` for aggregation

### Caching
- Idempotency cache (5 min)
- Typing indicators (3 sec, auto-expire)
- Online status (persistent, remove on disconnect)

### Batching
- Message worker: 100 messages or 500ms
- Status updates: can batch via Socket.io

### Connection Pooling
- MongoDB connection pool
- Redis connections
- Kafka producer/consumer connections

---

## Future Enhancements

- [ ] Message search/indexing
- [ ] Reaction reactions system (emojis)
- [ ] Message editing/deletion
- [ ] Voice messages
- [ ] File attachments (documents)
- [ ] Encryption end-to-end
- [ ] Message archiving
- [ ] Conversation pin/mute
- [ ] Read receipts for groups
- [ ] Analytics/metrics

