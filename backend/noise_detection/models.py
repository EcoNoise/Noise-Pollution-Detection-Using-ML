"""
Django Models for Noise Detection
"""

from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):
    """Custom User model dengan foto profil sebagai atribut langsung"""
    photo = models.ImageField(upload_to='profile_pics/', null=True, blank=True)

    def __str__(self):
        return self.username


class PredictionHistory(models.Model):
    """Store prediction history for analytics"""

    timestamp = models.DateTimeField(auto_now_add=True)
    noise_level = models.FloatField()
    noise_source = models.CharField(max_length=50)
    health_impact = models.CharField(max_length=20)
    confidence_score = models.FloatField()
    file_name = models.CharField(max_length=255, null=True, blank=True)
    processing_time = models.FloatField()  # in seconds

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"Prediction {self.id} - {self.noise_level}dB ({self.timestamp})"


class NoiseArea(models.Model):
    """Model untuk menyimpan area berisik yang ditambahkan user di peta"""
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='noise_areas')
    latitude = models.FloatField()  # Ubah ke FloatField untuk kompatibilitas dengan frontend
    longitude = models.FloatField()  # Ubah ke FloatField untuk kompatibilitas dengan frontend
    noise_level = models.FloatField()
    noise_source = models.CharField(max_length=100, blank=True)
    health_impact = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    radius = models.IntegerField(default=50)  # radius dalam meter
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)  # Waktu kedaluwarsa
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Area {self.id} - {self.noise_level}dB by {self.user.username}"
    
    @classmethod
    def check_user_daily_limit(cls, user, limit=5):
        """
        Mengecek apakah user sudah mencapai batas harian untuk menambah noise area
        """
        from django.utils import timezone
        from datetime import timedelta
        
        # Hitung 24 jam terakhir
        twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
        
        # Hitung jumlah area yang dibuat user dalam 24 jam terakhir
        recent_areas_count = cls.objects.filter(
            user=user,
            created_at__gte=twenty_four_hours_ago
        ).count()
        
        return {
            'can_add': recent_areas_count < limit,
            'current_count': recent_areas_count,
            'limit': limit,
            'remaining': max(0, limit - recent_areas_count),
            'reset_time': twenty_four_hours_ago + timedelta(hours=24)
        }
    
    @classmethod
    def cleanup_expired_areas(cls):
        """
        Menghapus area yang sudah kedaluwarsa
        """
        from django.utils import timezone
        
        expired_areas = cls.objects.filter(
            expires_at__lte=timezone.now()
        )
        
        count = expired_areas.count()
        expired_areas.delete()
        
        return count
    
    def save(self, *args, **kwargs):
        """
        Override save method untuk set expires_at secara otomatis
        """
        from django.utils import timezone
        from datetime import timedelta
        
        # Set expires_at jika belum ada (untuk area baru)
        if not self.expires_at and not self.pk:
            self.expires_at = timezone.now() + timedelta(hours=24)
        
        super().save(*args, **kwargs)
    
    @property
    def color(self):
        """Menentukan warna berdasarkan noise level"""
        if self.noise_level <= 40:
            return '#4CAF50'  # green - tenang
        elif self.noise_level <= 60:
            return '#FFC107'  # yellow - sedang
        elif self.noise_level <= 80:
            return '#FF9800'  # orange - berisik
        else:
            return '#F44336'  # red - sangat berisik


