# 04. API Contracts

Base API: `/api`. Health/metrics không có prefix `/api`.

Response pattern phổ biến:

- Thành công: `{ success: true, data?: ..., message?: ... }`
- Một số endpoint legacy trả `{ success: true, user }`, `{ success: true, settings }`, hoặc upload trả trực tiếp object không bọc `success`.
- Lỗi global handler chuẩn hóa trong `shared/middleware/error-handler.middleware.ts`, nhưng nhiều controller vẫn tự trả `{ success:false,error }`.

## System

| Method | Path | Auth | Request | Response | Error | File |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/health` | Public | none | `{status:"ok",timestamp}` | none đặc biệt | `apps/server/src/app.ts` |
| GET | `/metrics` | Public | none | Prometheus text | 500 | `apps/server/src/app.ts`, `shared/metrics.ts` |

## Auth

Schemas: `apps/server/src/modules/auth/auth.schema.ts`.

| Method | Path | Auth | Body/query | Response shape | Error cases | File/schema |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | `RegisterSchema`: `{email, username}` | `{success:true,message:"OTP sent..."}` | 400 validation, rate limit, duplicate email/username | `auth.routes.ts`, `RegisterSchema` |
| POST | `/api/auth/verify-otp` | Public | `VerifyOtpSchema`: `{email,otp,username,displayName?,password,deviceToken?,platform?}` | success + `accessToken`, `user`, refresh token cookie/body tùy platform | invalid OTP, duplicate, validation | `auth.controller.ts`, `VerifyOtpSchema` |
| POST | `/api/auth/login-password/request-otp` | Public | `LoginPasswordRequestOtpSchema`: `{email,password}` | `{success:true,message}` | invalid credentials, rate limit | `LoginPasswordRequestOtpSchema` |
| POST | `/api/auth/login-password/verify-otp` | Public | `LoginPasswordVerifyOtpSchema`: `{email,password,otp,deviceToken?,platform?}` | success + `accessToken`, `user`, refresh token | invalid OTP/password | `LoginPasswordVerifyOtpSchema` |
| POST | `/api/auth/forgot-password/request-otp` | Public | `ForgotPasswordRequestOtpSchema`: `{email}` | `{success:true,message}` | rate limit, unknown email behavior xem service | `ForgotPasswordRequestOtpSchema` |
| POST | `/api/auth/forgot-password/reset` | Public | `ForgotPasswordResetSchema`: `{email,otp,newPassword}` | `{success:true,message}` | invalid OTP, validation | `ForgotPasswordResetSchema` |
| POST | `/api/auth/google` | Public | `GoogleLoginSchema`: `{idToken,deviceToken?,platform?}` | success + token/user | invalid Google token | `GoogleLoginSchema` |
| POST | `/api/auth/refresh` | Public via cookie/body | cookie `refreshToken` hoặc body `{refreshToken}` | `{success:true,accessToken}` | 401 missing/invalid refresh | `auth.controller.ts` |
| GET | `/api/auth/current-token` | Public via cookie | cookie `accessToken` | `{success:true,accessToken}` | 401 missing | `auth.controller.ts` |
| POST | `/api/auth/logout` | Public-ish | `LogoutSchema`: `{deviceToken?}` + tokens | `{success:true,message}` | invalid token ignored/handled in service | `LogoutSchema` |
| POST | `/api/auth/change-password` | Required | `ChangePasswordSchema`: `{currentPassword,newPassword,confirmNewPassword}` | `{success:true,message}` | 401, wrong current password, validation | `ChangePasswordSchema` |

## Users

Schemas: `UpdateProfileSchema` in `auth.schema.ts`, `UpdateAccountSettingsSchema` in `users.schema.ts`.

| Method | Path | Auth | Body/query | Response shape | Error cases | File |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/users/me` | Required | none | `{success:true,user}` | 401, not found | `users.controller.ts` |
| GET | `/api/users/me/settings` | Required | none | `{success:true,settings}` | 401 | `users.controller.ts` |
| PATCH | `/api/users/me/settings` | Required | `UpdateAccountSettingsSchema`: booleans + `allowMessagesFrom` | `{success:true,settings}` | validation | `users.routes.ts` |
| GET | `/api/users/search` | Required | `query` hoặc `q`, `limit` | `{success:true,users}` | 401 | `users.controller.ts` |
| GET | `/api/users/discover` | Required | optional query từ service, chưa schema hóa | `{success:true,data: users}` | 401 | `users.controller.ts` |
| GET | `/api/users/:userId/public-profile` | Required | path `userId` | `{success:true,data:user}` | 404 | `users.controller.ts` |
| GET | `/api/users/:userId` | Required | path `userId` | `{success:true,data:user,user}` | 404 | `users.controller.ts` |
| GET | `/api/users/presence/bulk` | Required | query user ids tùy controller/service | `{success:true,presence}` | route-order risk | `users.routes.ts` |
| GET | `/api/users/:userId/presence` | Required | path `userId` | `{success:true,presence}` | 404/forbidden visibility | `presence.service.ts` |
| PATCH | `/api/users/me` | Required | `UpdateProfileSchema`: username/displayName/avatar/bio/skills/interests/links/devRole/onboardingCompleted | `{success:true,user}` | validation, duplicate username | `users.routes.ts` |
| POST | `/api/users/me/device-token` | Required | `UpsertDeviceTokenSchema`: `{deviceToken,platform}` | `{success:true,message}` | validation | `users.routes.ts` |

