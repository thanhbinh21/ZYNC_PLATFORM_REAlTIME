# Group Message Status Aggregation

**Status**: Design Document - Awaiting User Review  
**Date**: April 7, 2026  
**Objective**: Fix status display for group messages (sender perspective) and cross-user status updates

---

## 1. Problem Statement

**Current Issue:**
- Sender sends message to group → sees status for only themselves
- Recipient A marks read → status should change for sender (worst case: "sent")
- Recipient B still on "delivered" → sender should see "delivered" (not "sent")

**Example:**
```
Message sent to [A, B, C]:
  - User A: read ✓
  - User B: delivered ✓✓
  - User C: sent ✓
  
Sender should see: "delivered" (worst case among recipients: B)
NOT: "sent" (wrong)
```

---

## 2. Backend Changes: `getMessageHistory()`

### Current Behavior
Returns only current user's status:
```typescript
// What status does sender see?
const status = statusMap.get(msgId) || (msg.senderId === userId ? 'sent' : 'delivered');
// If sender → 'sent' (always for sender)
// Others → status or default 'delivered'
```

**Problem**: Sender only sees their own status ('sent'), never sees group status.

### Proposed Solution

**Logic for Group Message Status (Best Case Priority):**

```typescript
function aggregateGroupMessageStatus(
  messageId: string,
  senderId: string,
  userId: string, // Current requesting user
  allStatuses: Array<{userId: string, status: 'sent' | 'delivered' | 'read'}>
): 'sent' | 'delivered' | 'read' {
  // If requesting user is sender
  if (userId === senderId) {
    // Aggregate status from all RECIPIENTS only (exclude sender)
    const recipientStatuses = allStatuses
      .filter(s => s.userId !== senderId)
      .map(s => s.status);
    
    // Priority: read > delivered > sent (best case wins)
    // - If ANY recipient read → show 'read'
    // - Else if ANY recipient delivered → show 'delivered'
    // - Else → show 'sent' (nobody received)
    if (recipientStatuses.includes('read')) return 'read';
    if (recipientStatuses.includes('delivered')) return 'delivered';
    return 'sent';
  }
  
  // If requesting user is NOT sender (recipient)
  // Return own status
  return allStatuses.find(s => s.userId === userId)?.status || 'delivered';
}
```

**Priority Explanation:**
- **read** (✓filled): Best case - at least one recipient opened & read
- **delivered** (✓✓): Middle case - at least one recipient received
- **sent** (✓): Worst case - nobody received yet

**Implementation Steps:**
1. In `getMessageHistory()`:
   - Instead of single-user lookup, fetch ALL statuses for each message
   - Apply aggregation logic based on whether userId === senderId
   - Return aggregated status in message object

### Code Change Location
**File**: `apps/server/src/modules/messages/messages.service.ts`  
**Method**: `getMessageHistory()` (lines 283-340)

**Before**:
```typescript
// Fetch status for current user for all messages
const messageIds = messages.map(m => m._id.toString());
const statuses = await MessageStatusModel.find({
  messageId: { $in: messageIds },
  userId, // ← Only current user
}).lean();

const statusMap = new Map(statuses.map(s => [s.messageId.toString(), s.status]));

// Add status to each message
const messagesWithStatus = messages.map(msg => {
  const msgId = msg._id.toString();
  const status = statusMap.get(msgId) || (msg.senderId === userId ? 'sent' : 'delivered');
  return { ...msg, status };
});
```

**After**:
```typescript
// Fetch ALL statuses for all messages (needed for aggregation)
const messageIds = messages.map(m => m._id.toString());
const allStatuses = await MessageStatusModel.find({
  messageId: { $in: messageIds },
}).lean();

// Group statuses by messageId for aggregation
const statusByMessageId = new Map<string, Array<{userId: string, status: string}>>();
for (const status of allStatuses) {
  const msgId = status.messageId.toString();
  if (!statusByMessageId.has(msgId)) {
    statusByMessageId.set(msgId, []);
  }
  statusByMessageId.get(msgId)!.push({
    userId: status.userId,
    status: status.status,
  });
}

// Add aggregated status to each message
const messagesWithStatus = messages.map(msg => {
  const msgId = msg._id.toString();
  const msgStatuses = statusByMessageId.get(msgId) || [];
  
  // Aggregate status: sender sees best case (read > delivered > sent)
  let status: 'sent' | 'delivered' | 'read' = 'sent';
  
  if (userId === msg.senderId && msgStatuses.length > 0) {
    // Sender: show best case among recipients
    const recipientStatuses = msgStatuses
      .filter(s => s.userId !== userId)
      .map(s => s.status as 'sent' | 'delivered' | 'read');
    
    // Priority: read > delivered > sent
    if (recipientStatuses.includes('read')) status = 'read';
    else if (recipientStatuses.includes('delivered')) status = 'delivered';
    else status = 'sent';
  } else if (userId !== msg.senderId) {
    // Recipient: show own status
    const ownStatus = msgStatuses.find(s => s.userId === userId);
    status = (ownStatus?.status as 'sent' | 'delivered' | 'read') || 'delivered';
  }
  
  return { ...msg, status };
});
```

