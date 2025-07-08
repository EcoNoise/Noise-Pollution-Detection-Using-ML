"""
Test silence detection with improved feature extraction matching the notebook
"""

import numpy as np
import sys
import os
import tempfile
import warnings
import librosa

warnings.filterwarnings("ignore")

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def create_improved_feature_extractor():
    """Create improved feature extractor matching the notebook"""

    class ImprovedAudioProcessor:
        """Improved audio processor matching the notebook's AudioFeatureExtractor"""

        def __init__(self, sample_rate=22050, duration=4.0):
            self.sample_rate = sample_rate
            self.duration = duration
            self.target_length = int(sample_rate * duration)
            self.n_mfcc = 13
            self.n_fft = 2048
            self.hop_length = 512
            self.n_chroma = 12

        def extract_features(self, audio_data):
            """Extract features matching the notebook's implementation"""
            try:
                # Normalize audio length
                if len(audio_data) < self.target_length:
                    audio_data = np.pad(
                        audio_data,
                        (0, self.target_length - len(audio_data)),
                        mode="constant",
                    )
                else:
                    audio_data = audio_data[: self.target_length]

                # Normalize amplitude
                audio_data = librosa.util.normalize(audio_data)

                features = {}

                # 1. MFCC Features (similar to notebook)
                mfccs = librosa.feature.mfcc(
                    y=audio_data,
                    sr=self.sample_rate,
                    n_mfcc=self.n_mfcc,
                    n_fft=self.n_fft,
                    hop_length=self.hop_length,
                )
                features["mfcc_mean"] = np.mean(mfccs, axis=1)  # 13 features
                features["mfcc_std"] = np.std(mfccs, axis=1)  # 13 features
                features["mfcc_delta"] = np.mean(
                    librosa.feature.delta(mfccs), axis=1
                )  # 13 features

                # 2. Spectral Features (matching notebook)
                spectral_centroids = librosa.feature.spectral_centroid(
                    y=audio_data, sr=self.sample_rate, hop_length=self.hop_length
                )
                features["spectral_centroid_mean"] = np.mean(spectral_centroids)
                features["spectral_centroid_std"] = np.std(spectral_centroids)

                spectral_rolloff = librosa.feature.spectral_rolloff(
                    y=audio_data, sr=self.sample_rate, hop_length=self.hop_length
                )
                features["spectral_rolloff_mean"] = np.mean(spectral_rolloff)
                features["spectral_rolloff_std"] = np.std(spectral_rolloff)

                spectral_bandwidth = librosa.feature.spectral_bandwidth(
                    y=audio_data, sr=self.sample_rate, hop_length=self.hop_length
                )
                features["spectral_bandwidth_mean"] = np.mean(spectral_bandwidth)
                features["spectral_bandwidth_std"] = np.std(spectral_bandwidth)

                # 3. Zero Crossing Rate
                zcr = librosa.feature.zero_crossing_rate(
                    audio_data, hop_length=self.hop_length
                )
                features["zcr_mean"] = np.mean(zcr)
                features["zcr_std"] = np.std(zcr)

                # 4. Chroma Features
                chroma = librosa.feature.chroma_stft(
                    y=audio_data, sr=self.sample_rate, hop_length=self.hop_length
                )
                features["chroma_mean"] = np.mean(chroma, axis=1)  # 12 features
                features["chroma_std"] = np.std(chroma, axis=1)  # 12 features

                # 5. RMS Energy
                rms = librosa.feature.rms(y=audio_data, hop_length=self.hop_length)
                features["rms_mean"] = np.mean(rms)
                features["rms_std"] = np.std(rms)

                # 6. Spectral Contrast
                contrast = librosa.feature.spectral_contrast(
                    y=audio_data, sr=self.sample_rate, hop_length=self.hop_length
                )
                features["contrast_mean"] = np.mean(contrast, axis=1)  # 7 features
                features["contrast_std"] = np.std(contrast, axis=1)  # 7 features

                # 7. Tonnetz
                tonnetz = librosa.feature.tonnetz(
                    y=librosa.effects.harmonic(audio_data), sr=self.sample_rate
                )
                features["tonnetz_mean"] = np.mean(tonnetz, axis=1)  # 6 features
                features["tonnetz_std"] = np.std(tonnetz, axis=1)  # 6 features

                # 8. Tempo and Beat
                try:
                    tempo, beats = librosa.beat.beat_track(
                        y=audio_data, sr=self.sample_rate
                    )
                    features["tempo"] = tempo
                    features["beat_count"] = len(beats)
                except:
                    features["tempo"] = 120.0
                    features["beat_count"] = 100.0

                # 9. Mel-frequency Spectral Coefficients
                mel_spectrogram = librosa.feature.melspectrogram(
                    y=audio_data, sr=self.sample_rate, hop_length=self.hop_length
                )
                features["mel_mean"] = np.mean(mel_spectrogram, axis=1)[
                    :10
                ]  # 10 features
                features["mel_std"] = np.std(mel_spectrogram, axis=1)[
                    :10
                ]  # 10 features

                # 10. Contextual features (improved from notebook approach)
                rms_energy = features["rms_mean"]

                # Better contextual features based on audio characteristics
                if rms_energy < 0.001:  # True silence
                    hour_of_day = 23 / 23.0  # Night time
                    day_of_week = 6 / 6.0  # Weekend
                    location_type = 0 / 4.0  # Residential
                    weather_condition = 0 / 3.0  # Clear
                    traffic_density = 0.1  # Very low
                elif rms_energy < 0.02:  # Quiet audio
                    hour_of_day = 8 / 23.0  # Morning
                    day_of_week = 2 / 6.0  # Weekday
                    location_type = 1 / 4.0  # Suburban
                    weather_condition = 0 / 3.0  # Clear
                    traffic_density = 0.3  # Light
                else:  # Normal/loud audio
                    hour_of_day = 14 / 23.0  # Afternoon
                    day_of_week = 3 / 6.0  # Mid-week
                    location_type = 2 / 4.0  # Urban
                    weather_condition = 0 / 3.0  # Clear
                    traffic_density = 0.5  # Medium

                # Add contextual features
                features["hour_of_day"] = hour_of_day
                features["day_of_week"] = day_of_week
                features["location_type"] = location_type
                features["weather_condition"] = weather_condition
                features["traffic_density"] = traffic_density

                # Flatten features to match expected format
                flattened = []

                # MFCC (39 features)
                flattened.extend(features["mfcc_mean"])
                flattened.extend(features["mfcc_std"])
                flattened.extend(features["mfcc_delta"])

                # Spectral (6 features)
                flattened.extend(
                    [
                        features["spectral_centroid_mean"],
                        features["spectral_centroid_std"],
                        features["spectral_rolloff_mean"],
                        features["spectral_rolloff_std"],
                        features["spectral_bandwidth_mean"],
                        features["spectral_bandwidth_std"],
                    ]
                )

                # ZCR (2 features)
                flattened.extend([features["zcr_mean"], features["zcr_std"]])

                # Chroma (24 features)
                flattened.extend(features["chroma_mean"])
                flattened.extend(features["chroma_std"])

                # RMS (2 features)
                flattened.extend([features["rms_mean"], features["rms_std"]])

                # Contrast (14 features)
                flattened.extend(features["contrast_mean"])
                flattened.extend(features["contrast_std"])

                # Tonnetz (12 features)
                flattened.extend(features["tonnetz_mean"])
                flattened.extend(features["tonnetz_std"])

                # Tempo (2 features)
                flattened.extend([features["tempo"], features["beat_count"]])

                # Mel (20 features)
                flattened.extend(features["mel_mean"])
                flattened.extend(features["mel_std"])

                # Contextual (5 features)
                flattened.extend(
                    [
                        features["hour_of_day"],
                        features["day_of_week"],
                        features["location_type"],
                        features["weather_condition"],
                        features["traffic_density"],
                    ]
                )

                feature_array = np.array(flattened, dtype=np.float32)

                # Ensure we have exactly 126 features
                if len(feature_array) != 126:
                    print(f"Warning: Got {len(feature_array)} features, expected 126")
                    if len(feature_array) < 126:
                        padding = np.zeros(126 - len(feature_array))
                        feature_array = np.concatenate([feature_array, padding])
                    else:
                        feature_array = feature_array[:126]

                return feature_array

            except Exception as e:
                print(f"Error in improved feature extraction: {e}")
                return np.zeros(126, dtype=np.float32)

    return ImprovedAudioProcessor()