class HealthProfile(models.Model):
    """Model untuk menyimpan pengaturan health tracking user"""
    
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='health_profile')
    
    # Home Zone
    home_latitude = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True)
    home_longitude = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True)
    home_address = models.CharField(max_length=255, blank=True)
    
    # Work Zone  
    work_latitude = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True)
    work_longitude = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True)
    work_address = models.CharField(max_length=255, blank=True)
    
    # Settings
    tracking_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Health Profile - {self.user.username}"
    
    @property
    def home_avg_noise(self):
        """Hitung rata-rata noise level di sekitar rumah"""
        if not (self.home_latitude and self.home_longitude):
            return None
        
        # Cari area noise dalam radius 1km dari rumah
        from django.db.models import Avg
        from decimal import Decimal
        import math
        
        lat_range = Decimal('0.009')  # ~1km
        lng_range = Decimal('0.009')  # ~1km
        
        nearby_areas = NoiseArea.objects.filter(
            latitude__range=(self.home_latitude - lat_range, self.home_latitude + lat_range),
            longitude__range=(self.home_longitude - lng_range, self.home_longitude + lng_range)
        )
        
        result = nearby_areas.aggregate(avg_noise=Avg('noise_level'))
        return round(result['avg_noise'], 1) if result['avg_noise'] else None
    
    @property
    def work_avg_noise(self):
        """Hitung rata-rata noise level di sekitar kantor"""
        if not (self.work_latitude and self.work_longitude):
            return None
        
        from django.db.models import Avg
        from decimal import Decimal
        
        lat_range = Decimal('0.009')  # ~1km
        lng_range = Decimal('0.009')  # ~1km
        
        nearby_areas = NoiseArea.objects.filter(
            latitude__range=(self.work_latitude - lat_range, self.work_latitude + lat_range),
            longitude__range=(self.work_longitude - lng_range, self.work_longitude + lng_range)
        )
        
        result = nearby_areas.aggregate(avg_noise=Avg('noise_level'))
        return round(result['avg_noise'], 1) if result['avg_noise'] else None


class ExposureLog(models.Model):
    """Model untuk menyimpan log exposure harian"""
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='exposure_logs')
    date = models.DateField()
    
    # Exposure time dalam jam
    home_exposure_hours = models.FloatField(default=16.0)  # Default 16 jam di rumah
    work_exposure_hours = models.FloatField(default=8.0)   # Default 8 jam di kantor
    commute_exposure_minutes = models.FloatField(default=45.0)  # Default 45 menit commute
    
    # Average noise levels
    home_avg_noise = models.FloatField(null=True, blank=True)
    work_avg_noise = models.FloatField(null=True, blank=True)
    commute_avg_noise = models.FloatField(default=70.0)  # Estimasi noise commute
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', 'date']),
        ]
    
    def __str__(self):
        return f"Exposure Log - {self.user.username} ({self.date})"
    
    @property
    def total_exposure_hours(self):
        """Total jam exposure dalam sehari"""
        return self.home_exposure_hours + self.work_exposure_hours + (self.commute_exposure_minutes / 60)
    
    @property
    def weighted_avg_noise(self):
        """Rata-rata noise level tertimbang berdasarkan waktu exposure"""
        total_hours = self.total_exposure_hours
        if total_hours == 0:
            return 0
        
        home_noise = self.home_avg_noise or 50  # Default jika tidak ada data
        work_noise = self.work_avg_noise or 60  # Default jika tidak ada data
        commute_noise = self.commute_avg_noise or 70
        
        weighted_sum = (
            (home_noise * self.home_exposure_hours) +
            (work_noise * self.work_exposure_hours) +
            (commute_noise * (self.commute_exposure_minutes / 60))
        )
        
        return round(weighted_sum / total_hours, 1)
    
    @property
    def health_alerts(self):
        """Generate health alerts berdasarkan exposure"""
        alerts = []
        
        # Alert jika exposure tinggi di weekday
        if self.date.weekday() < 5:  # Monday-Friday
            if self.weighted_avg_noise > 70:
                alerts.append("High exposure Mon-Fri")
            if self.total_exposure_hours > 10:
                alerts.append("Extended exposure time")
        
        # Alert jika weekend tapi masih tinggi
        if self.date.weekday() >= 5:  # Weekend
            if self.weighted_avg_noise > 60:
                alerts.append("Weekend recovery needed")
        
        return alerts