---

## 3. Frontend Integration: Real-time Status Updates

### Current State
✅ **Frontend already has listener**: `listenToStatusUpdates()` in socket.ts (line 154)
- Waits for 'status_update' event from Socket.IO
- Callback receives: `{messageIds?, messageId?, status, userId, updatedAt}`
- Ready to update UI when status changes

### Solution: Broadcast Status Update via Existing Route

**No new route needed** - use existing `PUT /api/messages/:messageId/status`

**Approach:**
1. Frontend calls `markMessagesAsRead()` or `markMessagesAsDelivered()` 
   - These already emit via Socket.IO (socket.ts)
   - Server receives: `message_read` or `message_delivered` events
   
2. Server-side handler processes status update:
   - Updates MessageStatus in MongoDB
   - **NEW**: Calculate aggregated status for message sender
   - **NEW**: Broadcast to sender via `status_update` event

**Why no new route:**
- Current flow: Frontend → Socket.IO event → Handler → DB update
- Adding broadcast just extends existing handler logic
- Keeps single flow for status updates

### Backend Implementation (Update Existing Handler)

**File**: `apps/server/src/socket/gateway.ts` (where handlers should be)  
**Current handler**: Receives `message_read` / `message_delivered`

**New logic to add**:
```typescript
// In message_read or message_delivered handler
async handleMessageRead(data) {
  const { conversationId, messageIds } = data;
  const userId = socket.handshake.auth.userId;
  
  // Step 1: Update each message status
  for (const messageId of messageIds) {
    await MessagesService.updateMessageStatus(
      messageId,
      userId,
      'read'  // or 'delivered'
    );
  }
  
  // Step 2: Get message details to find sender
  const messages = await MessagesService.findMessagesByIds(messageIds);
  
  // Step 3: For each message, calculate aggregated status
  for (const message of messages) {
    const allStatuses = await MessageStatusModel.find({
      messageId: message._id,
    }).lean();
    
    // Aggregate: best case (read > delivered > sent)
    const aggregatedStatus = this.aggregateStatus(message.senderId, allStatuses);
    
    // Step 4: Broadcast to sender only
    io.to(`user:${message.senderId}`).emit('status_update', {
      messageId: message._id,
      status: aggregatedStatus,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    });
  }
}

private aggregateStatus(senderId: string, allStatuses: any[]) {
  const recipientStatuses = allStatuses
    .filter(s => s.userId !== senderId)
    .map(s => s.status);
  
  if (recipientStatuses.includes('read')) return 'read';
  if (recipientStatuses.includes('delivered')) return 'delivered';
  return 'sent';
}
```

### Frontend Automatic Update

**Already implemented** - no changes needed:
```typescript
// In useMessaging hook or component
useEffect(() => {
  listenToStatusUpdates((data) => {
    // Update message in state
    setMessages(prev => prev.map(msg =>
      msg._id === data.messageId
        ? { ...msg, status: data.status }
        : msg
    ));
  });
  
  return () => unlistenToStatusUpdates();
}, []);
```

---

## 4. Implementation Checklist

### Backend (Socket.IO Handler)
**File**: `apps/server/src/socket/gateway.ts`

- [ ] **Step 1**: Create helper method `aggregateStatus()`
  - Input: senderId, allStatuses array
  - Logic: read > delivered > sent
  - Return: 1 status value
  
- [ ] **Step 2**: Update `handleMessageRead` event handler
  - After updating status in DB
  - Get all statuses for message
  - Calculate aggregated status
  - Emit 'status_update' to sender
  
- [ ] **Step 3**: Update `handleMessageDelivered` event handler
  - Same as handleMessageRead
  - Different status value ('delivered' vs 'read')
  
- [ ] **Step 4**: Test broadcast
  - Open 2 browser tabs
  - Send message in tab 1
  - Mark read in tab 2
  - Check tab 1 receives status_update event

### Backend (getMessageHistory Service)
**File**: `apps/server/src/modules/messages/messages.service.ts`

- [ ] **Step 1**: Modify query to fetch ALL statuses
  - Remove `userId` filter
  - Get all statuses for messageIds
  
- [ ] **Step 2**: Group statuses by messageId
  - Create Map<messageId, Array<{userId, status}>>
  
- [ ] **Step 3**: Apply aggregation logic
  - For sender: best case among recipients
  - For recipient: own status
  
- [ ] **Step 4**: Test message history
  - Create group message
  - Mark different users with different statuses
  - Fetch history as sender
  - Verify sender sees aggregated status

