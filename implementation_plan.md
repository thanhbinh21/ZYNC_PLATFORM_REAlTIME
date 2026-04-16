# Phase 7 – Notifications (Module F26)

Triển khai hệ thống Push Notification đa kênh cho ZYNC Platform: **FCM** (Android/Web), **Web Push API** (Browser), và **APNs placeholder** (iOS). Notification worker tiêu thụ Kafka topic `notifications`, tra cứu device tokens của user và gửi push qua các kênh tương ứng.

---

## Quyết định kiến trúc (Resolved)

| # | Câu hỏi | Quyết định |
|---|---------|------------|
| Q1 | Firebase Service Account? | **Dev-safe mode**: log notification khi thiếu credentials. Production chỉ cần điền `.env`. |
| Q2 | Socket.IO real-time `new_notification`? | **Có**. Emit event `new_notification` qua Socket.IO để Web UI cập nhật badge/panel real-time mà không cần polling. |
| Q3 | Notification history retention? | **30 ngày** – dùng MongoDB TTL index trên `createdAt`. |
| Q4 | Notification debounce? | **Có**. Gom notification từ cùng conversation trong 5 giây thành 1 push ("X tin nhắn mới từ Y"). |
| Q5 | Story events → notification? | **Có**. `story_reaction` và `story_reply` produce notification cho story owner khi offline. |

---

## User Review Required

> [!IMPORTANT]
> **Firebase Project:** Cần tạo một Firebase project (miễn phí) và tải file `firebase-service-account.json` để FCM hoạt động. Trong môi trường dev, notification worker sẽ **log-only** nếu chưa cấu hình credentials.

> [!IMPORTANT]
> **Web Push VAPID keys:** Cần sinh cặp VAPID key bằng `npx web-push generate-vapid-keys`. Điền vào `.env` để browser notification hoạt động.

> [!WARNING]
> **Mute preferences:** Khi user mute conversation/group, notification sẽ bị chặn tại worker (trước khi gửi push). Dữ liệu mute preferences lưu trong MongoDB collection `notification_preferences`.

---

## Tổng quan kiến trúc

```
  ┌─────────────┐     ┌───────────┐      ┌──────────┐     ┌──────────┐
  │ Socket      │     │ Friends   │      │ Groups   │     │ Stories  │
  │ Gateway     │     │ Service   │      │ Service  │     │ Service  │
  │ (new msg)   │     │ (request) │      │ (invite) │     │ (react)  │
  └──────┬──────┘     └─────┬─────┘      └────┬─────┘     └────┬─────┘
         │                  │                  │                │
         └──────────────────┼──────────────────┼────────────────┘
                            │
                    Kafka produce →
                 topic: "notifications"
                            │
                            ▼
              ┌─────────────────────────┐
              │  Notification Worker    │
              │  (Kafka Consumer)       │
              │                         │
              │  1. Check mute prefs    │
              │  2. Check online status │
              │  3. Debounce (5s window)│
              │  4. Get device tokens   │
              │  5. Route by platform:  │
              │     • FCM (android/web) │
              │     • Web Push (browser)│
              │     • APNs (iOS stub)   │
              │  6. Clean expired tokens│
              │  7. Save to DB history  │
              │  8. Emit Socket.IO      │
              │     `new_notification`  │
              └─────────────────────────┘
```

---

# PART A – Infrastructure Layer

## A1: FCM Initialization

### [NEW] `apps/server/src/infrastructure/fcm.ts`

| Micro-task | Mô tả |
|------------|--------|
| A1.1 | Tạo file `fcm.ts`, import `firebase-admin` (đã có trong `package.json`) |
| A1.2 | Initialize Firebase Admin SDK từ env `GOOGLE_APPLICATION_CREDENTIALS` hoặc `FCM_SERVICE_ACCOUNT_JSON` |
| A1.3 | Export `sendFCMNotification(tokens: string[], notification: {title, body}, data?: Record<string, string>)` |
| A1.4 | Export `isFCMConfigured(): boolean` để check trạng thái |
| A1.5 | **Fail-safe**: Nếu env chưa cấu hình → `logger.warn` và return (không crash server) |
| A1.6 | Xử lý response: detect token `messaging/registration-token-not-registered` → return danh sách expired tokens |

```typescript
// Signature dự kiến
export function isFCMConfigured(): boolean;
export async function sendFCMNotification(
  tokens: string[],
  notification: { title: string; body: string },
  data?: Record<string, string>,
): Promise<{ successCount: number; expiredTokens: string[] }>;
```

---

## A2: Web Push Initialization

### [NEW] `apps/server/src/infrastructure/web-push.ts`

| Micro-task | Mô tả |
|------------|--------|
| A2.1 | Cài dependency: `web-push` + `@types/web-push` vào `apps/server` |
| A2.2 | Tạo file `web-push.ts`, import `web-push` |
| A2.3 | Initialize VAPID details từ env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| A2.4 | Export `sendWebPush(subscription: PushSubscriptionJSON, payload: string)` |
| A2.5 | Export `isWebPushConfigured(): boolean` |
| A2.6 | **Fail-safe**: Nếu VAPID env thiếu → `logger.warn`, bỏ qua |
| A2.7 | Xử lý lỗi 410 Gone / 404 → return `expired: true` để xóa subscription |

