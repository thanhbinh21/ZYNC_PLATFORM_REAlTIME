import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

function resolveApiBaseUrl(): string {
  const explicitUrl = process.env['NEXT_PUBLIC_API_URL'];
  if (explicitUrl && typeof window === 'undefined') {
    return explicitUrl;
  }

  if (typeof window !== 'undefined') {
    if (explicitUrl) {
      try {
        const explicit = new URL(explicitUrl);
        const currentHost = window.location.hostname;
        const isExplicitLocal = explicit.hostname === 'localhost' || explicit.hostname === '127.0.0.1';
        const isCurrentLocal = currentHost === 'localhost' || currentHost === '127.0.0.1';

        if (!isExplicitLocal || isCurrentLocal) {
          return explicitUrl;
        }

        const port = explicit.port || '3000';
        return `${window.location.protocol}//${currentHost}:${port}`;
      } catch {
        return explicitUrl;
      }
    }

    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  return 'http://localhost:3000';
}

const apiBaseUrl = resolveApiBaseUrl();

const ACCESS_TOKEN_COOKIE_KEY = 'accessToken';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from httpOnly cookie (read via js-cookie)
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get(ACCESS_TOKEN_COOKIE_KEY);
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const err = error as AxiosError & { config?: InternalAxiosRequestConfig & { _retry?: boolean } };
    if (err.response?.status === 401 && !err.config?._retry) {
      if (err.config) err.config._retry = true;
      try {
        const { data } = await axios.post<{ accessToken: string }>(
          `${apiBaseUrl}/api/auth/refresh`,
          {},
          { withCredentials: true },
        );
        Cookies.set(ACCESS_TOKEN_COOKIE_KEY, data.accessToken, {
          httpOnly: false,
          secure: process.env['NODE_ENV'] === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60,
        });
        return apiClient(err.config ?? { url: '/' });
      } catch {
        Cookies.remove(ACCESS_TOKEN_COOKIE_KEY);
        Cookies.remove('refreshToken');
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);