### Frontend
**File**: `apps/web/src/hooks/use-messaging.ts` or similar

- [ ] **Already implemented**: `listenToStatusUpdates()` exists
  - No new code needed
  - Just verify hook uses it properly
  
- [ ] **Test**: Status update display
  - Mark message as read from other device
  - Check UI updates (tick icons change)

---

## 5. Status Priority Reference

**Priority Order (best to worst for sender view)**:
```
read (✓filled)    ← Best: at least one recipient opened & read
     ↓
delivered (✓✓)   ← Middle: at least one recipient received
     ↓
sent (✓)         ← Worst: nobody received yet
```

**Decision Logic (for sender)**:
```
if (ANY recipient has 'read') → return 'read'
else if (ANY recipient has 'delivered') → return 'delivered'  
else → return 'sent' (nobody received)
```

**Who sees what:**
- **Sender**: Aggregated best case from ALL recipients
- **Recipient**: Own status only

---

## 6. Edge Cases

| Case | Sender Sees | Notes |
|------|------------|-------|
| All read | read | ✓ Best case |
| All delivered | delivered | Middle case |
| All sent | sent | ✓ Worst case |
| Mix: 1 read, 2 delivered | read | Best: read > delivered |
| Mix: 1 delivered, 2 sent | delivered | Best: delivered > sent |
| Mix: 1 read, 1 sent | read | Best: read > sent |
| Only sender (no recipients) | sent | Self message (no aggregation) |
| Non-existent message | error | Handled with validation |
| Recipient view (not sender) | own status | Always see own, never aggregated |

---

## 7. Performance Considerations

**getMessageHistory() Query Impact**:
- **Before**: `MessageStatus.find({messageId: [], userId})`
  - Single index: {messageId: 1, userId: 1}
  - Returns 1 status per message
  
- **After**: `MessageStatus.find({messageId: []})`
  - Index: {messageId: 1}
  - Returns N statuses per message (all recipients)
  - Memory: O(N) where N = group size (typically 2-1000)

**Network Impact**:
- Message history response size: +10% (includes all statuses)
- Socket broadcast: Only to sender (no extra traffic)

**Optimization Notes**:
- **Projection**: Can exclude unnecessary fields from status query
- **Caching**: aggregateStatus() result could be cached briefly
- **Index**: Ensure {messageId: 1} index exists
- **Typical case**: Most groups <50 people → negligible impact

**No N+1 queries**:
- Fetch all messages: 1 query
- Fetch all statuses for those messages: 1 query
- Aggregation: In-memory Map lookup

---

## Expected Outcome

**Before Fix**:
```
Timeline:
T0: Sender posts to [A, B]
T1: Recipient A marks read
T2: Recipient B marks delivered

Sender view (BROKEN):
  Message ✓ (always shows 'sent', never updates)

Recipient A view:
  From sender ✓✓✓ (shows 'read')

Recipient B view:
  From sender ✓✓ (shows 'delivered')
```

**After Fix**:
```
Timeline:
T0: Sender posts to [A, B]
T1: Recipient A marks read
    → Server broadcasts aggregated status to sender
T2: Recipient B marks delivered
    → Server broadcasts aggregated status to sender

Sender view (FIXED):
  Message ✓✓✓ (shows 'read' - best case)

Recipient A view:
  From sender ✓✓✓ (shows 'read' - own status)

Recipient B view:
  From sender ✓✓ (shows 'delivered' - own status)
```

**Key Improvement:**
- Sender status updates in real-time as recipients mark read/delivered
- Shows best case (read takes priority over delivered)

---

## 9. Review Points

**Changes Made (per user feedback)**:
1. ✅ Priority: read > delivered > sent (best case, not worst)
2. ✅ Socket.IO: Use existing `listenToStatusUpdates()` 
3. ✅ Handler location: socket/gateway.ts (not new route)
4. ✅ Service structure: Separate aggregation logic into helper method

**User Approval Checklist**:
- [ ] Status priority logic correct? (any read → return read, else any delivered → return delivered, else sent)
- [ ] getMessageHistory() aggregation makes sense?
- [ ] Socket broadcast approach acceptable? (emit to sender only)
- [ ] Ready to implement in gateway.ts + messages.service.ts?

**Implementation Notes**:
- Keep cleanly separated: `aggregateStatus()` helper method
- getMessageHistory should fetch all statuses (not filter by userId)
- Gateway handler calls service + aggregates + broadcasts
- No new routes needed

---

**Status**: ✏️ Ready for Implementation (Pending User Final Review)

**Files to Modify**:
1. `apps/server/src/modules/messages/messages.service.ts` - getMessageHistory()
2. `apps/server/src/socket/gateway.ts` - message handlers + aggregateStatus()

No new routes needed - reuse existing Socket.IO flow.
