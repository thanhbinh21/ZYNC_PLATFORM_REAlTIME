# 05. Socket Contracts

Socket.IO server: `apps/server/src/socket/gateway.ts`.

Client services:

- Web: `apps/web/src/services/socket.ts`
- Mobile: `apps/mobile/src/services/socket.ts`

Auth:

- Client truyền JWT qua `io(url, { auth: { token } })` hoặc Authorization header.
- Server verify bằng `JWT_SECRET`.
- Sau connect, socket join room `user:{userId}`.
- Conversation events cần membership trong `ConversationMemberModel`.

Rooms:

- `user:{userId}`: direct user events.
- `conv:{conversationId}`: conversation broadcast sau khi join/auto join.

## Client -> Server events

| Event | Payload shape | Điều kiện | Module xử lý | Event phản hồi |
| --- | --- | --- | --- | --- |
| `heartbeat` | optional `{timestamp?}`; server không dùng payload | Auth socket | `gateway.ts`, `presence.service.ts` | refresh Redis `presence:{userId}` |
| `join_conversation` | `{conversationId}` | user là member | `gateway.ts` | joins `conv:*`, emits `conversation_active_call_updated` |
| `leave_conversation` | `{conversationId}` | auth | `gateway.ts` | leaves `conv:*` |
| `typing_start` | `{conversationId}` | user là member | `gateway.ts`, Redis typing TTL | `typing_indicator {userId,conversationId,isTyping:true}` to others |
| `typing_stop` | `{conversationId}` | user là member | `gateway.ts` | `typing_indicator {isTyping:false}` |
| `send_message` | `{conversationId, content?, type, mediaUrl?, idempotencyKey, replyToMessageRef?, replyToMessageId?, replyToPreview?, replyToSenderId?, replyToSenderDisplayName?, replyToType?}` | member, rate limit, content/media required | `socket/chat.controller.ts` | `receive_message`, `status_update`, `message_sent`, `error` |
| `message_read` | `{conversationId,messageIds:string[]}` | member | `chat.controller.ts` | `status_update {status:"read"}` |
| `message_delivered` | `{conversationId,messageIds:string[]}` | member | `chat.controller.ts` | `status_update {status:"delivered"}` |
| `delete_message_for_me` | `{conversationId,messageId,idempotencyKey}` | owner/member rules in service | `chat.controller.ts` | `message_deleted_for_me` |
| `recall_message` | `{conversationId,messageId,idempotencyKey}` | sender/recall rules in service | `chat.controller.ts` | `message_recalled` to conversation |
| `forward_message` | `{originalMessageId,toConversationId,idempotencyKey}` | member of target | `chat.controller.ts` | `receive_message`, `message_forwarded` |
| `reaction_upsert` | `{requestId,conversationId,messageRef,emoji,delta,actionSource,idempotencyKey}` | member, reaction rate limit | `reaction.controller.ts` | `reaction_ack`, `reaction_updated`, `reaction_error` |
| `reaction_remove_all_mine` | `{requestId,conversationId,messageRef,idempotencyKey}` | member, rate limit | `reaction.controller.ts` | `reaction_ack`, `reaction_updated`, `reaction_error` |
| `call_invite` | `{targetUserId,conversationId?,callType:"audio"|"video"}` | auth, call service rules | `call.controller.ts` | `call_invited`, `call_incoming`, `call_status` |
| `call_group_invite` | `{conversationId,callType:"audio"|"video"}` | member/call service rules | `call.controller.ts` | `call_invited`, `call_incoming`, `call_participant_joined`, `call_status`, `conversation_active_call_updated` |
| `call_accept` | `{sessionId,callToken}` | participant + valid call token | `call.controller.ts` | `call_participant_joined`, `call_status`, `conversation_active_call_updated` |
| `call_reject` | `{sessionId,callToken,reason?:"rejected"|"busy"}` | participant + token | `call.controller.ts` | `call_participant_left`, `call_status`, call history message |
| `call_end` | `{sessionId,callToken,reason?}` | participant + token | `call.controller.ts` | `call_participant_left`, `call_status`, call history message |
| `webrtc_offer` | `{sessionId,toUserId,callToken,sdp}` | participant + valid signal route | `call.controller.ts` | `webrtc_offer` to target |
| `webrtc_answer` | `{sessionId,toUserId,callToken,sdp}` | participant + valid signal route | `call.controller.ts` | `webrtc_answer`, `call_status connected` |
| `webrtc_ice_candidate` | `{sessionId,toUserId,callToken,candidate}` | participant + valid signal route | `call.controller.ts` | `webrtc_ice_candidate` |
| `call_media_state` | `{sessionId,callToken,isScreenSharing?,isMicMuted?,isCameraOff?}` | participant + token | `call.controller.ts` | `call_media_state` to other participants |

## Server -> Client events

