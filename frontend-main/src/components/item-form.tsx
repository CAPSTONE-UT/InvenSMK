'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, Field, inputClass } from '@/components/ui';
import { categoryService, itemService } from '@/lib/api/inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import { conditionLabels, nullable } from '@/lib/format';
import type { Category, ItemCondition, ItemDetail, ItemInput } from '@/types/api';

const barcodePattern = '[A-Za-z0-9][A-Za-z0-9._\\-]{2,63}';

/** Form tambah/ubah barang (KF-03). `item` kosong berarti mode tambah. */
export function ItemForm({
  item,
  onSaved,
  onCancel,
}: {
  item?: ItemDetail;
  onSaved: (item: ItemDetail) => void;
  onCancel: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    barcode: item?.barcode ?? '',
    name: item?.name ?? '',
    category_id: item?.category.id ?? '',
    location: item?.location ?? '',
    condition: item?.condition ?? ('good' as ItemCondition),
    acquired_at: item?.acquired_at ?? '',
    notes: item?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    categoryService
      .list({ limit: 100 })
      .then((page) => setCategories(page.items))
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Kategori tidak dapat dimuat.')));
  }, []);

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const borrowed = item?.status === 'borrowed';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const barcode = form.barcode.trim().toUpperCase();
    const input: ItemInput = {
      name: form.name.trim(),
      category_id: form.category_id,
      location: nullable(form.location),
      condition: form.condition,
      acquired_at: form.acquired_at || null,
      notes: nullable(form.notes),
      ...(barcode ? { barcode } : {}),
    };
    try {
      if (item) {
        // Kondisi barang yang dipinjam hanya boleh berubah melalui pengembalian.
        const { condition, ...rest } = input;
        onSaved(await itemService.update(item.id, borrowed ? rest : { ...rest, condition }));
      } else {
        onSaved(await itemService.create(input));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Data barang gagal disimpan.'));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nama barang" htmlFor="item-name">
        <input id="item-name" required minLength={2} maxLength={150} value={form.name} onChange={(event) => update('name', event.target.value)} className={inputClass} placeholder="Laptop Asus A14" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kode barcode" htmlFor="item-barcode" hint={item ? undefined : 'Kosongkan untuk dibuat otomatis (INV-000001).'}>
          <input id="item-barcode" pattern={barcodePattern} maxLength={64} value={form.barcode} onChange={(event) => update('barcode', event.target.value)} className={`${inputClass} font-mono uppercase`} placeholder="INV-RPL-0012" required={Boolean(item)} />
        </Field>
        <Field label="Kategori" htmlFor="item-category">
          <select id="item-category" required value={form.category_id} onChange={(event) => update('category_id', event.target.value)} className={inputClass}>
            <option value="" disabled>
              {categories.length ? 'Pilih kategori' : 'Belum ada kategori'}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lokasi" htmlFor="item-location">
          <input id="item-location" maxLength={120} value={form.location} onChange={(event) => update('location', event.target.value)} className={inputClass} placeholder="Lab RPL 1" />
        </Field>
        <Field label="Kondisi" htmlFor="item-condition" hint={borrowed ? 'Diubah saat pengembalian.' : undefined}>
          <select id="item-condition" disabled={borrowed} value={form.condition} onChange={(event) => update('condition', event.target.value)} className={inputClass}>
            {(Object.keys(conditionLabels) as ItemCondition[]).map((condition) => (
              <option key={condition} value={condition}>
                {conditionLabels[condition]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tanggal perolehan" htmlFor="item-acquired">
          <input id="item-acquired" type="date" value={form.acquired_at} onChange={(event) => update('acquired_at', event.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Catatan" htmlFor="item-notes">
        <textarea id="item-notes" rows={2} maxLength={1000} value={form.notes} onChange={(event) => update('notes', event.target.value)} className={inputClass} />
      </Field>
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Menyimpan...' : item ? 'Simpan perubahan' : 'Tambah barang'}
        </Button>
      </div>
    </form>
  );
}
