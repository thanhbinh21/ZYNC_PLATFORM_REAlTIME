# 03. Backend Modules

## Tổng quan route mount

Nguồn: `apps/server/src/app.ts`.

| Base path | Router |
| --- | --- |
| `/api/auth` | `modules/auth/auth.routes.ts` |
| `/api/users` | `modules/users/users.routes.ts` |
| `/api/friends` | `modules/friends/friends.routes.ts` |
| `/api/groups` | `modules/groups/groups.routes.ts` |
| `/api/conversations` | `modules/conversations/conversations.routes.ts` |
| `/api/messages` | `modules/messages/messages.routes.ts` |
| `/api/upload` | `modules/upload/upload.routes.ts` |
| `/api/notifications` | `modules/notifications/notifications.routes.ts` |
| `/api/ai` | `modules/ai/ai.routes.ts` |
| `/api/calls` | `modules/calls/calls.routes.ts` |
| `/api/stickers` | `modules/stickers/sticker.routes.ts` |
| `/api/posts` | `modules/posts/posts.routes.ts` |

## Module table

| Module | Trách nhiệm | Controller/routes | Service | Model/schema | Middleware/validation | External dependencies | API endpoints | Socket events | Rủi ro/TODO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| auth | Register/login bằng OTP/password/Google, refresh/logout, change password, device token | `auth.routes.ts`, `auth.controller.ts` | `auth.service.ts`, `otp.service.ts` | `UserModel`, `DeviceTokenModel`, `auth.schema.ts` | `otpRateLimiter`, `validateBody`, `authenticate` cho change password | Redis OTP/blacklist, JWT, bcryptjs, SMTP/Resend, Google auth | `/register`, `/verify-otp`, `/login-password/*`, `/forgot-password/*`, `/google`, `/refresh`, `/current-token`, `/logout`, `/change-password` | Không trực tiếp | Access token được lưu cookie đọc được bởi JS trên web; cần review security. |
| users | Profile, search/discover user, account settings, presence query, device token | `users.routes.ts`, `users.controller.ts` | `users.service.ts`, `presence.service.ts` | `UserModel`, `DeviceTokenModel`, `users.schema.ts` | `authenticate`, `validateBody` | Redis presence/friends cache | `/me`, `/me/settings`, `/search`, `/discover`, `/:userId`, `/:userId/public-profile`, `/presence/bulk`, `/:userId/presence`, `/me/device-token` | `presence_changed` từ service/gateway | Route order có rủi ro: `/:userId` nằm trước `/presence/bulk`. |
| friends | Friend request, accept/reject, unfriend, block, list/count | `friends.routes.ts`, `friends.controller.ts` | `friends.service.ts` | `FriendshipModel`, `friends.schema.ts` | `authenticate`, `friendRequestRateLimiter`, `validateBody` | Redis friends cache, notification service | `/request`, `/request/:requestId/accept`, `/request/:requestId/reject`, `/:friendId`, `/:userId/block`, `/requests`, `/count`, `/` | Không thấy event riêng; notification qua worker | Có cleanup stale/orphaned records trong service, cho thấy data consistency từng gặp vấn đề. |
| groups | Group/channel CRUD, member/role approval, public channel discover/join | `groups.routes.ts`, `groups.controller.ts` | `groups.service.ts` | Reuse `ConversationModel`, `ConversationMemberModel`, `groups.schema.ts` | `authenticate`, `validateBody` | Notification service, Socket.IO | `/public`, `/discover`, `/`, `/:groupId`, `/:groupId/members`, `/:groupId/join`, role/approval/leave/delete | `group_updated`, `receive_message` system message | Group public có thể tạo với ít member; private yêu cầu >=2 selected members. |
| conversations | List conversations, direct conversation get/create | `conversations.routes.ts`, `conversations.controller.ts` | `conversations.service.ts` | `ConversationModel`, `ConversationMemberModel` | `authenticate` | Redis rate limit non-friend DM | `/`, `/direct`, `/:conversationId` | `conversation_active_call_updated` khi join room | `GET /api/conversations/:conversationId` trả 501 Not implemented. |
| messages | Send/history/status/read/reactions/delete/recall/forward | `messages.routes.ts`, `messages.controller.ts` | `messages.service.ts`, `message-reaction.service.ts` | `MessageModel`, `MessageStatusModel`, `MessageReactionUserModel`, `MessageReactionSummaryModel`, `messages.schema.ts` | `authenticate`, schema parse trong controller | Redis idempotency/rate/pending reaction, Kafka raw/embedding/notification, Socket.IO | `/send`, `/:conversationId`, `/:messageId/status`, `/:messageId/read`, `/batch/read`, reactions endpoints | `send_message`, `message_read`, `message_delivered`, `delete_message_for_me`, `recall_message`, `forward_message`, `reaction_*` | Route order: `/:conversationId` trước `/batch/read` có thể nuốt `/batch/read` nếu Express match trước; cần verify. |
| upload | Cloudinary signature, verify upload, delete upload | `upload.routes.ts`, `upload.controller.ts` | `upload.service.ts` | Không có model | `authenticate`, `uploadRateLimiter` | Cloudinary SDK | `/sign`, `/generate-signature`, `/verify`, `/:publicId` DELETE | Không | Hai endpoint signature (`/sign` và `/generate-signature`) song song; response shape khác nhau. |
| notifications | Notification list/read/preferences/mute/pin/web push | `notifications.routes.ts`, `notifications.controller.ts`, `web-push.controller.ts` | `notifications.service.ts`, `workers/notification.worker.ts` | `NotificationModel`, `NotificationPreferenceModel`, `notifications.schema.ts` | `authenticate`, `validateBody` | Kafka, Redis debounce, FCM, Web Push | `/`, `/unread-count`, `/read`, `/read-all`, `/preferences`, `/mute/:conversationId`, `/pin/:conversationId`, `/web-push/*` | `new_notification` | TTL notification 30 ngày; worker debounce có Redis keys. |
| calls | REST call session API + WebRTC signaling | `calls.routes.ts`, `calls.controller.ts`, `socket/call.controller.ts` | `calls.service.ts`, `calls.metrics.ts` | `CallSessionModel`, `CallParticipantModel`, `CallEventModel`, `UserCallStateModel`, `calls.schema.ts` | `authenticate`, `validateBody`, callToken ở socket | Socket.IO, JWT ephemeral call token, TURN config | `/active`, `/sessions`, `/sessions/:id`, `/token`, `/accept`, `/reject`, `/end` | `call_invite`, `call_group_invite`, `call_accept`, `call_reject`, `call_end`, `webrtc_*`, `call_media_state` | P2P/SFU naming: mode `sfu` cho group nhưng không thấy SFU server, chỉ mesh signaling. |
| stickers | Sticker pack public/admin CRUD nhẹ | `sticker.routes.ts`, `sticker.controller.ts` | `sticker.service.ts` | `StickerPackModel` | Không có auth trong routes hiện tại | Cloudinary CDN URL qua seed/config | `GET /`, `GET /:packId`, `GET /:packId/:stickerId`, `POST /` | Không | `POST /api/stickers` comment admin nhưng chưa có auth middleware. |
| posts/comments | Community feed, trending, post CRUD, views, like/bookmark/favorite, comments | `posts.routes.ts`, `posts.controller.ts` | `posts.service.ts` | `PostModel`, `CommentModel`, `PostViewModel` | `authenticate`; không thấy Zod schema riêng | Notification service, Mongo | `/`, `/feed`, `/trending`, `/author`, `/:postId`, `/:postId/view`, like/bookmark/favorite/comments | Không trực tiếp | Request body không được Zod validate; cần harden content/media fields. |
| ai/catchup | Conversation digest async | `ai.routes.ts`, `catchup.controller.ts` | `catchup.service.ts`, `catchup.worker.ts` | `AiCatchupDigestModel`, `catchup.schema.ts` | `authenticate`, safeParse | Kafka `ai-catchup-jobs`, Gemini/OpenRouter | `/catchup/conversations/:conversationId/digests`, `/catchup/digests/:digestId`, regenerate/settings | `ai_catchup_digest_updated` | Có daily/debounce Redis limit; cần giữ worker idempotency. |
| ai/reminders | AI/user reminders/tasks | `ai.routes.ts`, `reminder.controller.ts` | `reminder.service.ts` | `AiReminderModel`, `reminder.schema.ts` | `authenticate`, safeParse | Conversation membership | `/ai/reminders*` | `ai_reminder_updated` helper tồn tại | Web có cả reminders và assistant tasks; tránh duplicate UX. |
| ai/assistant | Assistant inbox, unread conversations, search, group notes, tasks | `assistant.routes.ts`, `assistant.controller.ts` | `assistant.service.ts`, `ai-assistant.worker.ts` | `AiAssistantItemModel`, `AiGroupNoteModel`, `AiCatchupDigestModel`, schemas | `authenticate`, safeParse | Kafka, Neon pgvector, AI provider, Mongo messages | `/api/ai/assistant*`, `/api/ai/search/messages` | `ai_assistant_item_updated` | Service rất lớn; vùng rủi ro cao khi refactor. |
| ai/moderation | Keyword/Gemini moderation, log, penalty, recall/block events | `moderation.controller.ts` | `moderation.service.ts`, `moderation.worker.ts` | `ModerationLogModel` | Admin router has `authenticate` only | Gemini, Kafka, Socket.IO | Admin routes comment `/api/admin/moderation` nhưng chưa mount | `content_blocked`, `message_recalled`, `user_penalty_updated` | Admin check TODO, router chưa mount. |
| stories | Chưa xác định từ codebase | Không thấy module | Không thấy | Không thấy | Không thấy | Không thấy | Không thấy | Không thấy | Feature chưa có trong code đã quét. |

