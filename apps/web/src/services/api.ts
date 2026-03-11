import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
  baseURL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000',
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
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000'}/api/auth/refresh`,
          {},
          { withCredentials: true },
        );
        (globalThis as Record<string, unknown>)['__accessToken'] = data.data.accessToken;
        return apiClient(err.config ?? { url: '/' });
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);
