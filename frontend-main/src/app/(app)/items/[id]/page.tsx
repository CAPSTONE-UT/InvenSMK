import { Suspense } from 'react';
import { ItemDetailView } from './item-detail-view';

export default function ItemDetailPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">Memuat barang...</p>}>
      <ItemDetailView />
    </Suspense>
  );
}
