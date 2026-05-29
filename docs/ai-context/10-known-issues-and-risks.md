# 10. Known Issues And Risks

| Mức độ | Mô tả | File liên quan | Hướng xử lý đề xuất | Verify sau khi sửa |
| --- | --- | --- | --- | --- |
| High | `GET /api/users/presence/bulk` có thể bị `/:userId` bắt trước vì route dynamic đặt trước route static. | `apps/server/src/modules/users/users.routes.ts` | Đưa `/presence/bulk` lên trước `/:userId` và `/:userId/public-profile`. | Integration test gọi `/api/users/presence/bulk`; `npm run test --workspace=apps/server -- users.routes` |
| High | `POST /api/messages/batch/read` có thể bị `GET /:conversationId` không ảnh hưởng method, nhưng route dynamic `/:messageId/read` và `/:conversationId` cần review thứ tự khi thêm endpoint mới. | `apps/server/src/modules/messages/messages.routes.ts` | Đặt static routes như `/batch/read` trước dynamic routes để tránh lỗi tương lai. | Test batch read và history. |
| High | `moderationAdminRouter` định nghĩa nhưng chưa mount; admin check TODO. | `apps/server/src/modules/ai/moderation/moderation.controller.ts`, `apps/server/src/app.ts` | Mount dưới `/api/admin/moderation` nếu cần, thêm RBAC/admin role middleware trước khi dùng thật. | Supertest 401/403/non-admin/admin; verify route reachable. |
| High | `GET /api/conversations/:conversationId` trả 501. | `apps/server/src/modules/conversations/conversations.routes.ts` | Implement detail endpoint hoặc xóa route khỏi client contract. | Integration test detail conversation. |
| High | Socket/Web/Mobile contract phân tán thủ công, nhiều `any`. | `apps/web/src/services/socket.ts`, `apps/mobile/src/services/socket.ts`, `packages/shared-types/src/index.ts` | Mở rộng shared-types cho call/reaction/AI events, dùng chung ở web/mobile/server. | `npm run typecheck`, targeted socket tests. |
| High | Chat/call gateway có duplicate legacy code trong `gateway.ts` sau khi đã delegate sang controllers. | `apps/server/src/socket/gateway.ts`, `apps/server/src/socket/*.controller.ts` | Xác định code path được register, xóa/di chuyển legacy sau test. | Socket integration tests chat/call/reaction. |
| Medium | Access token web lưu trong JS-readable cookie. | `apps/web/src/services/api.ts`, auth controller | Review threat model; cân nhắc httpOnly access cookie hoặc in-memory token + CSRF strategy. | Auth E2E, refresh/logout, XSS security review. |
| Medium | `POST /api/stickers` là admin comment nhưng public route. | `apps/server/src/modules/stickers/sticker.routes.ts` | Thêm authenticate + role/admin hoặc bỏ endpoint khỏi production. | Supertest public 401/403. |
| Medium | Posts API thiếu Zod validation. | `apps/server/src/modules/posts/posts.routes.ts`, `posts.controller.ts` | Thêm schema cho create/update/comment/feed query. | Unit/integration tests invalid payload. |
| Medium | AI moderation worker không thấy start trong `main.ts`, topic `moderation-actions` không nằm trong `KAFKA_TOPICS`. | `apps/server/src/main.ts`, `apps/server/src/modules/ai/moderation/moderation.worker.ts`, `infrastructure/kafka.ts` | Quyết định moderation sync hay async; nếu async thì add topic/start worker. | Integration moderation pipeline + Kafka local. |
| Medium | Group call mode `sfu` nhưng không thấy SFU infra/server. | `apps/server/src/modules/calls/calls.model.ts`, `calls.service.ts`, `socket/call.controller.ts` | Đổi naming thành group mesh hoặc thêm SFU architecture. | Multi-party call test 3 clients. |
| Medium | Web listener registry one-listener-per-event có thể làm component subscribe sau ghi đè component trước. | `apps/web/src/services/socket.ts` | Chuyển sang Set registry như mobile. | Mount multiple listeners in test/story; verify both fire. |
| Medium | Mobile `useAuthStore` dùng `any` cho user, route navigation cast `as any`, WebRTC nhiều `as any`. | `apps/mobile/src/store/useAuthStore.ts`, `apps/mobile/src/hooks/useVideoCall.ts` | Bổ sung shared types và narrow native WebRTC types. | `npm run typecheck --workspace=apps/mobile`. |
| Medium | `.env.example` comments có encoding bị lỗi khi đọc qua terminal hiện tại. | `.env.example`, `README.md` | Chuẩn hóa UTF-8 và kiểm tra editorconfig nếu cần. | Mở file bằng UTF-8, no mojibake. |
| Low | README roadmap nói nhiều phase pending nhưng code đã có nhiều feature. | `README.md` | Cập nhật README hoặc ghi rõ roadmap cũ. | Review docs consistency. |
| Low | `container.ts` tồn tại nhưng route/controller chủ yếu import trực tiếp, DI chưa dùng rộng. | `apps/server/src/container.ts`, modules | Hoặc dùng Awilix nhất quán, hoặc bỏ abstraction nếu chưa cần. | No unused/dead code lint. |
| Low | `project_overview.md`/`project_structure.md` root có thể trùng nội dung AI docs. | root docs | Giữ một source of truth hoặc link sang `docs/ai-context`. | Docs review. |

## Cách verify tối thiểu sau mọi thay đổi

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

Khi thay đổi backend route/socket:

```bash
npm run test --workspace=apps/server
npm run typecheck --workspace=apps/server
```

Khi thay đổi Web:

```bash
npm run typecheck --workspace=apps/web
npm run build --workspace=apps/web
```

Khi thay đổi Mobile:

```bash
npm run typecheck --workspace=apps/mobile
```
