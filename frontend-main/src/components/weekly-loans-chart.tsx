'use client';

import { useState } from 'react';
import { formatDate, formatNumber } from '@/lib/format';
import type { WeeklyLoanBucket } from '@/types/api';

/** Batas atas sumbu-y: 4 interval dengan langkah "rapi" (1, 2, 2.5, 5 x 10^n). */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const rawStep = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const factor = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= rawStep) ?? 10;
  return factor * magnitude * 4;
}

function weekLabel(bucket: WeeklyLoanBucket) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }).format(
    new Date(`${bucket.week_start}T00:00:00+07:00`),
  );
}

/**
 * Kolom satu seri: peminjaman per minggu. Satu warna (tanpa legenda), batang <= 24px dengan
 * ujung data membulat 4px, grid samar, tooltip saat hover/fokus, dan tampilan tabel.
 */
export function WeeklyLoansChart({ buckets }: { buckets: WeeklyLoanBucket[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...buckets.map((bucket) => bucket.total)));
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
  const last = buckets.length - 1;

  return (
    <div>
      <div className="flex gap-3">
        <div className="relative h-44 w-8 shrink-0 text-right text-[11px] tabular-nums text-slate-500" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(tick / max) * 100}%` }}>
              {formatNumber(tick)}
            </span>
          ))}
        </div>
        <div className="relative h-44 flex-1">
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden="true"
              className={`absolute inset-x-0 border-t ${tick === 0 ? 'border-slate-300' : 'border-slate-100'}`}
              style={{ bottom: `${(tick / max) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end">
            {buckets.map((bucket, index) => {
              const height = (bucket.total / max) * 100;
              const label = `Minggu ${formatDate(bucket.week_start)} – ${formatDate(bucket.week_end)}: ${formatNumber(bucket.total)} peminjaman`;
              return (
                <button
                  key={bucket.week_start}
                  type="button"
                  aria-label={label}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  className="group relative flex h-full flex-1 items-end justify-center outline-none"
                >
                  {index === last && bucket.total > 0 && active === null && (
                    <span
                      className="absolute text-xs font-semibold tabular-nums text-slate-900"
                      style={{ bottom: `calc(${height}% + 4px)` }}
                    >
                      {formatNumber(bucket.total)}
                    </span>
                  )}
                  <span
                    className={`block w-full max-w-6 rounded-t bg-[#1A66FF] transition-opacity ${
                      active !== null && active !== index ? 'opacity-40' : ''
                    } group-focus-visible:ring-2 group-focus-visible:ring-blue-900 group-focus-visible:ring-offset-2`}
                    style={{ height: bucket.total === 0 ? 0 : `max(${height}%, 2px)` }}
                  />
                  {active === index && (
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute z-10 w-max -translate-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs shadow-lg"
                      style={{ bottom: `${height}%` }}
                    >
                      <span className="block text-slate-500">
                        {formatDate(bucket.week_start)} – {formatDate(bucket.week_end)}
                      </span>
                      <span className="mt-0.5 block font-semibold tabular-nums text-slate-900">
                        {formatNumber(bucket.total)} peminjaman
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ml-11 mt-2 flex text-[11px] text-slate-500" aria-hidden="true">
        {buckets.map((bucket) => (
          <span key={bucket.week_start} className="flex-1 text-center">
            {weekLabel(bucket)}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-slate-600 hover:text-slate-900">Lihat sebagai tabel</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1.5 font-medium">Minggu</th>
              <th className="py-1.5 text-right font-medium">Peminjaman</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {buckets.map((bucket) => (
              <tr key={bucket.week_start}>
                <td className="py-1.5">
                  {formatDate(bucket.week_start)} – {formatDate(bucket.week_end)}
                </td>
                <td className="py-1.5 text-right tabular-nums">{formatNumber(bucket.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
