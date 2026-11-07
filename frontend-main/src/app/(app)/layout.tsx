import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { AuthProvider } from '@/components/auth-provider';

/** Area yang memerlukan login. Token disimpan di browser, sehingga guard berjalan di client. */
export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
