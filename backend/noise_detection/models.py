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
    latitude = models.DecimalField(max_digits=20, decimal_places=15)
    longitude = models.DecimalField(max_digits=20, decimal_places=15)
    noise_level = models.FloatField()
    noise_source = models.CharField(max_length=100, blank=True)
    health_impact = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    radius = models.IntegerField(default=100)  # radius dalam meter
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Area {self.id} - {self.noise_level}dB by {self.user.username}"
    
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