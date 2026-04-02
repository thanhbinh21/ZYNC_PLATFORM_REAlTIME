# Story Feature – Đăng, Xóa, Xem, Reactions, Reply, TTL 24h

Tính năng **Story** cho ZYNC Platform: đăng story (ảnh/text/video), xóa, tự hết hạn 24h, xem story, thả cảm xúc (emoji reactions), trả lời story bằng tin nhắn, xem danh sách reactions.

---

## Phase 1 – Data Models & Validation Schemas

> **Mục tiêu:** Cập nhật models và tạo schemas — nền tảng cho toàn bộ logic phía sau.

### Backend

#### [MODIFY] [story.model.ts](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/modules/stories/story.model.ts)

```diff
-export type StoryMediaType = 'text' | 'image';
+export type StoryMediaType = 'text' | 'image' | 'video';
+export type StoryReactionType = '❤️' | '😂' | '😢' | '😡' | '👍' | '🔥';

 export interface IStory extends Document {
   userId: string;
   mediaType: StoryMediaType;
   mediaUrl?: string;
   content?: string;
+  backgroundColor?: string;
+  fontStyle?: string;
   viewerIds: string[];
-  expiresAt: Date;
+  reactions: { userId: string; type: StoryReactionType; createdAt: Date }[];
+  expiresAt: Date;
 }
```

- Thêm `'video'` vào `mediaType`
- Thay `likerIds` bằng mảng `reactions[]` chứa `{ userId, type, createdAt }`
- Thêm `backgroundColor`, `fontStyle` cho story text
- 6 loại reaction: ❤️ 😂 😢 😡 👍 🔥

---

#### [MODIFY] [message.model.ts](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/modules/messages/message.model.ts)

Thêm field `storyRef` để liên kết reply với story gốc:

```diff
 export interface IMessage extends Document {
   conversationId: string;
   senderId: string;
   content: string;
   type: MessageType;
   mediaUrl?: string;
+  storyRef?: {                // Reply từ story
+    storyId: string;
+    ownerId: string;
+    mediaType: StoryMediaType;
+    thumbnail?: string;       // URL ảnh/video thumbnail
+  };
   idempotencyKey: string;
 }
```

Khi user reply story → tạo/tìm direct conversation 1-1 → gửi message với `storyRef` chứa thông tin story gốc. Phía frontend sẽ render message này khác (hiện preview story + nội dung reply).

---

#### [NEW] [stories.schema.ts](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/modules/stories/stories.schema.ts)

| Schema | Mô tả |
|--------|--------|
| `CreateStorySchema` | `mediaType`, `mediaUrl` (nếu image/video), `content` (nếu text), `backgroundColor`, `fontStyle` |
| `ReactToStorySchema` | `type` – enum 6 loại emoji |
| `ReplyToStorySchema` | `content` – nội dung tin nhắn reply |

### ✅ Kiểm tra Phase 1

- Models compile thành công (không lỗi TypeScript)
- Schemas validate đúng input hợp lệ / từ chối input sai

---

## Phase 2 – Service Layer (Business Logic)

> **Mục tiêu:** Implement toàn bộ logic nghiệp vụ: tạo, xóa, xem, react, reply story.

### Backend

#### [NEW] [stories.service.ts](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/modules/stories/stories.service.ts)

| Function | Mô tả |
|----------|--------|
| `createStory(userId, dto)` | Tạo story, `expiresAt = now + 24h` |
| `deleteStory(userId, storyId)` | Xóa story (chỉ owner) |
| `getStoriesFeed(userId)` | Stories từ bạn bè, grouped by user |
| `getMyStories(userId)` | Stories của mình |
| `viewStory(userId, storyId)` | `$addToSet viewerIds` |
| `reactToStory(userId, storyId, type)` | Thêm/cập nhật reaction (1 user = 1 reaction) |
| `removeReaction(userId, storyId)` | Xóa reaction |
| `getStoryReactions(userId, storyId)` | Danh sách reactions (chỉ owner) |
| `getStoryViewers(userId, storyId)` | Danh sách viewers (chỉ owner) |
| `replyToStory(userId, storyId, content)` | Tìm/tạo direct conversation → gửi message với `storyRef` |

### ✅ Kiểm tra Phase 2

