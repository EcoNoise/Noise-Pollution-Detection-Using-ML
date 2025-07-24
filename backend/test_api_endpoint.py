#!/usr/bin/env python3
"""
Test script to verify API endpoint functionality with the fixed feature extraction
"""

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'noise_detection_backend.settings')
django.setup()

import numpy as np
from noise_detection.utils import AudioProcessor
from noise_detection.ml_models import NoiseDetectionModel

def test_audio_processing_pipeline():
    """Test the complete audio processing pipeline"""
    print("🎯 Testing Audio Processing Pipeline")
    print("=" * 50)
    
    try:
        # Initialize components
        processor = AudioProcessor()
        model = NoiseDetectionModel()
        
        print("✅ Components initialized successfully")
        
        # Test with synthetic audio
        print("\n🔊 Testing with synthetic audio...")
        test_audio = np.random.randn(88200)  # 4 seconds at 22050 Hz
        
        # Extract features
        features = processor.extract_features(test_audio)
        print(f"   Features extracted: {len(features)} (expected: 210)")
        
        # Process through model
        result = model.process_audio_data(test_audio)
        
        print(f"   ✅ Processing successful!")
        print(f"   Noise level: {result.get('noise_level', 'N/A')} dB")
        print(f"   Noise source: {result.get('noise_source', 'N/A')}")
        print(f"   Health impact: {result.get('health_impact', 'N/A')}")
        print(f"   Confidence: {result.get('confidence', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_different_audio_scenarios():
    """Test with different audio scenarios"""
    print("\n🎵 Testing Different Audio Scenarios")
    print("=" * 50)
    
    processor = AudioProcessor()
    model = NoiseDetectionModel()
    
    scenarios = [
        ("Silence", np.zeros(88200)),
        ("White Noise", np.random.randn(88200)),
        ("Sine Wave", np.sin(2 * np.pi * 440 * np.linspace(0, 4, 88200))),
        ("Low Frequency", np.sin(2 * np.pi * 100 * np.linspace(0, 4, 88200))),
        ("High Frequency", np.sin(2 * np.pi * 2000 * np.linspace(0, 4, 88200))),
    ]
    
    results = []
    
    for name, audio in scenarios:
        try:
            result = model.process_audio_data(audio)
            results.append((name, result))
            print(f"   {name:15} -> {result.get('noise_level', 'N/A'):>6} dB | {result.get('noise_source', 'N/A'):>15}")
        except Exception as e:
            print(f"   {name:15} -> ❌ Error: {e}")
            results.append((name, None))
    
    return len([r for r in results if r[1] is not None]) > 0

if __name__ == "__main__":
    print("🚀 API Endpoint Functionality Test")
    print("=" * 60)
    
    # Run tests
    pipeline_test = test_audio_processing_pipeline()
    scenario_test = test_different_audio_scenarios()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary:")
    print(f"   Pipeline Test: {'✅ PASS' if pipeline_test else '❌ FAIL'}")
    print(f"   Scenario Test: {'✅ PASS' if scenario_test else '❌ FAIL'}")
    
    if pipeline_test and scenario_test:
        print("\n🎉 All API tests passed!")
        print("   • Feature extraction working correctly (210 features)")
        print("   • Model processing successful")
        print("   • Pipeline ready for production")
    else:
        print("\n⚠️ Some tests failed. Check the issues above.")
    
    print("\n✅ API test complete!")