## Friends

Schemas: `apps/server/src/modules/friends/friends.schema.ts`.

| Method | Path | Auth | Body/query | Response | Error cases | File |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/friends` | Required | `ListFriendsQuerySchema`: `cursor?`, `limit<=50` | `{success:true,friends,nextCursor?,hasMore?}` | validation | `friends.controller.ts` |
| GET | `/api/friends/requests` | Required | none | `{success:true,incoming,outgoing}` | 401 | `friends.controller.ts` |
| GET | `/api/friends/count` | Required | none | `{success:true,count}` | 401 | `friends.controller.ts` |
| POST | `/api/friends/request` | Required | `SendFriendRequestSchema`: accepts `toUserId/targetUserId/receiverId/userId` -> `{toUserId}` | `{success:true,request}` | self request, duplicate, blocked, rate limit | `friends.routes.ts` |
| PUT | `/api/friends/request/:requestId/accept` | Required | path requestId | `{success:true,message}` | not found/forbidden | `friends.controller.ts` |
| PUT | `/api/friends/request/:requestId/reject` | Required | path requestId | `{success:true,message}` | not found/forbidden | `friends.controller.ts` |
| DELETE | `/api/friends/:friendId` | Required | path friendId | `{success:true,message}` | not friend | `friends.controller.ts` |
| POST | `/api/friends/:userId/block` | Required | path userId | `{success:true,message}` | invalid user | `friends.controller.ts` |
| DELETE | `/api/friends/:userId/block` | Required | path userId | `{success:true,message}` | not blocked | `friends.controller.ts` |

## Groups/channels

Schemas: `apps/server/src/modules/groups/groups.schema.ts`.

| Method | Path | Auth | Body/query | Response | Error cases | File |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/groups/public` | Required | Chưa có schema | `{success:true,data:channels}` | 401 | `groups.controller.ts` |
| GET | `/api/groups/discover` | Required | Chưa có schema | `{success:true,data:channels}` | 401 | `groups.controller.ts` |
| POST | `/api/groups` | Required | `CreateGroupSchema`: name, avatarUrl?, memberIds?, category?, tags?, description?, rules?, isPublic? | `{success:true,data:group}` 201 | private <2 members, non-friends, invalid ids | `groups.routes.ts` |
| PATCH | `/api/groups/:groupId` | Required | `UpdateGroupSchema`: name?/avatarUrl? | `{success:true,data:group}` | not admin, not found | `groups.routes.ts` |
| POST | `/api/groups/:groupId/members` | Required | `AddGroupMembersSchema`: `{memberIds}` | `{success:true,data:group}` | not admin/member checks | `groups.routes.ts` |
| POST | `/api/groups/:groupId/join` | Required | none | `{success:true,data:group}` | not public/not found | `groups.controller.ts` |
| DELETE | `/api/groups/:groupId/members/me` | Required | none | `{success:true,...result}` | creator cannot leave? xem service | `groups.controller.ts` |
| PATCH | `/api/groups/:groupId/members/:userId/role` | Required | `UpdateGroupMemberRoleSchema`: `{role}` | `{success:true,data:group}` | not admin/creator rules | `groups.routes.ts` |
| PATCH | `/api/groups/:groupId/member-approval` | Required | `UpdateGroupMemberApprovalSchema`: `{memberApprovalEnabled}` | `{success:true,data:group}` | creator only | `groups.routes.ts` |
| DELETE | `/api/groups/:groupId/members/:userId` | Required | path ids | `{success:true,data:group}` | not admin, invalid member | `groups.controller.ts` |
| DELETE | `/api/groups/:groupId` | Required | path groupId | `{success:true,message}` | not admin/creator | `groups.controller.ts` |

