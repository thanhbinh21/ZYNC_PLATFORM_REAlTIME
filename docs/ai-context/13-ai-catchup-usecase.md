# 13. AI Catch-up Use Case Specification

## Mục tiêu

AI Catch-up giúp người dùng nhanh chóng nắm lại nội dung quan trọng của một cuộc trò chuyện khi có nhiều tin chưa đọc hoặc khi muốn xem lại đoạn trao đổi gần đây. Kết quả trả về là một digest gồm tiêu đề, tổng quan ngắn, các ý chính, quyết định, câu hỏi cần phản hồi, action items và gợi ý trả lời.

Phạm vi hiện tại tập trung vào chat 1-1, group và channel mà người dùng là member. Web đã có tích hợp trong chat panel và AI Assistant Box; mobile chưa thấy parity đầy đủ.

## Actor

| Actor | Vai trò |
| --- | --- |
| Người dùng đã đăng nhập | Yêu cầu tạo/xem/tạo lại digest cho conversation mình tham gia. |
| Web client | Hiển thị nút catch-up, trạng thái job, digest và realtime update. |
| AI worker | Lấy snapshot tin nhắn, gọi AI provider, lưu kết quả và phát realtime event. |
| AI provider | Sinh JSON summary từ prompt đã chuẩn hóa. |

## Tiền điều kiện

- Người dùng đã đăng nhập và có JWT hợp lệ.
- Người dùng là member của `conversationId`.
- `ConversationMember.aiPreferences.catchupEnabled` không phải `false`.
- Có tin nhắn visible để tóm tắt. Tin đã recall, deleted hoặc deleted-for-user không được đưa vào snapshot.
- Với xử lý bất đồng bộ, Kafka topic `ai-catchup-jobs` và AI provider cần được cấu hình. Nếu publish job lỗi, digest chuyển `failed`.

## Use Case UC-AI-CU-01: Tạo AI Catch-up Digest

### Trigger

- Người dùng bấm nút catch-up trong chat khi conversation có nhiều tin chưa đọc.
- Người dùng tạo digest từ tab Catch-up trong AI Assistant Box.
- Hệ thống có thể gợi ý tự động bằng trigger `auto` hoặc `auto_suggested`, tùy API surface.

### Luồng chính

1. Client gửi request tạo digest cho `conversationId`.
2. Server xác thực user và kiểm tra membership.
3. Server kiểm tra setting AI Catch-up của member.
4. Server tạo snapshot tin nhắn:
   - Ưu tiên tin chưa đọc của người dùng.
   - Nếu đi qua AI Assistant Box và không còn unread, có thể dùng mode `since_last_digest` hoặc `recent`.
   - Giới hạn snapshot tối đa 300 message gần nhất.
5. Server tính `cacheKey` từ user, conversation, mode và message boundary.
6. Nếu đã có digest cùng `cacheKey` ở trạng thái `queued`, `processing` hoặc `ready`, server trả lại digest hiện có.
7. Nếu chưa có, server tạo `AiCatchupDigest` trạng thái `queued`.
8. Với AI Assistant Box, server tạo hoặc cập nhật `AiAssistantItem` loại `catchup_digest`.
9. Server publish job vào Kafka topic `ai-catchup-jobs`.
10. Client nhận response và hiển thị trạng thái đang xử lý.
11. Worker nhận job, chuyển digest sang `processing`.
12. Worker load message theo snapshot, thêm context message trước đoạn cần tóm tắt nếu có.
13. Worker gọi AI provider và validate JSON output bằng schema.
14. Worker lưu `summary`, `futureSignals`, `model`, `generatedAt`, `omittedOlderCount`, chuyển status sang `ready`.
15. Worker đồng bộ suggested action items sang reminder/task.
16. Server emit realtime event cho user để client cập nhật UI.

### Kết quả thành công

Digest có trạng thái `ready` và chứa:

- `summary.title`
- `summary.overview`
- `summary.bullets`
- `summary.mentionedUserIds`
- `summary.sourceMessageRefs`
- `futureSignals.decisions`
- `futureSignals.questionsForUser`
- `futureSignals.actionItems`
- `futureSignals.suggestedReplies`

## Use Case UC-AI-CU-02: Xem digest mới nhất

### Luồng chính

