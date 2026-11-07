import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'InvenSMK | Inventaris Sekolah',
    short_name: 'InvenSMK',
    description: 'Aplikasi inventaris dan peminjaman barang sekolah.',
    lang: 'id-ID',
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#0B2B6B',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