| Event | Payload shape | Source | Client usage |
| --- | --- | --- | --- |
| `receive_message` | `{messageId,conversationId,senderId,sender?,content,type,mediaUrl?,callHistory?,moderationWarning?,replyTo?,idempotencyKey,createdAt}` | chat, group system, call history, moderation | Web/Mobile chat screens |
| `message_sent` | `{messageId,idempotencyKey,createdAt}` | chat send ack | Mobile listens; Web may use optimistic state |
| `status_update` | `{conversationId?,messageId?,messageIds?,idempotencyKeys?,status,userId,updatedAt?,reader?}` | chat status/read/call history | Web/Mobile message status |
| `typing_indicator` | `{userId,conversationId,isTyping}` | typing events | Web/Mobile chat |
| `message_deleted_for_me` | `{messageId,conversationId,deletedAt,effectiveLastMessage?,unreadCount?,lastVisibleMessage?}` | delete for me | Web/Mobile |
| `message_recalled` | `{messageId,idempotencyKey?,conversationId,recalledBy,recalledAt,conversationLastMessage?}` | recall/moderation block | Web/Mobile |
| `message_forwarded` | `{messageId,idempotencyKey,toConversationId}` | forward | Web/Mobile |
| `message_reacted` | legacy payload from REST reaction controller | `messages.controller.ts` | Web/Mobile still have listener; may be legacy |
| `reaction_ack` | `{requestId,accepted:true,conversationId,messageRef,messageId,userId,action,optimistic,serverTs,contractVersion}` | reaction socket | Web/Mobile reaction UI |
| `reaction_updated` | `{requestId,conversationId,messageRef,messageId,actor,summary,userState,updatedAt,contractVersion}` | reaction service/controller | Web/Mobile reaction UI |
| `reaction_error` | `{requestId,conversationId,messageRef,code,message,contractVersion}` | reaction controller | Web/Mobile error handling |
| `presence_changed` | `{userId,status:"online"|"offline",lastSeen}` | gateway/users service | Friend list/profile presence |
| `group_updated` | `{groupId,type,data}` | groups service | Mobile has listener; Web likely updates group state via socket |
| `new_notification` | notification object | `emitNotification`/worker | notification toast/hub |
| `ai_catchup_digest_updated` | `{digestId,conversationId,status,summary?,error?,updatedAt}` | AI worker/gateway helper | Web AI catch-up |
| `ai_assistant_item_updated` | `{itemId,type,conversationId?,status,title?,summarySnippet?,metadata?,detail?,error?,updatedAt}` | AI assistant worker | Web assistant box |
| `ai_reminder_updated` | reminder payload or status deleted | gateway helper | Web has listener |
| `content_blocked` | moderation block payload | moderation service/worker | Mobile listens; Web likely should too |
| `user_penalty_updated` | penalty payload | moderation service | Mobile listens |
| `call_invited` | `{sessionId,conversationId?,targetUserId?,isGroupCall,participantIds,callType,timeoutAt,callToken,callTokenExpiresInSeconds}` | call controller | Call UI caller |
| `call_incoming` | `{sessionId,conversationId?,fromUserId,callerName?,callerAvatarUrl?,conversationName?,isGroupCall,participantIds,callType,timeoutAt,callToken,callTokenExpiresInSeconds}` | call controller | Incoming call overlay |
| `call_status` | `{sessionId,status,reason?}` | call controller | Call state |
| `call_participant_joined` | `{sessionId,userId,joinedParticipantIds}` | call controller | WebRTC participant state |
| `call_participant_left` | `{sessionId,userId,reason?}` | call controller | Call UI |
| `webrtc_offer` | `{sessionId,fromUserId,sdp}` | call controller | WebRTC peer connection |
| `webrtc_answer` | `{sessionId,fromUserId,sdp}` | call controller | WebRTC peer connection |
| `webrtc_ice_candidate` | `{sessionId,fromUserId,candidate}` | call controller | WebRTC peer connection |
| `call_media_state` | `{sessionId,userId,isScreenSharing?,isMicMuted?,isCameraOff?}` | call controller | Call UI |
| `conversation_active_call_updated` | `{conversationId,activeCall:null|{callSessionId,type,status,startedAt,initiatedBy}}` | join/call updates | Chat header active call |
| `error` | `{message,code?}` | all socket controllers | Generic socket errors |

## Events client lắng nghe nhưng server emit chưa xác định

- `content_warning`: mobile service có listener, nhưng server search không thấy emit event này.
- Một số Web AI listeners tồn tại; cần kiểm tra worker emit cụ thể khi sửa AI.

## Rủi ro đồng bộ Web/Mobile

- Web `listenToMessages` dùng registry 1 callback/event và thường `socket.off(event)` trước khi register; Mobile cho phép nhiều callback bằng `Set`. Khi port logic giữa Web/Mobile cần để ý khác biệt này.
- Web gửi heartbeat mỗi 50s; server comment cũ nói 50s nhưng `HEARTBEAT_INTERVAL_MS` trong gateway là 30s không được dùng. Mobile có `heartbeat()` function nhưng không thấy timer trong đoạn service đầu; cần verify màn hình gọi.
- Call token bắt buộc cho accept/reject/end/WebRTC. Nếu REST tạo session nhưng client dùng socket flow, cần đảm bảo token được cấp qua `call_invited/call_incoming` hoặc `/api/calls/sessions/:id/token`.
- Reaction có cả legacy REST `/react` emit `message_reacted` và socket contract mới `reaction_*`; tránh cập nhật một phía làm lệch UI.
- Gateway file còn handler legacy/duplicate không được register trực tiếp sau khi đã delegate controller; khi sửa event nên sửa `socket/*.controller.ts` trước.