## Middleware/shared

| File | Vai trò |
| --- | --- |
| `apps/server/src/shared/middleware/auth.middleware.ts` | JWT auth, blacklist token check Redis |
| `apps/server/src/shared/middleware/validate.middleware.ts` | Validate body bằng Zod |
| `apps/server/src/shared/middleware/rate-limiter.middleware.ts` | OTP/friend/upload/general/message limits |
| `apps/server/src/shared/middleware/error-handler.middleware.ts` | Chuẩn hóa lỗi |
| `apps/server/src/shared/errors/*` | AppError, BadRequest, Forbidden, NotFound |
| `apps/server/src/shared/logger.ts` | Winston logger |
| `apps/server/src/shared/metrics.ts` | Prometheus metrics |

## Workers

| Worker | Topic | Vai trò |
| --- | --- | --- |
| `workers/message.worker.ts` | `raw-messages`, `raw-messages.retry` | batch insert messages, retry/DLQ |
| `workers/notification.worker.ts` | `notifications` | create notification, push, socket emit, debounce |
| `modules/ai/embeddings/message-embedding.worker.ts` | `message-embeddings` | embed message to Neon pgvector |
| `modules/ai/catchup/catchup.worker.ts` | `ai-catchup-jobs` | generate digest |
| `modules/ai/workers/ai-assistant.worker.ts` | `ai-catchup-jobs` | assistant/group note processing |
| `modules/ai/moderation/moderation.worker.ts` | Chưa thấy start trong `main.ts` | moderation async flow |
