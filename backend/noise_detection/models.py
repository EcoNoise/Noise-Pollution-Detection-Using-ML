"""
Django Models for Noise Detection
"""

from django.db import models


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
    
    
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class Profile(models.Model):
    """Menyimpan data tambahan untuk user, termasuk foto profil."""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    photo = models.ImageField(upload_to='profile_pics/', null=True, blank=True)

    def __str__(self):
        return f'{self.user.username} Profile'

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Signal untuk membuat Profile secara otomatis saat User baru dibuat."""
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Signal untuk menyimpan Profile saat User disimpan."""
    instance.profile.save()