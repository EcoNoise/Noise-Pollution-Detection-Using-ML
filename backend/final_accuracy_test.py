"""
Final Accuracy Test and Report
Tests the improved model accuracy and provides summary of changes
"""

import os
import sys
import django
import numpy as np

# Setup Django
sys.path.append("d:\\Src\\Small Project\\Noise-Pollution-Detection-Using-ML\\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "noise_detection_backend.settings")
django.setup()

from noise_detection.ml_models import ModelManager
from noise_detection.utils import AudioProcessor


def final_accuracy_test():
    print("🎯 Final Model Accuracy Test Report")
    print("=" * 50)

    model_manager = ModelManager.get_instance()
    audio_processor = AudioProcessor()

    print("\n📊 Testing Improved Accuracy with Various Audio Types:")
    print("-" * 55)

    test_scenarios = {
        "Perfect Silence": {
            "audio": np.zeros(88200),
            "expected_db_range": (15, 45),
            "description": "Complete silence - should be very quiet",
        },
        "Very Quiet Whisper": {
            "audio": np.random.normal(0, 0.001, 88200),
            "expected_db_range": (25, 50),
            "description": "Barely audible sound",
        },
        "Quiet Room Tone": {
            "audio": 0.01
            * np.sin(2 * np.pi * 60 * np.linspace(0, 4, 88200)),  # 60Hz hum
            "expected_db_range": (40, 65),
            "description": "Quiet room with slight hum",
        },
        "Normal Conversation": {
            "audio": np.random.normal(0, 0.05, 88200),
            "expected_db_range": (60, 85),
            "description": "Normal indoor conversation level",
        },
        "Busy Street": {
            "audio": np.random.normal(0, 0.2, 88200),
            "expected_db_range": (75, 95),
            "description": "Busy street or traffic noise",
        },
        "Very Loud Concert": {
            "audio": np.random.normal(0, 0.5, 88200),
            "expected_db_range": (90, 120),
            "description": "Very loud music or concert",
        },
        "Pure 440Hz Tone": {
            "audio": 0.1 * np.sin(2 * np.pi * 440 * np.linspace(0, 4, 88200)),
            "expected_db_range": (65, 85),
            "description": "Musical note A4",
        },
        "High Frequency Tone": {
            "audio": 0.1 * np.sin(2 * np.pi * 2000 * np.linspace(0, 4, 88200)),
            "expected_db_range": (70, 90),
            "description": "High pitched tone",
        },
    }

    results = {}
    accuracy_score = 0
    total_tests = len(test_scenarios)

    for scenario_name, scenario in test_scenarios.items():
        print(f"\\n🧪 Testing: {scenario_name}")
        print(f"   Description: {scenario['description']}")

        try:
            # Extract features and predict
            features = audio_processor.extract_features(scenario["audio"])
            result = model_manager.predict_all(features)

            # Check if prediction is within expected range
            predicted_db = result["noise_level"]
            expected_min, expected_max = scenario["expected_db_range"]

            is_accurate = expected_min <= predicted_db <= expected_max

            print(f"   Predicted: {predicted_db:.1f} dB")
            print(f"   Expected: {expected_min}-{expected_max} dB")
            print(
                f"   Source: {result['noise_source']} (conf: {result['confidence_score']:.3f})"
            )
            print(f"   Health Impact: {result['health_impact']}")

            if is_accurate:
                print(f"   ✅ ACCURATE - Within expected range")
                accuracy_score += 1
            else:
                print(f"   ❌ INACCURATE - Outside expected range")

            results[scenario_name] = {
                "predicted_db": predicted_db,
                "expected_range": scenario["expected_db_range"],
                "accurate": is_accurate,
                "source": result["noise_source"],
                "confidence": result["confidence_score"],
                "health_impact": result["health_impact"],
            }

        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            results[scenario_name] = {"error": str(e)}

    # Calculate overall accuracy
    overall_accuracy = (accuracy_score / total_tests) * 100

    print(f"\\n📋 Final Accuracy Report")
    print("=" * 35)
    print(f"Tests Passed: {accuracy_score}/{total_tests}")
    print(f"Overall Accuracy: {overall_accuracy:.1f}%")

    # Categorize results
    accurate_tests = [
        name for name, result in results.items() if result.get("accurate", False)
    ]
    inaccurate_tests = [
        name for name, result in results.items() if not result.get("accurate", True)
    ]

    if accurate_tests:
        print(f"\\n✅ Accurate Predictions:")
        for test_name in accurate_tests:
            result = results[test_name]
            print(f"   • {test_name}: {result['predicted_db']:.1f} dB")

    if inaccurate_tests:
        print(f"\\n❌ Inaccurate Predictions:")
        for test_name in inaccurate_tests:
            result = results[test_name]
            if "predicted_db" in result:
                expected = result["expected_range"]
                print(
                    f"   • {test_name}: {result['predicted_db']:.1f} dB (expected: {expected[0]}-{expected[1]} dB)"
                )

    # Source diversity analysis
    sources = [result["source"] for result in results.values() if "source" in result]
    unique_sources = set(sources)

    print(f"\\n🎭 Source Diversity Analysis:")
    print(f"Unique sources predicted: {len(unique_sources)}")
    print(f"Sources: {', '.join(sorted(unique_sources))}")

    if len(unique_sources) >= 4:
        print("✅ Good source diversity - model not overly biased")
    else:
        print("⚠️ Limited source diversity - model may still be biased")

    # Confidence analysis
    confidences = [
        result["confidence"] for result in results.values() if "confidence" in result
    ]
    if confidences:
        avg_confidence = np.mean(confidences)
        confidence_std = np.std(confidences)

        print(f"\\n🎯 Confidence Analysis:")
        print(f"Average confidence: {avg_confidence:.3f}")
        print(f"Confidence std: {confidence_std:.3f}")

        if 0.3 <= avg_confidence <= 0.8:
            print("✅ Reasonable confidence levels")
        elif avg_confidence > 0.8:
            print("⚠️ High confidence - may indicate overconfident predictions")
        else:
            print("⚠️ Low confidence - model uncertainty")

    return overall_accuracy, results


def print_improvement_summary():
    print(f"\\n🚀 Summary of Accuracy Improvements")
    print("=" * 45)

    improvements = [
        "✅ Added adaptive contextual features based on audio energy",
        "✅ Implemented silence detection (80% zero features or MFCC < 1.0)",
        "✅ Enhanced feature validation to handle NaN/infinite values",
        "✅ Added bias reduction for source predictions on low-energy audio",
        "✅ Improved confidence scoring for uncertain predictions",
        "✅ Contextual features now adapt to audio characteristics",
        "✅ Silence predictions now return realistic 15-40 dB range",
    ]

    for improvement in improvements:
        print(f"  {improvement}")

    print(f"\\n🎯 Key Accuracy Fixes:")
    print("  • Silence Detection: 113+ dB → 15-40 dB (realistic)")
    print("  • Source Diversity: Reduced bias toward 'children_playing'")
    print("  • Confidence Calibration: More realistic uncertainty")
    print("  • Feature Validation: Handles edge cases better")

    print(f"\\n💡 Remaining Improvement Opportunities:")
    print("  • Model retraining with more diverse data")
    print("  • Feature engineering optimization")
    print("  • Ensemble methods for better accuracy")
    print("  • Domain-specific fine-tuning")


if __name__ == "__main__":
    accuracy, results = final_accuracy_test()
    print_improvement_summary()

    print(f"\\n🎉 Model Accuracy Test Completed!")
    print(f"Current accuracy: {accuracy:.1f}%")

    if accuracy >= 75:
        print("🌟 EXCELLENT - Model accuracy significantly improved!")
    elif accuracy >= 60:
        print("👍 GOOD - Substantial improvements achieved")
    elif accuracy >= 40:
        print("📈 BETTER - Some improvements made, more work needed")
    else:
        print("🔧 NEEDS WORK - Further improvements required")
