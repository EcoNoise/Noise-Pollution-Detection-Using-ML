"""
URL patterns for Noise Detection API
"""

from django.urls import path
from .views import (
    ModelStatusView,
    AudioUploadPredictionView,
    PredictionHistoryView,
    BatchPredictionView,
    HealthView,
)

app_name = "noise_detection"

urlpatterns = [
    # Health check
    path("health/", HealthView.as_view(), name="health"),
    # Model status
    path("models/status/", ModelStatusView.as_view(), name="model_status"),
    # Audio prediction
    path("predict/", AudioUploadPredictionView.as_view(), name="audio_prediction"),
    path("predict/batch/", BatchPredictionView.as_view(), name="batch_prediction"),
    # History
    path("history/", PredictionHistoryView.as_view(), name="prediction_history"),
]
