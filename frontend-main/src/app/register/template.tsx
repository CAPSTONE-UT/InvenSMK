import type { ReactNode } from 'react';

export default function RegisterTemplate({ children }: { children: ReactNode }) {
  return <div className="motion-safe:animate-page-enter-right">{children}</div>;
}