1. Client mở conversation hoặc tab AI Catch-up.
2. Client gọi API lấy digest mới nhất theo `conversationId`.
3. Server kiểm tra membership và setting.
4. Server trả digest mới nhất hoặc `null`.
5. Client hiển thị digest nếu có; nếu status là `queued` hoặc `processing`, client tiếp tục chờ realtime event hoặc polling.

## Use Case UC-AI-CU-03: Regenerate digest

### Luồng chính

1. Người dùng bấm tạo lại digest.
2. Server kiểm tra digest/conversation thuộc user và user vẫn là member.
3. Server áp dụng rate limit regenerate.
4. Server reset status về `queued`, xóa summary/error/model cũ.
5. Server publish job mới.
6. Worker xử lý lại như UC-AI-CU-01.

### Kết quả thành công

Digest mới hoặc digest được reset chuyển sang `ready` với nội dung mới.

## Use Case UC-AI-CU-04: Bật/tắt AI Catch-up theo conversation

### Luồng chính

1. Người dùng bật/tắt AI Catch-up trong setting conversation.
2. Client gửi `{ catchupEnabled }`.
3. Server cập nhật `ConversationMember.aiPreferences.catchupEnabled`.
4. Server trả setting hiện tại.
5. Client cập nhật UI.

### Hành vi khi tắt

- User không thể tạo hoặc xem digest qua luồng yêu cầu membership có kiểm tra setting.
- Conversation bị loại khỏi danh sách catch-up trong AI Assistant Box.

## Luồng phụ và lỗi

| Mã | Tình huống | Hành vi mong đợi |
| --- | --- | --- |
| A1 | User không phải member | Trả 403. |
| A2 | Catch-up bị tắt cho conversation | Trả 403. |
| A3 | Không có tin nhắn visible | Trả 400. |
| A4 | Không có unread message ở endpoint trực tiếp `/api/ai/catchup/...` | Trả 400 `No unread messages available for AI Catch-up`. |
| A5 | Request bị debounce | Trả 429 `AI Catch-up request is already queued recently`. |
| A6 | Vượt daily limit manual/regenerate | Trả 429. |
| A7 | Kafka publish lỗi | Digest chuyển `failed`, có `error`, emit realtime update. |
| A8 | AI provider trả JSON không hợp lệ hoặc lỗi | Worker retry; nếu vẫn lỗi, digest chuyển `failed`. |
| A9 | Có digest cùng cacheKey | Trả lại digest/item hiện có, không tạo job trùng. |

## Business Rules

- Chỉ tóm tắt tin nhắn visible với user hiện tại.
- Không tóm tắt tin user tự gửi trong snapshot unread.
- Không được bịa quyết định, deadline, tên người hoặc action item.
- Context message chỉ dùng để hiểu ngữ cảnh, không được tóm tắt như nội dung unread chính.
- Output phải là JSON hợp lệ và pass schema server.
- `summary.bullets` tối đa 6 dòng khi worker lưu.
- `unreadCountHint` chỉ là hint, server vẫn đối chiếu với unread count lưu trong `Conversation` và `ConversationMember`.
- Snapshot lấy tối đa 300 message; worker tiếp tục cắt theo giới hạn prompt nếu quá dài.
- Direct catch-up endpoint dùng trigger `manual | auto_suggested`; AI Assistant endpoint dùng `manual | auto`.
- Web chat panel hiện chỉ hiển thị catch-up khi conversation enabled và unread count đủ ngưỡng UI, hoặc đã có digest.

## API Contract Liên Quan

### Direct Chat Catch-up

| Method | Path | Mục đích |
| --- | --- | --- |
| `POST` | `/api/ai/catchup/conversations/:conversationId/digests` | Tạo digest, trả `202`. |
| `GET` | `/api/ai/catchup/conversations/:conversationId/digests/latest` | Lấy digest mới nhất. |
| `GET` | `/api/ai/catchup/digests/:digestId` | Lấy digest theo id. |
| `POST` | `/api/ai/catchup/digests/:digestId/regenerate` | Tạo lại digest, trả `202`. |
| `PATCH` | `/api/ai/catchup/conversations/:conversationId/settings` | Bật/tắt catch-up. |

Body tạo digest:

```json
{
  "trigger": "manual",
  "unreadCountHint": 12,
  "toMessageRef": "optional-message-ref"
}
```

### AI Assistant Box Catch-up

