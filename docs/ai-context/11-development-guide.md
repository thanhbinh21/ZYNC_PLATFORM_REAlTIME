# 11. Development Guide

## Quy tắc code style từ codebase hiện tại

- TypeScript strict-ish, dùng `type` imports khá nhiều.
- Backend dùng Express handler async và `next(err)` hoặc wrapper `asyncHandler` ở AI assistant.
- Validation ưu tiên Zod (`*.schema.ts`) + `validateBody` hoặc `safeParse` trong controller.
- Model dùng Mongoose schema ở module domain.
- API response thường bọc `{success:true,data}` nhưng còn legacy `{success:true,user}`; khi thêm mới nên dùng `{success:true,data}`.
- Error nên dùng `AppError` subclasses trong `apps/server/src/shared/errors`.
- Web/Mobile service layer gọi API; UI không nên hardcode endpoint nếu đã có service.

## Cách thêm backend module mới

1. Tạo thư mục `apps/server/src/modules/{module}`.
2. Thêm:
   - `{module}.routes.ts`
   - `{module}.controller.ts`
   - `{module}.service.ts`
   - `{module}.schema.ts` nếu có request body/query
   - `{module}.model.ts` nếu có collection
3. Mount router trong `apps/server/src/app.ts` bằng `app.use('/api/{module}', router)`.
4. Nếu route cần auth, dùng `authenticate`.
5. Nếu có body, dùng `validateBody(ZodSchema)` hoặc `safeParse` và trả 400 rõ ràng.
6. Thêm integration tests dưới `apps/server/tests/integration`.

## Cách thêm route API mới

- Đặt static route trước dynamic route (`/batch/read` trước `/:id`).
- Ghi schema ở `*.schema.ts`.
- Controller chỉ parse request/response, logic đặt ở service.
- Response shape nên là:

```ts
res.json({ success: true, data });
```

- Error nghiệp vụ dùng:
  - `BadRequestError`
  - `ForbiddenError`
  - `NotFoundError`
  - `AppError`

## Cách thêm socket event mới

1. Xác định domain controller:
   - chat: `apps/server/src/socket/chat.controller.ts`
   - reaction: `apps/server/src/socket/reaction.controller.ts`
   - call: `apps/server/src/socket/call.controller.ts`
   - generic presence/join: `apps/server/src/socket/gateway.ts`
2. Parse payload bằng function riêng, không trust `unknown`.
3. Kiểm tra membership nếu liên quan conversation:

```ts
await ConversationMemberModel.exists({ conversationId, userId });
```

4. Dùng room đúng:
   - user-targeted: `io.to(\`user:${userId}\`)`
   - conversation: `io.to(\`conv:${conversationId}\`)`
5. Cập nhật cả:
   - `packages/shared-types/src/index.ts`
   - `apps/web/src/services/socket.ts`
   - `apps/mobile/src/services/socket.ts`
   - `docs/ai-context/05-socket-contracts.md`
6. Thêm socket integration test nếu event thay đổi state quan trọng.

## Cách thêm màn hình Web

1. Thêm route trong `apps/web/src/app`.
2. Nếu thuộc dashboard, đặt dưới `apps/web/src/app/(dashboard)/{route}/page.tsx`.
3. Tách UI vào `apps/web/src/components/{feature}`.
4. Tạo service trong `apps/web/src/services/{feature}.ts`.
5. Dùng token CSS/Tailwind có sẵn (`surface`, `accent`, `text`, `border`) thay vì màu hardcode.
6. Nếu cần state global, cân nhắc Zustand store trong `src/stores`.

## Cách thêm màn hình Mobile

1. Thêm file route trong `apps/mobile/app`.
2. Nếu là tab, thêm dưới `app/(tabs)` và cập nhật tab layout.
3. Dùng UI primitives trong `apps/mobile/src/ui`.
4. Dùng theme từ `apps/mobile/src/theme`.
5. API gọi qua `apps/mobile/src/services/api.ts`.
6. Với màn hình cần permission, xử lý permission/error/loading rõ ràng.

## Cách thêm design token

Web:

1. Thêm CSS variable ở `apps/web/src/app/globals.css` trong `:root` và `[data-zync-theme='dark']`.
2. Map sang Tailwind nếu cần ở `apps/web/tailwind.config.js`.
3. Không hardcode token chỉ ở một component nếu token dùng lại.

Mobile:

1. Thêm vào `apps/mobile/src/theme/colors.ts`.
2. Map vào `tokens.ts` nếu dùng như semantic token.
3. Giữ mapping gần Web nếu feature tồn tại cả hai nền tảng.

## Cách chạy test/typecheck/lint

Root:

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

Server:

```bash
npm run typecheck --workspace=apps/server
npm run test --workspace=apps/server
npm run lint --workspace=apps/server
```

Web:

```bash
npm run typecheck --workspace=apps/web
npm run build --workspace=apps/web
npm run lint --workspace=apps/web
```

Mobile:

```bash
npm run typecheck --workspace=apps/mobile
```

## Quy tắc không phá vỡ contract Web/Mobile

- Không đổi event name socket nếu chưa cập nhật cả Web/Mobile.
- Không đổi response shape REST đang được service web/mobile parse.
- Khi đổi route, cập nhật:
  - server routes/controllers
  - web services
  - mobile services
  - shared-types
  - docs `04-api-contracts.md`
- Với message/call/reaction, luôn test ít nhất hai clients.
- Với auth, test cả Web cookie refresh và Mobile refresh token body.
- Với upload, test Cloudinary signature + verify trước khi gửi message media.
