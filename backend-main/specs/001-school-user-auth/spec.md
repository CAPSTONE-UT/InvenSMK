# Feature Specification: Authentication & User Management Inventaris Sekolah

**Feature Branch**: `N/A (no branch hook configured)`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Buat spesifikasi khusus untuk modul Authentication & User
Management menggunakan Supabase Auth (Register, Login, Logout, Get User Profile, dan Auth
Middleware di Express) sesuaikan data karena ini untuk backend sistem Inventaris sekolah"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Masuk dan Mengakses Inventaris (Priority: P1)

Sebagai personel sekolah yang terdaftar, saya ingin masuk menggunakan email dan kata sandi agar
saya dapat mengakses fungsi inventaris yang diizinkan untuk peran saya.

**Why this priority**: Autentikasi merupakan gerbang untuk seluruh data dan operasi inventaris
sekolah yang dilindungi.

**Independent Test**: Dapat diuji dengan akun aktif yang memasukkan kredensial benar dan kemudian
mengakses satu operasi terlindungi, tanpa bergantung pada fungsi pendaftaran atau profil.

**Acceptance Scenarios**:

1. **Given** akun personel aktif dan email telah diverifikasi, **When** pengguna memasukkan
   kredensial yang benar, **Then** pengguna memperoleh sesi aktif dan informasi masa berlakunya.
2. **Given** kredensial salah, akun nonaktif, atau email belum diverifikasi, **When** pengguna
   mencoba masuk, **Then** akses ditolak dengan pesan aman yang tidak mengungkap detail sensitif.
3. **Given** sesi yang valid, **When** pengguna meminta operasi inventaris terlindungi, **Then**
   identitas dan peran pengguna tersedia untuk pemeriksaan izin operasi tersebut.
4. **Given** sesi tidak ada, rusak, atau kedaluwarsa, **When** pengguna meminta operasi
   terlindungi, **Then** akses ditolak dan tidak ada data inventaris yang dikembalikan.

---

### User Story 2 - Mendaftarkan Akun Personel Sekolah (Priority: P2)

Sebagai personel sekolah, saya ingin mendaftarkan akun dengan identitas pekerjaan saya agar saya
dapat menggunakan sistem inventaris setelah memverifikasi alamat email.

**Why this priority**: Pendaftaran menyediakan jalur masuk bagi personel baru, tetapi akses
inventaris baru bernilai setelah autentikasi tersedia.

**Independent Test**: Dapat diuji dengan mendaftarkan email baru beserta profil personel, lalu
memastikan akun dan instruksi verifikasi dibuat tanpa memerlukan login.

**Acceptance Scenarios**:

1. **Given** email dan nomor identitas personel belum terdaftar, **When** data wajib valid
   dikirimkan, **Then** akun dibuat dengan peran akses minimum dan instruksi verifikasi dikirim.
2. **Given** email atau nomor identitas personel telah digunakan, **When** pendaftaran dikirim,
   **Then** pendaftaran ditolak tanpa membuat akun atau profil ganda.
3. **Given** data wajib kosong, format email salah, atau kata sandi tidak memenuhi kebijakan,
   **When** pendaftaran dikirim, **Then** setiap kesalahan input dilaporkan secara jelas dan aman.

---

### User Story 3 - Melihat Profil Pengguna Aktif (Priority: P3)

Sebagai pengguna yang telah masuk, saya ingin melihat profil sekolah dan peran akses saya agar saya
dapat memastikan identitas yang sedang digunakan untuk kegiatan inventaris.

**Why this priority**: Profil memberi konteks identitas dan kewenangan, tetapi bergantung pada sesi
yang sudah terbentuk.

**Independent Test**: Dapat diuji dengan sesi valid untuk mengambil profil sendiri dan memastikan
hanya data pengguna tersebut yang dikembalikan.

**Acceptance Scenarios**:

1. **Given** sesi valid, **When** pengguna meminta profilnya, **Then** sistem mengembalikan nama
   lengkap, email, nomor identitas personel, unit sekolah, peran, dan status akun pengguna tersebut.
