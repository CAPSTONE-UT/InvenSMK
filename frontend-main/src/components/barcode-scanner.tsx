'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui';

type ScannerState = 'idle' | 'starting' | 'scanning' | 'error';

function cameraErrorMessage(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/NotAllowed|Permission/i.test(text)) {
    return 'Izin kamera ditolak. Izinkan akses kamera di pengaturan browser, atau ketik kode secara manual.';
  }
  if (/NotFound|Requested device not found/i.test(text)) return 'Kamera tidak ditemukan pada perangkat ini.';
  if (/secure|https/i.test(text) || (typeof window !== 'undefined' && !window.isSecureContext)) {
    return 'Kamera hanya dapat dipakai melalui HTTPS atau localhost.';
  }
  return 'Kamera tidak dapat dibuka. Ketik kode barang secara manual.';
}

/**
 * Pemindai kamera (KF-07). Kamera dibuka atas aksi pengguna dan berhenti setelah satu kode
 * terbaca agar tidak memproses barcode yang sama berulang kali.
 */
export function BarcodeScanner({ onDetected, paused }: { onDetected: (code: string) => void; paused: boolean }) {
  const elementId = `scanner-${useId().replace(/:/g, '')}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onDetectedRef = useRef(onDetected);
  const [state, setState] = useState<ScannerState>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      // Kamera sudah berhenti.
    }
    setState((current) => (current === 'error' ? current : 'idle'));
  }, []);

  const start = useCallback(async () => {
    if (scannerRef.current) return;
    setError('');
    setState('starting');
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(elementId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: (width, height) => ({ width: Math.floor(width * 0.85), height: Math.floor(Math.min(height, width) * 0.5) }) },
        (decodedText) => {
          void stop();
          onDetectedRef.current(decodedText.trim());
        },
        () => {
          // Frame tanpa barcode: abaikan.
        },
      );
      setState('scanning');
    } catch (err) {
      scannerRef.current = null;
      setError(cameraErrorMessage(err));
      setState('error');
    }
  }, [elementId, stop]);

  useEffect(() => {
    if (paused) void stop();
  }, [paused, stop]);

  useEffect(() => () => void stop(), [stop]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl bg-[#13284a]">
        <div id={elementId} className="min-h-56 w-full [&_video]:!w-full [&_video]:object-cover" />
        {state !== 'scanning' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-blue-200" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
              <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" />
            </svg>
            <p className="text-sm text-blue-100">
              {state === 'starting' ? 'Membuka kamera...' : 'Arahkan kamera ke barcode barang'}
            </p>
            {state !== 'starting' && (
              <Button variant="secondary" className="border-0" onClick={() => void start()}>
                {state === 'error' ? 'Coba lagi' : 'Buka kamera'}
              </Button>
            )}
          </div>
        )}
      </div>
      {state === 'scanning' && (
        <div className="mt-2 flex justify-end">
          <Button variant="ghost" className="py-1.5" onClick={() => void stop()}>
            Tutup kamera
          </Button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
