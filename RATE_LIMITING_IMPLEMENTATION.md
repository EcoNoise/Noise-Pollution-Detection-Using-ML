# Rate Limiting dan Auto-Expiry Implementation

## Overview
Implementasi fitur rate limiting dan auto-expiry untuk noise points di aplikasi Noise Map Web.

## Fitur yang Diimplementasikan

### 1. Rate Limiting (Pembatasan Tingkat)
- **Batas**: Maksimal 5 noise points per user dalam 24 jam
- **Implementasi**: 
  - Method `check_user_daily_limit()` di model `NoiseArea`
  - Validasi di `NoiseAreaListCreateView.post()`
  - Error handling 429 di frontend (`MapComponent.tsx`)

### 2. Auto-Expiry (Kedaluwarsa Otomatis)
- **Durasi**: 24 jam setelah dibuat
- **Implementasi**:
  - Field `expires_at` di model `NoiseArea`
  - Auto-set saat save di method `save()`
  - Cleanup otomatis di `NoiseAreaListCreateView.get()`
  - Management command `cleanup_expired_areas`

### 3. Informasi Waktu Expire di Popup
- **Fitur Baru**: Menampilkan berapa jam lagi noise point akan expire
- **Implementasi**:
  - Field `expires_at` ditambahkan ke interface `NoiseLocation`
  - Fungsi `getTimeUntilExpiry()` di `mapUtils.ts`
  - Tampilan waktu expire di `MapPopup.tsx`
  - Konversi data dari backend di `mapService.ts`

## Detail Implementasi

### Backend Changes

#### 1. Model (`noise_detection/models.py`)
```python
class NoiseArea(models.Model):
    # ... existing fields ...
    expires_at = models.DateTimeField(null=True, blank=True)
    
    @classmethod
    def check_user_daily_limit(cls, user):
        # Implementasi rate limiting
    
    @classmethod
    def cleanup_expired_areas(cls):
        # Cleanup expired areas
    
    def save(self, *args, **kwargs):
        # Auto-set expires_at untuk area baru
```

#### 2. Views (`noise_detection/views.py`)
```python
class NoiseAreaListCreateView(APIView):
    def post(self, request):
        # Rate limiting check
        if not NoiseArea.check_user_daily_limit(request.user):
            return Response(
                {"error": "Batas harian tercapai. Maksimal 5 titik dalam 24 jam."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
    
    def get(self, request):
        # Cleanup expired areas
        NoiseArea.cleanup_expired_areas()

class UserRateLimitStatusView(APIView):
    # Endpoint untuk cek status rate limit
```

#### 3. Serializer (`noise_detection/serializers.py`)
```python
class NoiseAreaSerializer(serializers.ModelSerializer):
    expires_at = serializers.DateTimeField(read_only=True)
```

### Frontend Changes

#### 1. Types (`types/mapTypes.ts`)
```typescript
export interface NoiseLocation {
    // ... existing fields ...
    expires_at?: Date; // Added expiration time field
}
```

#### 2. Utils (`utils/mapUtils.ts`)
```typescript
export const getTimeUntilExpiry = (expiresAt: Date): string => {
    // Menghitung waktu tersisa sampai expire
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) {
        return "Sudah expired";
    }
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
        return `${diffHours} jam ${diffMinutes} menit lagi`;
    } else {
        return `${diffMinutes} menit lagi`;
    }
};
```

#### 3. Popup Component (`components/MapPopup.tsx`)
```typescript
{location.expires_at && (
    <>
        <strong>Expire:</strong> {getTimeUntilExpiry(location.expires_at)}
        <br />
    </>
)}
```

#### 4. Service (`services/mapService.ts`)
```typescript
// Semua konversi data dari backend ke frontend sudah diperbarui
// untuk menyertakan field expires_at
expires_at: area.expires_at ? new Date(area.expires_at) : undefined,
```

#### 5. Error Handling (`components/MapComponent.tsx`)
```typescript
if (error.message.includes('429') || error.message.includes('Batas harian')) {
    setError("Batas harian tercapai! Anda hanya dapat menambahkan maksimal 5 titik kebisingan dalam 24 jam.");
}
```

## API Endpoints

### 1. Rate Limit Status
- **URL**: `/api/rate-limit-status/`
- **Method**: GET
- **Auth**: Required
- **Response**: 
```json
{
    "current_count": 3,
    "limit": 5,
    "remaining": 2,
    "reset_time": "2024-01-02T10:30:00Z"
}
```

### 2. Noise Areas (Updated)
- **URL**: `/api/noise-areas/`
- **Response** sekarang menyertakan `expires_at`:
```json
{
    "status": "success",
    "areas": [
        {
            "id": 1,
            "latitude": -6.2,
            "longitude": 106.8,
            "noise_level": 75.5,
            "expires_at": "2024-01-02T10:30:00Z",
            // ... other fields
        }
    ]
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

## Database Migration
```bash
python manage.py makemigrations noise_detection --name add_expires_at_to_noisearea
python manage.py migrate
```

## Testing

### 1. Rate Limiting
- Coba tambahkan lebih dari 5 noise points dalam 24 jam
- Verifikasi error 429 muncul
- Cek endpoint `/api/rate-limit-status/`

### 2. Auto-Expiry
- Tambahkan noise point
- Verifikasi field `expires_at` terisi (24 jam dari sekarang)
- Jalankan cleanup command setelah 24 jam

### 3. Popup Display
- Klik pada noise point di map
- Verifikasi informasi "Expire: X jam Y menit lagi" muncul
- Cek bahwa waktu terupdate secara real-time

## Security Considerations

1. **Rate Limiting**: Mencegah spam dan abuse
2. **Auto-Expiry**: Menjaga data tetap relevan dan fresh
3. **User-based**: Setiap user memiliki limit terpisah
4. **Server-side Validation**: Semua validasi dilakukan di backend

## Performance Notes

1. **Cleanup**: Dijalankan otomatis saat GET request
2. **Indexing**: Field `expires_at` dan `created_at` diindex untuk performa
3. **Caching**: Rate limit status bisa di-cache untuk mengurangi query

## Future Enhancements

1. **Configurable Limits**: Admin bisa mengatur limit per user
2. **Premium Users**: User premium bisa memiliki limit lebih tinggi
3. **Real-time Updates**: WebSocket untuk update waktu expire secara real-time
4. **Analytics**: Dashboard untuk monitoring usage patterns