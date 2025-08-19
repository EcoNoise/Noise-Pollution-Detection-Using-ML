# Perbaikan Frontend: Penghapusan Supabase & Penataan Ulang (Bilingual ID + EN)

Ringkasan / Summary

- ID: Dokumen ini merinci rencana bertahap untuk menghapus seluruh integrasi Supabase dari frontend, mempertahankan file .env, menghapus folder supabase (migrasi/konfigurasi), menonaktifkan autentikasi sementara (semua rute terbuka), menampilkan placeholder untuk seluruh fitur yang sebelumnya bergantung pada Supabase, serta melakukan refactor dan pembersihan kode (clean code) termasuk Prettier/ESLint dan mengaktifkan TypeScript strict. Tidak ada penambahan dependency baru. Tidak ada timeline yang dicantumkan.
- EN: This document outlines a phased plan to remove all Supabase integrations from the frontend, keep .env as-is, delete the local supabase folder (migrations/config), temporarily disable authentication (all routes open), show placeholders for all features previously backed by Supabase, and perform refactoring/clean-up including Prettier/ESLint and enabling TypeScript strict mode. No new dependencies will be added. No timeline included.

Keputusan & Ruang Lingkup / Decisions & Scope

- ID:
  - Hapus seluruh file klien Supabase dan semua pemanggilan terkait di kode.
  - Jangan hapus dependency SDK @supabase/supabase-js dari package.json (tetap dibiarkan untuk sekarang).
  - Hapus tipe/komentar spesifik Supabase (mis. interface Database) bersama dengan penghapusan file klien.
  - Hapus folder lokal supabase (migrasi & konfigurasi) dari proyek.
  - .env: biarkan apa adanya (tidak diubah).
  - End-state sementara: Opsi C — semua fitur terkait Supabase dinonaktifkan dan menampilkan placeholder/pemberitahuan di UI.
  - Autentikasi dinonaktifkan sementara: semua rute terbuka.
  - Clean code: terapkan Prettier/ESLint rules, aktifkan TypeScript strict, pecah mapService.ts menjadi modul-modul kecil.
  - Dokumentasi: tambahkan panduan mode offline/mock, peta modul arsitektur frontend pasca-penghapusan Supabase, dan placeholder daftar API backend baru.
  - Tidak menambah dependency baru (termasuk tooling DX).
- EN:
  - Remove all Supabase client files and related calls in code.
  - Do not remove @supabase/supabase-js from package.json for now.
  - Remove Supabase-specific types/comments (e.g., Database interface) alongside client file removal.
  - Delete the local supabase folder (migrations & config).
  - .env: leave untouched.
  - Temporary end-state: Option C — disable all Supabase-related features and display UI placeholders/notifications.
  - Temporarily disable authentication: all routes open.
  - Clean code: apply Prettier/ESLint rules, enable TypeScript strict, split mapService.ts into smaller modules.
  - Documentation: add offline/mock guide, frontend architecture map post-Supabase removal, and placeholder list of new backend APIs.
  - No new dependencies (including DX tooling).

Daftar Berkas dan Area Terdampak (Inventaris) / Affected Files and Areas (Inventory)

- Klien Supabase dan impor:
  - <mcfile name="supabase.ts" path="d:\noiseMapWeb\frontend\src\lib\supabase.ts"></mcfile>
  - <mcfile name="package.json" path="d:\noiseMapWeb\frontend\package.json"></mcfile>
  - <mcfile name=".env.example" path="d:\noiseMapWeb\frontend\.env.example"></mcfile>
- Layanan dan utilitas yang memanggil Supabase:
  - <mcfile name="api.ts" path="d:\noiseMapWeb\frontend\src\services\api.ts"></mcfile>
  - <mcfile name="healthService.ts" path="d:\noiseMapWeb\frontend\src\services\healthService.ts"></mcfile>
  - <mcfile name="mapService.ts" path="d:\noiseMapWeb\frontend\src\services\mapService.ts"></mcfile>
  - <mcfile name="profileService.ts" path="d:\noiseMapWeb\frontend\src\services\profileService.ts"></mcfile>
  - <mcfile name="tokenManager.ts" path="d:\noiseMapWeb\frontend\src\utils\tokenManager.ts"></mcfile>
- Komponen yang memanggil Supabase (dynamic import):
  - <mcfile name="HomePage.tsx" path="d:\noiseMapWeb\frontend\src\components\HomePage.tsx"></mcfile>
  - <mcfile name="MapComponent.tsx" path="d:\noiseMapWeb\frontend\src\components\MapComponent.tsx"></mcfile>
- Routing dan guard:
  - <mcfile name="AppMain.tsx" path="d:\noiseMapWeb\frontend\src\AppMain.tsx"></mcfile>
- Direktori Supabase lokal untuk dihapus:
  - <mcfolder name="supabase" path="d:\noiseMapWeb\supabase"></mcfolder>