```typescript
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function isWebPushConfigured(): boolean;
export async function sendWebPush(
  subscription: PushSubscriptionJSON,
  payload: string,
): Promise<{ success: boolean; expired: boolean }>;
```

---

## A3: Kafka Topic Update

### [MODIFY] `apps/server/src/infrastructure/kafka.ts`

| Micro-task | Mô tả |
|------------|--------|
| A3.1 | Không cần thêm topic mới – topic `NOTIFICATIONS` đã đủ cho toàn bộ notification events |
| A3.2 | (Verify) `KAFKA_TOPICS.NOTIFICATIONS = 'notifications'` đã tồn tại và auto-create 3 partitions ✓ |

> **Note:** Topic `NOTIFICATION_EVENTS` trong plan cũ là **không cần thiết**. Tất cả notification events (message, friend, group, story) đều produce vào cùng topic `notifications` với `type` field phân biệt.

---

# PART B – Data Layer (Models)

## B1: Notification Preference Model

### [NEW] `apps/server/src/modules/notifications/notification-preference.model.ts`

| Micro-task | Mô tả |
|------------|--------|
| B1.1 | Tạo folder `apps/server/src/modules/notifications/` |
| B1.2 | Tạo interface `INotificationPreference` |
| B1.3 | Tạo Mongoose schema + model `NotificationPreference` |
| B1.4 | Index: `{ userId: 1 }` (unique) |

```typescript
interface INotificationPreference {
  userId: string;
  mutedConversations: string[];
  mutedUntil?: Map<string, Date>;  // conversationId → mute expiry
  enablePush: boolean;              // master toggle
  enableSound: boolean;
  enableBadge: boolean;
}
```

---

## B2: Notification Model

### [NEW] `apps/server/src/modules/notifications/notification.model.ts`

| Micro-task | Mô tả |
|------------|--------|
| B2.1 | Tạo interface `INotification` |
| B2.2 | Tạo Mongoose schema + model `Notification` |
| B2.3 | Index: `{ userId: 1, createdAt: -1 }` cho cursor pagination |
| B2.4 | Index: `{ userId: 1, read: 1 }` cho unread count query |
| B2.5 | **TTL Index**: `{ createdAt: 1 }` với `expireAfterSeconds: 2592000` (30 ngày) |

```typescript
interface INotification {
  userId: string;
  type: 'new_message' | 'friend_request' | 'friend_accepted' | 'group_invite' | 'story_reaction' | 'story_reply';
  title: string;
  body: string;
  data?: Record<string, string>;  // deep link data
  conversationId?: string;
  fromUserId?: string;
  read: boolean;
  createdAt: Date;
}
```

---

## B3: DeviceToken Model Mở Rộng (Web Push)

### [MODIFY] `apps/server/src/modules/users/device-token.model.ts`

| Micro-task | Mô tả |
|------------|--------|
| B3.1 | Thêm optional field `pushSubscription` cho Web Push: `{ endpoint: string, keys: { p256dh: string, auth: string } }` |
| B3.2 | Giữ nguyên `deviceToken` cho FCM tokens (android/web FCM) |
| B3.3 | Web Push subscription dùng `endpoint` làm unique key thay vì `deviceToken` |
| B3.4 | Update index nếu cần |

> **Lý do:** Web Push API dùng `PushSubscription` object (endpoint + keys), khác với FCM token (string). Cần mở rộng model để lưu cả hai format.

```typescript
export interface IDeviceToken extends Document {
  userId: string;
  deviceToken: string;                   // FCM token hoặc Web Push endpoint
  platform: 'ios' | 'android' | 'web';
  pushSubscription?: {                    // chỉ dùng khi platform === 'web'
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
}
```

---

# PART C – Business Logic (Service Layer)

## C1: Notification Service

### [NEW] `apps/server/src/modules/notifications/notifications.service.ts`

| Micro-task | Mô tả | Dependencies |
|------------|--------|--------------|
| C1.1 | `createNotification(userId, type, title, body, data?)` → lưu vào MongoDB `notifications` collection | B2 |
| C1.2 | `produceNotificationEvent(payload)` → produce Kafka message vào topic `notifications` | A3 |
| C1.3 | `getNotifications(userId, cursor?, limit?)` → cursor pagination (createdAt + _id) | B2 |
| C1.4 | `markAsRead(userId, notificationIds: string[])` → đánh dấu đã đọc (batch) | B2 |
| C1.5 | `markAllAsRead(userId)` → đánh dấu tất cả đã đọc | B2 |
| C1.6 | `getUnreadCount(userId)` → đếm badge number | B2 |
| C1.7 | `isConversationMuted(userId, conversationId)` → kiểm tra mute status | B1 |
| C1.8 | `muteConversation(userId, conversationId, until?)` → mute conversation | B1 |
| C1.9 | `unmuteConversation(userId, conversationId)` → unmute | B1 |
| C1.10 | `getPreferences(userId)` → lấy notification settings | B1 |
| C1.11 | `updatePreferences(userId, prefs)` → cập nhật settings | B1 |

