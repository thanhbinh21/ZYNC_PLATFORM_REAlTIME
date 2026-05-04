# ZYNC Platform: Unified Implementation Roadmap
**Ngày lập:** 02/05/2026
**Mục tiêu:** Đồng bộ kiến trúc Backend chuẩn Senior + Hoàn thiện tính năng Web/Mobile + Tích hợp AI thông minh.

---

## 🚀 Giai đoạn 1: Chuẩn hóa Kiến trúc & Hạ tầng (Ưu tiên SỐ 1)
*Dựa trên đánh giá Tech Stack – Cần làm ngay để tránh nợ kỹ thuật khi mở rộng Plan A/B.*

### 1.1. Backend Refactoring (Critical)
- [x] **IoC Container:** Đã cài `awilix`, tạo `src/container.ts`, đăng ký Repositories dưới dạng Singleton.
- [x] **Repository Pattern:** Tạo `BaseRepository`, `MessageRepository`, `PostRepository`, `CommentRepository`. Service chưa migrate (còn static methods – xem bước tiếp theo).
- [x] **Schema-driven Validation:** `Zod` đã có sẵn + `validate.middleware.ts` đã hoạt động. Cần bổ sung schemas cho các module còn thiếu.
- [x] **Global Error Handling:** Xây dựng `error-handler.middleware.ts` chuẩn hóa 5 loại lỗi (AppError, Zod, MongoDB, JWT, Unknown) với format `ErrorResponse` thống nhất.

### 1.1.1 Còn lại (Service Migration)
- [x] **Migrate MessagesService:** Inject `MessageRepository`, thay `MessageModel.findOne/find` bằng `repo.findByIdempotencyKey()` + `repo['model'].find()`. Static methods giữ nguyên API (backward-compatible).
- [x] **Migrate PostsService:** Inject `PostRepository + CommentRepository`, thay `PostModel/CommentModel` bằng `postRepo.findFeed/findTrending/toggleLike/toggleBookmark/incrementViews` và `commentRepo.create/findByPost`. Static methods giữ nguyên API (backward-compatible).

### 1.2. Infrastructure Optimization
- [x] **Kafka Resiliency:** Triển khai Dead Letter Queue (DLQ) + Retry Topics. Worker subscribe cả `raw-messages` và `raw-messages.retry`. Max 3 retries → auto route sang DLQ.
- [x] **Socket Modularization:** Tách Call + WebRTC events ra `call.controller.ts` và Chat events (send_message, read, delivered, delete, recall, forward) ra `chat.controller.ts`. `gateway.ts` giảm từ 2184 → **2061 dòng**.
- [x] **Socket Modularization:** Tách Reaction events (`reaction_upsert`, `reaction_remove_all_mine`) ra `reaction.controller.ts` và Story emit functions (`emitStoryReaction`, `emitStoryReply`) ra `story.controller.ts`. `gateway.ts` giảm thêm ~370 dòng, còn **~1300 dòng**.

---

## 📱 Giai đoạn 2: Hoàn thiện tính năng (Plan A - Feature Parity)
*Mục tiêu: Xóa bỏ khoảng cách giữa Web và Mobile.*

### 2.1. Mobile Community & Explore
- [ ] **Community Feed:** Port toàn bộ tính năng bài viết, like, comment sang Mobile.
- [ ] **Explore Screen:** Trang khám phá Channels, Developers và Trending Posts trên Mobile.

### 2.2. Core Systems Completion
- [ ] **Presence System:** Hệ thống online/offline và last seen (real-time qua Redis).
- [ ] **Stories Full-flow:** Cho phép tạo story (Text/Image) trên Web và xem danh sách Viewers trên cả 2 nền tảng.
- [ ] **Push Notifications:** Hoàn thiện client-side handling cho Expo (Deep linking khi tap thông báo).

---

## 🤖 Giai đoạn 3: AI Intelligence & Personalization (Plan B)
*Tạo điểm nhấn khác biệt cho nền tảng.*

- [ ] **Semantic Search:** Kết hợp MongoDB Atlas Search và pgvector cho tìm kiếm theo ngữ nghĩa.
- [ ] **AI Personal Assistant:** Trợ lý thông minh hỗ trợ 8 function calling (search, schedule, summarize...).
- [ ] **Developer DNA:** Hệ thống đánh giá kỹ năng và "Radar Chart" cho profile developer.

---

## 🛠️ Giai đoạn 4: Tối ưu & Phát hành (Plan C & R7)
*Đảm bảo hệ thống chịu tải và bảo mật trước khi Launch.*

- [ ] **Performance:** Tối ưu Aggregation, Indexing MongoDB và cơ chế Caching Redis.
- [ ] **Security:** Hardening CSP, CORS, Rate Limit và XSS Prevention.
- [ ] **Testing:** Load test hệ thống chat/call và viết Integration Tests cho core logic.
- [ ] **Deployment:** EAS Build cho Mobile và Vercel/Docker cho Web/Server.

---

## 📅 Những gì cần làm tiếp theo (Immediate Next Steps)

1. **Bước 1: Refactor Backend Architecture (Ngay lập tức)**
   - Triển khai **Awilix IoC** và **Global Error Handler**. 
   - Đây là nền móng để bạn không phải sửa code nhiều lần khi thêm tính năng ở bước sau.
2. **Bước 2: Mobile Community & Explore (Độ ưu tiên cao)**
   - Web đã có đủ logic, việc port sang Mobile giúp dự án trông "hoàn thiện" hơn rất nhiều để demo.
3. **Bước 3: Presence & Push Notifications**
   - Hoàn thiện trải nghiệm real-time, làm cho ứng dụng có cảm giác "sống" hơn.
