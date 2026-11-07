'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { homePathForRole } from '@/lib/auth/session';
import { roleLabels } from '@/lib/format';
import type { UserRole } from '@/types/api';

type IconName = 'home' | 'scan' | 'box' | 'folder' | 'swap' | 'clock' | 'users' | 'user';

const iconPaths: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  box: 'M21 8 12 3 3 8m18 0v8l-9 5m9-13-9 5m0 8-9-5V8m9 13v-8M3 8l9 5',
  folder: 'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  swap: 'M7 7h13l-4-4M17 17H4l4 4',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6m13 9v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.74',
  user: 'M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
};

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={iconPaths[name]} />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  roles: UserRole[];
  /** Ditampilkan pada bottom navbar HP. */
  mobile?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home', roles: ['admin', 'inventory_officer'] },
  { href: '/pindai', label: 'Pindai', icon: 'scan', roles: ['admin', 'inventory_officer'], mobile: true },
  { href: '/loans', label: 'Peminjaman', icon: 'swap', roles: ['admin', 'inventory_officer'], mobile: true },
  { href: '/loans/history', label: 'Riwayat', icon: 'clock', roles: ['admin', 'inventory_officer'], mobile: true },
  { href: '/items', label: 'Data barang', icon: 'box', roles: ['admin', 'inventory_officer'] },
  { href: '/categories', label: 'Kategori', icon: 'folder', roles: ['admin'] },
  { href: '/users', label: 'Pengguna dan peran', icon: 'users', roles: ['admin'] },
  { href: '/my-loans', label: 'Peminjaman saya', icon: 'clock', roles: ['staff'], mobile: true },
  { href: '/profil', label: 'Profil', icon: 'user', roles: ['admin', 'inventory_officer', 'staff'], mobile: true },
];

function isActive(pathname: string, href: string) {
  if (href === '/loans') return pathname === '/loans';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const items = navItems.filter((item) => item.roles.includes(profile.role));
  const mobileItems = items.filter((item) => item.mobile);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex print:hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <Link href={homePathForRole(profile.role)} className="text-lg font-semibold tracking-tight text-[#18345b]">InvenSMK</Link>
          <p className="mt-0.5 text-xs text-slate-500">SMK Madya Depok</p>
        </div>
        <nav aria-label="Navigasi utama" className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-blue-50 text-blue-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-medium">{profile.full_name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{roleLabels[profile.role]}</p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-3 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
          >
            {loggingOut ? 'Keluar...' : 'Keluar'}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 md:hidden print:hidden">
          <Link href={homePathForRole(profile.role)} className="text-base font-semibold tracking-tight text-[#18345b]">InvenSMK</Link>
          <span className="text-xs text-slate-500">{roleLabels[profile.role]}</span>
        </header>
        <main className="mx-auto max-w-6xl p-5 pb-28 md:p-8 md:pb-8 print:max-w-none print:p-0">{children}</main>
      </div>

      <nav
        aria-label="Navigasi HP"
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200 bg-white md:hidden print:hidden"
        style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
      >
        {mobileItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? 'text-blue-700' : 'text-slate-500'
              }`}
            >
              <Icon name={item.icon} />
              {item.label === 'Peminjaman' ? 'Aktif' : item.label === 'Peminjaman saya' ? 'Pinjaman' : item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
