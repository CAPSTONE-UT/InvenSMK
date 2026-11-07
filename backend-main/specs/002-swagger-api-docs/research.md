# Research: Dokumentasi API Swagger dan OpenAPI

## Keputusan 1: Gunakan `swagger-ui-express` untuk halaman interaktif

- **Decision**: Sajikan UI Swagger melalui middleware Express dengan dokumen OpenAPI yang
  didefinisikan oleh aplikasi.
- **Rationale**: Kompatibel dengan Express yang sudah digunakan, menyediakan `Try it out`,
  dan tidak memerlukan perubahan pada controller atau service.
- **Alternatives considered**: Menulis halaman HTML Swagger UI sendiri menambah kode
  pemeliharaan; memakai server dokumentasi eksternal tidak mendukung verifikasi lokal dan
  dapat mengekspos kontrak internal.

## Keputusan 2: OpenAPI 3.0 sebagai kontrak terpusat bertipe

- **Decision**: Simpan dokumen sebagai object TypeScript OpenAPI 3.0 di `src/docs/openapi.ts`
  dan ekspor object tersebut untuk route serta test.
- **Rationale**: Satu sumber data mencegah UI dan pengujian membaca kontrak yang berbeda.
  Object dapat diperiksa dengan typecheck dan tidak membutuhkan parser YAML saat runtime.
- **Alternatives considered**: YAML statis lebih mudah dibaca, tetapi membutuhkan pembacaan
  file atau parser dan berisiko tidak sinkron dengan export yang dipakai aplikasi.

## Keputusan 3: Dokumentasi development-only

- **Decision**: Mount route Swagger hanya ketika environment aplikasi menyatakan mode
  development, dengan spec endpoint yang tidak melakukan akses data.
- **Rationale**: Memenuhi kebutuhan uji interaktif tanpa memperlebar paparan production.
- **Alternatives considered**: Selalu memasang UI lebih sederhana tetapi bertentangan dengan
  batas keamanan pada spesifikasi.

## Keputusan 4: Kontrak merepresentasikan perilaku aktual

- **Decision**: Dokumentasikan envelope `{ success, data?, message?, error? }`, status yang
  digunakan oleh error handler, validasi register/login dari schema Zod, dan Bearer auth
  pada profile/logout.
- **Rationale**: Konsumen memerlukan bentuk payload yang benar, sementara fitur ini tidak
  boleh mengubah perilaku endpoint.
- **Alternatives considered**: Membuat response wrapper baru akan menambah perilaku API dan
  melanggar batas fitur.

## Keputusan 5: Verifikasi dengan test route dan operasi

- **Decision**: Tambahkan test yang memeriksa UI/spec dapat diambil serta daftar method/path
  wajib dan security requirement cocok dengan implementasi.
- **Rationale**: Kegagalan test memberi sinyal saat endpoint ditambah atau kontrak dokumentasi
  tertinggal.
- **Alternatives considered**: Review manual saja tidak dapat menjamin sinkronisasi berulang.
