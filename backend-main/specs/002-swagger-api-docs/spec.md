# Feature Specification: Dokumentasi API Swagger dan OpenAPI

**Feature Branch**: `002-swagger-api-docs`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Tambahkan dokumentasi API interaktif pada School Inventory Backend menggunakan Swagger UI dan spesifikasi OpenAPI. Dokumentasikan seluruh endpoint REST yang telah diimplementasikan, autentikasi dan otorisasi, contoh serta respons validasi/error, dan sediakan pengujian serta langkah verifikasi tanpa mengubah perilaku API yang ada."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Menjelajahi Kontrak API (Priority: P1)

Sebagai developer frontend atau integrator, saya ingin melihat seluruh endpoint backend dalam satu dokumentasi yang terstruktur agar dapat memahami cara memanggil API tanpa membaca kode sumber.

**Why this priority**: Kontrak API yang lengkap adalah nilai utama fitur dan mengurangi kesalahan integrasi.

**Independent Test**: Buka halaman dokumentasi pada lingkungan pengembangan dan pastikan endpoint kesehatan serta seluruh endpoint autentikasi yang tersedia tercantum dengan metode, path, input, respons, dan status HTTP yang benar.

**Acceptance Scenarios**:

1. **Given** server berjalan pada lingkungan pengembangan, **When** pengguna membuka URL dokumentasi API, **Then** halaman dokumentasi dapat dimuat dan menampilkan informasi API beserta seluruh endpoint yang tersedia.
2. **Given** pengguna memilih sebuah endpoint, **When** pengguna melihat detailnya, **Then** metode, path, parameter, body, contoh, skema respons sukses, dan status error yang relevan ditampilkan.
3. **Given** implementasi endpoint berubah, **When** dokumentasi diperiksa dalam perubahan yang sama, **Then** dokumentasi tidak menghilangkan endpoint atau kontrak yang masih didukung.

---

### User Story 2 - Mencoba Endpoint Secara Interaktif (Priority: P1)

Sebagai developer atau QA, saya ingin mengirim permintaan dari halaman dokumentasi agar dapat memverifikasi perilaku endpoint tanpa menyiapkan klien API terpisah.

**Why this priority**: Pengujian langsung mempercepat validasi integrasi dan membantu menemukan ketidaksesuaian kontrak.

**Independent Test**: Dari halaman dokumentasi pada lingkungan pengembangan, gunakan kontrol uji interaktif untuk menjalankan endpoint kesehatan dan alur autentikasi yang tidak memerlukan kredensial sebelumnya.

**Acceptance Scenarios**:

1. **Given** endpoint yang tidak memerlukan autentikasi dipilih, **When** pengguna mengisi input valid dan menjalankan permintaan, **Then** pengguna dapat melihat permintaan yang dikirim, status HTTP, dan body respons aktual.
2. **Given** endpoint terlindungi dipilih, **When** pengguna memasukkan token akses yang valid pada mekanisme autentikasi dokumentasi lalu menjalankan permintaan, **Then** token diteruskan sesuai kontrak dan respons endpoint dapat dilihat.
3. **Given** pengguna memasukkan input tidak valid, **When** permintaan dijalankan, **Then** dokumentasi menampilkan respons validasi/error aktual beserta status dan bentuk payloadnya.

---

### User Story 3 - Memahami Keamanan dan Penanganan Error (Priority: P2)

Sebagai developer atau reviewer keamanan, saya ingin mengetahui endpoint mana yang terlindungi, aturan aksesnya, dan bentuk kegagalan yang mungkin terjadi agar integrasi tidak salah menerapkan autentikasi atau memproses error secara keliru.

**Why this priority**: Dokumentasi keamanan dan error mencegah penggunaan API yang tidak aman serta memperjelas pemulihan dari kegagalan.

**Independent Test**: Tinjau dokumentasi endpoint terlindungi dan endpoint dengan input tervalidasi, lalu cocokkan persyaratan token, perilaku akses, kode status, kode error, dan contoh respons dengan perilaku server.

