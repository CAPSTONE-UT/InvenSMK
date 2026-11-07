import { Suspense } from 'react';
import { ActiveLoansView } from './active-loans-view';

export default function LoansPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">Memuat peminjaman...</p>}>
      <ActiveLoansView />
    </Suspense>
  );
}
