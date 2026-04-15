# Message Reaction Backend Plan (Socket 2-Flow + IdempotencyKey Lookup)

## 1) Muc tieu

Xay dung backend reaction cho chat voi cac yeu cau:
- Socket xu ly nhanh cho UI (phan hoi ngay).
- Tach ro 2 luong:
  1. Luong DB add/update reaction.
  2. Luong socket response ngay cho client + broadcast cap nhat.
- Ho tro message duoc gui tu 2 nguon:
  - Tin nhan vua gui truc tiep (messageId tam = idempotencyKey).
  - Tin nhan da co trong lich su (messageId MongoDB).
- Khi add/update reaction, backend phai resolve message theo idempotencyKey de tim duoc ca 2 case.

## 2) Nguyen tac thiet ke

1. Socket event la kenh chinh de update UI realtime.
2. DB la source of truth.
3. Phan hoi socket cho sender ngay (ack nhanh), sau do co event confirm/update theo ket qua DB.
4. Message reference tu frontend cho reaction duoc goi chung la messageRef (co the la _id hoac idempotencyKey).
5. Luon uu tien tim Message bang idempotencyKey neu co, de khop voi luong createMessage trong gateway.

## 3) Data model backend (de xuat)

### 3.1 Collection: message_reaction_users

Muc dich: luu reaction theo user tren moi message (khong luu lich su click).

Fields:
- _id
- messageId (ObjectId)
- conversationId (ObjectId)
- userId (ObjectId)
- emojiCounts (Map<string, number>)
- totalCount (number)
- lastEmoji (string | null) // emoji cuoi cung user da react tren message
- createdAt
- updatedAt

Index:
- unique: (messageId, userId)
- index: (conversationId, messageId)

### 3.2 Collection: message_reaction_summary

Muc dich: doc nhanh UI (pill + modal sidebar count).

Fields:
- _id
- messageId (ObjectId) [unique]
- conversationId (ObjectId)
- emojiCounts (Map<string, number>)
- totalCount (number)
- updatedAt

Index:
- unique: (messageId)
- index: (conversationId, updatedAt)

## 4) Socket contract (tach 2 luong)

### 4.1 Client emit

Event: reaction_upsert
Payload:
{
  requestId: string,
  conversationId: string,
  messageRef: string,    // Mongo _id hoac idempotencyKey
  emoji: string,
  delta: number,         // thuong = 1, cho phep >1 de gom click nhanh
  actionSource: "picker-select" | "trigger-click",
  idempotencyKey: string // idempotency cho chinh thao tac reaction
}

Event: reaction_remove_all_mine
Payload:
{
  requestId: string,
  conversationId: string,
  messageRef: string,
  idempotencyKey: string
}

### 4.2 Server response (Flow B: tra socket ngay)

Event: reaction_ack (gui rieng cho sender)
Payload:
{
  requestId,
  accepted: true,
  conversationId,
  messageRef,
  messageId: string | null,
  userId,
  action: "upsert" | "remove_all_mine",
  optimistic: true,
  serverTs
}

Y nghia:
- Event nay tra ngay khi validate pass de UI update nhanh.
- Neu messageId chua resolve duoc ngay, messageId co the null tam thoi.

### 4.3 Server broadcast sau DB (Flow A ket hop notify)

Event: reaction_updated (broadcast vao room conv:{conversationId})
Payload:
{
  requestId,
  conversationId,
  messageRef,
  messageId,
  summary: {
    totalCount,
    emojiCounts
  },
  actor: {
    userId,
    action: "upsert" | "remove_all_mine",
    actionSource,
    emoji,
    delta
  },
  userState: {
    userId,
    lastEmoji,
    totalCount,
    emojiCounts
  },
  updatedAt
}

Event: reaction_error (gui rieng cho sender neu fail)
Payload:
{
  requestId,
  conversationId,
  messageRef,
  code,
  message
}

## 5) Luong xu ly chi tiet

### 5.1 reaction_upsert

B1. Validate payload + membership conversation.
B2. Emit reaction_ack ngay cho sender (optimistic).
B3. Chay async DB flow:
- Resolve message bang helper resolveMessageByRef(messageRef).
- Upsert message_reaction_users:
  - emojiCounts[emoji] += delta
  - totalCount += delta
  - lastEmoji = emoji
- Upsert message_reaction_summary:
  - emojiCounts[emoji] += delta
  - totalCount += delta
- Broadcast reaction_updated den room (kem actor.actionSource de frontend phan tich UX/debug).
B4. Neu fail, emit reaction_error cho sender.

### 5.2 reaction_remove_all_mine

B1. Validate payload + membership conversation.
B2. Emit reaction_ack ngay.
B3. Chay async DB flow:
- Resolve message.
- Tim message_reaction_users(messageId, userId).
- Lay old emojiCounts + totalCount.
- Tru nguoc vao summary (inc am theo tung emoji, total am).
- Dat emojiCounts = {} ; totalCount = 0 ; lastEmoji = null (hoac xoa doc tuy chon thiet ke).
- Broadcast reaction_updated den room.
B4. Neu fail, emit reaction_error cho sender.

