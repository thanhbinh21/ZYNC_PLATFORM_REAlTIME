# Message Reaction Contracts (Web + Mobile + Backend)

## 1) Muc tieu

Tai lieu nay chot contract du lieu cho tinh nang reaction de:
- Web, Mobile, Backend dung cung 1 payload.
- Tranh lech field khi coding realtime.
- Ho tro 2 hanh vi:
  - picker-select (chon emoji tu picker)
  - trigger-click (quick-add bang lastEmoji)

## 2) Dinh nghia chung

### 2.1 Constants

- REACTION_EMOJIS: ["👍", "❤️", "🤣", "😳", "😭", "😡"]
- REACTION_ACTIONS: ["upsert", "remove_all_mine"]
- ACTION_SOURCE: ["picker-select", "trigger-click"]

### 2.2 Message reference

- `messageRef`: string
- Co the la:
  - MongoDB `_id` cua message trong lich su
  - `idempotencyKey` cua message vua gui (chua map _id)

Backend phai resolve message theo thu tu:
1. findById(messageRef) neu hop le
2. findOne({ idempotencyKey: messageRef })

### 2.3 Baseline va delta realtime (bat buoc)

Phai tach ro 2 giai doan:
- Baseline hydration: lay trang thai reaction hien tai cho cac message dang hien thi.
- Delta realtime: nhan thay doi moi qua `reaction_updated`.

Rule bat buoc:
1. `reaction_updated` KHONG du de khoi tao trang thai cho user vao sau.
2. Client phai hydrate baseline truoc khi tin vao delta realtime.
3. Sau reconnect hoac nghi ngo missed-event, client phai refetch baseline cho visible messages.

Nguon baseline cho phep (chon 1 hoac ket hop):
- Cach A: API history/reaction summary.
- Cach B: socket snapshot event khi join conversation.

## 3) Client -> Server (socket emit)

### 3.1 Event: reaction_upsert

```json
{
  "requestId": "string",
  "conversationId": "string",
  "messageRef": "string",
  "emoji": "👍 | ❤️ | 🤣 | 😳 | 😭 | 😡",
  "delta": 1,
  "actionSource": "picker-select | trigger-click",
  "idempotencyKey": "string"
}
```

Rules:
- `delta` >= 1
- `emoji` bat buoc trong whitelist
- `actionSource` bat buoc
- `idempotencyKey` unique trong thoi gian TTL

### 3.2 Event: reaction_remove_all_mine

```json
{
  "requestId": "string",
  "conversationId": "string",
  "messageRef": "string",
  "idempotencyKey": "string"
}
```

Rules:
- Xoa tat ca reaction cua user hien tai tren messageRef

## 4) Server -> Client (socket response)

### 4.1 Event: reaction_ack (gui rieng cho sender, tra nhanh)

```json
{
  "requestId": "string",
  "accepted": true,
  "conversationId": "string",
  "messageRef": "string",
  "messageId": "string | null",
  "userId": "string",
  "action": "upsert | remove_all_mine",
  "optimistic": true,
  "serverTs": "ISO-8601"
}
```

Meaning:
- Ack ngay sau validate + membership pass.
- `messageId` co the `null` neu message chua resolve ngay.

### 4.2 Event: reaction_updated (broadcast room conv)

```json
{
  "requestId": "string",
  "conversationId": "string",
  "messageRef": "string",
  "messageId": "string",
  "summary": {
    "totalCount": 12,
    "emojiCounts": {
      "👍": 3,
      "❤️": 4,
      "🤣": 2,
      "😳": 1,
      "😭": 1,
      "😡": 1
    }
  },
  "actor": {
    "userId": "string",
    "action": "upsert | remove_all_mine",
    "actionSource": "picker-select | trigger-click",
    "emoji": "👍",
    "delta": 1
  },
  "userState": {
    "userId": "string",
    "lastEmoji": "👍 | null",
    "totalCount": 4,
    "emojiCounts": {
      "👍": 2,
      "❤️": 1,
      "🤣": 1
    }
  },
  "updatedAt": "ISO-8601"
}
```

Notes:
- `userState` la state cua actor vua thao tac.
- Client khac update theo `summary` + `actor`.
- Event nay la DELTA event (incremental update), khong thay the baseline hydration.

