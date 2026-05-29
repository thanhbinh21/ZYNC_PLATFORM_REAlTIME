# 06. Data Models

Nguồn: `apps/server/src/modules/**/*.model.ts`, `apps/server/src/infrastructure/redis.ts`, `apps/server/src/infrastructure/kafka.ts`, `apps/server/src/infrastructure/neon.ts`.

## MongoDB / Mongoose models

| Model/collection | Purpose | Fields quan trọng | Indexes/TTL | Quan hệ |
| --- | --- | --- | --- | --- |
| `User` | Tài khoản/profile | `email`, `username`, `displayName`, `avatarUrl`, `bio`, `skills`, `interests`, `devRole`, `onboardingCompleted`, `passwordHash`, `globalViolationCount`, `trustScore`, settings, `isOnline`, `lastSeenAt` | unique `email`, unique sparse `username` qua schema | referenced by all modules through string userId |
| `DeviceToken` | Push token/web push subscription | `userId`, `deviceToken`, `platform`, `pushSubscription.endpoint/keys` | unique `deviceToken`, index `{userId:1}` | user -> device tokens |
| `Friendship` | Quan hệ bạn bè/block | `userId`, `friendId`, `status` pending/accepted/blocked | unique `{userId,friendId}`, index `{status}` | pairs of User |
| `Conversation` | Direct/group/channel | `type`, `name`, `avatarUrl`, `createdBy`, `adminIds`, `memberApprovalEnabled`, `category`, `tags`, `description`, `rules`, `isPublic`, `memberCount`, `lastMessage`, `activeCall`, `unreadCounts` | `{unreadCounts:1}`, `lastMessage.sentAt`, `updatedAt` | members in `ConversationMember`; messages in `Message` |
| `ConversationMember` | Membership and per-user state | `conversationId`, `userId`, `role`, `joinedAt`, `penaltyScore`, `mutedUntil`, `lastVisibleMessageRef`, `unreadCount`, `aiPreferences` | unique `{conversationId,userId}`, index `{userId}` | joins User + Conversation |
| `Message` | Message content/history | `conversationId`, `senderId`, `content`, `type`, `mediaUrl`, `callHistory`, `replyTo`, `idempotencyKey`, delete fields, `reactions`, `moderationWarning`, `readByPreview` | unique `idempotencyKey`, `{conversationId,createdAt:-1}`, `{isDeleted:1}` | Conversation/User; statuses and reactions separate |
| `MessageStatus` | Per-user message delivery/read | `messageId`, `idempotencyKey`, `userId`, `status` | unique `{messageId,userId}`, `{idempotencyKey,userId}`, `{messageId,status}` | Message + User |
| `MessageReactionUser` | Per-user reaction state | `messageId`, `conversationId`, `userId`, `emojiCounts`, `totalCount`, `lastEmoji` | unique `{messageId,userId}`, `{conversationId,messageId}` | Message + User |
| `MessageReactionSummary` | Aggregated reaction counts | `messageId`, `conversationId`, `emojiCounts`, `totalCount` | unique `messageId`, `{conversationId,updatedAt:-1}` | Message |
| `Notification` | In-app notification | `userId`, `type`, `title`, `body`, `data`, `conversationId`, `fromUserId`, `read` | `{userId,createdAt:-1}`, `{userId,read}`, TTL `{createdAt:1}` 30 ngày | User, optional Conversation/fromUser |
| `NotificationPreference` | Notification settings | `userId`, `mutedConversations`, `mutedUntil`, `pinnedConversations`, `enablePush`, `enableSound`, `enableBadge` | unique `{userId}` | User |
| `CallSession` | Call session metadata | `conversationId`, `callType`, `mode`, `status`, `initiatedBy`, `participantIds`, `timeoutAt`, `startedAt`, `endedAt`, `durationSeconds`, `endedReason` | `{initiatedBy,createdAt:-1}`, `{participantIds,status,createdAt:-1}`, `{conversationId,createdAt:-1}` | User/Conversation |
| `CallParticipant` | Per-user call state | `sessionId`, `userId`, `role`, `status`, `joinedAt`, `leftAt` | unique `{sessionId,userId}`, `{userId,status,updatedAt:-1}` | CallSession + User |
| `CallEvent` | Call audit/event log | `sessionId`, `actorUserId`, `type`, `payload` | `{sessionId,createdAt:-1}` | CallSession |
| `UserCallState` | Active call pointer per user | `userId`, `activeCallSessionId` | unique `userId`, `{activeCallSessionId}` | User + CallSession |
| `StickerPack` | Sticker packs | `packId`, `packName`, `packDescription`, `stickers[]`, `icon`, `order` | unique/index `packId`, index `order` | Used by message type `sticker` |
| `Post` | Community post | `authorId`, `title`, `content`, `codeSnippets`, `mediaUrls`, `images`, `videoUrl`, `tags`, `type`, `channelId`, counts, `likedBy`, `bookmarkedBy`, `favoritedBy`, `status` | `authorId`, `createdAt`, `{tags,createdAt}`, `{channelId,createdAt}`, `{likesCount,createdAt}` | User author, optional channel |
| `Comment` | Post comments/replies | `postId`, `authorId`, `content`, `codeSnippet`, `parentId`, `likesCount`, `likedBy` | `postId`, `parentId`, `{postId,createdAt}` | Post/User |
| `PostView` | View cooldown/unique counter | `postId`, `viewerKey`, `lastViewedAt` | unique `{postId,viewerKey}` | Post |
| `AiCatchupDigest` | AI digest result/job | `userId`, `conversationId`, `cacheKey`, message refs, `catchupMode`, `trigger`, `status`, `summary`, `futureSignals`, `inputHash`, `model`, `error`, `generatedAt` | unique `{cacheKey}`, `{userId,conversationId,createdAt:-1}`, `{status,updatedAt}` | User + Conversation + Messages by refs |
| `AiReminder` | Reminder/task | `userId`, `conversationId`, `digestId`, `sourceMessageRefs`, `title`, `description`, `dueAt`, `status`, `createdBy` | `{userId,conversationId,status}`, `{userId,status,dueAt}` | User + Conversation + Digest |
| `AiAssistantItem` | Assistant inbox item/index | `userId`, `type`, `conversationId`, `refId`, `status`, `title`, `summarySnippet`, `metadata`, `trigger` | `{userId,type,status,createdAt:-1}`, `{userId,type,conversationId,createdAt:-1}`, `{userId,type,refId}` | Points to digest/task/search/group note |
| `AiGroupNote` | AI-generated group notes | `userId`, `conversationId`, `title`, `content`, `decisions`, `openQuestions`, `actionItems`, message refs, `pinned`, `status`, `model`, `error`, `generatedAt` | `{userId,conversationId,pinned:-1,createdAt:-1}`, `{status,updatedAt}` | User + Conversation + Messages |
| `ModerationLog` (`moderation_logs`) | Moderation audit | `messageId`, `conversationId`, `senderId`, `contentType`, `contentText`, `mediaUrl`, `label`, `confidence`, `reason`, `action`, `source`, `reviewedAt`, `reviewedBy` | `{label,createdAt:-1}`, `{senderId,createdAt:-1}`, partial TTL safe logs 7 ngày | Message/User/Conversation |