---

## C2: Notification Schemas (Zod)

### [NEW] `apps/server/src/modules/notifications/notifications.schema.ts`

| Micro-task | Mô tả |
|------------|--------|
| C2.1 | Schema `MarkReadSchema` – validate `{ notificationIds: string[] }` |
| C2.2 | Schema `UpdatePreferencesSchema` – validate `{ enablePush?, enableSound?, enableBadge? }` |
| C2.3 | Schema `MuteConversationSchema` – validate `{ until?: Date }` (optional timed mute) |
| C2.4 | Schema `WebPushSubscribeSchema` – validate PushSubscription object `{ endpoint, keys: {p256dh, auth} }` |
| C2.5 | Schema `GetNotificationsQuerySchema` – validate `{ cursor?, limit? }` query params |

---

# PART D – API Layer (Controller & Routes)

## D1: Notification Controller

### [NEW] `apps/server/src/modules/notifications/notifications.controller.ts`

| Micro-task | Mô tả | HTTP Method & Route |
|------------|--------|---------------------|
| D1.1 | `getNotificationsHandler` | `GET /api/notifications` |
| D1.2 | `getUnreadCountHandler` | `GET /api/notifications/unread-count` |
| D1.3 | `markAsReadHandler` | `PATCH /api/notifications/read` |
| D1.4 | `markAllAsReadHandler` | `PATCH /api/notifications/read-all` |
| D1.5 | `getPreferencesHandler` | `GET /api/notifications/preferences` |
| D1.6 | `updatePreferencesHandler` | `PATCH /api/notifications/preferences` |
| D1.7 | `muteConversationHandler` | `POST /api/notifications/mute/:conversationId` |
| D1.8 | `unmuteConversationHandler` | `DELETE /api/notifications/mute/:conversationId` |

---

## D2: Web Push Controller

### [NEW] `apps/server/src/modules/notifications/web-push.controller.ts`

| Micro-task | Mô tả | HTTP Method & Route |
|------------|--------|---------------------|
| D2.1 | `subscribeWebPushHandler` – nhận PushSubscription, lưu DeviceToken | `POST /api/notifications/web-push/subscribe` |
| D2.2 | `unsubscribeWebPushHandler` – xóa subscription | `DELETE /api/notifications/web-push/unsubscribe` |
| D2.3 | `getVapidKeyHandler` – trả public VAPID key cho client | `GET /api/notifications/web-push/vapid-key` |

---

## D3: Routes Registration

### [NEW] `apps/server/src/modules/notifications/notifications.routes.ts`

| Micro-task | Mô tả |
|------------|--------|
| D3.1 | Tạo `notificationsRouter` với auth middleware |
| D3.2 | Đăng ký tất cả routes từ D1 + D2 |
| D3.3 | Thêm validation middleware (Zod schemas từ C2) |

### [MODIFY] `apps/server/src/app.ts`

| Micro-task | Mô tả |
|------------|--------|
| D3.4 | Đăng ký `notificationsRouter` tại `/api/notifications` |

---

# PART E – Notification Worker (Kafka Consumer)

## E1: Worker Logic

### [MODIFY] `apps/server/src/workers/notification.worker.ts`

Hoàn thiện từ skeleton hiện tại. Luồng xử lý cho mỗi Kafka message:

| Micro-task | Mô tả | Dependencies |
|------------|--------|--------------|
| E1.1 | Parse payload: `{ userId, type, title, body, data?, conversationId?, fromUserId? }` | — |
| E1.2 | **Check mute**: Nếu `conversationId` → query `NotificationPreferenceModel`. Nếu muted → skip push (vẫn lưu DB) | B1 |
| E1.3 | **Check master toggle**: Nếu `enablePush === false` → skip push (vẫn lưu DB) | B1 |
| E1.4 | **Check online status**: Query Redis `online_users`. Nếu `type === 'new_message'` và user online → skip push | — |
| E1.5 | **Debounce logic**: Kiểm tra Redis key `notif_debounce:{userId}:{conversationId}`. Nếu exists → gom thành grouped notification. Set TTL 5s | — |
| E1.6 | **Lưu notification history**: Gọi `NotificationModel.create()` | B2 |
| E1.7 | **Emit Socket.IO**: `io.to('user:${userId}').emit('new_notification', notificationDoc)` cho real-time update | H1 |
| E1.8 | **Query device tokens**: `DeviceTokenModel.find({ userId })` | B3 |
| E1.9 | **Route FCM**: Tokens với `platform === 'android'` hoặc `platform === 'web'` (không có pushSubscription) → `sendFCMNotification()` | A1 |
| E1.10 | **Route Web Push**: Tokens với `platform === 'web'` + `pushSubscription` exists → `sendWebPush()` | A2 |
| E1.11 | **Route APNs**: `platform === 'ios'` → log placeholder | — |
| E1.12 | **Clean expired tokens**: FCM trả `messaging/registration-token-not-registered` hoặc Web Push trả 410 → xóa device token từ DB | B3 |
| E1.13 | **Error handling**: Log error, không throw (worker tiếp tục consume) | — |

