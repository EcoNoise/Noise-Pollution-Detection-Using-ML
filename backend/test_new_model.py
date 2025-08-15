#!/usr/bin/env python3
"""
Test script untuk menguji model klasifikasi multi-label yang baru
"""

import requests
import json

def test_model_status():
    """Test model status endpoint"""
    try:
        response = requests.get('http://127.0.0.1:8000/api/model-status/')
        if response.status_code == 200:
            data = response.json()
            print("✅ Model Status:")
            print(f"   YAMNet loaded: {data['models']['yamnet_loaded']}")
            print(f"   Classifier loaded: {data['models']['classifier_loaded']}")
            print(f"   Source classes: {data['source_classes']}")
            print(f"   Total models: {data['total_models']}")
            print(f"   Loaded models: {data['loaded_models']}")
            return True
        else:
            print(f"❌ Model status error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def test_health_endpoint():
    """Test health endpoint"""
    try:
        response = requests.get('http://127.0.0.1:8000/api/health/')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health Status: {data['status']}")
            return True
        else:
            print(f"❌ Health check error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check connection error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing New Multi-Label Classification Model")
    print("=" * 50)
    
    # Test health endpoint
    print("\n1. Testing Health Endpoint...")
    health_ok = test_health_endpoint()
    
    # Test model status
    print("\n2. Testing Model Status...")
    model_ok = test_model_status()
    
    print("\n" + "=" * 50)
    if health_ok and model_ok:
        print("✅ All tests passed! Model is ready for classification.")
        print("\nModel Features:")
        print("- YAMNet for feature extraction")
        print("- Multi-label classification with 6 classes:")
        print("  • vehicle (kendaraan)")
        print("  • construction (konstruksi)")
        print("  • household_machine (mesin rumah tangga)")
        print("  • human (manusia)")
        print("  • environment (lingkungan)")
        print("  • animal (hewan)")
    else:
        print("❌ Some tests failed. Please check the server.")