Fase Pekerjaan / Work Phases

Phase 0 — Konfirmasi Ruang Lingkup (Selesai) / Scope Confirmation (Done)

- ID: Konfirmasi diterima sesuai poin-poin pada bagian Keputusan & Ruang Lingkup.
- EN: Confirmation acknowledged as per Decisions & Scope above.

Phase 1 — Penghapusan Supabase (Selesai) / Remove Supabase (Done)

- Acceptance Criteria:
  - Tidak ada import atau pemanggilan Supabase tersisa di codebase.
  - Build frontend berhasil (meski fitur tertentu nonaktif/placeholder).
  - Direktori supabase terhapus bersih.

Phase 2 — Mode Sementara Opsi C (Placeholder) (Selesai) / Temporary Mode Option C (Placeholders) (Done)

- Status Implementasi:
  - Autentikasi dinonaktifkan sementara melalui ProtectedRoute (pass-through saat backend nonaktif).
  - Banner global: “Fitur yang bergantung pada backend sementara dinonaktifkan.” ditampilkan di seluruh aplikasi.
  - Komponen/halaman yang sebelumnya menggunakan Supabase (HomePage, MapComponent, ProfilePage, HistoryPage) menampilkan placeholder/warning dan tombol aksi dinonaktifkan dengan tooltip.

Phase 3 — Desain Data Layer Sementara (Mock/Offline) (Selesai) / Temporary Data Layer Design (Mock/Offline) (Done)

- Status Implementasi:
  - Dibuat antarmuka service backend-agnostic:
    - <mcfile name="IAuthService.ts" path="D:\noiseMapWeb\frontend\src\services\interfaces\IAuthService.ts"></mcfile>
    - <mcfile name="IProfileService.ts" path="D:\noiseMapWeb\frontend\src\services\interfaces\IProfileService.ts"></mcfile>
    - <mcfile name="IMapRepository.ts" path="D:\noiseMapWeb\frontend\src\services\interfaces\IMapRepository.ts"></mcfile>
    - <mcfile name="IHealthRepository.ts" path="D:\noiseMapWeb\frontend\src\services\interfaces\IHealthRepository.ts"></mcfile>
  - Disediakan barrel export: <mcfile name="index.ts" path="D:\noiseMapWeb\frontend\src\services\interfaces\index.ts"></mcfile>
  - Flag konfigurasi `backendEnabled=false` telah digunakan untuk routing UI ke placeholder.
  - Kontrak data tersirat dari interfaces di atas, sehingga transisi ke backend baru menjadi lebih mudah.

Phase 4 — Refactor & Clean Code (Selesai) / Refactor & Clean Code (Done)

- Status Implementasi:
  - 4.1: TypeScript strict aktif di <mcfile name="tsconfig.json" path="d:\noiseMapWeb\frontend\tsconfig.json"></mcfile> ("strict": true) dan build tanpa error tipe (Done)
  - 4.2: Prettier/ESLint rules diterapkan, file dirapikan, warning ESLint diperbaiki termasuk unused imports dan variables (Done)
  - 4.3: <mcfile name="mapService.ts" path="d:\noiseMapWeb\frontend\src\services\mapService.ts"></mcfile> dipecah menjadi modul: <mcfile name="map.repository.ts" path="d:\noiseMapWeb\frontend\src\services\map.repository.ts"></mcfile>, <mcfile name="map.transformers.ts" path="d:\noiseMapWeb\frontend\src\services\map.transformers.ts"></mcfile>, <mcfile name="map.analysis.ts" path="d:\noiseMapWeb\frontend\src\services\map.analysis.ts"></mcfile>, <mcfile name="map.export.ts" path="d:\noiseMapWeb\frontend\src\services\map.export.ts"></mcfile>, dan barrel export <mcfile name="index.ts" path="d:\noiseMapWeb\frontend\src\services\index.ts"></mcfile> (Done)
  - 4.4: Dead code dibersihkan, penamaan dirapikan, struktur folder distandarisasi (services, components, utils, types, config) (Done)
- Catatan:
  - API publik MapService dipertahankan sehingga pemanggilan di <mcfile name="MapComponent.tsx" path="d:\noiseMapWeb\frontend\src\components\MapComponent.tsx"></mcfile> dan <mcfile name="HomePage.tsx" path="d:\noiseMapWeb\frontend\src\components\HomePage.tsx"></mcfile> tetap berfungsi.
  - Tidak ada perintah build otomatis dijalankan.

Phase 5 — Dokumentasi Lanjutan / Extended Documentation

- Panduan offline/mock, peta modul arsitektur, dan daftar API pengganti (placeholder).

Phase 6 — QA & Uji Manual / QA & Manual Testing

- Skenario uji manual untuk memastikan stabilitas UI dan tidak ada call ke Supabase.