---

## E2: Worker Lifecycle

### [MODIFY] `apps/server/src/workers/notification.worker.ts`

| Micro-task | Mô tả |
|------------|--------|
| E2.1 | Thêm biến `consumer` ở module scope để `stop` function truy cập |
| E2.2 | Export `stopNotificationWorker()` → `consumer.disconnect()` |

### [MODIFY] `apps/server/src/main.ts`

| Micro-task | Mô tả |
|------------|--------|
| E2.3 | Import `startNotificationWorker` và `stopNotificationWorker` |
| E2.4 | Gọi `startNotificationWorker()` sau `startMessageWorker()` khi `KAFKA_ENABLED=true` |
| E2.5 | Thêm `stopNotificationWorker()` vào graceful shutdown handler |

---

# PART F – Event Producers

## F1: Message Notification (Socket Gateway)

### [MODIFY] `apps/server/src/socket/gateway.ts`

| Micro-task | Mô tả |
|------------|--------|
| F1.1 | Sau `handleSendMessage` thành công → lấy danh sách members của conversation |
| F1.2 | Lọc: bỏ sender, chỉ giữ members **offline** (check Redis `online_users`) |
| F1.3 | Với mỗi offline member → `produceMessage(KAFKA_TOPICS.NOTIFICATIONS, recipientId, payload)` |

**Payload mẫu:**
```json
{
  "userId": "<recipientId>",
  "type": "new_message",
  "title": "Tin nhắn mới từ <senderName>",
  "body": "<message preview 100 chars>",
  "conversationId": "<convId>",
  "fromUserId": "<senderId>",
  "data": { "conversationId": "<convId>", "action": "open_chat" }
}
```

---

## F2: Friend Request Notification

### [MODIFY] `apps/server/src/modules/friends/friends.service.ts`

| Micro-task | Mô tả |
|------------|--------|
| F2.1 | Trong `sendFriendRequest()` → produce notification `type: 'friend_request'` cho `toUserId` |
| F2.2 | Trong `acceptFriendRequest()` → produce notification `type: 'friend_accepted'` cho requester |

**Payload mẫu:**
```json
{
  "userId": "<toUserId>",
  "type": "friend_request",
  "title": "Lời mời kết bạn",
  "body": "<senderName> muốn kết bạn với bạn",
  "fromUserId": "<senderId>",
  "data": { "action": "open_friend_requests" }
}
```

---

## F3: Group Invite Notification

### [MODIFY] `apps/server/src/modules/groups/` (service hoặc controller)

| Micro-task | Mô tả |
|------------|--------|
| F3.1 | Khi thêm member vào nhóm → produce notification `type: 'group_invite'` cho user được thêm |

**Payload mẫu:**
```json
{
  "userId": "<addedUserId>",
  "type": "group_invite",
  "title": "Được thêm vào nhóm",
  "body": "<adminName> đã thêm bạn vào nhóm <groupName>",
  "conversationId": "<groupConvId>",
  "fromUserId": "<adminId>",
  "data": { "conversationId": "<groupConvId>", "action": "open_chat" }
}
```

---

## F4: Story Notification (NEW – thiếu trong plan cũ)

### [MODIFY] `apps/server/src/modules/stories/stories.service.ts`

| Micro-task | Mô tả |
|------------|--------|
| F4.1 | Trong `reactToStory()` → produce notification `type: 'story_reaction'` cho story owner (nếu owner offline) |
| F4.2 | Trong `replyToStory()` → produce notification `type: 'story_reply'` cho story owner (nếu owner offline) |

**Payload mẫu:**
```json
{
  "userId": "<storyOwnerId>",
  "type": "story_reaction",
  "title": "Phản hồi story",
  "body": "<reactorName> đã ❤️ story của bạn",
  "fromUserId": "<reactorId>",
  "data": { "action": "open_story", "storyId": "<storyId>" }
}
```

---

# PART G – Real-time Layer (Socket.IO)

## G1: Socket Event `new_notification` (NEW – thiếu trong plan cũ)

### [MODIFY] `apps/server/src/socket/gateway.ts`

| Micro-task | Mô tả |
|------------|--------|
| G1.1 | Export hàm `emitNotification(userId: string, notification: INotification)` |
| G1.2 | Emit tới room `user:${userId}` event `new_notification` với full notification object |
| G1.3 | Import và sử dụng trong notification worker (E1.7) |

> **Mục đích:** Khi user online nhưng không ở conversation đang nhận tin → vẫn cần cập nhật badge/panel real-time. Push notification bị skip cho online users nhưng Socket.IO event vẫn cần emit.

### Client-side events:

