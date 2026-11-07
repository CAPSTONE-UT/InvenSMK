# Quickstart Verifikasi Dokumentasi API

## Prasyarat

- Node.js versi 24.x dan pnpm tersedia.
- Variabel `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` tersedia
  pada environment development.

## Menjalankan Server

```powershell
$env:NODE_ENV = "development"
pnpm install
pnpm dev
```

Buka `http://localhost:3000/api-docs` pada browser. URL dasar dapat berbeda jika `PORT`
diatur pada environment. Dokumentasi tidak boleh tersedia ketika `NODE_ENV=production`.

## Skenario Verifikasi

1. Pastikan halaman Swagger UI dimuat dan menampilkan operasi yang tercantum dalam
   [data-model.md](./data-model.md).
2. Jalankan `GET /health` melalui **Try it out**; hasil yang diharapkan adalah HTTP 200
   dengan `success: true` dan `data.status` bernilai `ok`.
3. Jalankan register atau login dengan data development yang sah. Jangan memasukkan
   credential nyata ke dokumentasi atau commit.
4. Salin `access_token` dari respons login, klik **Authorize**, masukkan token Bearer, lalu
   jalankan profile atau logout.
5. Jalankan register dengan body tidak valid dan pastikan HTTP 400 serta
   `error.code: VALIDATION_ERROR` terlihat.

## Pemeriksaan Otomatis

```powershell
pnpm test
pnpm test:integration
pnpm typecheck
```

Pengujian dokumentasi harus memastikan halaman/spec dapat diakses dalam mode development,
operasi wajib tidak hilang, dan operasi terlindungi memiliki security requirement Bearer.
