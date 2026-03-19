# Project Structure – Zalo Clone

**Kiến trúc:** Scaled Modular Monolith  
**Stack:** Node.js + Socket.IO + MongoDB + Redis + Kafka | Next.js + React Native

---

## Sơ đồ thư mục

```
zalo-clone/
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
│   │   │   │   ├── presence/     # Online/offline, typing indicator
│   │   │   │   ├── stories/      # Story 24h
│   │   │   │   └── notifications/# Push notification (FCM/APNs)
│   │   │   ├── socket/           # Socket.IO gateway & event handlers
│   │   │   │   ├── gateway.ts
│   │   │   │   ├── events/       # Từng event handler (send_message, typing, v.v.)
│   │   │   │   └── middleware/   # Auth middleware cho socket
│   │   │   ├── workers/          # Kafka consumers
│   │   │   │   ├── message.worker.ts
│   │   │   │   └── notification.worker.ts
│   │   │   ├── infrastructure/   # Kết nối DB, Redis, Kafka
│   │   │   │   ├── database.ts   # MongoDB connection (Mongoose)
│   │   │   │   ├── redis.ts      # Redis client
│   │   │   │   └── kafka.ts      # Kafka producer/consumer setup
│   │   │   ├── shared/           # Utilities, constants, types dùng chung
│   │   │   │   ├── errors/
│   │   │   │   ├── middleware/   # Rate limiter, validation, auth guard
│   │   │   │   └── types/
│   │   │   └── main.ts           # Entry point
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── load/             # Artillery/K6 scripts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web/                      # Next.js web application
│   │   ├── src/
│   │   │   ├── app/              # Next.js App Router pages
│   │   │   ├── components/       # Reusable UI components
│   │   │   ├── hooks/            # Custom hooks (useSocket, usePresence, v.v.)
│   │   │   ├── store/            # State management (Zustand/Redux)
│   │   │   └── services/         # API calls, socket client
│   │   └── package.json
│   │
│   └── mobile/                   # React Native application
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── services/
│       └── package.json
│
├── packages/
│   └── shared-types/             # TypeScript types dùng chung server+client
│
├── infra/
│   ├── docker-compose.yml        # Local dev: chỉ Redis + Redpanda (~155MB RAM tổng)
│   ├── k8s/                      # Kubernetes manifests
│   │   ├── server-deployment.yaml
│   │   ├── worker-deployment.yaml
│   │   └── hpa.yaml              # Horizontal Pod Autoscaler
│   └── helm/                     # Helm chart cho production
│
├── .github/
│   ├── workflows/                # CI/CD (GitHub Actions)
│   │   ├── ci.yml
│   │   └── deploy.yml
│   ├── agents/
│   │   └── pipeline.agent.md     # Pipeline BA→DEV→QC agent
│   └── copilot-instructions.md   # Luật chơi cho Copilot
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
| `presence` | Online/offline, typing indicator | Redis only |
| `stories` | CRUD story 24h, viewers | `stories` |
| `notifications` | Push notification dispatch | - (gọi FCM/APNs) |

---

## Entry Points

| Entry Point | File | Mô tả |
|-------------|------|-------|
| HTTP Server | `apps/server/src/main.ts` | Khởi động Express + Socket.IO |
| Socket Gateway | `apps/server/src/socket/gateway.ts` | Đăng ký tất cả socket event handlers |
| Kafka Worker | `apps/server/src/workers/message.worker.ts` | Consumer Kafka topic `raw-messages` |
| Notification Worker | `apps/server/src/workers/notification.worker.ts` | Consumer Kafka topic `notifications` |
| Web App | `apps/web/src/app/page.tsx` | Next.js root page |

---

## Vị trí Config & Script

| Loại | Đường dẫn |
|------|-----------|
| Biến môi trường | `.env` (từ `.env.example`) |
| Docker local | `infra/docker-compose.yml` |
| Kubernetes | `infra/k8s/` |
| Helm chart | `infra/helm/` |
| CI/CD | `.github/workflows/` |
| Load test | `apps/server/tests/load/` |
| Seed data | `apps/server/scripts/seed.ts` |
| DB migration | `apps/server/scripts/migrate.ts` |

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
| `online_users` | Hash (userId → timestamp) | 30 giây/field | Presence tracking |
| `typing:{convId}:{userId}` | String | 3 giây | Typing indicator |
| `idempotency:{key}` | String | 5 phút | Chống gửi trùng tin nhắn |
| `friends:{userId}` | String (JSON) | 10 phút | Cache danh sách bạn bè |
| `otp:{phoneOrEmail}` | String | 5 phút | OTP verification |
| `otp_rl:ip:{ip}` | String | 1 giờ | Rate limit OTP theo IP |
| `otp_rl:id:{identifier}` | String | 1 giờ | Rate limit OTP theo SĐT/Email |
| `blacklist:token:{jti}` | String | = token expiry | JWT revocation |

---

## Auth API Contract

### Public Endpoints
| Method | Endpoint | Mô tả |
|--------|----------|------|
| POST | `/api/auth/register` | Gửi OTP đăng ký tới phone/email |
| POST | `/api/auth/verify-otp` | Xác thực OTP đăng ký, tạo tài khoản mới và trả JWT |
| POST | `/api/auth/login-password/request-otp` | Kiểm tra email + password hợp lệ, gửi OTP đăng nhập |
| POST | `/api/auth/login-password/verify-otp` | Xác thực OTP đăng nhập (email + password + OTP), trả JWT |
| POST | `/api/auth/forgot-password/request-otp` | Gửi OTP khôi phục mật khẩu theo email |
| POST | `/api/auth/forgot-password/reset` | Xác thực OTP khôi phục và cập nhật mật khẩu mới |
| POST | `/api/auth/google` | Đăng nhập bằng Google ID token |
| POST | `/api/auth/refresh` | Cấp lại access token từ refresh token cookie |
| POST | `/api/auth/logout` | Thu hồi phiên hiện tại, blacklist access token |

### Quy tắc nghiệp vụ chính
- Đăng nhập tài khoản nội bộ bắt buộc đi qua luồng Email + Password + OTP.
- Luồng OTP-only không dùng cho user đã tồn tại.
- OTP hardcode chỉ dùng trong test (`NODE_ENV=test`), các môi trường khác phải gửi OTP thực.

---

## Socket.IO Events Contract

### Client → Server
| Event | Payload | Mô tả |
|-------|---------|-------|
| `send_message` | `{conversationId, content, type, idempotencyKey}` | Gửi tin nhắn |
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
| `friend_request` | `{requestId, fromUserId, createdAt}` | Lời mời kết bạn mới |
| `group_updated` | `{groupId, type, data}` | Cập nhật nhóm |

---

## MongoDB Collections & Index Summary

| Collection | Indexes quan trọng |
|------------|-------------------|
| `users` | `phoneNumber` (unique), `email` (unique sparse) |
| `device_tokens` | `deviceToken` (unique), `userId` |
| `friendships` | `{userId, friendId}` (unique), `status` |
| `conversations` | `unreadCounts.userId` (multikey), `lastMessage.sentAt`, `updatedAt` |
| `conversation_members` | `{conversationId, userId}` (unique), `userId` |
| `messages` | `{conversationId, createdAt: -1}`, `idempotencyKey` (unique, TTL 24h) |
| `message_status` | `{messageId, userId}` (unique), `{messageId, status}` |
| `stories` | `expiresAt` (TTL index – tự xóa sau 24h), `userId` |

---

## Công nghệ & Dependencies chính

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js + Socket.IO |
| Database | MongoDB 7 (Mongoose ODM) |
| Cache / Pub-Sub | Redis 7 (ioredis) |
| Message Queue | Apache Kafka (kafkajs) |
| Web Frontend | Next.js 14 (App Router) |
| Mobile | React Native (Expo) |
| Testing | Jest, React Testing Library, Artillery/K6 |
| Containerization | Docker, Kubernetes, Helm |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus, Grafana, ELK Stack |
| SMS / OTP | Twilio (chỉ production, dev dùng OTP hardcode) |
| Email | Resend (SMTP relay: smtp.resend.com:587) |
| Push Notification | FCM (Android/Web), APNs (iOS) |
| Media Storage | Cloudinary (free 25 credits/tháng, CDN + image transformation, giữ nguyên lên production) |
| Message Broker (local) | Redpanda (Kafka-compatible, no ZK, ~150MB) |
| Message Broker (production) | Upstash Kafka (SASL/SSL, pay-as-you-go) |
| Cache / Pub-Sub (local) | Redis 7 Alpine (~5MB, Docker) |
| Cache / Pub-Sub (production) | Upstash Redis (TLS, pay-as-you-go) |
