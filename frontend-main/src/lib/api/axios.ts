import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearSession, getAccessToken, getRefreshToken, saveSession } from '@/lib/auth/session';
import type { BaseResponse, LoginData } from '@/types/api';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({ baseURL });

/** Endpoint publik: tidak dikirimi token otomatis dan tidak memicu refresh. */
const publicPaths = ['/health', '/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'];

function isPublic(url: string | undefined) {
  return url !== undefined && publicPaths.includes(url.split('?')[0] ?? url);
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !isPublic(config.url) && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

/** Satu proses refresh dipakai bersama oleh request yang gagal bersamaan. */
function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(null);

  refreshPromise ??= axios
    .post<BaseResponse<LoginData>>(`${baseURL}/api/v1/auth/refresh`, { refresh_token: refreshToken })
    .then((response) => {
      const session = response.data.data?.session;
      if (!session) return null;
      saveSession(session);
      return session.access_token;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/** Dipanggil saat session tidak dapat dipulihkan; diisi oleh AuthProvider (redirect ke login). */
let onSessionExpired: () => void = () => {};

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

api.interceptors.response.use(undefined, async (error: AxiosError<BaseResponse>) => {
  const config = error.config as RetriableConfig | undefined;
  const isAuthError =
    error.response?.status === 401 && error.response.data?.error?.code === 'AUTHENTICATION_ERROR';

  if (!config || !isAuthError || isPublic(config.url) || config.url === '/api/v1/auth/logout') {
    throw error;
  }

  if (!config._retried) {
    config._retried = true;
    const newToken = await refreshAccessToken();
    if (newToken) {
      config.headers.Authorization = `Bearer ${newToken}`;
      return api(config);
    }
  }

  clearSession();
  onSessionExpired();
  throw error;
});
