import { Suspense } from 'react';
import { LabelSheet } from './label-sheet';

export default function LabelsPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">Menyiapkan label...</p>}>
      <LabelSheet />
    </Suspense>
  );
}
