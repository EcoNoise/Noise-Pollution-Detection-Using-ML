# Skema Tabel dan Aturan Bisnis: noise_areas

Dokumen ini menjadi rujukan bersama untuk backend (Supabase), frontend (React), dan proses analitik terkait pengelolaan data area kebisingan.

## 1) Skema Tabel: public.noise_areas

Catatan:

- Kolom `noise_level` di database saat ini ekuivalen dengan `noise_level_db` pada rancangan awal. Kita gunakan nama DB apa adanya: `noise_level`.
- Kolom di bawah menggabungkan yang sudah ada di Supabase (sesuai diagram) dan tambahan dari rancangan (sudah disiapkan migrasinya).

| Kolom            | Tipe Data                 | Keterangan                                                                             |
| ---------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| id               | uuid (PK)                 | Primary key unik tiap laporan/noise area.                                              |
| user_id          | uuid (FK → auth.users.id) | ID pelapor (opsional bila login).                                                      |
| latitude         | numeric                   | Lintang.                                                                               |
| longitude        | numeric                   | Bujur.                                                                                 |
| radius           | int4                      | Radius area terdampak (meter).                                                         |
| noise_level      | numeric                   | Tingkat kebisingan dalam dB (ekuivalen dengan `noise_level_db`).                       |
| noise_source     | text                      | Label detail hasil klasifikasi (contoh: "car horn").                                   |
| health_impact    | health_status_enum / text | Dampak kesehatan dari model/heuristik.                                                 |
| description      | text                      | Deskripsi ringkas dari pelapor (opsional, bisa disembunyikan di UI).                   |
| address          | text                      | Alamat yang ditentukan sistem/pengguna.                                                |
| raw_labels       | jsonb                     | Hasil klasifikasi YAMNet lengkap, contoh: `[{"label":"car horn","score":0.82}, ...]`.  |
| final_category   | noise_category_enum       | Kategori utama hasil mapping: (Traffic, Construction, Industry, Event, Nature, Other). |
| confidence_score | double precision          | Nilai confidence tertinggi YAMNet (0–1). Opsional untuk UX.                            |
| status           | noise_area_status_enum    | Status data: (active, expiring, expired, permanent).                                   |
| created_at       | timestamptz               | Waktu laporan dibuat.                                                                  |
| updated_at       | timestamptz               | Waktu laporan terakhir diubah/divalidasi.                                              |
| expires_at       | timestamptz               | Waktu kadaluarsa otomatis, atau NULL untuk permanen.                                   |
| validation_count | int4                      | Jumlah validasi "masih ada" dari pengguna lain.                                        |
| report_count     | int4                      | Jumlah laporan spam/salah.                                                             |
| cluster_id       | uuid (opsional)           | ID cluster jika digabung ke area kebisingan yang sama.                                 |

Indeks yang direkomendasikan (sebagian sudah disediakan di migrasi):

- (status), (final_category), (expires_at), (cluster_id)

---

## 2) Penentuan Kategori & Expire

Setelah klasifikasi YAMNet (atau input manual jika tanpa audio), sistem menentukan `final_category`. Berdasarkan kategori ini, sistem otomatis menetapkan `expires_at` default sebagai berikut:

- Event → NOW() + 1 hari (lebih realistis untuk mayoritas event)
- Construction → NOW() + 14 hari (30 hari terlalu panjang untuk minor construction)
- Traffic → NOW() + 3 hari (90 hari terlalu panjang, traffic biasanya cepat resolved)
- Industry → NOW() + 90 hari (bukan permanen, karena industry issue kadang resolved)
- Nature → NOW() + 7 hari (cuaca/alam biasanya cepat berubah)
- Other → NOW() + 7 hari (lebih konservatif untuk unknown category)

Catatan:

- `updated_at` selalu di-set ke waktu saat perubahan dilakukan.
- Jika kategori tidak teridentifikasi (fallback), gunakan `Other` dengan TTL 7 hari.

Tambahan UI (sesuai permintaan):

- Di popup peta, tampilkan `final_category` sebagai label "Kategori".
- Tampilkan "Koordinat (latitude, longitude)" dalam format ringkas: `(<lat_five_decimals>, <lon_five_decimals>)`.
- Tampilkan `radius` sebagai label "Radius" dengan format konsisten (meter), contoh: `100 m`.
- Utility `formatCoordinates(lat, lon)` dan `formatRadius(radius)` ditambahkan pada frontend untuk memastikan clean code dan konsistensi tampilan.

---

## 3) Penyimpanan Data

Setiap laporan menyimpan:

- `created_at`, `updated_at`, `expires_at`
- `raw_labels` (JSON lengkap), contoh:
  ```json
  [
    { "label": "car horn", "score": 0.82 },
    { "label": "engine", "score": 0.75 },
    { "label": "traffic noise", "score": 0.68 }
  ]
  ```
- `final_category` (hasil mapping kategori utama dari `raw_labels`)
- `noise_source` (label detail dengan confidence tertinggi; contoh: `car horn`)
- `confidence_score` (nilai tertinggi; contoh: 0.82 → 82%)

Catatan implementasi:

- Untuk input manual (tanpa audio), `raw_labels` boleh kosong; `final_category` diisi berdasarkan pilihan pengguna.
- `confidence_score` dapat `NULL` jika tidak relevan.

---

## 4) Status Data di Sistem

Status ditentukan otomatis berdasarkan nilai `expires_at` dan aturan berikut:

