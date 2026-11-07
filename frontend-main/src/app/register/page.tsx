'use client';

import Link from 'next/link';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/errors';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', staff_id: '', school_unit: '' });

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => router.replace('/login'), 2200);
    return () => window.clearTimeout(timeout);
  }, [router, successMessage]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await authService.register({
        ...formData,
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        staff_id: formData.staff_id.trim(),
        school_unit: formData.school_unit.trim(),
      });
      if (response.data.success) {
        const data = response.data.data;
        if (data?.session) {
          // Session dari pendaftaran dicabut; pengguna masuk ulang lewat halaman login.
          try {
            await authService.logout(data.session.access_token);
          } catch {
            // Tetap lanjut ke halaman masuk jika session gagal dicabut.
          }
          setSuccessMessage('Pendaftaran berhasil. Silakan masuk dengan akun yang baru dibuat.');
        } else if (data?.email_verification_required) {
          setSuccessMessage(`Pendaftaran berhasil. Verifikasi email ${data.email}, lalu masuk ke akun Anda.`);
        } else {
          setErrorMessage('Respons pendaftaran tidak sesuai dengan kontrak API. Coba lagi.');
        }
      } else {
        setErrorMessage(response.data.message || 'Pendaftaran tidak berhasil. Periksa kembali data Anda.');
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Tidak dapat terhubung ke layanan. Coba lagi nanti.'));
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'full_name', label: 'Nama lengkap', type: 'text', autoComplete: 'name', minLength: 2, maxLength: 120 },
    { name: 'staff_id', label: 'ID staf', type: 'text', autoComplete: 'off', minLength: 3, maxLength: 50 },
    { name: 'school_unit', label: 'Unit sekolah', type: 'text', autoComplete: 'organization', minLength: 2, maxLength: 100 },
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 254 },
    { name: 'password', label: 'Kata sandi', type: 'password', autoComplete: 'new-password', minLength: 8, maxLength: 128 },
  ];

  return (
    <main className="min-h-screen bg-white md:grid md:grid-cols-[1fr_1fr]">
      <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 md:px-8 lg:px-12">
        <div className="w-full max-w-lg">
          <Link href="/login" className="mb-10 inline-block text-lg font-semibold tracking-tight text-[#18345b] md:hidden">InvenSMK</Link>
          <div className="mb-7">
            <p className="mb-2 text-sm font-medium text-slate-500">Akun sekolah</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Daftar akun</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Isi data staf untuk membuat akun.</p>
          </div>

          {!successMessage && (
            <form onSubmit={handleRegister} className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.name} className={field.name === 'school_unit' || field.name === 'email' || field.name === 'password' ? 'sm:col-span-2' : ''}>
                  <label htmlFor={field.name} className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}</label>
                  <input id={field.name} name={field.name} type={field.type} autoComplete={field.autoComplete} minLength={field.minLength} maxLength={field.maxLength} required value={formData[field.name as keyof typeof formData]} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10" />
                </div>
              ))}
              {errorMessage && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{errorMessage}</p>}
              <button type="submit" disabled={loading} className="mt-1 w-full rounded-lg bg-[#18345b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#244978] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">{loading ? 'Memproses...' : 'Buat akun'}</button>
            </form>
          )}
          {!successMessage && <p className="mt-6 text-center text-sm text-slate-600">Sudah punya akun? <Link href="/login" className="font-semibold text-blue-800 hover:underline">Masuk</Link></p>}
        </div>
      </section>

      <section className="hidden min-h-screen flex-col justify-between bg-[#18345b] p-12 text-white md:flex lg:p-16">
        <Link href="/login" className="text-lg font-semibold tracking-tight">InvenSMK</Link>
        <div className="max-w-lg pb-10">
          <p className="mb-4 text-sm font-medium text-blue-200">Inventaris sekolah</p>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight lg:text-5xl">Mulai kelola barang sekolah dengan rapi.</h2>
          <p className="mt-5 max-w-md text-base leading-7 text-blue-100">Buat akun staf untuk mengakses profil sekolah.</p>
        </div>
        <p className="text-sm text-blue-200">STSI4440 | Kelompok B | Universitas Terbuka</p>
      </section>

      {successMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-5" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="register-success-title" className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 id="register-success-title" className="text-lg font-semibold text-slate-900">Pendaftaran berhasil</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{successMessage}</p>
            <button type="button" onClick={() => router.replace('/login')} className="mt-5 w-full rounded-lg bg-[#18345b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#244978]">Ke halaman masuk</button>
          </section>
        </div>
      )}
    </main>
  );
}