| Event | Direction | Payload | Mô tả |
|-------|-----------|---------|--------|
| `new_notification` | Server → Client | `INotification` object | Notification mới, cập nhật badge + panel |
| `notification_read` | Client → Server | `{ notificationIds: string[] }` | (Optional) Real-time mark read |

---

# PART H – Web Client: Service Layer

## H1: Notification API Service

### [NEW] `apps/web/src/services/notifications.ts`

| Micro-task | Mô tả |
|------------|--------|
| H1.1 | `fetchNotifications(cursor?, limit?)` → `GET /api/notifications` |
| H1.2 | `fetchUnreadCount()` → `GET /api/notifications/unread-count` |
| H1.3 | `markAsRead(notificationIds)` → `PATCH /api/notifications/read` |
| H1.4 | `markAllAsRead()` → `PATCH /api/notifications/read-all` |
| H1.5 | `fetchPreferences()` → `GET /api/notifications/preferences` |
| H1.6 | `updatePreferences(prefs)` → `PATCH /api/notifications/preferences` |
| H1.7 | `muteConversation(conversationId, until?)` → `POST /api/notifications/mute/:id` |
| H1.8 | `unmuteConversation(conversationId)` → `DELETE /api/notifications/mute/:id` |

---

## H2: Web Push Service

### [NEW] `apps/web/src/services/web-push.ts`

| Micro-task | Mô tả |
|------------|--------|
| H2.1 | `requestNotificationPermission()` → xin quyền Notification API browser |
| H2.2 | `getVapidKey()` → `GET /api/notifications/web-push/vapid-key` |
| H2.3 | `subscribeToPush()` → đăng ký Service Worker Push API + gửi subscription lên server |
| H2.4 | `unsubscribeFromPush()` → hủy đăng ký Push + gọi API unsubscribe |

---

## H3: Service Worker

### [NEW] `apps/web/public/sw.js`

| Micro-task | Mô tả |
|------------|--------|
| H3.1 | Listen `push` event → parse payload → hiển thị native notification |
| H3.2 | Listen `notificationclick` event → focus/open tab với deep link URL |
| H3.3 | Handle `pushsubscriptionchange` → auto re-subscribe |
| H3.4 | Notification options: icon (Zync logo), badge, vibration pattern |

---

# PART I – Web Client: State Management

## I1: Notification Hook (NEW – thiếu hoàn toàn trong plan cũ)

### [NEW] `apps/web/src/hooks/use-notifications.ts`

| Micro-task | Mô tả | Dependencies |
|------------|--------|--------------|
| I1.1 | State: `notifications[]`, `unreadCount`, `isLoading`, `hasMore` | H1 |
| I1.2 | `loadNotifications()` → fetch từ API, cursor pagination | H1 |
| I1.3 | `loadMore()` → fetch page tiếp theo | H1 |
| I1.4 | Subscribe Socket.IO event `new_notification` → prepend vào list + increment badge | G1 |
| I1.5 | `markRead(ids)` → optimistic update UI + call API | H1 |
| I1.6 | `markAllRead()` → optimistic update + call API | H1 |
| I1.7 | `refreshUnreadCount()` → poll unread count khi focus tab | H1 |
| I1.8 | **Notification sound**: Play sound khi nhận `new_notification` (nếu `enableSound` trong preferences) | H1 |
| I1.9 | Auto-request push permission khi user chưa bật | H2 |

---

# PART J – Web Client: UI Components

## J1: NotificationBell

### [NEW] `apps/web/src/components/home-dashboard/molecules/NotificationBell.tsx`

| Micro-task | Mô tả |
|------------|--------|
| J1.1 | Icon chuông (Lucide `Bell` icon) trên navbar dashboard |
| J1.2 | Badge đỏ hiển thị unread count (ẩn khi 0, hiện "99+" khi > 99) |
| J1.3 | Click toggle mở/đóng `NotificationPanel` dropdown |
| J1.4 | Animation pulse khi có notification mới |

---

## J2: NotificationPanel

### [NEW] `apps/web/src/components/home-dashboard/organisms/NotificationPanel.tsx`

| Micro-task | Mô tả |
|------------|--------|
| J2.1 | Dropdown panel hoặc slide-over panel |
| J2.2 | Header: "Thông báo" + nút "Đánh dấu tất cả đã đọc" |
| J2.3 | Notification item: avatar người gửi + message preview + timestamp relative ("2 phút trước") |
| J2.4 | Unread indicator: chấm xanh bên trái cho notification chưa đọc |
| J2.5 | Click notification → điều hướng đến conversation/friend request/story tương ứng |
| J2.6 | Infinite scroll (cursor pagination) khi cuộn xuống cuối |
| J2.7 | Empty state: "Không có thông báo nào" |
| J2.8 | Loading skeleton khi đang fetch |
| J2.9 | Click ngoài panel → đóng panel |

---

## J3: NotificationSettings

### [NEW] `apps/web/src/components/home-dashboard/organisms/NotificationSettings.tsx`

