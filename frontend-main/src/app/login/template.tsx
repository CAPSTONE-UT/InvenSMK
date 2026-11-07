import type { ReactNode } from 'react';

export default function LoginTemplate({ children }: { children: ReactNode }) {
  return <div className="motion-safe:animate-page-enter-left">{children}</div>;
}