- Permanen → `expires_at IS NULL` → `status = 'permanent'`
- Kadaluarsa → `NOW() ≥ expires_at` → `status = 'expired'`
- Aktif/Mendekati Expire → bila `NOW() < expires_at`:
  - Total umur data: `ttl = expires_at - created_at`
  - Sisa waktu: `remaining = expires_at - NOW()`
  - Jika `remaining ≤ 0.2 * ttl` → `status = 'expiring'`
  - Selain itu → `status = 'active'`

Opsional (untuk konsistensi):

- Cron job harian dapat melakukan recalculation status agar nilai `status` tersimpan konsisten untuk keperluan indeks/query cepat.
- Alternatif: gunakan VIEW yang menghitung `computed_status` on-the-fly tanpa menyimpan.

---

## 5) Tampilan di Peta (Frontend)

Gaya marker berdasarkan `status`:

- Active → ikon/lingkaran berwarna penuh (opacity normal)
- Expiring → ikon sedikit pudar + label kecil "akan kadaluarsa"
- Expired → ikon abu-abu + tooltip "laporan lama, mungkin tidak relevan"
- Permanent → ikon stabil tanpa indikator expire

Detail saat marker diklik (popup):

- Lokasi (lat, lon) & radius area
- Tingkat kebisingan (dB)
- `final_category`
- `raw_labels` (opsional, tampil 2 label teratas dengan skor)
- `confidence_score` (mis. 82%)
- `created_at` & `expires_at` (jika ada)
- `status` saat ini

Catatan UI:

- Username pelapor diambil dari tabel `profiles` berdasarkan `user_id` dan ditampilkan sebagai "Ditambahkan oleh".
- Deskripsi pengguna dapat disembunyikan dari popup (sesuai keputusan produk saat ini).

---

## 6) Validasi & Refresh oleh Pengguna

Aksi komunitas:

- "Masih ada" → memperpanjang `expires_at`
  - Perpanjangan default mengikuti kategori saat ini:  
    Event +2 hari, Construction +30 hari, Traffic +90 hari, Nature/Other +7–30 hari (default 14 hari).
  - `validation_count` bertambah 1.
- "Sudah hilang" → menandai selesai lebih cepat
  - Set `expires_at = NOW()` sehingga status menjadi `expired`.
- "Report" → melaporkan spam/data salah
  - `report_count` bertambah 1; aturan moderasi/threshold diserahkan ke kebijakan admin.

Penggabungan/Clustering:

- Jika ada laporan baru dalam radius yang sama (mis. jarak pusat ≤ max(radius A, radius B) atau aturan haversine < ambang X meter), sistem dapat:
  - Menetapkan `cluster_id` yang sama untuk keduanya; atau
  - Membuat cluster baru dan menetapkan `cluster_id` tersebut.
- `expires_at` cluster/lokasi dapat diperbarui mengikuti kategori terbaru (terutama jika `final_category` berbeda dan ada kebijakan prioritas kategori).

---

## 7) Pengelolaan Data Lama (Aging & Archival)

- Data dengan status `expired` tetap ditampilkan pudar di peta selama 1–3 bulan (konfigurabel).
- Setelah periode itu, data dipindahkan ke tabel arsip (mis. `public.noise_areas_archive`).
- Tabel arsip menyimpan minimal:
  - `id_asal` (ref ke data asal), `latitude`, `longitude`, `radius`
  - `raw_labels`, `final_category`, `noise_source`, `confidence_score`
  - `created_at`, `updated_at`, `expires_at`, `user_id` (opsional), `cluster_id` (opsional)
- Data arsip digunakan untuk analisis tren historis (mis. heatmap jangka panjang) dan tidak ditampilkan di peta utama secara default.

---

## 8) Aturan Ringkas TTL per Kategori (Default)

| Kategori     | TTL Default         | Catatan                                                             |
| ------------ | ------------------- | ------------------------------------------------------------------- |
| Event        | 2 hari              | Kejadian temporer (konser, demo, festival).                         |
| Construction | 30 hari             | Pekerjaan konstruksi; dapat diperpanjang dengan validasi komunitas. |
| Traffic      | 90 hari             | Pola lalu lintas cenderung persisten namun tetap dinamis.           |
| Industry     | Permanen (NULL)     | Sumber kebisingan permanen (pabrik).                                |
| Nature/Other | 14 hari (7–30 opsi) | Default 14 hari; dapat disesuaikan di konfigurasi.                  |

---

## 9) Pertimbangan Backend & RLS (Supabase)

- RLS:
  - Select publik (read-only) untuk data yang tidak sensitif.
  - Insert: hanya pengguna login.
  - Update/Delete: hanya pemilik (`user_id = auth.uid()`), kecuali endpoint terkontrol untuk aksi komunitas (validasi/report) via RPC.
- RPC (opsional):
  - `rpc_validate_area(id, action)` untuk "masih ada"/"sudah hilang"/"report" agar logika perpanjangan dan counter konsisten.
- Cron/Scheduler:
  - Recalculate `status` secara periodik atau gunakan VIEW `computed_status` agar UI bisa query cepat.

---

## 10) Integrasi Frontend Singkat

- Pengambilan data: join ke `profiles` untuk `username` berdasarkan `user_id` (sudah diimplementasikan di service).
- Penentuan gaya marker berdasarkan `status`.
- Popup menampilkan field penting: `noise_level`, `final_category`, `confidence_score`, 2 label teratas dari `raw_labels` (opsional), `created_at`, `expires_at`, dan `status`.
- Tindakan pengguna (reanalyze/validasi/hapus) dibatasi oleh kepemilikan dan kebijakan.

---

Dokumen ini dapat dikembangkan lebih lanjut (contoh: diagram state, spesifikasi RPC, dan contoh query analitik) sesuai kebutuhan sprint berikutnya.