### 4.4 Event (optional): reaction_snapshot

Su dung cho baseline hydration khi user vao room/reconnect.

```json
{
  "conversationId": "string",
  "items": [
    {
      "messageId": "string",
      "messageRef": "string",
      "summary": {
        "totalCount": 12,
        "emojiCounts": { "👍": 3, "❤️": 4 }
      }
    }
  ],
  "snapshotTs": "ISO-8601",
  "contractVersion": "reaction-v1"
}
```

### 4.3 Event: reaction_error (gui rieng cho sender)

```json
{
  "requestId": "string",
  "conversationId": "string",
  "messageRef": "string",
  "code": "REACTION_UPSERT_FAILED | REACTION_REMOVE_FAILED | VALIDATION_ERROR | MESSAGE_NOT_FOUND",
  "message": "string"
}
```

## 5) API fallback (recommended)

Dung khi socket reconnect/late-join hoac can re-hydrate baseline:

### 5.1 GET /api/messages/:messageRef/reactions/summary

Response:
```json
{
  "success": true,
  "messageId": "string",
  "conversationId": "string",
  "summary": {
    "totalCount": 12,
    "emojiCounts": {
      "👍": 3,
      "❤️": 4,
      "🤣": 2
    }
  }
}
```

### 5.2 GET /api/messages/:messageRef/reactions/details

Response:
```json
{
  "success": true,
  "messageId": "string",
  "tabs": [
    { "emoji": "ALL", "count": 12 },
    { "emoji": "❤️", "count": 4 },
    { "emoji": "👍", "count": 3 }
  ],
  "rows": [
    {
      "userId": "string",
      "displayName": "string",
      "avatarUrl": "string | null",
      "lastEmoji": "❤️",
      "totalCount": 4,
      "emojiCounts": { "❤️": 2, "👍": 1, "🤣": 1 }
    }
  ]
}
```

## 6) Idempotency contract

### 6.1 Command idempotency

- Redis key: `reaction_cmd:{idempotencyKey}`
- TTL: 60-300s
- Neu duplicate command:
  - khong ghi DB lan nua
  - emit lai reaction_ack/reaction_updated cached

### 6.2 UI rule cho idempotencyKey

- Moi thao tac click chinh thuc tao key moi
- Neu client co batching (delta > 1), 1 batch = 1 key

## 7) Optimistic update rules

Prerequisite:
- Chi optimistic day du sau khi baseline hydration da co.
- Neu baseline chua xong, co the cho optimistic tam thoi nhung bat buoc reconcile bang snapshot/API + `reaction_updated`.

### 7.1 upsert (picker-select / trigger-click)

Client sender update ngay:
- myEmojiCounts[emoji] += delta
- myLastEmoji = emoji
- summary.emojiCounts[emoji] += delta
- summary.totalCount += delta

Sau do reconcile bang `reaction_updated`.

### 7.2 remove_all_mine

Client sender update ngay:
- tru toan bo myEmojiCounts khoi summary
- xoa emoji count = 0
- myEmojiCounts = {}
- myLastEmoji = null

Sau do reconcile bang `reaction_updated`.

## 8) Validation matrix

1. conversationId: required
2. messageRef: required
3. emoji: required cho upsert
4. delta: required cho upsert, >= 1
5. actionSource: required cho upsert
6. idempotencyKey: required
7. user phai la member conversation

## 9) Versioning contract

De xuat them truong version de de migrate:

- Trong emit payload: `contractVersion: "reaction-v1"`
- Trong server response: `contractVersion: "reaction-v1"`

Neu chua can, co the de optional cho phase 1.

## 10) Test cases contract

- [ ] upsert picker-select tra du field
- [ ] upsert trigger-click tra du field
- [ ] remove_all_mine tra du field
- [ ] duplicate idempotencyKey khong tang count lan 2
- [ ] messageRef la _id hoat dong
- [ ] messageRef la idempotencyKey hoat dong
- [ ] reaction_updated co actor.actionSource
- [ ] remove_all_mine lam lastEmoji -> null
- [ ] late-join client hydrate baseline dung truoc khi nhan delta
- [ ] reconnect client refetch baseline va khong bi sai tong count