- Unit test cho từng function trong service
- Đảm bảo logic `expiresAt`, permission check, reaction uniqueness

---

## Phase 3 – REST API (Controller + Routes)

> **Mục tiêu:** Expose API cho frontend qua HTTP endpoints, kết nối controller → service.

### Backend

#### [NEW] [stories.controller.ts](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/modules/stories/stories.controller.ts)

Request handlers theo pattern [friends.controller.ts](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/modules/friends/friends.controller.ts).

---

#### [MODIFY] [stories.routes.ts](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/modules/stories/stories.routes.ts)

| Method | Endpoint | Handler |
|--------|----------|---------|
| `GET` | `/api/stories` | `getStoriesFeedHandler` |
| `GET` | `/api/stories/me` | `getMyStoriesHandler` |
| `POST` | `/api/stories` | `createStoryHandler` + [validateBody(CreateStorySchema)](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/shared/middleware/validate.middleware.ts#5-18) |
| `DELETE` | `/api/stories/:storyId` | `deleteStoryHandler` |
| `POST` | `/api/stories/:storyId/view` | `viewStoryHandler` |
| `POST` | `/api/stories/:storyId/react` | `reactToStoryHandler` + [validateBody(ReactToStorySchema)](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/shared/middleware/validate.middleware.ts#5-18) |
| `DELETE` | `/api/stories/:storyId/react` | `removeReactionHandler` |
| `GET` | `/api/stories/:storyId/reactions` | `getStoryReactionsHandler` |
| `GET` | `/api/stories/:storyId/viewers` | `getStoryViewersHandler` |
| `POST` | `/api/stories/:storyId/reply` | `replyToStoryHandler` + [validateBody(ReplyToStorySchema)](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/shared/middleware/validate.middleware.ts#5-18) |

> 10 endpoints. Tất cả đều yêu cầu [authenticate](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/shared/middleware/auth.middleware.ts#10-45).

### ✅ Kiểm tra Phase 3

Chạy integration test:

```bash
cd apps/server && npx jest tests/integration/stories.routes.test.ts --verbose
```

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Create text story | 201, `expiresAt = now + 24h` |
| 2 | Create image story | 201, có `mediaUrl` |
| 3 | Create video story | 201, `mediaType = 'video'` |
| 4 | Thiếu `content` (text type) | 400 |
| 5 | Thiếu `mediaUrl` (image type) | 400 |
| 6 | Delete own story | 200, story xóa khỏi DB |
| 7 | Delete story người khác | 403 |
| 8 | View story | 200, user thêm vào `viewerIds` |
| 9 | React ❤️ to story | 200, reaction lưu đúng type |
| 10 | React lần 2 → cập nhật (không duplicate) | 200, chỉ 1 reaction/user |
| 11 | Remove reaction | 200, reaction bị xóa |
| 12 | Get reactions (owner) | 200, danh sách reactions |
| 13 | Get reactions (non-owner) | 403 |
| 14 | Reply to story | 201, message có `storyRef` |
| 15 | Get feed (bạn bè) | 200, grouped by user |
| 16 | Get my stories | 200, chỉ story của mình |

---

## Phase 4 – Realtime (Socket.IO)

> **Mục tiêu:** Thêm socket events để story reactions & replies hiển thị realtime.

### Backend

#### [MODIFY] [gateway.ts](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/server/src/socket/gateway.ts)

Thêm socket events cho story realtime:

| Event | Direction | Payload | Mô tả |
|-------|-----------|---------|--------|
| `story_reaction` | Server → Client | `{ storyId, userId, reactionType, displayName }` | Thông báo realtime khi có người react |
| `story_reply` | Server → Client | `{ storyId, senderId, content, displayName }` | Thông báo realtime khi có người reply |

### ✅ Kiểm tra Phase 4

- Mở 2 browser tabs, đăng nhập 2 user → react/reply story → kiểm tra event realtime

---

## Phase 5 – Frontend Service & Hook

> **Mục tiêu:** Tạo API service và React hook để frontend giao tiếp với backend.

### Frontend

#### [NEW] [stories.ts](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/web/src/services/stories.ts)

| Function | API |
|----------|-----|
| `fetchStoriesFeed()` | `GET /api/stories` |
| `fetchMyStories()` | `GET /api/stories/me` |
| `createStory(data)` | `POST /api/stories` |
| `deleteStory(storyId)` | `DELETE /api/stories/:storyId` |
| `viewStory(storyId)` | `POST /api/stories/:storyId/view` |
| `reactToStory(storyId, type)` | `POST /api/stories/:storyId/react` |
| `removeReaction(storyId)` | `DELETE /api/stories/:storyId/react` |
| `fetchReactions(storyId)` | `GET /api/stories/:storyId/reactions` |
| `replyToStory(storyId, content)` | `POST /api/stories/:storyId/reply` |

---

#### [NEW] [use-stories.ts](file:///d:/nam%204%20ki%202/Cong%20Nghe%20Moi/ZYNC_PLATFORM_REAlTIME/apps/web/src/hooks/use-stories.ts)

React hook: load feed, create, delete, react, reply, socket listeners cho realtime updates.

### ✅ Kiểm tra Phase 5

- Gọi thử API từ browser console hoặc test component đơn giản
- Kiểm tra hook trả về data đúng cấu trúc

---

## Phase 6 – UI Components (Atomic Design)

> **Mục tiêu:** Xây dựng toàn bộ giao diện Story theo Atomic Design pattern.

### Frontend

#### [NEW] Story Components – `apps/web/src/components/stories/`

| Level | Component | Mô tả |
|-------|-----------|--------|
| **atoms** | `StoryAvatar.tsx` | Avatar tròn viền gradient (chưa xem = xanh, đã xem = xám) |
| **atoms** | `StoryProgressBar.tsx` | Thanh progress auto-advance |
| **atoms** | `ReactionButton.tsx` | Nút emoji đơn lẻ (❤️😂😢😡👍🔥) |
| **molecules** | `StoryCard.tsx` | Card preview (avatar + username + thumbnail) |
| **molecules** | `StoryCreateModal.tsx` | Modal tạo story: chọn text/image/video, upload, preview |
| **molecules** | `ReactionPicker.tsx` | Thanh chọn 6 emoji reactions (pop-up khi nhấn) |
| **molecules** | `StoryReplyInput.tsx` | Input box trả lời story (góc dưới viewer) |
| **molecules** | `StoryReactionsModal.tsx` | Modal danh sách reactions (grouped by emoji type) |
| **organisms** | `StoryBar.tsx` | Thanh ngang cuộn story avatars (Home page) |
| **organisms** | `StoryViewer.tsx` | Fullscreen viewer: ảnh/text/video, progress, reaction picker, reply input, swipe |
| | `stories.types.ts` | TypeScript interfaces |

---

#### [MODIFY] Home page integration

Thêm `<StoryBar />` vào đầu trang Home.

### ✅ Kiểm tra Phase 6

- Tất cả component render không lỗi
- Responsive trên mobile/desktop
- Animation mượt (reaction picker, progress bar, swipe)

---

## Phase 7 – Integration Testing & Polish

> **Mục tiêu:** Kiểm tra end-to-end toàn bộ flow, fix bugs, polish UX.

### Manual Verification

1. Mở web → kiểm tra **StoryBar** trên Home
2. Tạo text story (chọn màu nền) → xem fullscreen
3. Tạo image story → xem fullscreen
4. Thả reaction ❤️😂😢 trên story bạn bè → kiểm tra animation
5. Reply story → kiểm tra tin nhắn xuất hiện trong chat 1-1 với story preview
6. Xóa story → không còn hiển thị
7. Xem danh sách reactions (chỉ story của mình)

### Automated Tests

```bash
cd apps/server && npx jest tests/integration/stories.routes.test.ts --verbose
```

---

## Tóm tắt Phases

| Phase | Nội dung | Files chính |
|-------|----------|-------------|
| **1** | Data Models & Schemas | `story.model.ts`, `message.model.ts`, `stories.schema.ts` |
| **2** | Service Layer | `stories.service.ts` |
| **3** | REST API | `stories.controller.ts`, `stories.routes.ts` |
| **4** | Realtime Socket | `gateway.ts` |
| **5** | Frontend Service & Hook | `stories.ts`, `use-stories.ts` |
| **6** | UI Components | 11 components (Atomic Design) |
| **7** | Integration & Polish | E2E testing, bug fixes |
