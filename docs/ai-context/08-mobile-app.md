# 08. Mobile App

## Kiến trúc Expo/React Native

Mobile app nằm trong `apps/mobile`, dùng Expo Router.

Entry points:

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/index.tsx`
- `apps/mobile/app/(tabs)/_layout.tsx`

Config:

- `apps/mobile/app.json`
- `apps/mobile/eas.json`
- `apps/mobile/babel.config.js`
- `apps/mobile/tsconfig.json`
- `apps/mobile/scripts/set-env-ip.js`

## Routes/tabs/screens

| Route | File | Vai trò |
| --- | --- | --- |
| `/` | `app/index.tsx` | auth/onboarding redirect |
| Auth layout | `app/(auth)/_layout.tsx` | auth stack |
| Welcome | `app/(auth)/welcome.tsx` | welcome |
| Login | `app/(auth)/login.tsx` | login password/OTP |
| Register | `app/(auth)/register.tsx` | register |
| Verify OTP | `app/(auth)/verify-otp.tsx` | verify |
| Forgot password | `app/(auth)/forgot-password.tsx` | reset |
| Onboarding | `app/(auth)/onboarding.tsx` | profile setup |
| Tabs layout | `app/(tabs)/_layout.tsx` | bottom tabs |
| Home | `app/(tabs)/home.tsx` | dashboard |
| Chat list | `app/(tabs)/chat.tsx` | conversations |
| Friends | `app/(tabs)/friends.tsx` | friends |
| Community | `app/(tabs)/community.tsx` | posts feed |
| Profile | `app/(tabs)/profile.tsx` | profile |
| Chat room | `app/chat-room.tsx` | message thread |
| Call screen | `app/call-screen.tsx` | WebRTC call UI |
| Create group | `app/create-group.tsx` | group creation |
| Group info | `app/group-info.tsx` | group settings/members |
| Explore | `app/explore.tsx` | discover |
| Notifications | `app/notifications.tsx` | notification list |
| Post detail | `app/post-detail.tsx` | post/comments |
| Settings | `app/settings.tsx` | settings/logout/theme |

## Auth storage

Files:

- `apps/mobile/src/services/auth.ts`
- `apps/mobile/src/services/api.ts`
- `apps/mobile/src/store/useAuthStore.ts`

Behavior:

- `useAuthStore` hydrates on import.
- Token is loaded from `services/auth.ts` helpers (`getToken`, `saveToken`, `removeToken`, `getRefreshToken`).
- Axios interceptor attaches Bearer token.
- On 401, mobile calls `POST {API_URL}/auth/refresh` with body `{refreshToken}`, saves new access token, retries request.

Storage backend is likely SecureStore/AsyncStorage from dependencies, but exact implementation should be read in `apps/mobile/src/services/auth.ts` before modifying token persistence.

## API/socket services

API:

- `src/services/api.ts` computes `API_URL`.
- Default Android emulator URL: `http://10.0.2.2:3000/api`.
- If `EXPO_PUBLIC_API_URL` exists, use it.
- In dev with Expo `hostUri`, use LAN host `http://{host}:3000/api`.

Socket:

- `src/services/socket.ts` computes `SOCKET_URL`.
- Auth token loaded async from storage.
- Refreshes token on `connect_error` if message is `Invalid auth token` or `Missing auth token`.
- Uses listener registry with multiple callbacks per event.
- Provides chat, reaction, moderation, call/WebRTC helper functions.

Domain services:

- `posts.ts`, `notifications.ts`, `explore.ts`, `calls.ts`, `push-notifications.ts`.
- Mobile has no full AI assistant service observed in `src/services`; AI feature parity with web appears partial.

## Theme/design token mapping với Web

Files:

- `apps/mobile/src/theme/colors.ts`
- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/theme/get-app-theme.ts`
- `apps/mobile/src/store/useAppPreferencesStore.ts`

Mobile light theme mirrors Web teal/mint tokens:

- Web `--accent #0f9d8e` -> mobile `lightTheme.accent`.
- Web light background -> mobile `#F4FBF8`, surface `#FFFFFF`.
- Dark theme constants exist in `colors.ts`, and settings exposes theme preference, but many aliases are light-first.

UI primitives:

- `src/ui/AppScreen.tsx`, `AppHeader.tsx`, `AppButton.tsx`, `Avatar.tsx`, `MessageBubble.tsx`, `ChatInputBar.tsx`, etc.

## Feature đã có/chưa có

| Feature | Mobile status theo code |
| --- | --- |
| Auth register/login/OTP/forgot | Có |
| Onboarding developer profile | Có |
| Chat list/room | Có |
| Message send/read/delivered/typing | Có |
| Media picker/upload | Có sử dụng `expo-image-picker` và chat-room logic |
| Sticker picker | Có |
| Reaction socket | Có |
| Delete/recall/forward | Có helper socket và UI trong chat-room |
| Friends | Có tab/service |
| Groups | Có create/group-info/chat integration |
| Community posts/comments | Có |
| Explore users/channels | Có |
| Notifications | Có context/sheet/screen/push service |
| WebRTC calls | Có `useVideoCall.ts`, `call-screen.tsx`, `react-native-webrtc` |
| AI assistant/catchup UI | Chưa xác định từ mobile services/screens; có thể chưa có hoặc partial |
| Web Push | Không áp dụng; mobile dùng Expo notifications/FCM flow |
| Stories | Chưa xác định từ codebase |

## Điểm khác biệt Web/Mobile

- Web dùng cookie `accessToken`; Mobile dùng persisted token/refresh token trong storage.
- Web socket URL dùng `NEXT_PUBLIC_WS_URL`; Mobile dùng `EXPO_PUBLIC_SOCKET_URL` hoặc Expo LAN host.
- Web listener registry có xu hướng one-listener-per-event; Mobile registry hỗ trợ nhiều listeners.
- Web có AI assistant services/components; Mobile chưa thấy AI assistant service tương đương.
- Mobile có rủi ro native permissions: notification, media picker, microphone/camera/WebRTC.
- Mobile route `chat-room.tsx` lớn và chứa nhiều state/UI logic nội tuyến; Web tách nhiều component hơn.

## Rủi ro đặc biệt trên mobile

| Rủi ro | File liên quan | Gợi ý verify |
| --- | --- | --- |
| Keyboard overlap trong chat | `app/chat-room.tsx` | test iOS/Android với long input, media draft |
| WebRTC native permissions và device lifecycle | `src/hooks/useVideoCall.ts`, `app/call-screen.tsx` | test accept/reject/end/background |
| Socket token refresh | `src/services/socket.ts`, `src/services/api.ts` | expire access token, verify reconnect |
| Push token registration duplication | `app/_layout.tsx`, `src/services/push-notifications.ts` | login/logout/relogin |
| Media picker/upload | `app/chat-room.tsx` | image/video/file size/network error |
| Type safety | `src/store/useAuthStore.ts`, `useVideoCall.ts`, socket listeners use `any` | run `npm run typecheck --workspace=apps/mobile` |