| Micro-task | Mô tả |
|------------|--------|
| J3.1 | Toggle bật/tắt push notification (master toggle) |
| J3.2 | Toggle âm thanh notification |
| J3.3 | Toggle badge count |
| J3.4 | Danh sách conversation đang mute + nút unmute cho từng conversation |
| J3.5 | Tích hợp vào settings page hoặc modal trong NotificationPanel |

---

## J4: Dashboard Integration (NEW – thiếu trong plan cũ)

### [MODIFY] `apps/web/src/components/home-dashboard/organisms/home-dashboard-screen.tsx`

| Micro-task | Mô tả |
|------------|--------|
| J4.1 | Thêm `NotificationBell` vào navbar (cạnh avatar/profile) |
| J4.2 | Render `NotificationPanel` khi bell được click |

### [MODIFY] `apps/web/src/app/home/page.tsx`

| Micro-task | Mô tả |
|------------|--------|
| J4.3 | Initialize `useNotifications()` hook |
| J4.4 | Pass notification state xuống dashboard components |
| J4.5 | Request push notification permission sau khi user đã đăng nhập |

---

# PART K – Configuration & Dependencies

## K1: Environment Variables

### [MODIFY] `.env.example`

| Micro-task | Mô tả |
|------------|--------|
| K1.1 | Thêm `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| K1.2 | Thêm `NEXT_PUBLIC_VAPID_PUBLIC_KEY` cho Next.js client |
| K1.3 | Thêm `GOOGLE_APPLICATION_CREDENTIALS` hoặc `FCM_SERVICE_ACCOUNT_JSON` |

```env
# ── Firebase Cloud Messaging ──
# Option 1: Path to service account JSON file
GOOGLE_APPLICATION_CREDENTIALS=
# Option 2: Inline JSON (for containerized environments)
FCM_SERVICE_ACCOUNT_JSON=

# ── Web Push (VAPID keys) ──
# Sinh bằng: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@zync.io

# ── Next.js (Web Push client) ──
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

---

## K2: Package Dependencies

### [MODIFY] `apps/server/package.json`

| Micro-task | Mô tả |
|------------|--------|
| K2.1 | Thêm `web-push` dependency |
| K2.2 | Thêm `@types/web-push` devDependency |
| K2.3 | `firebase-admin` đã có ✓ (v12.1.0) – không cần thêm |

---

## K3: Documentation

### [MODIFY] `project_structure.md`

| Micro-task | Mô tả |
|------------|--------|
| K3.1 | Thêm module `notifications` vào bảng module responsibilities |
| K3.2 | Thêm `notification_preferences`, `notifications` vào MongoDB collections |

### [MODIFY] `project_overview.md`

| Micro-task | Mô tả |
|------------|--------|
| K3.3 | Đánh dấu ✓ các Phase 7 items khi hoàn thành |

---

# PART L – Testing

## L1: Unit Tests

| Micro-task | Mô tả | File |
|------------|--------|------|
| L1.1 | Test `notifications.service.ts`: CRUD notification, cursor pagination | `tests/unit/notifications.service.test.ts` |
| L1.2 | Test mute/unmute logic: muted conversation → skip push | `tests/unit/notifications.service.test.ts` |
| L1.3 | Test preferences update: toggle push/sound/badge | `tests/unit/notifications.service.test.ts` |
| L1.4 | Test `fcm.ts`: unconfigured → no crash, configured → mock send | `tests/unit/fcm.test.ts` |
| L1.5 | Test `web-push.ts`: unconfigured → no crash, 410 → expired | `tests/unit/web-push.test.ts` |

---

## L2: Integration Tests

| Micro-task | Mô tả | File |
|------------|--------|------|
| L2.1 | Test notification REST endpoints (CRUD + pagination) | `tests/integration/notifications.routes.test.ts` |
| L2.2 | Test mute/unmute endpoints | `tests/integration/notifications.routes.test.ts` |
| L2.3 | Test Web Push subscribe/unsubscribe | `tests/integration/notifications.routes.test.ts` |
| L2.4 | Test worker: mock Kafka message → verify mute filtering + online skip + FCM mock | `tests/integration/notification.worker.test.ts` |
| L2.5 | Test full flow: `send_message` → Kafka produce → worker consume → FCM mock called | `tests/integration/notification.worker.test.ts` |
| L2.6 | Test expired token cleanup: FCM error → verify device token removed | `tests/integration/notification.worker.test.ts` |

---

## L3: Manual Verification

| # | Test case | Cách kiểm tra |
|---|-----------|---------------|
| L3.1 | Push notification khi offline | Chạy `npm run dev:server` → send message khi user offline → kiểm tra log FCM/Web Push |
| L3.2 | Kafka messages | Mở Redpanda UI (`http://localhost:8080`) → verify messages trên topic `notifications` |
| L3.3 | Badge count real-time | Web UI: gửi tin nhắn → kiểm tra badge tự tăng trên NotificationBell |
| L3.4 | Notification panel | Click chuông → danh sách notification hiển thị → click mark as read |
| L3.5 | Browser push permission | Cho phép notification → nhận push trên desktop |
| L3.6 | Mute conversation | Mute conversation → gửi tin nhắn → verify không nhận push |
| L3.7 | Debounce | Gửi 10 tin nhanh → verify chỉ nhận 1-2 push (grouped) |

