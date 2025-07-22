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
    # Health check
    path("health/", HealthView.as_view(), name="health"),
    # Model status
    path("models/status/", ModelStatusView.as_view(), name="model_status"),
    # Audio prediction
    path("predict/", AudioUploadPredictionView.as_view(), name="audio_prediction"),
    path("predict/batch/", BatchPredictionView.as_view(), name="batch_prediction"),
    # History
    path("history/", PredictionHistoryView.as_view(), name="prediction_history"),
    # Authentication
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path("auth/login/", LoginView.as_view(), name="auth_login"),
    path("auth/refresh/", RefreshTokenView.as_view(), name="auth_refresh"),
    path("auth/me/", UserProfileView.as_view(), name="auth_me"),
    # Noise Areas
    path("areas/", NoiseAreaListCreateView.as_view(), name="noise_areas"),
    path("areas/<int:pk>/", NoiseAreaDetailView.as_view(), name="noise_area_detail"),
    path("areas/my/", UserNoiseAreasView.as_view(), name="user_noise_areas"),
    # Health Dashboard
    path("health-profile/", HealthProfileView.as_view(), name="health_profile"),
    path("exposure-logs/", ExposureLogView.as_view(), name="exposure_logs"),
    path("weekly-summary/", WeeklySummaryView.as_view(), name="weekly_summary"),
    path("health-dashboard/", HealthDashboardView.as_view(), name="health_dashboard"),
]
