# Project Structure – Zalo Clone

**Kiến trúc:** Scaled Modular Monolith  
**Stack:** Node.js + Socket.IO + MongoDB + Redis + Kafka | Next.js + React Native

---

## Sơ đồ thư mục

```
zync-platform/
├── apps/
│   ├── server/                   # Backend: REST API + WebSocket server
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/         # Module xác thực & JWT
│   │   │   │   ├── users/        # Quản lý user profile, device tokens
│   │   │   │   ├── friends/      # Kết bạn, chặn, danh bạ
│   │   │   │   ├── groups/       # Quản lý nhóm, thành viên, phân quyền
│   │   │   │   ├── conversations/# Hội thoại 1-1 và nhóm
│   │   │   │   ├── messages/     # Tin nhắn, media, idempotency
│   │   │   │   ├── stories/      # Story 24h
│   │   │   │   ├── notifications/ # Push notification, preferences
│   │   │   │   ├── ai/           # AI foundation + moderation (moderation/, guards/, fallback/, embeddings/)
│   │   │   │   └── upload/       # Cấp pre-signed URL upload media
│   │   │   ├── socket/           # Socket.IO gateway & event handlers
│   │   │   │   ├── gateway.ts
│   │   │   ├── workers/          # Kafka consumers
│   │   │   │   ├── message.worker.ts
│   │   │   │   └── notification.worker.ts
│   │   │   ├── infrastructure/   # Kết nối DB, Redis, Kafka
│   │   │   │   ├── database.ts   # MongoDB connection (Mongoose)
│   │   │   │   ├── redis.ts      # Redis client
│   │   │   │   ├── kafka.ts      # Kafka producer/consumer setup
│   │   │   │   ├── fcm.ts        # Firebase Cloud Messaging
│   │   │   │   ├── web-push.ts   # Web Push API (VAPID)
│   │   │   │   ├── gemini.ts     # Gemini model clients/config
│   │   │   │   └── neon.ts       # Neon + pgvector migration/client
│   │   │   ├── shared/           # Utilities, constants, types dùng chung
│   │   │   │   ├── errors/
│   │   │   │   ├── logger.ts
│   │   │   │   └── middleware/   # Rate limiter, validation, auth guard
│   │   │   └── main.ts           # Entry point
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── load/             # Artillery/K6 scripts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web/                      # Next.js web application
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/              # App Router pages
│   │   │   │   ├── auth/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── friends/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── home/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── globals.css
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/       # Atomic Design components
│   │   │   │   ├── auth/
│   │   │   │   │   └── login/
│   │   │   │   ├── friends/
│   │   │   │   │   ├── atoms/
│   │   │   │   │   ├── molecules/
│   │   │   │   │   ├── organisms/
│   │   │   │   │   └── friends.types.ts
│   │   │   │   ├── home/
│   │   │   │   │   ├── atoms/
│   │   │   │   │   ├── molecules/
│   │   │   │   │   ├── organisms/
│   │   │   │   │   ├── home.types.ts
│   │   │   │   │   └── mockData.ts
│   │   │   │   ├── home-dashboard/
│   │   │   │       ├── atoms/
│   │   │   │       ├── molecules/
│   │   │   │       ├── organisms/
│   │   │   │       ├── home-dashboard.types.ts
│   │   │   │       └── mock-data.ts
│   │   │   │   └── stories/
│   │   │   ├── hooks/
│   │   │   │   ├── use-friends-dashboard.ts
│   │   │   │   ├── use-home-dashboard.ts
│   │   │   │   ├── use-stories.ts
│   │   │   │   ├── use-notifications.ts
│   │   │   │   └── use-login-form.ts
│   │   │   └── services/
│   │   │       ├── api.ts
│   │   │       ├── auth.ts
│   │   │       ├── friends.ts
│   │   │       ├── stories.ts
│   │   │       ├── notifications.ts
│   │   │       ├── web-push.ts
│   │   │       └── socket.ts
│   │   ├── next-env.d.ts
│   │   ├── next.config.mjs
│   │   └── package.json
│   │
│   └── mobile/                   # React Native application
│       ├── app/                  # Expo Router screens
│       │   ├── (auth)/
│       │   ├── (tabs)/
│       │   ├── chat-room.tsx
│       │   └── _layout.tsx
│       ├── src/
│       │   ├── services/
│       │   ├── store/
│       │   ├── hooks/
│       │   ├── components/
│       │   ├── theme/
│       │   └── ui/
│       └── package.json
│
├── packages/
│   └── shared-types/             # TypeScript types dùng chung server+client
│
├── infra/
│   ├── docker-compose.yml        # Local dev: chỉ Redis + Redpanda (~155MB RAM tổng)
│
├── docs/
│   └── designs/
│
├── project_overview.md                     # Thông tin & Roadmap dự án
└── project_structure.md          # File này
```

