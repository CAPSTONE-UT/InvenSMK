'use client';

import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, inputClass } from '@/components/ui';
import { loanService } from '@/lib/api/inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import { conditionLabels, nullable } from '@/lib/format';
import type { ItemCondition, Loan } from '@/types/api';

const conditions: { value: ItemCondition; hint: string }[] = [
  { value: 'good', hint: 'Barang kembali tersedia' },
  { value: 'minor_damage', hint: 'Tetap tersedia, kondisi dicatat' },
  { value: 'damaged', hint: 'Status menjadi rusak, tidak dapat dipinjam' },
];

/** Form pengembalian (KF-10): pilih kondisi barang dan catatan. */
export function ReturnForm({
  loanId,
  onDone,
  onCancel,
}: {
  loanId: string;
  onDone: (loan: Loan) => void;
  onCancel?: () => void;
}) {
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      onDone(await loanService.returnItem(loanId, { condition, notes: nullable(notes) }));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Pengembalian gagal dicatat.'));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Kondisi barang saat kembali</legend>
        <div className="grid gap-2">
          {conditions.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                condition === option.value ? 'border-blue-700 bg-blue-50' : 'border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="condition"
                value={option.value}
                checked={condition === option.value}
                onChange={() => setCondition(option.value)}
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium text-slate-900">{conditionLabels[option.value]}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Catatan (opsional)" htmlFor="return-notes">
        <textarea
          id="return-notes"
          rows={2}
          maxLength={500}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={inputClass}
          placeholder="Misalnya: layar tergores"
        />
      </Field>
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? 'Menyimpan...' : 'Konfirmasi pengembalian'}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Batal
          </Button>
        )}
      </div>
    </form>
  );
}
