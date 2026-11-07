'use client';

import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from 'react';

/** Label barcode Code 128 (KF-05). Kode barang dapat dibaca pemindai kamera di halaman Pindai. */
export function BarcodeLabel({ code, name, category }: { code: string; name: string; category?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, code, {
      format: 'CODE128',
      height: 48,
      width: 1.6,
      margin: 0,
      fontSize: 13,
      font: 'monospace',
      displayValue: true,
    });
  }, [code]);

  return (
    <figure className="flex break-inside-avoid flex-col items-center gap-1.5 rounded-lg border border-slate-300 bg-white p-3 text-center">
      <figcaption className="w-full">
        <p className="truncate text-xs font-semibold text-slate-900">{name}</p>
        {category && <p className="truncate text-[10px] text-slate-500">{category} · SMK Madya Depok</p>}
      </figcaption>
      <svg ref={svgRef} role="img" aria-label={`Barcode ${code}`} className="max-w-full" />
    </figure>
  );
}