def test_silence_detection_improved():
    """Test silence detection with improved features"""
    print("🔬 Testing Silence Detection with Improved Features")
    print("=" * 60)

    # Create improved processor
    processor = create_improved_feature_extractor()

    # Test different audio types
    test_signals = {
        "silence": np.zeros(int(22050 * 4)),
        "quiet_whisper": np.random.normal(0, 0.001, int(22050 * 4)),
        "normal_sound": np.random.normal(0, 0.05, int(22050 * 4)),
        "loud_sound": np.random.normal(0, 0.2, int(22050 * 4)),
    }

    for signal_name, signal_data in test_signals.items():
        print(f"\n🎵 Testing: {signal_name}")
        print("-" * 30)

        try:
            features = processor.extract_features(signal_data)

            # Analyze silence detection features
            mfcc_first = features[0]  # First MFCC coefficient (energy)
            rms_mean = features[71]  # RMS mean feature
            spectral_centroid = features[39]  # Spectral centroid

            print(f"MFCC[0] (energy): {mfcc_first:.4f}")
            print(f"RMS mean: {rms_mean:.6f}")
            print(f"Spectral centroid: {spectral_centroid:.2f}")

            # Check silence indicators
            is_silence = (
                abs(mfcc_first) > 100  # Very negative MFCC[0] indicates silence
                or rms_mean < 0.001  # Very low RMS
                or spectral_centroid < 10  # Very low spectral centroid
            )

            print(f"Detected as silence: {is_silence}")

            # Show contextual features (last 5)
            contextual = features[-5:]
            context_names = [
                "hour_of_day",
                "day_of_week",
                "location_type",
                "weather_condition",
                "traffic_density",
            ]
            print("Contextual features:")
            for name, value in zip(context_names, contextual):
                print(f"  {name}: {value:.3f}")

        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_silence_detection_improved()
