# 12. AI Handoff Summary

## Dự án này là gì

Zync Platform là monorepo TypeScript cho nền tảng nhắn tin realtime kiểu Zalo Clone, mở rộng cho cộng đồng developer: chat 1-1/group, friends, public channels, community posts/comments, notification, WebRTC calls và AI assistant/catch-up/search/moderation.

## Kiến trúc chính

- Backend: Express modular monolith trong `apps/server`.
- Realtime: Socket.IO + Redis adapter.
- Database chính: MongoDB/Mongoose.
- Cache/presence/rate limit: Redis.
- Async jobs: KafkaJS + Redpanda local.
- AI vector search: Neon PostgreSQL + pgvector.
- Web: Next.js App Router.
- Mobile: Expo Router/React Native.
- Shared contracts: `packages/shared-types`.

## Các module chính

- Auth/users/friends/groups/conversations/messages/upload/notifications/calls/stickers/posts/AI.
- AI gồm catchup digest, reminders/tasks, assistant inbox, semantic search, group notes, moderation.
- Stories chưa thấy trong codebase.

## Luồng nghiệp vụ chính

- Auth: register/login OTP -> JWT access + refresh -> REST Bearer/cookie -> refresh/logout blacklist Redis.
- Chat: socket `send_message` -> membership/rate/idempotency -> Kafka raw-messages hoặc fallback -> Mongo Message/Status -> `receive_message`/`status_update`.
- Upload: server ký Cloudinary -> client upload trực tiếp -> verify -> gửi message media.
- Notification: domain service produce Kafka `notifications` -> worker lưu Mongo + emit `new_notification` + FCM/Web Push.
- Call: socket invite/accept/reject/end + callToken -> WebRTC offer/answer/ICE relay -> call history message.
- AI: message embeddings -> Neon; catchup/group note jobs -> AI provider -> Mongo AI models -> `ai_*_updated`.

## 10 file quan trọng nên đọc trước

1. `apps/server/src/app.ts`
2. `apps/server/src/main.ts`
3. `apps/server/src/socket/gateway.ts`
4. `apps/server/src/socket/chat.controller.ts`
5. `apps/server/src/socket/call.controller.ts`
6. `apps/server/src/modules/messages/messages.service.ts`
7. `apps/server/src/modules/conversations/conversations.service.ts`
8. `apps/web/src/services/socket.ts`
9. `apps/mobile/src/services/socket.ts`
10. `packages/shared-types/src/index.ts`

## Nguyên tắc khi sửa code

- Đọc route/service/model hiện tại trước khi sửa.
- Giữ contract REST/socket tương thích Web và Mobile.
- Static routes phải đặt trước dynamic routes.
- Thêm Zod schema cho endpoint mới.
- Với socket event mới, cập nhật server + web + mobile + shared types.
- Không ghi secrets từ `.env` vào docs/code.
- Với AI/Kafka/Redis, verify fallback khi service external thiếu config.

## Vùng code rủi ro cao

- Chat realtime/idempotency/status/reaction: `messages.service.ts`, `chat.controller.ts`, `reaction.controller.ts`.
- Call/WebRTC: `calls.service.ts`, `call.controller.ts`, Web/Mobile call UI.
- AI assistant service rất lớn: `apps/server/src/modules/ai/assistant/assistant.service.ts`.
- Gateway legacy/duplicate code: `apps/server/src/socket/gateway.ts`.
- Auth token storage/refresh: `apps/web/src/services/api.ts`, `apps/mobile/src/services/api.ts`.
- Route ordering: `users.routes.ts`, `messages.routes.ts`.

## Việc đã hoàn thành theo code

- Auth OTP/password/Google/refresh/logout.
- User profile/onboarding/settings.
- Friends request/block/list/count.
- Direct/group conversations.
- Realtime chat, media/sticker, reply, read/delivered, delete/recall/forward.
- Reactions with socket contract mới.
- Cloudinary signed upload.
- Notifications with preferences, mute/pin, web push/mobile token support.
- WebRTC call signaling and call history.
- Community posts/comments.
- AI catchup, reminders/tasks, assistant inbox, semantic search, group notes, moderation logs/service.

## Việc còn lại/rủi ro

- Stories chưa có.
- Conversation detail endpoint trả 501.
- Moderation admin route chưa mount và thiếu RBAC.
- Mobile AI assistant parity chưa rõ.
- Group call gọi là `sfu` nhưng không thấy SFU infra.
- Posts thiếu Zod validation.
- Web socket listener registry có thể ghi đè listener.

## Cách AI nên tiếp cận khi nhận bug/tính năng

1. Xác định domain module và đọc `routes/controller/service/model/schema`.
2. Kiểm tra client Web/Mobile service đang gọi contract thế nào.
3. Nếu liên quan socket, đọc cả server socket controller và hai client socket service.
4. Nếu liên quan data consistency, đọc model indexes và Redis/Kafka keys.
5. Sửa nhỏ, thêm/điều chỉnh test đúng tầng.
6. Chạy typecheck/test workspace liên quan.
7. Cập nhật docs contract nếu đổi API/socket/model.