| Method | Path | Mục đích |
| --- | --- | --- |
| `GET` | `/api/ai/assistant/catchup/unread-conversations` | Lấy danh sách conversation kèm AI state. |
| `POST` | `/api/ai/assistant/catchup` | Tạo digest và `AiAssistantItem`, trả `201`. |
| `GET` | `/api/ai/assistant/catchup/:conversationId` | Lấy item + digest mới nhất. |
| `POST` | `/api/ai/assistant/catchup/:conversationId/regenerate` | Tạo lại digest theo conversation. |
| `PATCH` | `/api/ai/assistant/conversations/:conversationId/settings` | Bật/tắt catch-up. |

Body tạo digest qua Assistant Box:

```json
{
  "conversationId": "conversation-id",
  "trigger": "manual",
  "unreadCountHint": 12,
  "toMessageRef": "optional-message-ref"
}
```

## Realtime Events

| Event | Payload chính | Client dùng để |
| --- | --- | --- |
| `ai_catchup_digest_updated` | `digestId`, `conversationId`, `status`, `summary?`, `error?`, `updatedAt` | Cập nhật chat panel direct catch-up. |
| `ai_assistant_item_updated` | `itemId`, `type`, `conversationId`, `status`, `title?`, `summarySnippet?`, `metadata?`, `detail?`, `error?`, `updatedAt` | Cập nhật AI Assistant Box. |

## Data Model

| Model | Vai trò |
| --- | --- |
| `AiCatchupDigest` | Lưu detail digest/job: message refs, status, summary, future signals, model, error. |
| `AiAssistantItem` | Index/feed item cho AI Assistant Box, trỏ tới digest qua `refId`. |
| `ConversationMember.aiPreferences.catchupEnabled` | Setting bật/tắt theo user-conversation. |
| `MessageStatus` | Xác định message nào đã đọc/chưa đọc. |
| `AiReminder` | Nhận suggested action items được sync từ digest. |

## Trạng thái

```text
queued -> processing -> ready
queued -> processing -> failed
queued -> failed
```

Ý nghĩa:

- `queued`: đã tạo digest/item và chờ worker.
- `processing`: worker đang build prompt/gọi AI.
- `ready`: đã có summary hợp lệ.
- `failed`: queue hoặc worker lỗi; có thể regenerate.

## Tiêu chí nghiệm thu

- User là member có thể tạo digest khi có unread visible messages.
- User không phải member không thể tạo/xem/regenerate digest.
- Khi catch-up bị tắt, API tạo/xem digest bị chặn và conversation không xuất hiện trong danh sách Assistant Catch-up.
- Tạo trùng cùng snapshot trả lại digest hiện có, không tạo nhiều job.
- Request liên tiếp trong thời gian debounce trả 429.
- Worker lưu summary đúng schema và emit realtime update.
- Khi AI provider lỗi, digest chuyển `failed` và UI hiển thị trạng thái lỗi.
- Regenerate reset summary cũ, queue job mới và cập nhật UI.
- Suggested action items trong digest được sync thành task/reminder.

## Test Gợi Ý

| Nhóm test | Case |
| --- | --- |
| API integration | Create latest/regenerate/settings với member hợp lệ. |
| Permission | Non-member, catchup disabled, digest không thuộc user. |
| Snapshot | Unread explicit, unread fallback theo count, recent/since-last-digest qua Assistant Box. |
| Rate limit | Debounce, manual daily limit, regenerate daily limit. |
| Worker | AI output hợp lệ, JSON invalid rồi retry, provider fail. |
| Realtime | Client nhận `ai_catchup_digest_updated` và `ai_assistant_item_updated`. |
| UI web | Chat panel hiển thị queued/processing/ready/failed; AI Box hydrate detail và regenerate. |

## Rủi ro / Điểm Cần Chốt

- Có hai surface API cho catch-up: direct chat và AI Assistant Box. Khi phát triển tiếp cần quyết định surface chính để tránh lệch behavior.
- Trigger enum đang khác nhau giữa hai surface: `auto_suggested` và `auto`.
- Mobile chưa có service/UI AI Assistant tương đương web.
- Nếu Kafka disabled hoặc AI provider thiếu config, feature chỉ tạo được trạng thái lỗi hoặc không hoàn tất.
- Worker prompt hiện yêu cầu tiếng Việt, nhưng tên fallback trong code còn không dấu (`Nguoi dung`, `Ban`).
