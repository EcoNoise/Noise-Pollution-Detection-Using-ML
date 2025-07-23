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
    RegisterView,
    LoginView,
    RefreshTokenView,
    UserProfileView,
    NoiseAreaListCreateView,
    NoiseAreaDetailView,
    UserNoiseAreasView,
    HealthProfileView,
    ExposureLogView,
    WeeklySummaryView,
    HealthDashboardView,
)

app_name = "noise_detection"

urlpatterns = [
    # Health and Model Status
    path("health/", HealthView.as_view(), name="health"),
    path("model-status/", ModelStatusView.as_view(), name="model_status"),
    
    # Audio Processing
    path("audio/predict/", AudioUploadPredictionView.as_view(), name="audio_predict"),
    path("audio/batch/", BatchPredictionView.as_view(), name="batch_predict"),
    path("predictions/history/", PredictionHistoryView.as_view(), name="prediction_history"),
    
    # Authentication
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", RefreshTokenView.as_view(), name="token_refresh"),
    path("auth/me/", UserProfileView.as_view(), name="user_profile"),
    
    # Noise Areas
    path("noise-areas/", NoiseAreaListCreateView.as_view(), name="noise_areas"),
    path("noise-areas/<str:pk>/", NoiseAreaDetailView.as_view(), name="noise_area_detail"),
    path("my-noise-areas/", UserNoiseAreasView.as_view(), name="user_noise_areas"),
    # Health Dashboard
    path("health-profile/", HealthProfileView.as_view(), name="health_profile"),
    path("exposure-logs/", ExposureLogView.as_view(), name="exposure_logs"),
    path("weekly-summary/", WeeklySummaryView.as_view(), name="weekly_summary"),
    path("health-dashboard/", HealthDashboardView.as_view(), name="health_dashboard"),
]