---

## Trách nhiệm từng module (Server)

| Module | Trách nhiệm | Collections MongoDB |
|--------|-------------|-------------------|
| `auth` | Đăng ký, OTP, JWT issue/revoke, logout | - (dùng Redis cho OTP/blacklist) |
| `users` | Profile, device tokens | `users`, `device_tokens` |
| `friends` | Kết bạn, chặn, danh sách bạn | `friendships` |
| `groups` | CRUD nhóm, quản lý thành viên | `conversations`, `conversation_members` |
| `conversations` | Danh sách hội thoại, unread count | `conversations`, `conversation_members` |
| `messages` | Gửi/nhận tin nhắn, media, idempotency | `messages`, `message_status` |
| `stories` | CRUD story 24h, viewers | `stories` |
| `notifications` | Push notification, preferences, mute/unmute | `notifications`, `notification_preferences` |
| `ai` | Moderation, guard prompt injection, model fallback, embedding/vector services | `moderation_logs` + Neon pgvector tables |
| `upload` | Cấp pre-signed URL upload media | - (gọi Cloudinary) |

---

## Entry Points

| Entry Point | File | Mô tả |
|-------------|------|-------|
| HTTP Server | `apps/server/src/main.ts` | Khởi động Express + Socket.IO |
| Socket Gateway | `apps/server/src/socket/gateway.ts` | Đăng ký tất cả socket event handlers |
| Kafka Worker | `apps/server/src/workers/message.worker.ts` | Consumer Kafka topic `raw-messages` |
| Notification Worker | `apps/server/src/workers/notification.worker.ts` | Consumer Kafka topic `notifications` |
| Moderation Worker | `apps/server/src/modules/ai/moderation/moderation.worker.ts` | Worker moderation async (AI-1) |
| AI Router | `apps/server/src/modules/ai/ai.routes.ts` | AI health route + placeholder AI endpoints |
| Web App | `apps/web/src/app/page.tsx` | Next.js root page |

---

## Vị trí Config & Script

| Loại | Đường dẫn |
|------|-----------|
| Biến môi trường | `.env` (từ `.env.example`) |
| Docker local | `infra/docker-compose.yml` |
| CI/CD | `.github/workflows/` |
| Load test | `apps/server/tests/load/` |
| Seed data | `apps/server/scripts/seed.ts` |
| Seed data QA (friends/chat/group) | `apps/server/scripts/seed-friend-test-data.ts` |


---

## Kiến trúc luồng tin nhắn

```
Client A
  │
  ├─[WebSocket send_message]──► Chat Server
  │                                  │
  │                          ┌───────┴────────┐
  │                    Redis Pub/Sub      Kafka Producer
  │                          │            (raw-messages)
  │                          │                │
  │                   Broadcast đến     Kafka Consumer
  │                   Server khác         (Worker)
  │                          │                │
  │                          │         Batch Insert
  │                          │         MongoDB
  │                          │                │
  │                   Chat Server B    Push Notification
  │                          │         (nếu offline)
  ▼                          ▼
Client A ◄─[message_sent]   Client B ◄─[receive_message]
```

---

## Redis Key Schema

| Key Pattern | Kiểu | TTL | Mục đích |
|-------------|------|-----|---------|
| `user:{userId}:conversations` | String (JSON) | 5 phút | Cache danh sách hội thoại |
| `online_users` | Hash (userId → timestamp) | không TTL field | Presence realtime theo kết nối socket |
| `presence:lastSeen:{userId}` | String | chưa áp dụng (planned) | Last seen cho offline presence API/UI |
| `typing:{convId}:{userId}` | String | 3 giây | Typing indicator |
| `idempotency:{key}` | String | 5 phút | Chống gửi trùng tin nhắn |
| `friends:{userId}` | String (JSON) | 10 phút | Cache danh sách bạn bè |
| `otp:{email}` | String | 5 phút | OTP verification |
| `otp_rl:ip:{ip}` | String | 1 giờ | Rate limit OTP theo IP |
| `otp_rl:id:{identifier}` | String | 1 giờ | Rate limit OTP theo email |
| `blacklist:token:{jti}` | String | = token expiry | JWT revocation |
| `notif_debounce:{userId}:{convId}` | String | 30 giây | Debounce push notification |
| `ai_rate:{userId}` | Sorted Set | 61 giây | Sliding-window rate limit cho AI requests |
| `embed:{taskType}:{slug}` | String (JSON vector) | 30 phút | Cache embedding query/document |

