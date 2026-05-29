# 00. Project Summary

## Tên dự án

**Zync Platform** (`zync-platform`).

Mô tả trong `package.json` và `README.md`: nền tảng nhắn tin thời gian thực kiểu Zalo Clone. Theo code hiện tại, dự án đã mở rộng thành mạng giao tiếp cho developer với chat, bạn bè, nhóm/kênh, community posts, gọi WebRTC, notification và AI assistant/catch-up.

Đường dẫn chính:

- `package.json`
- `README.md`
- `apps/server/src`
- `apps/web/src`
- `apps/mobile`
- `packages/shared-types/src/index.ts`
- `infra/docker-compose.yml`

## Mục tiêu sản phẩm

- Nhắn tin realtime 1-1 và group.
- Quản lý bạn bè, hồ sơ developer, khám phá người dùng/kênh.
- Community feed dạng bài viết/comment.
- Gọi audio/video qua WebRTC.
- Notification in-app, web push, mobile push.
- AI features: catch-up digest, assistant inbox, reminder/task, semantic search, group notes, moderation.

Đối tượng người dùng được suy ra từ code: developer/student/mentor/recruiter/other, vì `UserModel` có `devRole`, `skills`, `interests` và màn hình onboarding developer profile.

## Stack chính

| Lớp | Stack | File liên quan |
| --- | --- | --- |
| Monorepo | npm workspaces | `package.json` |
| Backend | Node.js, Express, TypeScript | `apps/server/src/app.ts`, `apps/server/src/main.ts` |
| Realtime | Socket.IO + Redis adapter | `apps/server/src/socket/gateway.ts` |
| Database chính | MongoDB + Mongoose | `apps/server/src/infrastructure/database.ts`, `apps/server/src/modules/**/*.model.ts` |
| Cache/presence/rate limit | Redis/ioredis | `apps/server/src/infrastructure/redis.ts` |
| Queue/worker | KafkaJS, Redpanda local | `apps/server/src/infrastructure/kafka.ts`, `apps/server/src/workers/*`, `infra/docker-compose.yml` |
| Web | Next.js 14 App Router, React 18, Tailwind, Zustand | `apps/web/src/app`, `apps/web/src/services`, `apps/web/tailwind.config.js` |
| Mobile | Expo Router, React Native, React 19, Zustand | `apps/mobile/app`, `apps/mobile/src/services`, `apps/mobile/src/store` |
| Storage | Cloudinary signed direct upload | `apps/server/src/modules/upload`, `apps/web/src/services/upload.ts` |
| Push | Firebase Admin/FCM, Web Push | `apps/server/src/infrastructure/fcm.ts`, `apps/server/src/infrastructure/web-push.ts` |
| Email OTP | SMTP/Nodemailer hoặc Resend | `apps/server/src/modules/auth/otp.service.ts` |
| AI | Gemini/OpenRouter providers, Neon pgvector | `apps/server/src/modules/ai`, `apps/server/src/infrastructure/neon.ts` |
| TURN | coturn local | `infra/docker-compose.yml`, `.env.example` |

## Kiến trúc tổng quan

Backend là modular monolith: các module nằm trong `apps/server/src/modules/*`, route được mount tập trung tại `apps/server/src/app.ts`. Socket gateway nằm ở `apps/server/src/socket/gateway.ts` và delegate sang `chat.controller.ts`, `reaction.controller.ts`, `call.controller.ts`.

Dữ liệu realtime:

- Socket auth bằng JWT trong `handshake.auth.token`.
- User join room `user:{userId}`.
- Conversation join room `conv:{conversationId}` sau khi kiểm tra membership.
- Redis adapter đồng bộ event khi chạy nhiều instance.

Async processing:

- Kafka topics trong `apps/server/src/infrastructure/kafka.ts`.
- Message worker ghi message batch từ topic `raw-messages`.
- Notification worker xử lý topic `notifications`.
- AI workers dùng `message-embeddings` và `ai-catchup-jobs`.

## Cách chạy local

