import { Suspense } from 'react';
import { ScanWorkspace } from './scan-workspace';

export default function PindaiPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">Memuat pemindai...</p>}>
      <ScanWorkspace />
    </Suspense>
  );
}
