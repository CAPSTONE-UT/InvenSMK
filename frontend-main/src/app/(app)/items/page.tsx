import { Suspense } from 'react';
import { ItemsView } from './items-view';

export default function ItemsPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">Memuat data barang...</p>}>
      <ItemsView />
    </Suspense>
  );
}
