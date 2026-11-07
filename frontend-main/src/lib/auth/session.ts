import type { UserRole, UserSession } from '@/types/api';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const EXPIRES_AT_KEY = 'access_token_expires_at';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession) {
  const store = storage();
  if (!store) return;
  store.setItem(ACCESS_TOKEN_KEY, session.access_token);
  store.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  store.setItem(EXPIRES_AT_KEY, String(session.expires_at));
}

export function getAccessToken() {
  return storage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function getRefreshToken() {
  return storage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function hasSession() {
  return getAccessToken() !== null;
}

export function clearSession() {
  const store = storage();
  if (!store) return;
  store.removeItem(ACCESS_TOKEN_KEY);
  store.removeItem(REFRESH_TOKEN_KEY);
  store.removeItem(EXPIRES_AT_KEY);
}

/** Halaman awal setelah login, sesuai peran. */
export function homePathForRole(role: UserRole) {
  if (role === 'staff') return '/my-loans';
  return '/dashboard';
}