## Redis key schema

| Key | Type | TTL | Purpose | File |
| --- | --- | --- | --- | --- |
| `otp:{email}` | string | `OTP_TTL_SECONDS` trong `otp.service.ts` | OTP register/login/reset | `auth/otp.service.ts` |
| `blacklist:token:{jti}` | string | token remaining TTL | logout/revoke access/refresh token | `auth.service.ts`, `auth.middleware.ts` |
| `idempotency:{key}` | string JSON | default 300s | cache message result for retry | `infrastructure/redis.ts` |
| `typing:{conversationId}:{userId}` | string | default 3s | typing indicator | `infrastructure/redis.ts` |
| `online_users` | hash | none | legacy online timestamp map | `infrastructure/redis.ts` |
| `presence:{userId}` | string | `PRESENCE_TTL_SECONDS` | online presence | `users/presence.service.ts` |
| `presence:lastSeen:{userId}` | string/date | Chưa xác định từ codebase | last seen | `presence.service.ts` |
| `friends:{userId}` | string JSON | 600s | cached friend ids | `presence.service.ts` |
| `friends:{userId}:*` | string JSON | `FRIENDS_CACHE_TTL_SECONDS` | list friends cache | `friends.service.ts` |
| `msg_rate:{userId}` | zset | 2s | message sliding-window rate limit | `infrastructure/redis.ts` |
| reaction command/cache keys | string/hash | configured constants | idempotency/pending reactions/rate | `messages/message-reaction.service.ts` |
| notification debounce keys | string | debounce window | coalesce notifications | `workers/notification.worker.ts` |
| AI embedding cache | string JSON | `EMBEDDING_CACHE_TTL` | cache embeddings | `ai/embeddings/embedding.service.ts` |
| AI catchup/debounce/daily keys | string | 24h/debounce | rate/debounce digest jobs | `ai/catchup/catchup.service.ts`, `ai/assistant/assistant.service.ts` |
| non-friend DM rate keys | Chưa xác định từ codebase | `windowSeconds` | direct conversation anti-spam | `conversations.service.ts` |