2. **Given** sesi valid tetapi profil tidak tersedia, **When** profil diminta, **Then** permintaan
   gagal secara terkendali dan tidak mengembalikan profil milik pengguna lain.
3. **Given** sesi tidak valid, **When** profil diminta, **Then** akses ditolak tanpa membocorkan
   data profil.

---

### User Story 4 - Keluar dari Sistem (Priority: P4)

Sebagai pengguna yang telah masuk, saya ingin keluar agar sesi pada perangkat saat ini tidak dapat
digunakan lagi untuk mengakses data inventaris.

**Why this priority**: Logout mengurangi risiko akses setelah perangkat ditinggalkan, tetapi hanya
berlaku setelah alur masuk tersedia.

**Independent Test**: Dapat diuji dengan keluar dari sesi aktif lalu mencoba kembali operasi
terlindungi menggunakan sesi yang sama dan memastikan akses ditolak.

**Acceptance Scenarios**:

1. **Given** sesi aktif, **When** pengguna keluar, **Then** sesi perangkat saat ini diakhiri dan
   tidak dapat dipakai kembali.
2. **Given** sesi sudah kedaluwarsa atau sudah diakhiri, **When** pengguna meminta logout,
   **Then** sistem memberikan hasil aman dan tidak mengaktifkan kembali sesi tersebut.

### Edge Cases

- Dua permintaan pendaftaran bersamaan menggunakan email atau nomor identitas personel yang sama.
- Pengguna telah dihapus atau dinonaktifkan setelah sesi diterbitkan tetapi sebelum sesi berakhir.
- Identitas autentikasi tersedia, tetapi profil personel terkait hilang atau tidak lengkap.
- Sesi berakhir tepat ketika operasi inventaris terlindungi sedang diminta.
- Email menggunakan perbedaan huruf besar-kecil atau spasi yang dapat menyebabkan duplikasi semu.
- Pengguna melakukan logout berulang kali atau memakai ulang sesi yang sudah diakhiri.
- Layanan identitas sementara tidak tersedia saat register, login, validasi sesi, atau logout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem MUST menerima pendaftaran personel dengan `full_name`, `email`, `password`,
  `staff_id`, dan `school_unit` sebagai data wajib.
- **FR-002**: Sistem MUST memvalidasi seluruh data pendaftaran dan menolak nilai kosong, format
  tidak sah, serta kata sandi yang tidak memenuhi kebijakan keamanan.
- **FR-003**: Sistem MUST memastikan `email` dan `staff_id` unik tanpa membedakan huruf besar-kecil
  pada email.
- **FR-004**: Sistem MUST membuat akun baru dengan status belum terverifikasi dan peran akses
  minimum; pendaftaran publik MUST NOT dapat memilih atau meningkatkan peran sendiri.
- **FR-005**: Sistem MUST mengirim instruksi verifikasi email setelah pendaftaran berhasil dan MUST
  NOT mengizinkan login sebelum email diverifikasi.
- **FR-006**: Sistem MUST mengautentikasi pengguna aktif menggunakan email dan kata sandi yang
  benar serta mengembalikan sesi dan masa berlakunya.
- **FR-007**: Sistem MUST menolak login untuk kredensial salah, email belum terverifikasi, atau akun
  nonaktif dengan pesan yang tidak mengungkap apakah email tertentu terdaftar.
- **FR-008**: Sistem MUST memverifikasi sesi pada setiap operasi yang ditandai terlindungi sebelum
  operasi tersebut dijalankan.
- **FR-009**: Sistem MUST menyediakan identitas pengguna, peran, dan status akun yang telah
  diverifikasi kepada pemeriksaan izin berikutnya pada operasi terlindungi.
- **FR-010**: Sistem MUST menolak sesi yang hilang, rusak, kedaluwarsa, telah diakhiri, atau terkait
  akun nonaktif tanpa mengembalikan data inventaris.
