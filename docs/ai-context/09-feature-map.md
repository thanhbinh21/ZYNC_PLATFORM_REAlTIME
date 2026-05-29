# 09. Feature Map

Trạng thái dựa trên code hiện tại, không dựa vào roadmap README.

| Nhóm | Feature | Trạng thái | Bằng chứng |
| --- | --- | --- | --- |
| Auth | Register with OTP | Done | `auth.routes.ts`, `RegisterSchema`, `VerifyOtpSchema` |
| Auth | Password login with OTP step | Done | `/login-password/request-otp`, `/verify-otp` |
| Auth | Forgot password | Done | `/forgot-password/*` |
| Auth | Google login | Done/Partial | `/api/auth/google`; cần cấu hình `GOOGLE_CLIENT_ID` |
| Auth | Refresh/logout/token blacklist | Done | `auth.service.ts`, Redis `blacklist:token:*` |
| Auth | RBAC/admin | Planned/Broken | moderation admin TODO says admin check missing |
| Friends | Send/accept/reject requests | Done | `friends.routes.ts` |
| Friends | List/count friends | Done | `listFriends`, `getFriendsCount` |
| Friends | Block/unblock | Done | `blockUser`, `unblockUser` |
| Friends | Mutual friends | Partial | service has `getMutualFriendsCount`, API exposure unclear |
| Chat | Realtime text/media/sticker | Done | socket `send_message`, message schemas |
| Chat | Message history pagination | Done | `GetMessageHistorySchema` |
| Chat | Delivery/read status | Done | `MessageStatusModel`, socket/REST events |
| Chat | Typing | Done | `typing_start/stop`, Redis TTL |
| Chat | Reply | Done | reply fields in message schema/socket |
| Chat | Delete for me/recall/forward | Done | socket handlers |
| Chat | Reactions new contract | Done/Partial | socket `reaction_*`; legacy `/react` still exists |
| Chat | Kafka fallback | Partial/Risky | fallback mode exists, complex consistency |
| Group | Private group create/manage | Done | `groups.service.ts` |
| Group | Public channels/discover/join | Done | `/api/groups/public`, `/discover`, `/join` |
| Group | Member approval | Done/Partial | schema/service exists; UX coverage should verify |
| Calling | 1-1 call | Done/Partial | REST/socket/call UI exist; real device/browser verification required |
| Calling | Group call | Partial | mode `sfu` naming but no SFU service found |
| Calling | TURN local | Done | `infra/docker-compose.yml` coturn |
| Calling | Call history message | Done | `createCallHistoryMessage`, `receive_message` |
| Community | Feed/trending/posts | Done | `posts.routes.ts`, web/mobile services |
| Community | Comments/replies | Done/Partial | comment model parentId; UI should verify nested replies |
| Community | Post validation | Risky | no Zod schema for posts |
| Explore | Discover users | Done | `/api/users/discover`, web/mobile explore |
| Explore | Discover public channels | Done | `/api/groups/discover/public` |
| Story | Stories | Planned/Not found | no module/model/route found |
| Notification | In-app notification list/read | Done | notifications routes/models |
| Notification | Realtime notification | Done | `new_notification` helper/worker |
| Notification | Web push | Done/Partial | web-push routes/service; needs VAPID/browser verify |
| Notification | Mobile push | Done/Partial | device token model, FCM worker, mobile push service |
| AI | AI health/config | Done | `/api/ai/health` |
| AI | Catch-up digest | Done/Partial | routes/workers/models; async config dependent |
| AI | Assistant box/tasks | Done/Partial | web service/components; mobile missing |
| AI | Semantic message search | Done/Partial | Neon pgvector required |
| AI | Group notes | Done/Partial | assistant routes/models/workers |
| AI | Moderation | Partial/Risky | service/worker/log exists; admin route not mounted, worker start unclear |
| Settings/Profile | Profile edit/onboarding | Done | web/mobile onboarding, `UpdateProfileSchema` |
| Settings/Profile | Account privacy settings | Done/Partial | `users.schema.ts`; mobile settings appears mostly local toggles |
| Deployment/Observability | Docker local infra | Done | `infra/docker-compose.yml` |
| Deployment/Observability | Metrics | Done/Partial | `/metrics`, Prometheus metrics |
| Deployment/Observability | Production deploy | Chưa xác định từ codebase | no deployment target documented in code read |

## Broken/Risky nổi bật

- `GET /api/conversations/:conversationId` trả 501.
- `moderationAdminRouter` chưa mount và thiếu RBAC.
- `users.routes.ts` route order có thể làm `/presence/bulk` lỗi.
- `messages.routes.ts` route order có thể làm `/batch/read` lỗi.
- AI/mobile feature parity chưa rõ; web có nhiều AI UI hơn mobile.
