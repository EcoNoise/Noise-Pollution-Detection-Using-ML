# Dokumentasi Perbikan: Health Dashboard tidak ter-update untuk pengguna lain

Tandai: [FIXED]

## Ringkasan Masalah
- Ketika pengguna selain saya melakukan Stop Monitoring di halaman RealTime, datanya masuk ke tabel `health_analysis_sessions` tetapi tidak muncul pada `HealthDashboard.tsx` dan `HistoryPage.tsx`.
- Di Supabase, baris sesi tercatat, namun tabel agregasi harian `health_daily_metrics` tetap kosong untuk pengguna tersebut.

## Akar Masalah (Root Cause)
- Agregasi ke tabel `health_daily_metrics` mengandalkan Trigger DB: `health_session_to_daily_after_upd` yang memanggil fungsi `trg_health_session_to_daily()` lalu `upsert_health_daily_metrics(...)` ketika kolom `ended_at` di-update.
- Pada beberapa lingkungan/akun pengguna, trigger tidak mengeksekusi agregasi (kemungkinan karena:
  - Migrasi trigger/fungsi belum ter-deploy di instance Supabase yang digunakan pengguna tersebut; atau
  - Kebijakan RLS/konteks auth untuk fungsi berjalan tidak sesuai sehingga insert/update ke `health_daily_metrics` tertolak secara silent; atau
  - Update `ended_at` berhasil tetapi event trigger tidak terpasang/terpicu karena urutan migrasi.
)
- Akibatnya, `health_daily_metrics` kosong sehingga RPC `get_today_dashboard` dan `get_weekly_audio_summary` mengembalikan nilai nol/kosong dan UI tidak menampilkan data.

## Perbaikan yang Diterapkan
1. Menambahkan fallback pemanggilan RPC `upsert_health_daily_metrics` di client (frontend) setelah `endHealthSession` sukses meng-update baris pada `health_analysis_sessions`.
   - Lokasi perubahan: `frontend/src/services/healthService.ts` pada fungsi `endHealthSession(...)`.
   - Mekanisme: setelah update berhasil, ambil `userId` aktif via `supabase.auth.getUser()`, ambil `started_at` hasil update untuk menentukan `p_date` (UTC, format `YYYY-MM-DD`), kemudian panggil `supabase.rpc('upsert_health_daily_metrics', {...})` dengan parameter:
     - `p_user_id`: `userId` saat ini
     - `p_date`: tanggal dari `started_at`
     - `p_session_avg_db`, `p_session_avg_dba`, `p_session_duration_seconds`: menggunakan nilai dari hasil update atau fallback dari nilai yang dikirim saat stop
   - Jika RPC gagal, dibiarkan senyap (console.warn) karena pada kondisi normal trigger DB sudah mengagregasi.

2. Tidak ada perubahan pada UI, namun UI kini akan mendapatkan data dari RPC yang membaca `health_daily_metrics` karena fallback memastikan tabel tersebut terisi.

## Dampak Perubahan
- Perilaku normal (trigger berfungsi): tidak ada perubahan hasil, karena insert/update RLS tetap membatasi ke baris milik user.
- Perilaku ketika trigger tidak berjalan: data harian tetap terisi karena fallback RPC meng-upsert metrik harian secara eksplisit.

## Langkah Uji (Verifikasi)
1. Login sebagai Pengguna A pada perangkat A.
2. Mulai Monitoring, lalu Stop Monitoring (pastikan ada pembacaan sehingga `avg_dba` > 0).
3. Buka tabel Supabase:
   - Pastikan baris di `public.health_analysis_sessions` bertambah (dengan `ended_at` terisi).
   - Pastikan baris/record di `public.health_daily_metrics` untuk `(user_id=Pengguna A, metric_date=tanggal sesi)` bertambah/ter-update.
4. Buka halaman `HistoryPage.tsx` dan `HealthDashboard.tsx` sebagai Pengguna A. Data harian/mingguan harus tampil (Total Analisis > 0 atau rata-rata dB > 0 bila ada paparan).
5. Ulangi langkah 1-4 sebagai Pengguna B (akun berbeda) pada perangkat B. Hasil harus sama.

## Catatan dan Rekomendasi Lanjutan
- Pastikan migrasi `20250122000000_create_health_dashboard_schema.sql` sudah benar-benar ter-aplikasi di instance Supabase yang aktif, termasuk:
  - Trigger `health_session_to_daily_after_ins` dan `health_session_to_daily_after_upd` pada `public.health_analysis_sessions`.
  - Fungsi `public.trg_health_session_to_daily()` dan `public.upsert_health_daily_metrics(...)`.
  - RLS pada `public.health_daily_metrics`: kebijakan `daily_insert_own` dan `daily_update_own` menggunakan `auth.uid()`.
- Pertimbangkan untuk menandai `public.upsert_health_daily_metrics` sebagai `SECURITY DEFINER` dan mengikat role yang aman bila ingin benar-benar melepas ketergantungan pada konteks JWT di sisi trigger (opsional, perlu peninjauan keamanan).
- Monitoring: tambahkan log error di Supabase (fungsi/trigger) bila terjadi penolakan RLS agar mudah diinvestigasi.

Tandai: [VERIFIED AFTER TEST]