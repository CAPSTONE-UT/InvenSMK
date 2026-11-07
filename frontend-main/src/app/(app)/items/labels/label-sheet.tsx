'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RequireRole } from '@/components/auth-provider';
import { BarcodeLabel } from '@/components/barcode-label';
import { Alert, Button, LoadingState, PageHeader } from '@/components/ui';
import { itemService } from '@/lib/api/inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { ItemDetail } from '@/types/api';

const uuidPattern = /^[0-9a-f-]{36}$/i;
const maxLabels = 60;

export function LabelSheet() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get('ids') ?? '')
    .split(',')
    .filter((id) => uuidPattern.test(id))
    .slice(0, maxLabels);
  const idsKey = ids.join(',');
  const [items, setItems] = useState<ItemDetail[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const list = idsKey ? idsKey.split(',') : [];
    if (list.length === 0) return;
    Promise.all(list.map((id) => itemService.get(id)))
      .then(setItems)
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Data label tidak dapat dimuat.')));
  }, [idsKey]);

  return (
    <RequireRole roles={['admin', 'inventory_officer']}>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Data barang"
          title="Cetak label barcode"
          description="Tempel label pada barang agar dapat dipindai dari kamera ponsel."
          actions={
            <>
              <Link href="/items" className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                Kembali
              </Link>
              <Button onClick={() => window.print()} disabled={!items?.length}>Cetak</Button>
            </>
          }
        />
      </div>
      {ids.length === 0 && <Alert tone="info">Pilih barang pada halaman Data barang, lalu klik Cetak label.</Alert>}
      {error && <Alert>{error}</Alert>}
      {ids.length > 0 && !items && !error && <LoadingState label="Menyiapkan label..." />}
      {items && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-2">
          {items.map((item) => (
            <BarcodeLabel key={item.id} code={item.barcode} name={item.name} category={item.category.name} />
          ))}
        </div>
      )}
    </RequireRole>
  );
}
