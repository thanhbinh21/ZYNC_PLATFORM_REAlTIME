# 07. Frontend Web

## Kiến trúc Next.js App Router

Web app nằm trong `apps/web`, dùng Next.js 14 App Router.

Entry files:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/providers.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/(dashboard)/layout.tsx`

Routes:

| Route | File | Màn hình |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | landing/home marketing-ish |
| `/auth` | `src/app/auth/page.tsx` | login/register/OTP/password/Google flow |
| `/onboarding` | `src/app/onboarding/page.tsx` | developer profile setup |
| `/home` | `src/app/(dashboard)/home/page.tsx` | dashboard/home |
| `/chat` | `src/app/(dashboard)/chat/page.tsx` | chat |
| `/friends` | `src/app/(dashboard)/friends/page.tsx` | friends |
| `/community` | `src/app/(dashboard)/community/page.tsx` | posts/community |
| `/explore` | `src/app/(dashboard)/explore/page.tsx` | discover channels/users |
| `/profile` | `src/app/(dashboard)/profile/page.tsx` | profile |
| `/settings` | `src/app/(dashboard)/settings/page.tsx` | settings |

## Component structure

| Folder | Vai trò |
| --- | --- |
| `components/auth/login` | login screen theo atoms/molecules/organisms |
| `components/home` | landing/home marketing components |
| `components/home-dashboard` | dashboard/chat panel, notification hub, call overlay, message UI |
| `components/friends` | friends screen, list/search/request UI |
| `components/community` | post/comment panels |
| `components/ai-assistant` | assistant box UI |
| `components/notifications` | in-app notification toasts |
| `components/shared` | sidebar, header, toast, skeleton, logo, modal |

Code dùng pattern atoms/molecules/organisms ở một số vùng nhưng chưa đồng nhất toàn repo.

## Services/hooks/store

Service layer:

- `src/services/api.ts`: Axios base URL, `withCredentials`, Authorization từ cookie `accessToken`, refresh 401.
- `src/services/socket.ts`: Socket singleton và helper events.
- `src/services/auth.ts`: auth API.
- `src/services/chat.ts`: messages/upload/reaction REST.
- `src/services/friends.ts`, `groups.ts`, `posts.ts`, `notifications.ts`, `web-push.ts`, `users.ts`, `explore.ts`.
- `src/services/ai-assistant.ts`, `ai-catchup.ts`, `ai-reminder.ts`.

Hooks:

- `src/hooks/use-messaging.ts`: chat state/socket integration.
- `src/hooks/use-notifications.ts`: notification fetch/toasts.
- `src/hooks/use-home-dashboard.ts`, `use-friends-dashboard.ts`, `use-ai-assistant.ts`, `use-login-form.ts`.

Stores:

- `src/stores/call-store.ts`: active call state.
- `src/stores/profile-store.ts`: profile state.

Context:

- `src/context/media-viewer-context.tsx`.

## Auth/session handling

Web uses:

- `apps/web/src/services/auth.ts` for API calls.
- `apps/web/src/services/api.ts` stores/reads `accessToken` in JS-readable cookie via `js-cookie`.
- Refresh request: `POST /api/auth/refresh` with `withCredentials:true`.
- `current-token` endpoint exists for httpOnly cookie retrieval but web service currently reads cookie directly.

Rủi ro:

- Code comment nói refresh token cookie httpOnly, nhưng access token cookie dùng JS-readable cookie. Cần review XSS/token exposure.
- Response refresh interceptor expects `{accessToken}` while server returns `{success:true,accessToken}`; works because it reads `data.accessToken`, but type says only `{accessToken}`.

## Socket usage

`src/services/socket.ts`:

- Resolves WS URL from `NEXT_PUBLIC_WS_URL`, with LAN hostname adaptation.
- Auth by `accessToken`.
- Auto reconnect.
- Heartbeat every 50s after connect.
- Exposes helpers: join/leave conversation, send message, status, typing, delete/recall/forward, call/WebRTC, reaction, AI events, error listener.

Main UI integration:

- `hooks/use-messaging.ts`
- `components/home-dashboard/organisms/GlobalCallListener.tsx`
- `components/home-dashboard/organisms/ActiveCallOverlay.tsx`
- `components/notifications/InAppNotificationToasts.tsx`

## UI theme/design tokens

Files:

- `apps/web/tailwind.config.js`
- `apps/web/src/app/globals.css`

Theme uses CSS variables:

- Background: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--surface-*`
- Text: `--text-primary`, `--text-secondary`, `--text-tertiary`
- Accent: `--accent`, `--accent-hover`, `--accent-light`, `--accent-strong`
- Border/shadow/radius: `--border*`, `--shadow*`, `--radius*`
- Dark mode via `[data-zync-theme='dark']`
- Message size via `[data-zync-message-size]`

Tailwind maps variables to semantic colors like `bg.primary`, `surface.soft`, `accent`, `text.primary`.

## Các màn hình chính

| Màn hình | File chính | Data/services |
| --- | --- | --- |
| landing | `src/app/page.tsx`, `components/home/*` | local/mock data |
| auth | `src/app/auth/page.tsx`, `components/auth/login/*`, `hooks/use-login-form.ts` | `services/auth.ts` |
| onboarding | `src/app/onboarding/page.tsx` | `apiClient.patch('/api/users/me')` |
| home/dashboard | `src/app/(dashboard)/home/page.tsx`, `components/home-dashboard/organisms/home-dashboard-screen.tsx` | conversations/friends/notifications/hooks |
| chat | `src/app/(dashboard)/chat/page.tsx`, `use-messaging.ts`, message components | `services/chat.ts`, `services/socket.ts`, upload |
| friends | `src/app/(dashboard)/friends/page.tsx`, `components/friends/*` | `services/friends.ts`, `services/users.ts` |
| community | `src/app/(dashboard)/community/page.tsx`, `community-content.tsx`, `components/community/*` | `services/posts.ts` |
| explore | `src/app/(dashboard)/explore/page.tsx`, `explore-content.tsx` | `services/explore.ts` |
| profile | `src/app/(dashboard)/profile/page.tsx` | `services/users.ts`, profile store |
| settings | `src/app/(dashboard)/settings/page.tsx` | `account-settings.ts`, notifications prefs |
| call UI | `GlobalCallListener.tsx`, `ActiveCallOverlay.tsx`, `call-store.ts` | socket call events, TURN env |
| AI assistant | `components/ai-assistant/*`, `hooks/use-ai-assistant.ts` | `services/ai-assistant.ts` |

## Rủi ro UI hiện tại và điểm dễ lỗi

- `apps/web/src/services/socket.ts` dài và giữ nhiều contract thủ công; dễ lệch với mobile/server.
- Listener registry Web thường chỉ giữ một callback mỗi event; nếu nhiều component subscribe cùng event có thể ghi đè.
- `globals.css` rất lớn, chứa nhiều class custom; thay đổi token có blast radius rộng.
- Có mock data trong `components/home-dashboard/mock-data.ts` và `chat-mock-data.ts`; cần phân biệt màn hình dùng real API hay mock.
- Chat là vùng rủi ro cao: optimistic message, media upload, reply, reaction, delete/recall, read status, call history cùng hội tụ.
- Call UI phụ thuộc WebRTC browser APIs và TURN env `NEXT_PUBLIC_TURN_*`; cần test bằng hai client thật.