---

# Execution Order (Dependency Graph)

Thứ tự triển khai tối ưu theo dependency:

```
Phase 1: Infrastructure (parallel)
├── A1: FCM init
├── A2: Web Push init
└── K2: Install dependencies

Phase 2: Data Layer (parallel, after Phase 1)
├── B1: NotificationPreference model
├── B2: Notification model (+ TTL index)
└── B3: DeviceToken model update

Phase 3: Business Logic (after Phase 2)
├── C1: Notification service
└── C2: Zod schemas

Phase 4: API Layer (after Phase 3)
├── D1: Notification controller
├── D2: Web Push controller
└── D3: Routes registration + app.ts

Phase 5: Worker (after Phase 3 + A1 + A2)
├── E1: Worker logic (full implementation)
└── E2: Worker lifecycle + main.ts

Phase 6: Event Producers (after C1, parallel)
├── F1: Gateway → message notifications
├── F2: Friends → friend notifications
├── F3: Groups → group notifications
└── F4: Stories → story notifications

Phase 7: Real-time (after E1)
└── G1: Socket event `new_notification`

Phase 8: Web Client Service (parallel with Phase 5-7)
├── H1: Notification API service
├── H2: Web Push service
└── H3: Service Worker

Phase 9: Web Client State (after H1 + G1)
└── I1: use-notifications hook

Phase 10: Web Client UI (after I1)
├── J1: NotificationBell
├── J2: NotificationPanel
├── J3: NotificationSettings
└── J4: Dashboard integration

Phase 11: Config & Docs (anytime)
├── K1: Environment variables
└── K3: Documentation

Phase 12: Testing (after all)
├── L1: Unit tests
├── L2: Integration tests
└── L3: Manual verification
```

---

# Checklist tổng hợp (73 micro-tasks)

## Infrastructure (8 tasks)
- [ ] A1.1 – Tạo `fcm.ts`, import firebase-admin
- [ ] A1.2 – Initialize Firebase Admin SDK từ env
- [ ] A1.3 – Export `sendFCMNotification()`
- [ ] A1.4 – Export `isFCMConfigured()`
- [ ] A1.5 – Fail-safe logging khi thiếu config
- [ ] A1.6 – Detect & return expired tokens
- [ ] A2.1 – Install `web-push` + `@types/web-push`
- [ ] A2.2–A2.7 – Tạo `web-push.ts` đầy đủ (init, send, fail-safe, expired detection)

## Data Layer (9 tasks)
- [ ] B1.1 – Tạo folder `modules/notifications/`
- [ ] B1.2–B1.4 – `NotificationPreference` model + index
- [ ] B2.1–B2.5 – `Notification` model + indexes + TTL 30 ngày
- [ ] B3.1–B3.4 – Mở rộng `DeviceTokenModel` cho Web Push

## Business Logic (16 tasks)
- [ ] C1.1 – `createNotification()`
- [ ] C1.2 – `produceNotificationEvent()`
- [ ] C1.3 – `getNotifications()` cursor pagination
- [ ] C1.4 – `markAsRead()` batch
- [ ] C1.5 – `markAllAsRead()`
- [ ] C1.6 – `getUnreadCount()`
- [ ] C1.7 – `isConversationMuted()`
- [ ] C1.8 – `muteConversation()`
- [ ] C1.9 – `unmuteConversation()`
- [ ] C1.10 – `getPreferences()`
- [ ] C1.11 – `updatePreferences()`
- [ ] C2.1 – `MarkReadSchema`
- [ ] C2.2 – `UpdatePreferencesSchema`
- [ ] C2.3 – `MuteConversationSchema`
- [ ] C2.4 – `WebPushSubscribeSchema`
- [ ] C2.5 – `GetNotificationsQuerySchema`

## API Layer (12 tasks)
- [ ] D1.1–D1.8 – 8 notification endpoints
- [ ] D2.1–D2.3 – 3 web push endpoints
- [ ] D3.1–D3.4 – Routes registration + app.ts

## Worker (15 tasks)
- [ ] E1.1–E1.13 – Full worker logic (parse, mute check, online check, debounce, save DB, emit socket, route push, clean tokens)
- [ ] E2.1–E2.2 – `stopNotificationWorker()`
- [ ] E2.3–E2.5 – main.ts integration

## Event Producers (6 tasks)
- [ ] F1.1–F1.3 – Gateway message notifications
- [ ] F2.1–F2.2 – Friends request/accept notifications
- [ ] F3.1 – Group invite notification
- [ ] F4.1–F4.2 – Story reaction/reply notifications

## Real-time (3 tasks)
- [ ] G1.1 – Export `emitNotification()` trong gateway
- [ ] G1.2 – Emit `new_notification` event
- [ ] G1.3 – Worker sử dụng emit function

