'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/api/auth';
import { getApiErrorCode, getApiErrorMessage } from '@/lib/api/errors';
import { homePathForRole, saveSession } from '@/lib/auth/session';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await authService.login({ email: email.trim().toLowerCase(), password });
      if (!response.data.success) {
        setErrorMessage(response.data.message || 'Login tidak berhasil. Periksa kembali data Anda.');
      } else if (response.data.data?.session) {
        saveSession(response.data.data.session);
        router.push(homePathForRole(response.data.data.user.role));
      } else {
        setErrorMessage('Respons login tidak memuat session yang diperlukan. Coba lagi.');
      }
    } catch (error) {
      setErrorMessage(
        getApiErrorCode(error) === 'AUTHENTICATION_ERROR'
          ? 'Email atau kata sandi tidak sesuai, atau akun belum aktif.'
          : getApiErrorMessage(error, 'Tidak dapat terhubung ke layanan. Coba lagi nanti.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white md:grid md:grid-cols-[1fr_1fr]">
      <section className="hidden min-h-screen flex-col justify-between bg-[#18345b] p-12 text-white md:flex lg:p-16">
        <Link href="/login" className="text-lg font-semibold tracking-tight">InvenSMK</Link>
        <div className="max-w-lg pb-10">
          <p className="mb-4 text-sm font-medium text-blue-200">Akun staf sekolah</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight lg:text-5xl">Kelola inventaris sekolah. Lebih rapi, lebih cepat.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-blue-100">Catat peminjaman dan pengembalian barang praktik cukup dengan memindai barcode dari ponsel.</p>
        </div>
        <p className="text-sm text-blue-200">STSI4440 | Kelompok B | Universitas Terbuka</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/login" className="mb-14 inline-block text-lg font-semibold tracking-tight text-[#18345b] md:hidden">InvenSMK</Link>
          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-slate-500">Akun sekolah</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Masuk</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Masuk dengan email dan kata sandi yang terdaftar.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input id="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@sekolah.sch.id" className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10" />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Kata sandi</label>
              <input id="password" type="password" autoComplete="current-password" minLength={1} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan kata sandi" className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10" />
            </div>
            {errorMessage && <p role="alert" className="text-sm text-red-700">{errorMessage}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#18345b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#244978] disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Memproses...' : 'Masuk'}</button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-600">Belum punya akun? <Link href="/register" className="font-semibold text-blue-800 hover:underline">Daftar</Link></p>
        </div>
      </section>
    </main>
  );
}