**Acceptance Scenarios**:

1. **Given** endpoint profil atau logout dipilih, **When** pengguna membaca bagian keamanan, **Then** dokumentasi menyatakan bahwa token Bearer wajib digunakan dan permintaan tanpa token atau token tidak valid ditolak.
2. **Given** pengguna membaca endpoint autentikasi, **When** pengguna melihat skema input, **Then** batasan field, field wajib, dan contoh nilai valid serta tidak valid tersedia.
3. **Given** server mengembalikan error validasi, autentikasi, route tidak ditemukan, atau error internal, **When** pengguna membaca dokumentasi respons, **Then** status dan bentuk respons error standar dijelaskan tanpa membocorkan informasi sensitif.

### Edge Cases

- Halaman dokumentasi tidak boleh tersedia sebagai pengganti endpoint API atau mengubah status dan body respons endpoint yang telah ada.
- Dokumentasi harus tetap dapat dimuat ketika endpoint tertentu memerlukan token atau layanan data eksternal; kegagalan pemanggilan endpoint ditampilkan sebagai respons uji, bukan membuat halaman dokumentasi gagal dimuat.
- Input body dengan field tambahan, field wajib yang hilang, format email tidak valid, atau panjang nilai di luar batas harus memiliki contoh dan respons validasi yang terdokumentasi.
- Token Bearer yang hilang, format header salah, token kedaluwarsa, atau akun tidak aktif harus didokumentasikan sebagai kegagalan autentikasi/otorisasi sesuai perilaku yang berlaku.
- Endpoint dan respons baru yang belum menjadi bagian backend saat fitur ini dibuat tidak termasuk cakupan dokumentasi.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem MUST menyediakan satu halaman dokumentasi API interaktif yang dapat diakses pada lingkungan pengembangan tanpa mengubah endpoint bisnis yang sudah tersedia.
- **FR-002**: Dokumentasi MUST mencakup endpoint `GET /health`, `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, dan `GET /api/v1/auth/profile`.
- **FR-003**: Untuk setiap endpoint, dokumentasi MUST mencantumkan metode HTTP, path, tujuan, input yang diperlukan, contoh permintaan, skema respons sukses, dan seluruh status HTTP yang relevan.
- **FR-004**: Dokumentasi MUST menjelaskan field body register dan login, termasuk kewajiban field, batas panjang, format email, dan aturan validasi yang terlihat oleh konsumen API.
- **FR-005**: Dokumentasi MUST menjelaskan respons standar sukses dan gagal, termasuk field `success`, `data`, `message`, `error.code`, serta `error.details` jika tersedia.
- **FR-006**: Dokumentasi MUST memberikan contoh bermakna untuk respons sukses dan error validasi, autentikasi, route tidak ditemukan, dan error internal dengan data sensitif disamarkan.
- **FR-007**: Dokumentasi MUST menandai endpoint logout dan profile sebagai endpoint yang memerlukan token akses Bearer.
- **FR-008**: Dokumentasi MUST menjelaskan bahwa permintaan ke profile dan logout tanpa header Bearer, dengan format header salah, atau dengan token tidak valid ditolak melalui `AUTHENTICATION_ERROR`; dokumentasi MUST menyatakan bahwa versi API saat ini tidak menerapkan middleware otorisasi role-based terpisah, sehingga dokumentasi tidak boleh mengklaim pembatasan role atau status akun yang tidak diverifikasi oleh implementasi.
- **FR-009**: Pengguna MUST dapat menjalankan permintaan dari halaman dokumentasi pada lingkungan pengembangan, termasuk memasukkan body, header autentikasi, dan melihat status serta body respons aktual.
- **FR-010**: Sistem MUST memastikan dokumentasi dapat diverifikasi terhadap daftar route dan kontrak respons aktual melalui pengujian otomatis atau pemeriksaan yang gagal ketika endpoint terdokumentasi hilang atau kontraknya tidak valid.
- **FR-011**: Dokumentasi MUST hanya diaktifkan ketika `NODE_ENV` bernilai `development` (atau default development yang eksplisit untuk menjalankan server lokal) dan MUST tidak dipasang ketika `NODE_ENV=production`; perubahan konfigurasi ini MUST tidak mengubah route bisnis.
- **FR-012**: Penambahan dokumentasi MUST mempertahankan status HTTP, payload, validasi, autentikasi, otorisasi, dan penanganan error endpoint yang sudah ada.
- **FR-013**: Panduan pengembang MUST menjelaskan URL dokumentasi, cara menjalankan server pengembangan, cara mengautentikasi permintaan terlindungi, dan langkah memverifikasi sinkronisasi dokumentasi dengan implementasi.

### Key Entities

- **Dokumen API**: Deskripsi terstruktur mengenai metadata API, daftar endpoint, input, respons, keamanan, contoh, dan status error.
- **Operasi API**: Satu kombinasi metode dan path yang mewakili endpoint yang dapat dipanggil konsumen.
- **Skema Kontrak**: Definisi bentuk dan aturan data untuk body permintaan, parameter, header, respons sukses, dan respons error.
- **Persyaratan Keamanan**: Informasi mengenai kebutuhan token, perilaku penolakan akses, dan konteks lingkungan tempat operasi dapat diuji.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dari lima endpoint REST yang tersedia saat fitur dibuat tercantum dalam dokumentasi dengan metode dan path yang cocok dengan implementasinya.
- **SC-002**: 100% endpoint terlindungi yang tersedia saat fitur dibuat mencantumkan kebutuhan token Bearer dan perilaku penolakan tanpa token atau token tidak valid.
- **SC-003**: Untuk setiap endpoint, seluruh status respons yang digunakan oleh implementasi dan minimal satu contoh respons sukses serta error yang relevan dapat ditemukan tanpa membaca kode sumber; contoh error validation, authentication, not-found, conflict, dependency, dan internal MUST memiliki `success: false`, `message`, dan `error` tanpa stack trace atau credential.
- **SC-004**: Pengguna baru dapat menemukan halaman dokumentasi dan menjalankan permintaan endpoint kesehatan pada lingkungan pengembangan dalam waktu paling lama 2 menit mengikuti panduan pengembang.
- **SC-005**: Pengujian sinkronisasi dokumentasi gagal ketika salah satu endpoint yang diwajibkan hilang atau metode/path-nya berbeda dari implementasi.
- **SC-006**: Seluruh pengujian API yang sudah ada tetap lulus dan tidak ada perubahan terukur pada status, bentuk body, atau aturan autentikasi endpoint bisnis akibat fitur ini.

## Assumptions

- Lingkungan pengembangan menggunakan `NODE_ENV=development`; bila variabel tidak disediakan untuk server lokal, konfigurasi boleh menetapkan default development secara eksplisit, tetapi production MUST memerlukan nilai `NODE_ENV=production` agar dokumentasi tidak terpasang.
- Versi pertama hanya mendokumentasikan endpoint REST yang telah diimplementasikan saat spesifikasi dibuat; endpoint masa depan wajib ditambahkan melalui perubahan dokumentasi terkait.
- Token akses yang digunakan pada pengujian interaktif diperoleh melalui alur login yang sah; dokumentasi tidak menyediakan kredensial nyata.
- Bentuk respons standar yang sudah digunakan proyek merupakan sumber kebenaran untuk contoh sukses dan error.
- Halaman interaktif ditujukan untuk pengembangan dan verifikasi internal; tidak ada role-based authorization terpisah pada endpoint saat ini, sehingga fitur hanya mendokumentasikan Bearer authentication dan penolakan token yang gagal.
- Dokumentasi dan pengujian sinkronisasi menjadi bagian dari perubahan endpoint berikutnya agar kontrak tetap terpelihara.
