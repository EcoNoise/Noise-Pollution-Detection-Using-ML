# Rate Limiting dan Auto-Expiry untuk Noise Points

## Fitur yang Diimplementasikan

### 1. Rate Limiting
- **Batas**: Maksimal 5 titik per user per 24 jam
- **Implementasi**: 
  - Method `check_user_daily_limit()` di model `NoiseArea`
  - Validasi di view `NoiseAreaListCreateView.post()`
  - Error handling di frontend `MapComponent.tsx`

### 2. Auto-Expiry
- **Durasi**: 24 jam setelah titik dibuat
- **Implementasi**:
  - Field `expires_at` di model `NoiseArea`
  - Auto-set saat save area baru
  - Cleanup otomatis saat GET noise areas
  - Management command untuk cleanup manual

## Endpoint Baru

### Rate Limit Status
```
GET /api/rate-limit-status/
```
Response:
```json
{
  "status": "success",
  "rate_limit": {
    "can_add": true,
    "current_count": 2,
    "limit": 5,
    "remaining": 3,
    "reset_time": "2025-07-25T12:11:53Z"
  }
}
```

## Management Command

### Cleanup Expired Areas
```bash
# Dry run (preview)
python manage.py cleanup_expired_areas --dry-run

# Actual cleanup
python manage.py cleanup_expired_areas
```

## Database Changes

### Migration
- File: `0002_add_expires_at_to_noisearea.py`
- Menambahkan field `expires_at` (nullable) ke tabel `noise_areas`

## Error Handling

### Rate Limit Exceeded (429)
```json
{
  "status": "error",
  "error": "Batas harian tercapai. Anda sudah menambahkan 5 titik dalam 24 jam terakhir.",
  "details": {
    "current_count": 5,
    "limit": 5,
    "remaining": 0,
    "reset_time": "2025-07-25T12:11:53Z"
  }
}
```

## Cara Kerja

1. **Saat menambah titik baru**:
   - Cek rate limit user
   - Jika belum mencapai batas, izinkan
   - Set `expires_at` = sekarang + 24 jam

2. **Saat mengambil data titik**:
   - Cleanup expired areas terlebih dahulu
   - Return data yang masih valid

3. **Cleanup otomatis**:
   - Berjalan setiap kali GET noise areas
   - Bisa dijadwalkan dengan cron job untuk management command

## Keamanan

- Rate limiting berdasarkan user authentication
- Cleanup hanya menghapus area yang benar-benar expired
- Validasi koordinat identik tetap berfungsi