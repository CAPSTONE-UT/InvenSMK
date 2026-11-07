// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Otomatis arahkan pengunjung ke halaman login
  redirect('/login');
}
