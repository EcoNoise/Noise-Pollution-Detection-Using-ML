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
