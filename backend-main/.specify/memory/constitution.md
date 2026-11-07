<!--
Sync Impact Report
- Version change: unversioned scaffold -> 1.0.0
- Modified principles:
  - Scaffold principle 1 -> I. Stack Teknologi Wajib
  - Scaffold principle 2 -> II. Arsitektur Berlapis Ketat
  - Scaffold principle 3 -> III. Type Safety dan Validasi Batas Sistem
  - Scaffold principle 4 -> IV. Penanganan Error dan Kontrak Respons Konsisten
  - Scaffold principle 5 -> V. Konvensi Penamaan Antar-Lapisan
- Added sections:
  - Batasan Teknis
  - Alur Pengembangan dan Pemeriksaan Kepatuhan
- Removed sections: none
- Follow-up TODOs: none
-->
# School Inventory Backend Constitution

## Core Principles

### I. Stack Teknologi Wajib
Backend MUST menggunakan Node.js, Express.js, dan TypeScript dengan `strict` mode aktif.
Integrasi database MUST menggunakan `@supabase/supabase-js`, sedangkan validasi schema MUST
menggunakan Zod. Penggantian atau penambahan teknologi inti MUST diperlakukan sebagai amendemen
konstitusi. Pembatasan ini menjaga konsistensi implementasi dan menghindari tumpang tindih alat.

### II. Arsitektur Berlapis Ketat
Setiap alur request MUST mengikuti urutan `Routes -> Controllers -> Services -> Supabase Client`.
Routes hanya MUST mendefinisikan endpoint dan middleware; Controllers MUST menangani kontrak HTTP
dan mendelegasikan logika bisnis; Services MUST memuat logika bisnis dan seluruh akses Supabase.
Controllers dan Routes MUST NOT melakukan query atau call Supabase secara langsung, dan lapisan
MUST NOT dilewati. Pemisahan ini memastikan tanggung jawab dapat diuji dan dipelihara secara jelas.

### III. Type Safety dan Validasi Batas Sistem
TypeScript MUST dikompilasi dengan `strict` mode dan kode baru MUST NOT melemahkan pemeriksaan tipe
melalui penggunaan tipe yang tidak aman tanpa alasan terdokumentasi. Payload eksternal, termasuk
body, params, dan query yang digunakan endpoint, MUST divalidasi dengan schema Zod sebelum masuk
ke logika bisnis. Data yang gagal divalidasi MUST diteruskan ke mekanisme error global. Aturan ini
mencegah data tidak tepercaya menyebar ke lapisan internal.

### IV. Penanganan Error dan Kontrak Respons Konsisten
Semua error MUST ditangani melalui Global Middleware Error Handler; Controllers dan Services MUST
meneruskan error dan MUST NOT membentuk respons error ad hoc. Setiap respons API MUST berbentuk
`{ success: boolean, data?: any, message?: string, error?: any }`. Respons sukses MUST menetapkan
`success: true`, sedangkan respons gagal MUST menetapkan `success: false` dan menyertakan informasi
yang aman bagi klien. Kontrak tunggal membuat perilaku API dapat diprediksi oleh seluruh konsumen.

### V. Konvensi Penamaan Antar-Lapisan
Nama kolom database dan key payload JSON MUST menggunakan `snake_case`. Fungsi dan variabel
TypeScript MUST menggunakan `camelCase`. Class dan Interface MUST menggunakan `PascalCase`.
Transformasi nama, bila diperlukan, MUST dilakukan secara eksplisit pada batas lapisan dan MUST
NOT mengubah kontrak payload yang telah ditetapkan. Konsistensi ini mencegah ambiguitas antara
model database, kontrak API, dan kode aplikasi.

## Batasan Teknis

- Akses Supabase MUST dibuat melalui client resmi `@supabase/supabase-js` dan hanya digunakan oleh
  lapisan Services.
- Schema Zod MUST menjadi sumber aturan validasi input API; validasi manual yang menduplikasi
  schema MUST NOT menggantikannya.
- Konfigurasi TypeScript MUST mempertahankan `strict: true`.
- Dependensi atau pola baru MUST tetap kompatibel dengan Express.js dan arsitektur berlapis yang
  ditetapkan konstitusi ini.
- Informasi internal, stack trace, credential, dan detail sensitif MUST NOT diekspos melalui field
  `error` pada respons produksi.

## Alur Pengembangan dan Pemeriksaan Kepatuhan

- Setiap perubahan endpoint MUST ditinjau terhadap alur Routes, Controllers, Services, dan
  Supabase Client sebelum digabungkan.
- Review MUST memverifikasi bahwa tidak ada akses Supabase di luar Services, seluruh input relevan
  memiliki schema Zod, dan seluruh jalur respons mengikuti kontrak respons standar.
- Pemeriksaan tipe TypeScript dalam strict mode MUST lulus sebelum perubahan dinyatakan siap.
- Penyimpangan dari prinsip konstitusi MUST didokumentasikan dan diselesaikan melalui amendemen;
  persetujuan review biasa tidak dapat mengesampingkan aturan ini.

## Governance

Konstitusi ini mengungguli kebiasaan, dokumentasi, dan praktik proyek lain yang bertentangan.
Amendemen MUST mendokumentasikan alasan, dampak migrasi, dan perubahan prinsip, lalu memperoleh
persetujuan maintainer proyek sebelum berlaku. Setiap amendemen MUST memperbarui Sync Impact
Report, versi, dan tanggal amendemen.

Versi mengikuti Semantic Versioning: MAJOR untuk penghapusan atau redefinisi prinsip yang tidak
kompatibel; MINOR untuk prinsip atau panduan yang baru atau diperluas secara material; PATCH untuk
klarifikasi non-semantik. Setiap review perubahan MUST memeriksa kepatuhan terhadap konstitusi.
Kompleksitas atau pengecualian MUST memiliki justifikasi tertulis dan rencana untuk kembali patuh.

**Version**: 1.0.0 | **Ratified**: 2026-10-07 | **Last Amended**: 2026-10-07
