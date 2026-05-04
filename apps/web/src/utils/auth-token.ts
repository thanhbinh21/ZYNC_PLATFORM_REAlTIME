/**
 * Auth token utilities – reads from httpOnly cookie set by server.
 * Access token is stored in httpOnly cookie 'accessToken'.
 * This file provides client-side read access (cookies are httpOnly so JS cannot write them).
 */
import Cookies from 'js-cookie';

const ACCESS_TOKEN_COOKIE_KEY = 'accessToken';

/**
 * Lay access token hien tai tu httpOnly cookie.
 * Tra ve null neu chua dang nhap hoac cookie da het han.
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return Cookies.get(ACCESS_TOKEN_COOKIE_KEY) ?? null;
}

/**
 * Xoa access token cookie (goi khi logout).
 */
export function clearAccessToken(): void {
  Cookies.remove(ACCESS_TOKEN_COOKIE_KEY);
  Cookies.remove('refreshToken');
}