## Conversations

| Method | Path | Auth | Body/query | Response | Error cases | File |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/conversations` | Required | Chưa có schema; controller gọi list | `{success:true,data:conversations}` | 401/500 | `conversations.controller.ts` |
| POST | `/api/conversations/direct` | Required | body `{targetUserId}` | `{success:true,data:conversation}` | 400/403/404/429 | `conversations.controller.ts` |
| GET | `/api/conversations/direct` | Required | query `userId` | `{success:true,data:conversation}` | 400/403/404/429 | `conversations.controller.ts` |
| GET | `/api/conversations/:conversationId` | Required | path | `501 {success:false,error:"Not implemented yet"}` | Always 501 currently | `conversations.routes.ts` |

## Messages

Schemas: `apps/server/src/modules/messages/messages.schema.ts`.

| Method | Path | Auth | Body/query | Response | Error cases | File |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/messages/send` | Required | `SendMessageSchema` | `{success:true,data:message}` 201 | validation, forbidden membership | `messages.controller.ts` |
| GET | `/api/messages/:conversationId` | Required | `GetMessageHistorySchema`: `cursor?`, `limit<=100` | `{success:true,data:{messages,nextCursor,hasMore...}}` | forbidden membership | `messages.controller.ts` |
| PUT | `/api/messages/:messageId/status` | Required | `UpdateMessageStatusSchema`: `{status}` | `{success:true,data/status...}` | invalid status | `messages.controller.ts` |
| POST | `/api/messages/:messageId/read` | Required | no schema? path messageId | `{success:true,...}` | forbidden/not found | `messages.controller.ts` |
| POST | `/api/messages/batch/read` | Required | `MarkAsReadSchema`: `{messageIds}` | `{success:true,...}` | route-order risk because `/:conversationId` is earlier | `messages.routes.ts` |
| GET | `/api/messages/:messageRef/reactions/summary` | Required | path messageRef | `{success:true,data:{summary,userState?}}` | not found/forbidden | `messages.controller.ts` |
| GET | `/api/messages/:messageRef/reactions/details` | Required | path messageRef | `{success:true,data:{...}}` | not found/forbidden | `messages.controller.ts` |
| POST | `/api/messages/:messageId/react` | Required | body `{reactionType}` | `{success:true,data:message}` | legacy path; may differ from socket reaction contract | `messages.controller.ts` |

## Upload

