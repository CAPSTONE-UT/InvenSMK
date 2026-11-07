'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RequireRole, useAuth } from '@/components/auth-provider';
import { ItemForm } from '@/components/item-form';
import {
  Alert,
  Button,
  Card,
  ConditionBadge,
  EmptyState,
  ItemStatusBadge,
  LoadingState,
  Modal,
  PageHeader,
  PaginationBar,
  inputClass,
} from '@/components/ui';
import { categoryService, itemService } from '@/lib/api/inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import { itemStatusLabels } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounce';
import type { Category, Item, ItemStatus, Paginated } from '@/types/api';

const statuses = Object.keys(itemStatusLabels) as ItemStatus[];

function parseStatus(value: string | null): ItemStatus | '' {
  return statuses.includes(value as ItemStatus) ? (value as ItemStatus) : '';
}

export function ItemsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q.trim());
  const [categoryId, setCategoryId] = useState(searchParams.get('category') ?? '');
  const [status, setStatus] = useState<ItemStatus | ''>(parseStatus(searchParams.get('status')));
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Item> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    categoryService.list({ limit: 100 }).then((result) => setCategories(result.items)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    itemService
      .list({ q: debouncedQ, category_id: categoryId, status: status || undefined, page, limit: 20 })
      .then((result) => {
        if (!active) return;
        setData(result);
        setError('');
      })
      .catch((err: unknown) => active && setError(getApiErrorMessage(err, 'Data barang tidak dapat dimuat.')));
    return () => {
      active = false;
    };
  }, [debouncedQ, categoryId, status, page, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError('');
    try {
      await itemService.remove(deleting.id);
      setNotice(`${deleting.name} dihapus.`);
      setDeleting(null);
      reload();
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, 'Barang gagal dihapus.'));
    }
  };

  const printLabels = () => router.push(`/items/labels?ids=${[...selected].join(',')}`);

  return (
    <RequireRole roles={['admin', 'inventory_officer']}>
      <PageHeader
        eyebrow="Inventaris"
        title="Data barang"
        description="Cari barang berdasarkan nama, kode barcode, atau lokasi."
        actions={
          <>
            {selected.size > 0 && (
              <Button variant="secondary" onClick={printLabels}>
                Cetak label ({selected.size})
              </Button>
            )}
            {isAdmin && <Button onClick={() => setCreating(true)}>Tambah barang</Button>}
          </>
        }
      />

      {notice && (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
        <label htmlFor="item-search" className="sr-only">Cari barang</label>
        <input id="item-search" type="search" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Cari nama, kode, atau lokasi" className={inputClass} />
        <label htmlFor="item-category-filter" className="sr-only">Kategori</label>
        <select id="item-category-filter" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} className={inputClass}>
          <option value="">Semua kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <label htmlFor="item-status-filter" className="sr-only">Status</label>
        <select id="item-status-filter" value={status} onChange={(event) => { setStatus(parseStatus(event.target.value)); setPage(1); }} className={inputClass}>
          <option value="">Semua status</option>
          {statuses.map((value) => (
            <option key={value} value={value}>{itemStatusLabels[value]}</option>
          ))}
        </select>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card>
        {!data && !error && <LoadingState />}
        {data && data.items.length === 0 && (
          <EmptyState title="Belum ada barang" description={isAdmin ? 'Tambahkan barang pertama atau ubah filter pencarian.' : 'Ubah filter pencarian.'} />
        )}
        {data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <span className="sr-only">Pilih untuk label</span>
                  </th>
                  <th className="px-4 py-3 font-medium">Barang</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                  <th className="px-4 py-3 font-medium">Kondisi</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isAdmin && <th className="px-4 py-3"><span className="sr-only">Aksi</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" aria-label={`Pilih ${item.name} untuk label`} checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/items/${item.id}`} className="font-medium text-slate-900 hover:underline">{item.name}</Link>
                      <p className="font-mono text-xs text-slate-500">{item.barcode}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.category.name}</td>
                    <td className="px-4 py-3 text-slate-700">{item.location ?? '—'}</td>
                    <td className="px-4 py-3"><ConditionBadge condition={item.condition} /></td>
                    <td className="px-4 py-3"><ItemStatusBadge status={item.status} /></td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => { setDeleteError(''); setDeleting(item); }} className="text-sm font-medium text-red-700 hover:underline">
                          Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <PaginationBar meta={data.pagination} onPage={setPage} />}
      </Card>

      <Modal open={creating} title="Tambah barang" onClose={() => setCreating(false)}>
        <ItemForm
          onCancel={() => setCreating(false)}
          onSaved={(item) => {
            setCreating(false);
            setNotice(`${item.name} ditambahkan dengan kode ${item.barcode}.`);
            reload();
          }}
        />
      </Modal>

      <Modal open={deleting !== null} title="Hapus barang?" onClose={() => setDeleting(null)}>
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">{deleting?.name}</span> akan dihapus permanen. Barang yang memiliki riwayat peminjaman tidak dapat dihapus.
        </p>
        {deleteError && <div className="mt-4"><Alert>{deleteError}</Alert></div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>Batal</Button>
          <Button variant="danger" onClick={() => void confirmDelete()}>Hapus</Button>
        </div>
      </Modal>
    </RequireRole>
  );
}
