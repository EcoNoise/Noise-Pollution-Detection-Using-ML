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
        """Extract comprehensive audio features matching notebook implementation (210 features)"""
        try:
            import time
            
            # Ensure audio is the correct length
            audio_data = self._ensure_length(audio_data)

            # Normalize amplitude (matching notebook)
            audio_data = librosa.util.normalize(audio_data)

            # Configuration matching notebook
            n_fft = 2048
            hop_length = 512

            features = {}

            # 1. MFCC Features (matching notebook implementation - 20 coefficients)
            mfccs = librosa.feature.mfcc(
                y=audio_data,
                sr=self.sample_rate,
                n_mfcc=20,  # Changed from 13 to 20 to match notebook
                n_fft=n_fft,
                hop_length=hop_length,
            )
            features["mfcc_mean"] = np.mean(mfccs, axis=1)  # 20 features
            features["mfcc_var"] = np.var(mfccs, axis=1)  # 20 features (using var instead of std)

            # 2. Chroma Features (12 features)
            chroma = librosa.feature.chroma_stft(
                y=audio_data, sr=self.sample_rate, n_chroma=12, hop_length=hop_length
            )
            features["chroma_mean"] = np.mean(chroma, axis=1)  # 12 features
            features["chroma_var"] = np.var(chroma, axis=1)  # 12 features

            # 3. Mel-frequency features (64 mel bands to match notebook)
            mel_spectrogram = librosa.feature.melspectrogram(
                y=audio_data, sr=self.sample_rate, n_mels=64, hop_length=hop_length
            )
            features["mel_mean"] = np.mean(mel_spectrogram, axis=1)  # 64 features
            features["mel_var"] = np.var(mel_spectrogram, axis=1)  # 64 features

            # 4. Zero Crossing Rate
            zcr = librosa.feature.zero_crossing_rate(
                audio_data, hop_length=hop_length
            )
            features["zcr_mean"] = np.mean(zcr)
            features["zcr_var"] = np.var(zcr)

            # 5. Spectral Features
            spectral_centroids = librosa.feature.spectral_centroid(
                y=audio_data, sr=self.sample_rate, hop_length=hop_length
            )
            features["spectral_centroid_mean"] = np.mean(spectral_centroids)
            
            spectral_bandwidth = librosa.feature.spectral_bandwidth(
                y=audio_data, sr=self.sample_rate, hop_length=hop_length
            )
            features["spectral_bandwidth_mean"] = np.mean(spectral_bandwidth)
            
            spectral_rolloff = librosa.feature.spectral_rolloff(
                y=audio_data, sr=self.sample_rate, hop_length=hop_length
            )
            features["spectral_rolloff_mean"] = np.mean(spectral_rolloff)

            # 6. Metadata-based features (simulated to match notebook structure)
            # These simulate the metadata features from the notebook
            current_time = time.time()
            clip_duration = len(audio_data) / self.sample_rate
            
            # Basic metadata features
            features["duration"] = clip_duration
            features["salience"] = 1.0  # Default salience
            features["fold"] = 1  # Default fold
            
            # Duration-based features
            features["duration_normalized"] = clip_duration / 4.0  # Normalize by expected duration
            
            # Source-based feature
            features["source_id"] = 1  # Default source ID
            
            # Quality indicator
            features["quality_score"] = features["salience"] * features["duration_normalized"]
            
            # Statistical enrichment features (matching notebook)
            features["duration_vs_class_mean"] = clip_duration / 4.0
            features["duration_vs_class_std"] = (clip_duration - 4.0) / 1.0
            features["salience_vs_class_mean"] = features["salience"] / 1.0
            features["quality_vs_class_mean"] = features["quality_score"] / 1.0
            
            # Complex interactions
            features["duration_quality_interaction"] = clip_duration * features["quality_score"]
            features["duration_salience_ratio"] = clip_duration / (features["salience"] + 1e-6)
            features["normalized_quality_score"] = features["quality_score"] / 1.0

            # Flatten all features into a single array (matching notebook order)
            feature_vector = []
            
            # Add features in the same order as notebook
            for key in sorted(features.keys()):
                if isinstance(features[key], np.ndarray):
                    feature_vector.extend(features[key])
                else:
                    feature_vector.append(features[key])

            # Convert to numpy array
            feature_array = np.array(feature_vector, dtype=np.float32)

            # Verify we have exactly 210 features
            if len(feature_array) != 210:
                print(f"Warning: Expected 210 features, got {len(feature_array)}")
                # Pad or truncate to match expected size
                if len(feature_array) < 210:
                    padding = np.zeros(210 - len(feature_array))
                    feature_array = np.concatenate([feature_array, padding])
                else:
                    feature_array = feature_array[:210]

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
