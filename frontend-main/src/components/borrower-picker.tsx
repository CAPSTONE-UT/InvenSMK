'use client';

import { useEffect, useState } from 'react';
import { inputClass } from '@/components/ui';
import { userService } from '@/lib/api/inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import { roleLabels } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounce';
import type { ManagedUser } from '@/types/api';

/** Pencarian peminjam aktif berdasarkan nama, email, atau ID personel. */
export function BorrowerPicker({
  value,
  onChange,
}: {
  value: ManagedUser | null;
  onChange: (user: ManagedUser | null) => void;
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim());
  const [results, setResults] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (value || debounced.length < 2) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- status muat untuk permintaan ini
    setLoading(true);
    userService
      .list({ q: debounced, account_status: 'active', limit: 8 })
      .then((page) => {
        if (!active) return;
        setResults(page.items);
        setError('');
      })
      .catch((err: unknown) => active && setError(getApiErrorMessage(err, 'Daftar pengguna tidak dapat dimuat.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debounced, value]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-700 bg-blue-50 p-3">
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium text-slate-900">{value.full_name}</p>
          <p className="truncate text-xs text-slate-600">
            {value.staff_id} · {value.school_unit} · {roleLabels[value.role]}
          </p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="shrink-0 text-sm font-medium text-blue-800 hover:underline">
          Ganti
        </button>
      </div>
    );
  }

  const showResults = debounced.length >= 2;

  return (
    <div>
      <input
        id="borrower"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cari nama, email, atau ID peminjam"
        autoComplete="off"
        className={inputClass}
      />
      {error && <p role="alert" className="mt-1.5 text-sm text-red-700">{error}</p>}
      {showResults && (
        <ul className="mt-2 max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {loading && results.length === 0 && <li className="p-3 text-sm text-slate-500">Mencari...</li>}
          {!loading && results.length === 0 && !error && (
            <li className="p-3 text-sm text-slate-500">Tidak ada pengguna aktif yang cocok.</li>
          )}
          {results.map((user) => (
            <li key={user.user_id}>
              <button
                type="button"
                onClick={() => onChange(user)}
                className="block w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50"
              >
                <span className="block font-medium text-slate-900">{user.full_name}</span>
                <span className="block text-xs text-slate-500">
                  {user.staff_id} · {user.school_unit}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
