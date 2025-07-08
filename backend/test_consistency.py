#!/usr/bin/env python3
import os
import sys
import django
from pathlib import Path

# Setup Django
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "noise_detection_backend.settings")
django.setup()

from noise_detection.ml_models import ModelManager
from noise_detection.utils import AudioProcessor
import numpy as np


def test_consistency():
    """Test consistency between predict_all and individual methods"""

    # Test dengan data yang sama
    np.random.seed(42)
    test_audio = np.random.randn(88200) * 0.1

    processor = AudioProcessor()
    model_manager = ModelManager()

    features = processor.extract_features(test_audio)

    print("Testing consistency between predict_all and individual methods:")
    print("=" * 60)

    # predict_all method
    result_all = model_manager.predict_all(features)
    print(f"predict_all():")
    print(f"  Noise level: {result_all['noise_level']} dB")
    print(f"  Noise source: {result_all['noise_source']}")
    print(f"  Health impact: {result_all['health_impact']}")
    print(f"  Confidence: {result_all['confidence_score']}")

    print()

    # Individual methods
    noise_level = model_manager.predict_noise_level(features)
    noise_source, confidence = model_manager.predict_noise_source(features)
    health_impact = model_manager.predict_health_impact(features, noise_level)

    print(f"Individual methods:")
    print(f"  Noise level: {noise_level:.2f} dB")
    print(f"  Noise source: {noise_source}")
    print(f"  Health impact: {health_impact}")
    print(f"  Confidence: {confidence:.3f}")

    print()
    print("Consistency check:")
    print(f"  Noise level match: {abs(result_all['noise_level'] - noise_level) < 0.1}")
    print(f"  Noise source match: {result_all['noise_source'] == noise_source}")
    print(f"  Health impact match: {result_all['health_impact'] == health_impact}")
    print(
        f"  Confidence match: {abs(result_all['confidence_score'] - confidence) < 0.01}"
    )


if __name__ == "__main__":
    test_consistency()
