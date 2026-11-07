'use client';

import { useEffect } from 'react';

/** Register only in production so the worker cannot interfere with Next dev/HMR. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown) => {
      console.error('Service worker registration failed:', error);
    });
  }, []);

  return null;
}