---

## Auth API Contract

### Public Endpoints
| Method | Endpoint | Mô tả |
|--------|----------|------|
| POST | `/api/auth/register` | Gửi OTP đăng ký tới email (kèm `username` duy nhất) |
| POST | `/api/auth/verify-otp` | Xác thực OTP đăng ký theo email, tạo tài khoản mới (`username` + `displayName`) và trả JWT |
| POST | `/api/auth/login-password/request-otp` | Kiểm tra email + password hợp lệ, gửi OTP đăng nhập |
| POST | `/api/auth/login-password/verify-otp` | Xác thực OTP đăng nhập (email + password + OTP), trả JWT |
| POST | `/api/auth/forgot-password/request-otp` | Gửi OTP khôi phục mật khẩu theo email |
| POST | `/api/auth/forgot-password/reset` | Xác thực OTP khôi phục theo email và cập nhật mật khẩu mới |
| POST | `/api/auth/google` | Đăng nhập bằng Google ID token |
| POST | `/api/auth/refresh` | Cấp lại access token từ refresh token cookie |
| POST | `/api/auth/logout` | Thu hồi phiên hiện tại, blacklist access token |

### Quy tắc nghiệp vụ chính
- Đăng nhập tài khoản nội bộ bắt buộc đi qua luồng Email + Password + OTP.
- Luồng OTP-only không dùng cho user đã tồn tại.
- Username là định danh duy nhất song song với email và có thể cập nhật qua `PATCH /api/users/me`.
- Tạm thời cho phép OTP hardcode ở môi trường non-production (`OTP_HARDCODE=true`) để dev nhanh; production phải gửi OTP thực qua SMTP email provider.

---

## Socket.IO Events Contract

### Client → Server
| Event | Payload | Mô tả |
|-------|---------|-------|
| `join_conversation` | `{conversationId}` | Join room conversation hợp lệ theo membership |
| `leave_conversation` | `{conversationId}` | Leave room conversation |
| `send_message` | `{conversationId, content?, type, mediaUrl?, idempotencyKey}` | Gửi tin nhắn (`type`: `text`/`image`/`video`/`audio`/`file`/`sticker`) |
| `message_read` | `{conversationId, messageIds[]}` | Báo đã đọc |
| `typing_start` | `{conversationId}` | Bắt đầu gõ |
| `typing_stop` | `{conversationId}` | Dừng gõ |

### Server → Client
| Event | Payload | Mô tả |
|-------|---------|-------|
| `receive_message` | `{messageId, senderId, content, type, mediaUrl, createdAt}` | Nhận tin nhắn |
| `status_update` | `{messageId, status, userId}` | Cập nhật trạng thái tin nhắn |
| `typing_indicator` | `{userId, conversationId, isTyping}` | Broadcast typing |
| `user_online` | `{userId, online, lastSeen}` | Trạng thái online |
| `new_notification` | `{type, title, body, ...}` | Thông báo realtime toàn cục |
| `friend_request` | `{requestId, fromUserId, createdAt}` | Lời mời kết bạn mới |
| `group_updated` | `{groupId, type, data}` | Cập nhật nhóm |
| `content_blocked` | `{messageId, conversationId, reason, confidence}` | Báo tin nhắn bị chặn bởi moderation |
| `content_warning` | `{conversationId, messageId?, message}` | Nhắc nhở nội dung nhạy cảm và cảnh báo vi phạm |
| `reaction_updated` | `{requestId, conversationId, messageRef, ...}` | Event reaction realtime chuẩn mới cho Web/Mobile |
| `message_reacted` | `{messageId, conversationId, reactionType, userId, actionType, reactions[]}` | Cập nhật reaction realtime |
| `user_penalty_updated` | `{conversationId, penaltyScore, mutedUntil}` | Đồng bộ điểm vi phạm/mute của user theo conversation |
| `story_reaction` | `{storyId, userId, reactionType, displayName}` | Realtime reaction cho story owner |
| `story_reply` | `{storyId, senderId, content, displayName}` | Realtime reply story về DM + notify |

---

## Health & AI Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|------|
| GET | `/health` | Liveness cơ bản của server process |
| GET | `/api/ai/health` | Trạng thái cấu hình AI (Gemini/Neon/toggles) |

---

## Upload API Contract

| Method | Endpoint | Payload | Mô tả |
|--------|----------|---------|-------|
| POST | `/api/upload/sign` | `{folder}` | Cấp chữ ký upload tương thích luồng stories/profile cũ |
| POST | `/api/upload/generate-signature` | `{type}` (`image`/`video`/`document`) | Cấp chữ ký upload cho chat/media flow |
| POST | `/api/upload/verify` | `{publicId, type}` (`image`/`video`/`document`) | Xác minh upload thành công và trả URL an toàn |
| DELETE | `/api/upload/:publicId` | - | Xóa file upload theo quyền sở hữu user |