| Method | Path | Auth | Body/query | Response | Error cases | File |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/upload/sign` | Required | `{folder?}` | `{success:true,data:{signature,timestamp,apiKey,cloudName,folder}}` | 500 Cloudinary not configured | `upload.routes.ts` |
| POST | `/api/upload/generate-signature` | Required | `{type:"image"|"video"|"document"}` | signature object: timestamp/signature/cloudName/apiKey/folder/publicIdPrefix | 400 invalid type, 500 | `upload.controller.ts` |
| POST | `/api/upload/verify` | Required | `{publicId,type}` | `{success:true,data:{url,secureUrl,size...}}` | 400 missing/failed, 500 | `upload.controller.ts` |
| DELETE | `/api/upload/:publicId` | Required | path publicId | `{success:true}` | 400 missing/delete failed | `upload.controller.ts` |

## Notifications

Schemas: `apps/server/src/modules/notifications/notifications.schema.ts`.

| Method | Path | Auth | Body/query | Response | Error cases | File |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/notifications` | Required | `GetNotificationsQuerySchema`: cursor?, limit<=100 | `{success:true,items,nextCursor,hasMore}` | validation | `notifications.controller.ts` |
| GET | `/api/notifications/unread-count` | Required | none | `{success:true,count}` | 401 | `notifications.controller.ts` |
| PATCH | `/api/notifications/read` | Required | `MarkReadSchema`: `{notificationIds}` | `{success:true,modified}` | validation | `notifications.routes.ts` |
| PATCH | `/api/notifications/read-all` | Required | none | `{success:true,modified}` | 401 | `notifications.controller.ts` |
| GET | `/api/notifications/preferences` | Required | none | `{success:true,data:prefs}` | 401 | `notifications.controller.ts` |
| PATCH | `/api/notifications/preferences` | Required | `UpdatePreferencesSchema`: enablePush/Sound/Badge | `{success:true,data:prefs}` | validation | `notifications.routes.ts` |
| POST | `/api/notifications/mute/:conversationId` | Required | `MuteConversationSchema`: `{until?}` | `{success:true,message}` | validation | `notifications.routes.ts` |
| DELETE | `/api/notifications/mute/:conversationId` | Required | none | `{success:true,message}` | 401 | `notifications.controller.ts` |
| POST | `/api/notifications/pin/:conversationId` | Required | `PinConversationSchema`: `{pin?}` | `{success:true,message}` | validation | `notifications.routes.ts` |
| DELETE | `/api/notifications/pin/:conversationId` | Required | none | `{success:true,message}` | 401 | `notifications.controller.ts` |
| POST | `/api/notifications/web-push/subscribe` | Required | `WebPushSubscribeSchema`: `{endpoint,keys:{p256dh,auth}}` | `{success:true,message}` 201 | validation | `web-push.controller.ts` |
| DELETE | `/api/notifications/web-push/unsubscribe` | Required | body `{endpoint}` | `{success:true,message}` | missing endpoint | `web-push.controller.ts` |
| GET | `/api/notifications/web-push/vapid-key` | Required | none | `{success:true,data:{publicKey}}` | missing VAPID likely null/empty | `web-push.controller.ts` |

## Calls

Schemas: `apps/server/src/modules/calls/calls.schema.ts`.

| Method | Path | Auth | Body/query | Response | Error cases | File |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/calls/active` | Required | none | `{success:true,data:session|null}` | 401 | `calls.controller.ts` |
| POST | `/api/calls/sessions` | Required | `CreateCallSessionSchema`: `{targetUserId,conversationId?,callType?}` | `{success:true,data:session}` 201 | busy/not friend/membership | `calls.routes.ts` |
| GET | `/api/calls/sessions/:sessionId` | Required | path | `{success:true,data:session}` | not participant/not found | `calls.controller.ts` |
| POST | `/api/calls/sessions/:sessionId/token` | Required | none | `{success:true,data:{token,expiresInSeconds}}` | not participant | `calls.controller.ts` |
| POST | `/api/calls/sessions/:sessionId/accept` | Required | none | `{success:true,data:session}` | invalid state | `calls.controller.ts` |
| POST | `/api/calls/sessions/:sessionId/reject` | Required | `RejectCallSessionSchema`: `{reason?}` | `{success:true,data:session}` | invalid state | `calls.routes.ts` |
| POST | `/api/calls/sessions/:sessionId/end` | Required | `EndCallSessionSchema`: `{reason?}` | `{success:true,data:session}` | invalid state | `calls.routes.ts` |

## Stickers

| Method | Path | Auth | Body/query | Response | Error cases | File |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/stickers` | Public | none | `{success:true,data:packs}` | 500 | `sticker.controller.ts` |
| GET | `/api/stickers/:packId` | Public | path | `{success:true,data:pack}` | 404 | `sticker.controller.ts` |
| GET | `/api/stickers/:packId/:stickerId` | Public | path | `{success:true,data:sticker}` | 404 | `sticker.controller.ts` |
| POST | `/api/stickers` | Public currently | pack body, not Zod validated | `{success:true,data:pack}` 201 | 400 duplicate/invalid service | `sticker.routes.ts` |

## Posts/community

Không thấy Zod schema riêng cho posts.

