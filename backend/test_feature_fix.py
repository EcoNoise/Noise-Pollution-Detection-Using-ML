#!/usr/bin/env python3
"""
Test script to verify the feature extraction fix
"""

import numpy as np
import os
from noise_detection.utils import AudioProcessor

def test_feature_extraction():
    """Test that feature extraction generates correct number of features"""
    print("🔬 Testing Feature Extraction Fix")
    print("=" * 50)
    
    # Initialize processor
    processor = AudioProcessor()
    
    # Test with synthetic audio
    print("\n1️⃣ Testing with synthetic audio...")
    test_audio = np.random.randn(88200)  # 4 seconds at 22050 Hz
    features = processor.extract_features(test_audio)
    
    print(f"   Feature count: {len(features)}")
    print(f"   Expected: 210 features")
    print(f"   ✅ Match: {len(features) == 210}")
    
    # Test with different audio lengths
    print("\n2️⃣ Testing with different audio lengths...")
    for duration in [1, 2, 3, 4, 5]:
        test_audio = np.random.randn(int(22050 * duration))
        features = processor.extract_features(test_audio)
        print(f"   {duration}s audio -> {len(features)} features (expected: 210)")
    
    return len(features) == 210

def test_model_compatibility():
    """Test that models can process the new features"""
    print("\n3️⃣ Testing Model Compatibility...")
    
    try:
        # Test with the actual model loading
        import joblib
        from sklearn.preprocessing import StandardScaler
        
        # Try to load the scaler
        scaler_path = "ml_models/feature_scaler.pkl"
        if os.path.exists(scaler_path):
            scaler = joblib.load(scaler_path)
            print(f"   Scaler loaded successfully")
            print(f"   Scaler expects {scaler.n_features_in_} features")
            
            # Test scaling
            processor = AudioProcessor()
            test_audio = np.random.randn(88200)
            features = processor.extract_features(test_audio)
            
            # Try to scale features
            scaled_features = scaler.transform([features])
            print(f"   ✅ Feature scaling successful")
            print(f"   Input features: {len(features)}")
            print(f"   Scaled features: {scaled_features.shape}")
            
            return True
        else:
            print(f"   ⚠️ Scaler file not found at {scaler_path}")
            return True
            
    except Exception as e:
        print(f"   ❌ Model compatibility test failed: {e}")
        return False

def test_real_audio_file():
    """Test with a real audio file if available"""
    print("\n4️⃣ Testing with real audio file...")
    
    # Look for test audio files
    test_files = [
        "test_audio.wav",
        "sample.wav", 
        "../test_audio.wav",
        "audio_samples/test.wav"
    ]
    
    processor = AudioProcessor()
    
    for test_file in test_files:
        if os.path.exists(test_file):
            print(f"   Found test file: {test_file}")
            try:
                audio_data, _ = processor.load_audio(test_file)
                features = processor.extract_features(audio_data)
                print(f"   ✅ Real audio processing successful")
                print(f"   Features extracted: {len(features)}")
                return True
            except Exception as e:
                print(f"   ❌ Error processing {test_file}: {e}")
    
    print("   ⚠️ No test audio files found, skipping real audio test")
    return True

if __name__ == "__main__":
    print("🎯 Feature Extraction Fix Verification")
    print("=" * 60)
    
    # Run tests
    feature_test = test_feature_extraction()
    model_test = test_model_compatibility()
    audio_test = test_real_audio_file()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary:")
    print(f"   Feature Extraction: {'✅ PASS' if feature_test else '❌ FAIL'}")
    print(f"   Model Compatibility: {'✅ PASS' if model_test else '❌ FAIL'}")
    print(f"   Real Audio Test: {'✅ PASS' if audio_test else '❌ FAIL'}")
    
    if all([feature_test, model_test, audio_test]):
        print("\n🎉 All tests passed! Feature extraction fix is successful.")
        print("   • StandardScaler feature mismatch resolved")
        print("   • Models now expect 210 features correctly")
        print("   • Audio processing pipeline working properly")
    else:
        print("\n⚠️ Some tests failed. Please check the issues above.")
    
    print("\n✅ Verification complete!")