---

## MongoDB Collections & Index Summary

| Collection | Indexes quan trọng |
|------------|-------------------|
| `users` | `email` (unique), `username` (unique sparse) |
| `device_tokens` | `deviceToken` (unique), `userId` |
| `friendships` | `{userId, friendId}` (unique), `status` |
| `conversations` | `unreadCounts.userId` (multikey), `lastMessage.sentAt`, `updatedAt` |
| `conversation_members` | `{conversationId, userId}` (unique), `userId`, fields moderation: `penaltyScore`, `penaltyWindowStartedAt`, `mutedUntil` |
| `messages` | `{conversationId, createdAt: -1}`, `idempotencyKey` (unique, TTL 24h) |
| `message_status` | `{messageId, userId}` (unique), `{messageId, status}` |
| `stories` | `expiresAt` (TTL index – tự xóa sau 24h), `userId` |
| `notifications` | `{userId, createdAt: -1}`, `{userId, read}`, `createdAt` (TTL 30 ngày) |
| `notification_preferences` | `userId` (unique) |
| `moderation_logs` | `{messageId, createdAt}`, `{reporterId, createdAt}`, `{status, createdAt}` |

---

## Công nghệ & Dependencies chính

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js + Socket.IO |
| Database | MongoDB 7 (Mongoose ODM) |
| Vector Database | Neon PostgreSQL + pgvector |
| Cache / Pub-Sub | Redis 7 (ioredis) |
| Message Queue | Apache Kafka (kafkajs) |
| LLM / Embedding | Google Gemini (2.5 Pro/Flash + text-embedding-004) |
| Web Frontend | Next.js 14 (App Router) |
| Mobile | React Native (Expo) |
| Testing | Jest, React Testing Library, Artillery/K6 |
| Containerization | Docker, Kubernetes, Helm |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus, Grafana, ELK Stack |
| OTP Delivery | Email provider (Resend API / SMTP, dev có thể dùng OTP hardcode) |
| Email | Resend (SMTP relay: smtp.resend.com:587) |
| Push Notification | FCM (Android/Web), APNs (iOS) |
| Media Storage | Cloudinary (free 25 credits/tháng, CDN + image transformation, giữ nguyên lên production) |
| Message Broker (local) | Redpanda (Kafka-compatible, no ZK, ~150MB) |
| Message Broker (production) | Upstash Kafka (SASL/SSL, pay-as-you-go) |
| Cache / Pub-Sub (local) | Redis 7 Alpine (~5MB, Docker) |
| Cache / Pub-Sub (production) | Upstash Redis (TLS, pay-as-you-go) |

---

## UI Parity Rules (Web + Mobile)

Để giữ UI đồng bộ giữa `apps/web` và `apps/mobile`, áp dụng bắt buộc các quy tắc sau:

1. **Design tokens là nguồn chuẩn duy nhất**
  - Web dùng CSS variables trong `apps/web/src/app/globals.css`.
  - Mobile dùng theme tokens trong `apps/mobile/src/theme/colors.ts`.
  - Không hardcode màu, opacity, blur trong component khi token tương đương đã tồn tại.

2. **Parity theo cấp Atomic Design**
  - Với mỗi Atom hoặc Molecule quan trọng ở Web (button, input, card, panel), phải có bản tương đương ở Mobile (`src/ui/` hoặc `src/components/`).
  - UI component chỉ nhận dữ liệu qua props; logic API hoặc Socket đặt ở Screen/Page hoặc custom hook.

3. **Mapping trạng thái UI đồng nhất**
  - Mỗi feature phải có cùng tập trạng thái `loading`, `empty`, `error`, `default` trên cả 2 nền tảng.
  - Text trạng thái hiển thị cho người dùng dùng tiếng Việt tự nhiên và nhất quán ngữ nghĩa.

4. **Contract hiển thị dùng chung**
  - Type dữ liệu hiển thị ưu tiên lấy từ `packages/shared-types` hoặc contract service thống nhất.
  - Tránh việc mỗi nền tảng tự suy diễn field khác nhau cho cùng một entity.

5. **QC parity trước khi merge**
  - So sánh ảnh chụp Web và Mobile cho cùng một luồng chính.
  - Kiểm tra tương phản chữ trên nền glass để đảm bảo readability.
  - Kiểm tra responsive Web và các kích thước màn hình mobile phổ biến.
