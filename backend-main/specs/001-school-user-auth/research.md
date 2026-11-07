# Phase 0 Research: Authentication & User Management

## 1. Verifikasi token pada backend

**Decision**: Middleware mengekstrak Bearer token, lalu `AuthService` memvalidasinya melalui
`supabase.auth.getUser(accessToken)`. Setelah token terbukti autentik, service memeriksa profil
aktif dan registry sesi yang dicabut sebelum mengembalikan identity context.

**Rationale**: Dokumentasi Supabase menyatakan `getUser(jwt)` melakukan request ke Auth server dan
hasilnya autentik untuk keputusan otorisasi. Delegasi ke service juga mematuhi larangan call
Supabase dari middleware/controller.

**Alternatives considered**:
- `getSession()` ditolak karena data sesi lokal tidak cukup sebagai dasar otorisasi server.
- Decode JWT tanpa verifikasi ditolak karena payload dapat dipalsukan.
- Query langsung dari middleware ditolak karena melanggar layering konstitusi.

## 2. Penyimpanan profil personel

**Decision**: Simpan profil domain pada `public.school_staff_profiles`, dengan `user_id` sebagai
primary key sekaligus foreign key ke primary key `auth.users(id)` menggunakan `ON DELETE CASCADE`.
Aktifkan RLS. Trigger `AFTER INSERT` pada `auth.users` membuat profil dari metadata signup, tetapi
role dan account status selalu berasal dari default database, bukan metadata dari klien.

**Rationale**: Schema Auth tidak diekspos melalui data API. Panduan resmi merekomendasikan tabel
publik yang merujuk `auth.users` dan trigger untuk membuat profil saat signup. Trigger membuat
pembuatan identity dan profil satu alur; kegagalan constraint profil membatalkan signup.

**Alternatives considered**:
- Menyimpan semua data pada user metadata ditolak karena metadata pengguna bukan tempat tepercaya
  untuk role/otorisasi.
- Insert profil kedua dari service ditolak karena dapat meninggalkan akun tanpa profil bila insert
  gagal setelah signup berhasil.
- Menyalin password ke tabel profil ditolak karena credential hanya boleh dikelola Supabase Auth.

## 3. Signup, verifikasi email, dan role awal

**Decision**: Gunakan signup email/password dengan email confirmation aktif. Kirim `full_name`,
`staff_id`, dan `school_unit` sebagai metadata untuk trigger. Database menetapkan `role = 'staff'`
dan `account_status = 'active'`; klien tidak dapat mengirim kedua field tersebut.

**Rationale**: Ini memenuhi verifikasi email wajib dan mencegah privilege escalation saat
registrasi publik. Unique constraints database menjaga `staff_id` dari race condition.

**Alternatives considered**:
- Auto-confirm ditolak karena bertentangan dengan spesifikasi.
- Role dari request ditolak karena memungkinkan peningkatan hak akses.
- Admin-only account creation ditolak karena spesifikasi secara eksplisit meminta register.

## 4. Login dan status akun domain

**Decision**: Setelah password login berhasil, service mengambil profil. Jika profil hilang atau
`account_status != 'active'`, sesi yang baru dibuat dicabut dan response login generik dikembalikan.
Email belum terverifikasi ditangani oleh konfigurasi email confirmation Supabase.

**Rationale**: Provider mengelola credential, sedangkan status domain inventaris tetap berada pada
model aplikasi. Pesan generik mencegah account enumeration.

**Alternatives considered**:
- Hanya mengandalkan status Supabase ditolak karena tidak merepresentasikan status personel sekolah.
- Memeriksa profil sebelum password ditolak karena membocorkan keberadaan email.

## 5. Logout sesi saat ini dan pencabutan segera

**Decision**: Logout mencatat `session_id` token yang telah diverifikasi ke
`revoked_auth_sessions` sampai `expires_at`, kemudian memanggil server-side sign-out dengan scope
`local`. Setiap validasi auth menolak session ID yang terdaftar. Record kedaluwarsa dapat dibersihkan
secara periodik atau oportunistik.

**Rationale**: Supabase menjelaskan bahwa access JWT tidak dapat dicabut sebelum kedaluwarsa;
sign-out mencabut refresh token. Registry lokal diperlukan agar acceptance criterion bahwa sesi
logout langsung ditolak dapat dipenuhi oleh backend.

**Alternatives considered**:
- Hanya `signOut({ scope: 'local' })` ditolak karena access token lama masih valid hingga `exp`.
- Scope global ditolak karena fitur hanya meminta logout perangkat/sesi saat ini.
- Access-token denylist penuh ditolak; `session_id` lebih kecil dan mencakup token refresh dalam
  sesi yang sama.

## 6. Client Supabase dan secret

**Decision**: Gunakan client server stateless dengan persistence, auto-refresh, dan URL session
detection dinonaktifkan. Anon/publishable key digunakan untuk signup, login, dan verifikasi user;
service-role key hanya pada client admin server-side untuk revokasi yang memerlukannya. Kedua client
hanya diakses oleh service.

**Rationale**: Backend tidak memiliki browser storage dan tidak boleh berbagi mutable user session
antar-request. Pembatasan admin client mengurangi dampak kebocoran privilege.

**Alternatives considered**:
- Satu client stateful global ditolak karena sesi request dapat tercampur.
- Mengirim service-role key ke klien ditolak karena memberi akses administratif penuh.

## 7. Validasi, error, dan kontrak response

**Decision**: Zod memvalidasi body dan bentuk Authorization header pada HTTP boundary. Service
melempar typed application errors; global error middleware memetakan ke status HTTP dan envelope
`{ success, data?, message?, error? }`. Detail error provider dicatat secara aman tetapi tidak
diteruskan mentah ke klien.

**Rationale**: Pendekatan ini memenuhi konstitusi, menghasilkan response konsisten, dan membatasi
kebocoran informasi auth.

**Alternatives considered**:
- Response langsung dari controller ditolak karena menduplikasi error handling.
- Meneruskan pesan Supabase mentah ditolak karena tidak stabil dan dapat membocorkan detail akun.

## 8. Strategi pengujian

**Decision**: Gunakan Node.js built-in test runner melalui `tsx --test`. Unit test menggunakan fake
service/client; contract dan integration test memakai Supabase project lokal atau khusus pengujian,
dengan data unik per run dan cleanup setelah test.

**Rationale**: Repository sudah memiliki `tsx`, sehingga strategi ini menambah sedikit dependensi
dan tetap mendukung TypeScript. Integration test diperlukan untuk trigger, RLS, email confirmation,
dan semantics pencabutan sesi.

**Alternatives considered**:
- Hanya unit test ditolak karena tidak membuktikan integrasi Auth/database.
- Test terhadap project produksi ditolak karena berisiko merusak data nyata.
- Menambah framework test baru ditunda karena runner yang tersedia sudah mencukupi cakupan awal.

## Sources

- [Supabase JavaScript `getUser`](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase JavaScript `signUp`](https://supabase.com/docs/reference/javascript/auth-signup)
- [Supabase JavaScript `signOut`](https://supabase.com/docs/reference/javascript/auth-signout)
- [Supabase Admin `signOut`](https://supabase.com/docs/reference/javascript/auth-admin-signout)
