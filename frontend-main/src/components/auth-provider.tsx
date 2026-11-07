'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '@/lib/api/auth';
import { setSessionExpiredHandler } from '@/lib/api/axios';
import { getApiErrorMessage } from '@/lib/api/errors';
import { clearSession, hasSession } from '@/lib/auth/session';
import type { UserProfile, UserRole } from '@/types/api';

interface AuthContextValue {
  profile: UserProfile;
  hasRole: (...roles: UserRole[]) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setSessionExpiredHandler(() => router.replace('/login'));

    if (!hasSession()) {
      router.replace('/login');
      return;
    }

    let active = true;
    authService
      .getProfile()
      .then((response) => {
        if (!active) return;
        if (response.data.data) setProfile(response.data.data);
        else setErrorMessage('Profil tidak ditemukan pada respons API.');
      })
      .catch((error: unknown) => {
        // 401 sudah ditangani interceptor (refresh atau kembali ke login).
        if (active) setErrorMessage(getApiErrorMessage(error, 'Profil tidak dapat dimuat. Coba lagi nanti.'));
      });

    return () => {
      active = false;
    };
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Token tetap dihapus di browser bila API logout tidak dapat dijangkau.
    } finally {
      clearSession();
      router.replace('/login');
    }
  }, [router]);

  const value = useMemo<AuthContextValue | null>(
    () =>
      profile === null
        ? null
        : { profile, hasRole: (...roles: UserRole[]) => roles.includes(profile.role), logout },
    [profile, logout],
  );

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <div className="max-w-md text-center">
          <p role="alert" className="text-sm text-red-800">{errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 text-sm font-semibold text-blue-800 hover:underline"
          >
            Muat ulang
          </button>
        </div>
      </main>
    );
  }

  if (value === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Memuat akun...
      </main>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Guard RBAC di sisi tampilan. Otorisasi sebenarnya tetap diperiksa backend (403). */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) return <Forbidden />;
  return <>{children}</>;
}

export function Forbidden() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-sm font-semibold text-slate-500">403</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Akses ditolak</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Peran akun Anda tidak memiliki izin untuk membuka halaman ini.
      </p>
    </div>
  );
}