Theo `README.md`, `.env.example`, `package.json`:

```bash
npm install
npm run docker:up
npm run dev:server
npm run dev:web
npm run dev:mobile
```

LAN demo:

```bash
npm run dev:server:lan
npm run dev:web:lan
npm run dev:mobile:lan
```

Health check:

```bash
curl http://localhost:3000/health
```

## Scripts quan trọng

Root `package.json`:

| Script | Ý nghĩa |
| --- | --- |
| `npm run dev:server` | chạy backend watch mode |
| `npm run dev:web` | chạy Next.js port `3001` |
| `npm run dev:mobile` | chạy Expo dev client |
| `npm run docker:up` | chạy Redis, Redpanda, Redpanda Console, coturn |
| `npm run build` | build all workspaces |
| `npm run test` | chạy tests all workspaces nếu có |
| `npm run lint` | chạy lint all workspaces nếu có |
| `npm run typecheck` | typecheck all workspaces nếu có |

Server `apps/server/package.json`:

- `npm run dev --workspace=apps/server`
- `npm run build --workspace=apps/server`
- `npm run test --workspace=apps/server`
- `npm run typecheck --workspace=apps/server`
- `npm run seed:stickers --workspace=apps/server`
- `npm run seed:friends:test --workspace=apps/server`
- `npm run reset:data --workspace=apps/server`

Web `apps/web/package.json`:

- `npm run dev --workspace=apps/web`
- `npm run build --workspace=apps/web`
- `npm run typecheck --workspace=apps/web`

Mobile `apps/mobile/package.json`:

- `npm run start --workspace=apps/mobile`
- `npm run start:lan --workspace=apps/mobile`
- `npm run android --workspace=apps/mobile`
- `npm run ios --workspace=apps/mobile`
- `npm run typecheck --workspace=apps/mobile`

## Biến môi trường quan trọng

Nguồn: `.env.example`. Không đọc giá trị thật trong `.env` để tránh ghi secrets vào tài liệu.

| Nhóm | Biến |
| --- | --- |
| App | `NODE_ENV`, `PORT`, `HOST`, `CORS_ORIGINS` |
| MongoDB | `MONGODB_URI` |
| Redis | `REDIS_URL` |
| Kafka | `KAFKA_BROKERS`, `KAFKA_GROUP_ID`, `KAFKA_ENABLED` |
| JWT | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY` |
| OTP | `OTP_HARDCODE`, `OTP_HARDCODE_VALUE`, `OTP_RATE_LIMIT_MAX`, `OTP_RATE_LIMIT_WINDOW_SECONDS` |
| Email | `OTP_EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `RESEND_API_KEY` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET`, `STICKER_CDN_URL` |
| Push | `GOOGLE_APPLICATION_CREDENTIALS`, `FCM_SERVICE_ACCOUNT_JSON`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| Web | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| Mobile | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SOCKET_URL` được code mobile hỗ trợ qua `process.env` |
| TURN/WebRTC | `TURN_REALM`, `TURN_USERNAME`, `TURN_PASSWORD`, `TURN_URLS`, `NEXT_PUBLIC_TURN_*`, `CALL_EPHEMERAL_TOKEN_*`, `CALL_RING_TIMEOUT_MS` |
| OAuth | `GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| AI | `AI_PROVIDER`, `GEMINI_API_KEY`, `AI_MODEL_PRIMARY`, `AI_MODEL_FALLBACK`, `OPENROUTER_*`, `AI_EMBEDDING_MODEL`, `AI_RATE_LIMIT_PER_MINUTE`, `AI_MODERATION_ENABLED`, `AI_ASSISTANT_ENABLED`, `AI_SEARCH_ENABLED`, `NEON_DATABASE_URL` |

## Điểm chưa xác định từ codebase

- Production deployment target cụ thể chưa xác định từ codebase.
- CI/CD chi tiết chưa thấy trong phần đã đọc ngoài thư mục `.github`.
- Stories module không có route/model riêng trong `apps/server/src/modules`.