| Method | Path | Auth | Body/query | Response | Error cases | File |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/posts` | Required | create post payload: title/content/type/tags/media... theo `PostsService.createPost` | `{success:true,data:post}` 201 | validation in service | `posts.controller.ts` |
| GET | `/api/posts/feed` | Required | `cursor?`, `limit?` | `{success:true,items,nextCursor,hasMore}` | 401 | `posts.controller.ts` |
| GET | `/api/posts/trending` | Required | `limit?` | `{success:true,data:posts}` | 401 | `posts.controller.ts` |
| GET | `/api/posts/author` | Required | `authorId`, `limit?` | `{success:true,data:posts}` | 400 missing authorId | `posts.controller.ts` |
| GET | `/api/posts/:postId` | Required | path | `{success:true,data:post}` | 404 | `posts.controller.ts` |
| POST | `/api/posts/:postId/view` | Required | none/body optional | `{success:true,data:{viewCount,counted}}` | 404 | `posts.controller.ts` |
| PATCH | `/api/posts/:postId` | Required | `{title?,content?,tags?}` | `{success:true,data:post}` | forbidden/not found | `posts.controller.ts` |
| DELETE | `/api/posts/:postId` | Required | path | `{success:true,message}` | forbidden/not found | `posts.controller.ts` |
| POST | `/api/posts/:postId/like` | Required | none | `{success:true,data:{liked,likesCount}}` | 404 | `posts.controller.ts` |
| POST | `/api/posts/:postId/bookmark` | Required | none | `{success:true,data:{bookmarked}}` | 404 | `posts.controller.ts` |
| POST | `/api/posts/:postId/favorite` | Required | none | `{success:true,data:{favorited,favoritesCount}}` | 404 | `posts.controller.ts` |
| POST | `/api/posts/:postId/comments` | Required | `{content,codeSnippet?,parentId?}` | `{success:true,data:comment}` 201 | 404/invalid | `posts.controller.ts` |
| GET | `/api/posts/:postId/comments` | Required | path | `{success:true,data:comments}` | 404 | `posts.controller.ts` |

## AI

Schemas:

- `apps/server/src/modules/ai/catchup/catchup.schema.ts`
- `apps/server/src/modules/ai/reminders/reminder.schema.ts`
- `apps/server/src/modules/ai/assistant/assistant.schema.ts`
- `apps/server/src/modules/ai/ai.schema.ts` has `AIChatRequestSchema` and `SearchRequestSchema`, but no route using chat schema was found in `ai.routes.ts`.

| Method | Path | Auth | Body/query | Response | Error cases | File |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/ai/health` | Required | none | `{success:true,data:{ai:{enabled,gemini,neon,assistant,search,catchup}}}` | 401 | `ai.routes.ts` |
| POST | `/api/ai/catchup/conversations/:conversationId/digests` | Required | `CreateCatchupDigestSchema`: trigger/unreadCountHint/toMessageRef | `{success:true,data:digest}` 202 | not member, rate/debounce | `catchup.controller.ts` |
| GET | `/api/ai/catchup/conversations/:conversationId/digests/latest` | Required | path | `{success:true,data:digest|null}` | not member | `catchup.controller.ts` |
| GET | `/api/ai/catchup/digests/:digestId` | Required | path | `{success:true,data:digest}` | not owner/not found | `catchup.controller.ts` |
| POST | `/api/ai/catchup/digests/:digestId/regenerate` | Required | path | `{success:true,data:digest}` 202 | not owner | `catchup.controller.ts` |
| PATCH | `/api/ai/catchup/conversations/:conversationId/settings` | Required | `UpdateCatchupSettingsSchema`: `{catchupEnabled}` | `{success:true,data:settings}` | validation | `catchup.controller.ts` |
| POST | `/api/ai/reminders` | Required | `CreateReminderSchema` | `{success:true,data:reminder}` 201 | not member | `reminder.controller.ts` |
| GET | `/api/ai/reminders` | Required | `conversationId?`, `status?` | `{success:true,data:reminders}` | 401 | `reminder.controller.ts` |
| GET | `/api/ai/reminders/:reminderId` | Required | path | `{success:true,data:reminder}` | not owner/not found | `reminder.controller.ts` |
| PATCH | `/api/ai/reminders/:reminderId` | Required | `UpdateReminderSchema` | `{success:true,data:reminder}` | validation | `reminder.controller.ts` |
| DELETE | `/api/ai/reminders/:reminderId` | Required | path | 204 | not owner/not found | `reminder.controller.ts` |
| GET | `/api/ai/search/messages` | Required | `AssistantSearchQuerySchema`: `q?`, `conversationId?`, `limit<=20` | `{success:true,data:result}` | AI/search disabled, membership | `assistant.controller.ts` |
| GET | `/api/ai/assistant` | Required | `AssistantQuerySchema`: type?, conversationId?, limit?, skip? | `{success:true,data:{items,total}}` | validation | `assistant.routes.ts` |
| GET | `/api/ai/assistant/catchup/unread-conversations` | Required | limit?, skip? | `{success:true,data:{conversations,total}}` | validation | `assistant.controller.ts` |
| GET | `/api/ai/assistant/search` | Required | `q?`, `conversationId?`, `limit?` | `{success:true,data:result}` | membership | `assistant.controller.ts` |
| POST | `/api/ai/assistant/catchup` | Required | `CreateCatchupDigestSchema`: `{conversationId,trigger?,unreadCountHint?,toMessageRef?}` | `{success:true,data:result}` 201 | debounce/rate | `assistant.controller.ts` |
| GET | `/api/ai/assistant/catchup/:conversationId` | Required | path | `{success:true,data:result|null}` | membership | `assistant.controller.ts` |
| POST | `/api/ai/assistant/catchup/:conversationId/regenerate` | Required | path | `{success:true,data:result}` | membership | `assistant.controller.ts` |
| PATCH | `/api/ai/assistant/conversations/:conversationId/settings` | Required | `{catchupEnabled}` | `{success:true,data:{catchupEnabled}}` | validation | `assistant.controller.ts` |
| GET | `/api/ai/assistant/tasks` | Required | status?, conversationId?, limit?, skip? | `{success:true,data:{tasks,total}}` | validation | `assistant.controller.ts` |
| POST | `/api/ai/assistant/tasks` | Required | `CreateAssistantTaskSchema` | `{success:true,data:task}` 201 | validation | `assistant.controller.ts` |
| PATCH | `/api/ai/assistant/tasks/:taskId` | Required | `UpdateAssistantTaskSchema` | `{success:true,data:task}` | not owner | `assistant.controller.ts` |
| DELETE | `/api/ai/assistant/tasks/:taskId` | Required | path | 204 | not owner | `assistant.controller.ts` |
| GET | `/api/ai/assistant/notes` | Required | conversationId?, status?, limit?, skip? | `{success:true,data:{notes,total}}` | validation | `assistant.controller.ts` |
| POST | `/api/ai/assistant/conversations/:conversationId/notes` | Required | `CreateGroupNoteSchema`: `{fromLatestNote?}` | `{success:true,data:{item,detail}}` 201 | not member | `assistant.controller.ts` |
| GET | `/api/ai/assistant/notes/:noteId` | Required | path | `{success:true,data:note}` | not owner | `assistant.controller.ts` |
| PATCH | `/api/ai/assistant/notes/:noteId` | Required | `UpdateGroupNoteSchema` | `{success:true,data:note}` | validation | `assistant.controller.ts` |
| DELETE | `/api/ai/assistant/notes/:noteId` | Required | path | 204 | not owner | `assistant.controller.ts` |
| POST | `/api/ai/assistant/notes/:noteId/regenerate` | Required | path | `{success:true,data:{item,detail}}` | not owner | `assistant.controller.ts` |

## Moderation admin routes

Defined in `apps/server/src/modules/ai/moderation/moderation.controller.ts`, but **not mounted** in `apps/server/src/app.ts`.

Nếu mount theo comment, contract dự kiến:

| Method | Path | Auth | Body/query | Response | Rủi ro |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/admin/moderation` | Required only | `label?`, `limit?`, `before?`, `senderId?` | logs + count + nextCursor | thiếu admin/RBAC |
| GET | `/api/admin/moderation/stats` | Required only | none | stats last24h | thiếu admin/RBAC |
| PATCH | `/api/admin/moderation/:logId/review` | Required only | `{action:"pass"|"block"|"mute_user"}` | updated log | route chưa hoạt động |