## Web Client Service (10 tasks)
- [ ] H1.1–H1.8 – Notification API service (8 functions)
- [ ] H2.1–H2.4 – Web Push service (permission, subscribe, unsubscribe)
- [ ] H3.1–H3.4 – Service Worker

## Web Client State (9 tasks)
- [ ] I1.1–I1.9 – `use-notifications` hook (state, Socket.IO, sound, auto-permission)

## Web Client UI (14 tasks)
- [ ] J1.1–J1.4 – NotificationBell (icon, badge, toggle, animation)
- [ ] J2.1–J2.9 – NotificationPanel (dropdown, items, scroll, empty state)
- [ ] J3.1–J3.5 – NotificationSettings (toggles, mute list)
- [ ] J4.1–J4.5 – Dashboard integration

## Config (5 tasks)
- [ ] K1.1–K1.3 – Environment variables
- [ ] K2.1–K2.2 – Package dependencies
- [ ] K3.1–K3.3 – Documentation updates

## Testing (13 tasks)
- [ ] L1.1–L1.5 – Unit tests (service, FCM, Web Push)
- [ ] L2.1–L2.6 – Integration tests (routes, worker, full flow)
- [ ] L3.1–L3.7 – Manual verification

---

**Tổng cộng: ~73 micro-tasks, chia thành 12 execution phases.**

---

# PART M – Message Preview with Quick Reply (Enhancement)

> **Mục đích:** Khi user đang chat với user1, nếu user2 hoặc nhóm gửi tin nhắn → hiện floating preview popup với khả năng trả lời nhanh mà không cần rời cuộc hội thoại hiện tại.

## M1: Socket Service Extension

### [MODIFY] `apps/web/src/services/socket.ts`

| Micro-task | Mô tả | Status |
|------------|--------|--------|
| M1.1 | Thêm `sendQuickReply(conversationId, content, idempotencyKey)` – gửi tin nhắn qua socket đến bất kỳ conversation nào | ✅ Done |

## M2: Message Preview Hook

### [NEW] `apps/web/src/hooks/use-message-preview.ts`

| Micro-task | Mô tả | Status |
|------------|--------|--------|
| M2.1 | State quản lý `MessagePreviewItem[]` (max 3 preview, FIFO) | ✅ Done |
| M2.2 | Subscribe Socket.IO `new_notification` → filter `type === 'new_message'` | ✅ Done |
| M2.3 | Skip preview nếu `conversationId === selectedConversationId` (đang ở trong chat đó) | ✅ Done |
| M2.4 | Auto-dismiss sau 8 giây, pause khi hover, resume khi leave | ✅ Done |
| M2.5 | Lookup conversation data để lấy avatar, sender name, group flag | ✅ Done |
| M2.6 | `quickReply(conversationId, content)` → gọi `sendQuickReply` | ✅ Done |

## M3: Message Preview Popup Component

### [NEW] `apps/web/src/components/home-dashboard/organisms/MessagePreviewPopup.tsx`

| Micro-task | Mô tả | Status |
|------------|--------|--------|
| M3.1 | `PreviewCard` – glassmorphic card hiển thị avatar + tên + preview tin nhắn + thời gian | ✅ Done |
| M3.2 | Progress bar auto-dismiss (8s linear animation) | ✅ Done |
| M3.3 | Hover → pause timer, leave → resume | ✅ Done |
| M3.4 | Nút "Trả lời nhanh" → mở input inline | ✅ Done |
| M3.5 | Quick reply input: Enter gửi, Escape đóng | ✅ Done |
| M3.6 | Sent feedback: hiện checkmark "Đã gửi" rồi auto-dismiss | ✅ Done |
| M3.7 | Nút "Mở hội thoại" → navigate đến conversation + dismiss preview | ✅ Done |
| M3.8 | Click vào card body → navigate đến conversation | ✅ Done |
| M3.9 | Close button (hiện khi hover) | ✅ Done |
| M3.10 | Slide-in/slide-out animation | ✅ Done |
| M3.11 | Group badge icon cho tin nhắn nhóm | ✅ Done |
| M3.12 | Stacked layout (max 3, top-right corner) | ✅ Done |

## M4: Tailwind Animation Config

### [MODIFY] `apps/web/tailwind.config.js`

| Micro-task | Mô tả | Status |
|------------|--------|--------|
| M4.1 | `preview-slide-in` keyframe + animation | ✅ Done |
| M4.2 | `preview-slide-out` keyframe + animation | ✅ Done |
| M4.3 | `preview-progress` keyframe (8s linear width 100%→0%) | ✅ Done |

## M5: Dashboard Integration

### [MODIFY] `apps/web/src/app/home/page.tsx`

| Micro-task | Mô tả | Status |
|------------|--------|--------|
| M5.1 | Import `useMessagePreview` hook + `MessagePreviewPopup` component | ✅ Done |
| M5.2 | Initialize hook với `selectedConversationId` + `conversations` | ✅ Done |
| M5.3 | Render `MessagePreviewPopup` với navigation callback → switch tab chat + select conversation | ✅ Done |
