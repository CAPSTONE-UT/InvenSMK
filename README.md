<p align="center">
  <img src="frontend-main/public/invensmk-logo.svg" alt="InvenSMK" width="360">
</p>

# InvenSMK

Aplikasi inventaris dan peminjaman barang sekolah. Proyek terdiri dari REST API
Express + TypeScript, frontend Next.js, dan Supabase untuk Auth serta database.

## Isi repository

| Folder | Isi |
|---|---|
| [`backend-main/`](backend-main/README.md) | REST API, autentikasi dan role, endpoint inventaris, migration, seed demo |
| [`frontend-main/`](frontend-main/README.md) | Antarmuka web, scanner barcode, cetak label, dan dukungan PWA |

Tidak ada package root. Instalasi dan perintah dijalankan dari folder masing-masing.

## Prasyarat

- Node.js `>=24.0.0 <25`
- pnpm `10.30.2` (dapat diaktifkan dengan Corepack)
- Project Supabase dengan Auth aktif

```powershell
corepack enable
corepack prepare pnpm@10.30.2 --activate
```

## Menjalankan untuk development

### 1. Siapkan Supabase dan backend

Di terminal pertama:

```powershell
cd backend-main
pnpm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Isi `.env` dengan URL project, anon/publishable key, dan service role key dari
Supabase. Jangan commit atau bagikan `.env` maupun service role key. Jalankan
migration di `supabase/migrations/` sesuai urutan yang dijelaskan di
[`backend-main/README.md`](backend-main/README.md), lalu jalankan:

```powershell
pnpm dev
```

Backend berjalan di `http://localhost:3000` secara default. Swagger UI tersedia di
`http://localhost:3000/api-docs/` selama `NODE_ENV=development`.

### 2. Siapkan dan jalankan frontend

Di terminal kedua:

```powershell
cd frontend-main
pnpm install
```

Buat `frontend-main/.env.local` untuk menunjuk API backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Lalu jalankan frontend di port lain:

```powershell
pnpm dev -- --port 3001
```

Buka `http://localhost:3001`. `NEXT_PUBLIC_API_URL` adalah alamat backend,
bukan port frontend. Jika port `3001` sedang dipakai, pilih port frontend lain;
API tetap diarahkan ke backend.

## Data demo

Setelah migration diterapkan dan `.env` backend terisi, isi akun serta data demo:

```powershell
cd backend-main
pnpm seed:demo
```

Seed membuat akun admin, petugas, guru, dan siswa, ditambah contoh barang serta
peminjaman aktif, terlambat, dan selesai. Password awal semua akun:
`DemoInventaris!2026`. Seed mengatur ulang password akun demo tersebut setiap kali
dijalankan. Detail akun dan penggantian password ada di
[`backend-main/README.md`](backend-main/README.md). Gunakan seed hanya pada project
Supabase demo/pengembangan.

## Role aplikasi

| Role database | Pengguna | Akses utama |
|---|---|---|
| `admin` | Admin | Dashboard, master barang/kategori, akun, dan laporan ringkasan |
| `inventory_officer` | Petugas inventaris | Scan, pinjam/kembali, dan melihat inventaris/peminjaman |
| `staff` | Guru/siswa peminjam | Melihat peminjaman milik sendiri |

Backend tetap menegakkan hak akses; pembatasan menu di frontend hanya untuk
tampilan.

## Fitur utama

- Login, pendaftaran, refresh session, logout, dan profil pengguna.
- Kategori dan barang dengan barcode, lokasi, kondisi, dan status.
- Peminjaman/pengembalian atomik, riwayat kondisi, status terlambat, dan dashboard.
- Pemindaian Code 128, Code 39, EAN-13, dan QR melalui kamera atau input manual.
- Cetak label barcode Code 128.
- PWA dengan manifest, ikon, service worker, aset statis, dan halaman fallback offline.

Service worker aktif saat frontend berjalan dalam mode production. Data API dan
halaman yang memuat akun tidak disimpan untuk penggunaan offline; transaksi tetap
membutuhkan koneksi backend.

## Menjalankan frontend sebagai PWA

Dari `frontend-main`, hentikan server development lalu jalankan production preview
pada port frontend yang tersedia:

```powershell
pnpm build
pnpm start -- --port 3001
```

Buka origin tersebut dan gunakan opsi **Install app** dari browser. HTTPS diperlukan
untuk instalasi pada deployment dan akses kamera dari HP. `localhost` dapat digunakan
untuk pengembangan lokal pada komputer yang sama. Informasi detail ada di
[`frontend-main/README.md`](frontend-main/README.md).

## Dokumentasi

- [Panduan backend, migration, seed, endpoint, dan role](backend-main/README.md)
- [Panduan frontend, route, scanner, dan PWA](frontend-main/README.md)
- [Kontrak API untuk frontend](frontend-main/KONTRAK.md)