Một số key reaction/AI cụ thể được build trong service private methods; khi sửa cần đọc trực tiếp:

- `apps/server/src/modules/messages/message-reaction.service.ts`
- `apps/server/src/modules/ai/catchup/catchup.service.ts`
- `apps/server/src/modules/ai/assistant/assistant.service.ts`

## Kafka topics

Nguồn: `apps/server/src/infrastructure/kafka.ts`.

| Topic | Purpose | Producer | Consumer |
| --- | --- | --- | --- |
| `raw-messages` | raw socket/REST messages for async insert | `messages.service.ts`, `socket/gateway.ts/chat.controller.ts` | `workers/message.worker.ts` |
| `raw-messages.retry` | retry raw message insert | `message.worker.ts` | `message.worker.ts` |
| `raw-messages.dlq` | dead letter after retries | `message.worker.ts` | Chưa xác định từ codebase |
| `notifications` | notification jobs | `notifications.service.ts`, domain services | `workers/notification.worker.ts` |
| `notifications.retry` | retry notification | Topic created | Chưa xác định rõ consumer trong code đã đọc |
| `notifications.dlq` | notification DLQ | Topic created | Chưa xác định từ codebase |
| `message-embeddings` | message embedding jobs | `messages.service.ts`, `assistant.service.ts` | `ai/embeddings/message-embedding.worker.ts` |
| `ai-catchup-jobs` | catchup/group note/assistant jobs | `catchup.service.ts`, `assistant.service.ts` | `catchup.worker.ts`, `ai-assistant.worker.ts` |
| `moderation-actions` | moderation actions | `moderation.worker.ts` | Chưa xác định từ codebase |

Kafka only starts if `KAFKA_ENABLED=true` in `main.ts`.

## Neon / pgvector tables

Nguồn: `apps/server/src/infrastructure/neon.ts`.

| Table | Purpose | Fields/indexes |
| --- | --- | --- |
| `message_embeddings` | semantic search over messages | `id`, `message_id`, `conversation_id`, `content_text`, `embedding vector(768)`, `created_at`; HNSW cosine index; `{conversation_id,created_at}`; unique `message_id` |
| `moderation_vectors` | optional vectors for flagged content | `id`, `message_id`, `embedding`, `label`, `confidence`, `created_at` |
| `user_profile_embeddings` | semantic user search | `id`, `user_id unique`, `bio_text`, `embedding vector(768)`, `updated_at`; HNSW cosine index |

If `NEON_DATABASE_URL` is missing, `main.ts` logs warning and vector features are disabled.
