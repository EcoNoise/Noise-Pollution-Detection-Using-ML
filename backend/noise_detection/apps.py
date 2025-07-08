"""
Noise Detection Django App Configuration
"""

from django.apps import AppConfig


class NoiseDetectionConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "noise_detection"

    def ready(self):
        """Initialize ML models when Django starts"""
        try:
            from .ml_models import ModelManager

            # Pre-load models for better performance
            ModelManager.get_instance()
        except Exception as e:
            # Log silently, jangan ganggu startup
            import logging

            logger = logging.getLogger(__name__)
            logger.debug(f"Model loading info: {e}")
