'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { RequireRole } from '@/components/auth-provider';
import { Alert, Button, Card, EmptyState, Field, LoadingState, Modal, PageHeader, inputClass } from '@/components/ui';
import { categoryService } from '@/lib/api/inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatNumber, nullable } from '@/lib/format';
import type { Category } from '@/types/api';

function CategoryForm({ category, onSaved, onCancel }: { category?: Category; onSaved: (category: Category) => void; onCancel: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const input = { name: name.trim(), description: nullable(description) };
    try {
      onSaved(category ? await categoryService.update(category.id, input) : await categoryService.create(input));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Kategori gagal disimpan.'));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nama kategori" htmlFor="category-name">
        <input id="category-name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Komputer" />
      </Field>
      <Field label="Deskripsi (opsional)" htmlFor="category-description">
        <textarea id="category-description" rows={2} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} />
      </Field>
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    categoryService
      .list({ limit: 100 })
      .then((page) => {
        setCategories(page.items);
        setError('');
      })
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Kategori tidak dapat dimuat.')));
  }, [reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError('');
    try {
      await categoryService.remove(deleting.id);
      setNotice(`Kategori ${deleting.name} dihapus.`);
      setDeleting(null);
      reload();
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, 'Kategori gagal dihapus.'));
    }
  };

  return (
    <RequireRole roles={['admin']}>
      <PageHeader eyebrow="Data master" title="Kategori barang" actions={<Button onClick={() => setEditing('new')}>Tambah kategori</Button>} />
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}
      {error && <Alert>{error}</Alert>}
      <Card>
        {!categories && !error && <LoadingState />}
        {categories?.length === 0 && <EmptyState title="Belum ada kategori" description="Buat kategori sebelum menambahkan barang." />}
        {categories && categories.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {categories.map((category) => (
              <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{category.name}</p>
                  <p className="text-sm text-slate-500">
                    <Link href={`/items?category=${category.id}`} className="hover:underline">{formatNumber(category.item_count)} barang</Link>
                    {category.description && <> · {category.description}</>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" className="py-1.5" onClick={() => setEditing(category)}>Ubah</Button>
                  <Button variant="ghost" className="py-1.5 text-red-700 hover:text-red-800" onClick={() => { setDeleteError(''); setDeleting(category); }}>Hapus</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={editing !== null} title={editing === 'new' ? 'Tambah kategori' : 'Ubah kategori'} onClose={() => setEditing(null)}>
        {editing !== null && (
          <CategoryForm
            category={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={(category) => {
              setEditing(null);
              setNotice(`Kategori ${category.name} disimpan.`);
              reload();
            }}
          />
        )}
      </Modal>

      <Modal open={deleting !== null} title="Hapus kategori?" onClose={() => setDeleting(null)}>
        <p className="text-sm text-slate-600">
          Kategori <span className="font-medium text-slate-900">{deleting?.name}</span> akan dihapus. Kategori yang masih memiliki barang tidak dapat dihapus.
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
