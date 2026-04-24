import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

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

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true, // send http-only cookie for refresh token
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from memory store
apiClient.interceptors.request.use((config) => {
  // Access token is stored in memory (not localStorage) for security
  const token = (globalThis as Record<string, unknown>)['__accessToken'] as string | undefined;
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
        (globalThis as Record<string, unknown>)['__accessToken'] = data.accessToken;
        return apiClient(err.config ?? { url: '/' });
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);