- **FR-011**: Pengguna dengan sesi valid MUST dapat mengambil profilnya sendiri yang berisi
  `user_id`, `full_name`, `email`, `staff_id`, `school_unit`, `role`, dan `account_status`.
- **FR-012**: Sistem MUST NOT mengembalikan kata sandi, bukti kredensial, atau data profil pengguna
  lain dalam hasil profil.
- **FR-013**: Pengguna MUST dapat mengakhiri sesi perangkat saat ini, dan sesi itu MUST ditolak
  untuk setiap penggunaan berikutnya.
- **FR-014**: Semua hasil operasi MUST menyatakan keberhasilan atau kegagalan secara konsisten dan
  hanya menyertakan data, pesan, atau detail error yang relevan dan aman.
- **FR-015**: Kegagalan validasi, autentikasi, profil, dan layanan dependensi MUST ditangani secara
  konsisten tanpa mengekspos credential, detail internal, atau stack trace.
- **FR-016**: Cakupan fitur MUST terbatas pada register, login, logout, profil pengguna sendiri,
  dan perlindungan operasi berbasis sesi; reset kata sandi, perubahan profil, pengelolaan role,
  dan pengelolaan akun oleh administrator berada di luar cakupan.

### Key Entities *(include if feature involves data)*

- **User Account**: Identitas login pengguna, meliputi pengenal unik, email terverifikasi, status
  akun, dan status sesi; tidak mengekspos bukti kredensial.
- **School Staff Profile**: Profil personel yang terkait satu-ke-satu dengan akun, meliputi nama
  lengkap, nomor identitas personel, unit sekolah, peran akses, dan status akun.
- **User Session**: Bukti bahwa pengguna telah berhasil masuk, meliputi pemilik sesi, masa berlaku,
  dan status aktif atau telah diakhiri.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sedikitnya 95% pengguna uji dapat menyelesaikan pendaftaran valid dalam waktu kurang
  dari 2 menit pada percobaan pertama.
- **SC-002**: Sedikitnya 95% pengguna dengan akun aktif dan terverifikasi dapat masuk dan melihat
  profilnya dalam waktu kurang dari 30 detik.
- **SC-003**: 100% percobaan mengakses operasi terlindungi tanpa sesi valid ditolak tanpa
  mengembalikan data inventaris atau profil.
- **SC-004**: 100% sesi yang telah diakhiri melalui logout ditolak ketika digunakan kembali.
- **SC-005**: Dalam pengujian 1.000 percobaan autentikasi berurutan, sedikitnya 99% hasil login,
  logout, dan pengambilan profil diterima pengguna dalam waktu 2 detik pada kondisi layanan normal.
- **SC-006**: 100% hasil kegagalan yang diuji tidak mengungkap kata sandi, bukti kredensial, stack
  trace, atau keberadaan akun melalui perbedaan pesan login.
- **SC-007**: Seluruh lima alur utama—register, login, logout, melihat profil, dan perlindungan
  operasi—dapat diselesaikan oleh penguji sesuai acceptance scenarios tanpa bantuan pengembang.

## Assumptions

- Pengguna sasaran adalah personel sekolah yang memiliki email aktif dan nomor identitas personel.
- Email harus diverifikasi sebelum login; pengiriman ulang verifikasi berada di luar cakupan fitur.
- Akun hasil pendaftaran memperoleh role akses minimum. Penetapan role lebih tinggi dilakukan oleh
  proses administrasi terpisah yang berada di luar cakupan.
- Role awal yang digunakan sistem adalah `staff`; role lain seperti `admin` dan
  `inventory_officer` telah atau akan dikelola oleh modul otorisasi terpisah.
- `school_unit` mewakili unit kerja seperti tata usaha, laboratorium, perpustakaan, atau gudang.
- Kebijakan kata sandi mengikuti kebijakan keamanan terpusat yang berlaku bagi sistem.
- Fitur bergantung pada layanan identitas terpusat dan kemampuan pengiriman email verifikasi.
- Satu profil personel hanya terkait dengan satu akun pengguna.
