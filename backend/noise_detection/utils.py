"""
Utility functions for audio processing
"""

import numpy as np
import librosa
from typing import Tuple
import tempfile
import os
import warnings

# Suppress warnings untuk startup yang bersih
warnings.filterwarnings("ignore", message="Couldn't find ffmpeg or avconv")
warnings.filterwarnings("ignore", category=RuntimeWarning, module="pydub")
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
warnings.filterwarnings("ignore", category=UserWarning, module="librosa")
warnings.filterwarnings("ignore", message=".*mpg123.*")

# Configure librosa to suppress backend warnings
os.environ["LIBROSA_CACHE_DIR"] = "/tmp/librosa_cache"


class AudioProcessor:
    """Audio processing utility class for noise detection"""

    def __init__(self, sample_rate: int = 22050, duration: float = 4.0):
        self.sample_rate = sample_rate
        self.duration = duration
        self.target_length = int(sample_rate * duration)

    def load_audio(self, audio_file, offset: float = 0.0) -> Tuple[np.ndarray, int]:
        """Load audio file with standardized parameters"""
        try:
            # Handle file-like object
            if hasattr(audio_file, "read"):
                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=".wav"
                ) as tmp_file:
                    tmp_file.write(audio_file.read())
                    tmp_path = tmp_file.name

                try:
                    # Try loading with librosa, with better error handling
                    audio_data, sr = librosa.load(
                        tmp_path,
                        sr=self.sample_rate,
                        duration=self.duration,
                        offset=offset,
                        res_type="kaiser_fast",  # Faster resampling
                    )
                except Exception:
                    # Fallback: try without specific backend
                    try:
                        audio_data, sr = librosa.load(
                            tmp_path,
                            sr=self.sample_rate,
                            duration=self.duration,
                            offset=offset,
                        )
                    except Exception as e2:
                        raise ValueError(f"Error loading audio file: {str(e2)}")
                finally:
                    # Clean up temp file
                    try:
                        os.unlink(tmp_path)
                    except Exception:
                        pass
            else:
                # Handle file path
                audio_data, sr = librosa.load(
                    audio_file,
                    sr=self.sample_rate,
                    duration=self.duration,
                    offset=offset,
                    res_type="kaiser_fast",
                )

            return self._ensure_length(audio_data), sr

        except Exception as e:
            raise ValueError(f"Error loading audio: {str(e)}")

    def _ensure_length(self, audio_data: np.ndarray) -> np.ndarray:
        """Ensure audio data is the correct length"""
        if len(audio_data) > self.target_length:
            return audio_data[: self.target_length]
        elif len(audio_data) < self.target_length:
            padding = self.target_length - len(audio_data)
            return np.pad(audio_data, (0, padding), mode="constant")
        return audio_data

    def extract_features(self, audio_data: np.ndarray) -> np.ndarray:
        """Extract comprehensive audio features matching notebook implementation (126 features)"""
        try:
            # Ensure audio is the correct length
            audio_data = self._ensure_length(audio_data)

            # Normalize amplitude (matching notebook)
            audio_data = librosa.util.normalize(audio_data)

            # Configuration matching notebook
            n_fft = 2048
            hop_length = 512

            features = {}

            # 1. MFCC Features (matching notebook implementation)
            mfccs = librosa.feature.mfcc(
                y=audio_data,
                sr=self.sample_rate,
                n_mfcc=13,
                n_fft=n_fft,
                hop_length=hop_length,
            )
            features["mfcc_mean"] = np.mean(mfccs, axis=1)  # 13 features
            features["mfcc_std"] = np.std(mfccs, axis=1)  # 13 features
            features["mfcc_delta"] = np.mean(
                librosa.feature.delta(mfccs), axis=1
            )  # 13 features

            # 2. Spectral Features (matching notebook)
            spectral_centroids = librosa.feature.spectral_centroid(
                y=audio_data, sr=self.sample_rate, hop_length=hop_length
            )
            spectral_rolloff = librosa.feature.spectral_rolloff(
                y=audio_data, sr=self.sample_rate, hop_length=hop_length
            )
            spectral_bandwidth = librosa.feature.spectral_bandwidth(
                y=audio_data, sr=self.sample_rate, hop_length=hop_length
            )

            features["spectral_centroid_mean"] = np.mean(spectral_centroids)
            features["spectral_centroid_std"] = np.std(spectral_centroids)
            features["spectral_rolloff_mean"] = np.mean(spectral_rolloff)
            features["spectral_rolloff_std"] = np.std(spectral_rolloff)
            features["spectral_bandwidth_mean"] = np.mean(spectral_bandwidth)
            features["spectral_bandwidth_std"] = np.std(spectral_bandwidth)

            # 3. Zero Crossing Rate
            zcr = librosa.feature.zero_crossing_rate(audio_data, hop_length=hop_length)
            features["zcr_mean"] = np.mean(zcr)
            features["zcr_std"] = np.std(zcr)

            # 4. Chroma Features
            chroma = librosa.feature.chroma_stft(
                y=audio_data, sr=self.sample_rate, hop_length=hop_length
            )
            features["chroma_mean"] = np.mean(chroma, axis=1)  # 12 features
            features["chroma_std"] = np.std(chroma, axis=1)  # 12 features

            # 5. RMS Energy
            rms = librosa.feature.rms(y=audio_data, hop_length=hop_length)
            features["rms_mean"] = np.mean(rms)
            features["rms_std"] = np.std(rms)

            # 6. Spectral Contrast
            contrast = librosa.feature.spectral_contrast(
                y=audio_data, sr=self.sample_rate, hop_length=hop_length
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
            except Exception:
                features["tempo"] = 120.0
                features["beat_count"] = 100.0

            # 9. Mel-frequency Spectral Coefficients
            mel_spectrogram = librosa.feature.melspectrogram(
                y=audio_data, sr=self.sample_rate, hop_length=hop_length
            )
            features["mel_mean"] = np.mean(mel_spectrogram, axis=1)[:10]  # 10 features
            features["mel_std"] = np.std(mel_spectrogram, axis=1)[:10]  # 10 features

            # 10. Contextual Features (improved approach matching notebook)
            rms_energy = features["rms_mean"]

            # Adaptive contextual features based on RMS energy (matching notebook approach)
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

            features["hour_of_day"] = hour_of_day
            features["day_of_week"] = day_of_week
            features["location_type"] = location_type
            features["weather_condition"] = weather_condition
            features["traffic_density"] = traffic_density

            # Flatten features in exact order to match training
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

            # Convert to numpy array
            feature_array = np.array(flattened, dtype=np.float32)

            # Verify we have exactly 126 features
            if len(feature_array) != 126:
                print(f"Warning: Expected 126 features, got {len(feature_array)}")
                # Pad or truncate to match expected size
                if len(feature_array) < 126:
                    padding = np.zeros(126 - len(feature_array))
                    feature_array = np.concatenate([feature_array, padding])
                else:
                    feature_array = feature_array[:126]

            return feature_array

        except Exception as e:
            raise ValueError(f"Error extracting features: {str(e)}")

    def process_audio_file(self, audio_file) -> np.ndarray:
        """Complete pipeline: load audio and extract features"""
        audio_data, _ = self.load_audio(audio_file)
        return self.extract_features(audio_data)


def preprocess_audio_for_prediction(audio_file) -> np.ndarray:
    """Convenience function for audio preprocessing"""
    processor = AudioProcessor()
    return processor.process_audio_file(audio_file)