## 6) Message resolve strategy (bat buoc ho tro idempotencyKey)

Tao helper chung:

resolveMessageByRef(messageRef: string):
1. Neu messageRef la ObjectId hop le:
- tim MessageModel.findById(messageRef)
- neu thay -> return
2. Tim theo idempotencyKey:
- MessageModel.findOne({ idempotencyKey: messageRef })
- neu thay -> return
3. Neu chua thay (co the message vua publish Kafka, chua insert DB):
- dua vao Redis queue pending_reaction:{messageRef}
- worker insertMessageWithMetadata se apply pending reaction sau khi message ton tai

Luu y:
- Day la diem quan trong de xu ly dung voi createMessage trong MessagesService dang tra _id = idempotencyKey o gateway.

## 7) Redis pending queue cho reaction (de xu ly race voi Kafka)

De xuat key:
- pending_reaction:{messageRef}

Value co the la list item JSON:
{
  requestId,
  userId,
  conversationId,
  action,
  actionSource,
  emoji,
  delta,
  idempotencyKey,
  createdAt
}

TTL: 5 phut.

Khi message duoc insert xong (insertMessageWithMetadata):
- consume pending_reaction:{mockId or idempotencyKey}
- apply lan luot vao 2 collection reaction
- broadcast reaction_updated
- clear key

## 8) Idempotency cho reaction command

Moi lenh reaction_upsert/remove_all_mine can idempotencyKey rieng.

De xuat:
- Redis key: reaction_cmd:{idempotencyKey}
- Gia tri: ket qua xu ly gan nhat (requestId, messageId, updatedAt)
- TTL: 60-300s

Neu command trung idempotencyKey:
- Khong ghi DB lai.
- Emit lai reaction_updated hoac reaction_ack cached.

## 9) Validation va security

1. Kiem tra user la member conversation truoc khi xu ly reaction.
2. Kiem tra emoji thuoc whitelist.
3. Kiem tra delta > 0 va gioi han delta toi da moi request (vd <= 20).
4. Rate limit theo user + message + 10s de tranh spam.

## 10) Pseudo code handler

```ts
socket.on("reaction_upsert", async (payload) => {
  validate(payload);
  ensureMember(payload.conversationId, userId);

  socket.emit("reaction_ack", {
    requestId: payload.requestId,
    accepted: true,
    conversationId: payload.conversationId,
    messageRef: payload.messageRef,
    messageId: null,
    userId,
    action: "upsert",
    optimistic: true,
    serverTs: new Date().toISOString(),
  });

  void (async () => {
    try {
      const message = await resolveMessageByRef(payload.messageRef);
      if (!message) {
        await enqueuePendingReaction(payload, userId);
        return;
      }

      const summary = await applyUpsertReaction({
        messageId: message._id,
        conversationId: payload.conversationId,
        userId,
        emoji: payload.emoji,
        delta: payload.delta,
      });

      io.to(`conv:${payload.conversationId}`).emit("reaction_updated", {
        requestId: payload.requestId,
        conversationId: payload.conversationId,
        messageRef: payload.messageRef,
        messageId: message._id,
        summary,
        actor: {
          userId,
          action: "upsert",
          actionSource: payload.actionSource,
          emoji: payload.emoji,
          delta: payload.delta,
        },
        userState: {
          userId,
          lastEmoji: payload.emoji,
          totalCount: 0, // thay bang so thuc sau khi apply DB
          emojiCounts: {},
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      socket.emit("reaction_error", {
        requestId: payload.requestId,
        conversationId: payload.conversationId,
        messageRef: payload.messageRef,
        code: "REACTION_UPSERT_FAILED",
        message: "Failed to update reaction",
      });
    }
  })();
});
```

## 11) Task checklist backend

### A. Schema + Index
- [ ] Tao model message_reaction_users
- [ ] Tao model message_reaction_summary
- [ ] Tao index unique/can thiet
- [ ] Them truong lastEmoji cho message_reaction_users

### B. Services
- [ ] resolveMessageByRef (ObjectId + idempotencyKey)
- [ ] applyUpsertReaction
- [ ] applyRemoveAllMine
- [ ] enqueue/apply pending_reaction
- [ ] idempotency cho reaction command

### C. Socket gateway
- [ ] Them event reaction_upsert
- [ ] Them event reaction_remove_all_mine
- [ ] Emit reaction_ack ngay
- [ ] Emit reaction_updated sau DB
- [ ] Emit reaction_error khi fail
- [ ] Ho tro actionSource trong payload + actor broadcast

### D. Integration voi luong message hien tai
- [ ] Hook vao insertMessageWithMetadata de consume pending_reaction
- [ ] Dam bao nhan duoc ca messageRef la idempotencyKey

### E. Tests
- [ ] Unit test service upsert/remove
- [ ] Integration test socket 2-flow
- [ ] Test case messageRef la _id
- [ ] Test case messageRef la idempotencyKey
- [ ] Test case pending khi message chua insert
