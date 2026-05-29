# 02. Project Structure

## Cây thư mục quan trọng

```text
zync-platform/
  apps/
    server/
      src/
        app.ts
        main.ts
        container.ts
        infrastructure/
        modules/
        shared/
        socket/
        workers/
      tests/
      scripts/
      package.json
    web/
      src/
        app/
        components/
        hooks/
        services/
        stores/
        context/
      public/
      package.json
      tailwind.config.js
      next.config.mjs
    mobile/
      app/
      src/
        components/
        context/
        hooks/
        services/
        store/
        theme/
        ui/
      assets/
      package.json
      app.json
      eas.json
  packages/
    shared-types/
      src/index.ts
  infra/
    docker-compose.yml
  docs/
  scripts/
  package.json
  .env.example
```

## `apps/server`

Vai trò: backend REST + realtime + workers.

Entry points:

- `apps/server/src/main.ts`: load `.env`, connect Mongo/Redis/Neon/Kafka, start workers, create HTTP server, init Socket.IO.
- `apps/server/src/app.ts`: Express app, middleware, `/health`, `/metrics`, mount route.

Config:

- `apps/server/tsconfig.json`
- `apps/server/jest.config.js`
- `apps/server/Dockerfile`
- `.env.example`

Test:

- `apps/server/tests/unit`
- `apps/server/tests/integration`

Seed/script:

- `apps/server/scripts/seed.ts`
- `apps/server/scripts/seed-stickers.ts`
- `apps/server/scripts/seed-month-data.ts`
- `apps/server/scripts/seed-friend-test-data.ts`
- `apps/server/scripts/reset-data.ts`
- `apps/server/scripts/dev-lan.js`

Backend module layout:

```text
modules/{domain}/
  *.routes.ts
  *.controller.ts
  *.service.ts
  *.schema.ts
  *.model.ts
```

Không phải module nào cũng đủ tất cả file. Ví dụ upload không có model; stickers không auth middleware public/admin mixed.

## `apps/web`

Vai trò: Next.js web client.

Entry points:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/providers.tsx`
- `apps/web/src/app/page.tsx`
- Dashboard route group: `apps/web/src/app/(dashboard)/layout.tsx`

Routes:

- `/`
- `/auth`
- `/onboarding`
- `/home`
- `/chat`
- `/friends`
- `/community`
- `/explore`
- `/profile`
- `/settings`

Service layer:

- `apps/web/src/services/api.ts`: Axios base, access token cookie, refresh handling.
- `apps/web/src/services/socket.ts`: Socket.IO client, chat/call/reaction/AI event helpers.
- Domain services: `auth.ts`, `chat.ts`, `friends.ts`, `groups.ts`, `posts.ts`, `notifications.ts`, `upload.ts`, `ai-*`.

State/store:

- `apps/web/src/stores/call-store.ts`
- `apps/web/src/stores/profile-store.ts`

Theme:

- `apps/web/tailwind.config.js`
- `apps/web/src/app/globals.css`

## `apps/mobile`

Vai trò: Expo Router mobile client.

Entry points:

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/index.tsx`
- `apps/mobile/app/(tabs)/_layout.tsx`

Routes/screens:

- Auth: `app/(auth)/welcome.tsx`, `login.tsx`, `register.tsx`, `verify-otp.tsx`, `forgot-password.tsx`, `onboarding.tsx`
- Tabs: `home.tsx`, `chat.tsx`, `friends.tsx`, `community.tsx`, `profile.tsx`
- Standalone: `chat-room.tsx`, `call-screen.tsx`, `create-group.tsx`, `group-info.tsx`, `explore.tsx`, `notifications.tsx`, `post-detail.tsx`, `settings.tsx`

Services:

- `apps/mobile/src/services/api.ts`
- `apps/mobile/src/services/auth.ts`
- `apps/mobile/src/services/socket.ts`
- `apps/mobile/src/services/calls.ts`
- `apps/mobile/src/services/posts.ts`
- `apps/mobile/src/services/notifications.ts`
- `apps/mobile/src/services/explore.ts`
- `apps/mobile/src/services/push-notifications.ts`

State/theme:

- `apps/mobile/src/store/useAuthStore.ts`
- `apps/mobile/src/store/useActiveCallStore.ts`
- `apps/mobile/src/store/useAppPreferencesStore.ts`
- `apps/mobile/src/theme/*`
- `apps/mobile/src/ui/*`

## `packages/shared-types`

Vai trò: contract TypeScript dùng chung cho server/web/mobile.

File chính:

- `packages/shared-types/src/index.ts`

Chứa:

- User, Friendship, Conversation, Message.
- Socket payload cho message/status/typing.
- AI catchup/reminder/assistant/group note types.
- Sticker types.
- API response wrappers.

Rủi ro: một số type frontend/mobile vẫn dùng `any`, và shared types không bao phủ toàn bộ REST/socket contract mới như call payload chi tiết.

## `infra`

Vai trò: local infrastructure.

File:

- `infra/docker-compose.yml`

Services:

- Redis `6379`
- Redpanda Kafka `9092`
- Redpanda Console `8080`
- coturn `3478`, relay `20000-20040`

## Nơi đặt config/env/docker/test

| Loại | Vị trí |
| --- | --- |
| Root scripts/workspaces | `package.json` |
| TypeScript base | `tsconfig.base.json`, `tsconfig.json` |
| Env template | `.env.example` |
| Docker local infra | `infra/docker-compose.yml` |
| Server test config | `apps/server/jest.config.js` |
| Server tests | `apps/server/tests` |
| Web config | `apps/web/next.config.mjs`, `apps/web/tailwind.config.js`, `apps/web/postcss.config.js` |
| Mobile config | `apps/mobile/app.json`, `apps/mobile/eas.json`, `apps/mobile/babel.config.js` |
| Seed scripts | `apps/server/scripts` |

## Điểm cần lưu ý

- `project_overview.md` và `project_structure.md` tồn tại ở root nhưng tài liệu này ưu tiên code hiện tại.
- `.env` tồn tại ở root nhưng không nên đưa giá trị thật vào docs.
- `apps/mobile/ts_errors.txt` tồn tại; nên xem khi xử lý typecheck mobile.
