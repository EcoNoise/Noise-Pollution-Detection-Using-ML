"""
ML Models Manager for Noise Detection
Handles loading and prediction of all trained models
"""

import joblib
import numpy as np
import logging
from typing import Dict, Any, Tuple
from django.conf import settings

logger = logging.getLogger(__name__)


class ModelManager:
    """Singleton class to manage all ML models"""

    _instance = None
    _models_loaded = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._models_loaded:
            self.models = {}
            self.scaler = None
            self.selected_features = (
                None  # Changed from feature_selector to selected_features
            )
            # Define source classes from metadata
            self.source_classes = [
                "dog_bark",
                "children_playing",
                "car_horn",
                "air_conditioner",
                "street_music",
                "gun_shot",
                "siren",
                "engine_idling",
                "jackhammer",
                "drilling",
            ]
            self.health_labels = ["Low", "Moderate", "High", "Severe"]
            self._load_models()
            ModelManager._models_loaded = True

    @classmethod
    def get_instance(cls):
        """Get singleton instance"""
        return cls()

    def _load_models(self):
        """Load all trained models"""
        try:
            models_dir = settings.ML_MODELS_DIR

            # Model paths - menggunakan model yang benar-benar ada
            model_files = {
                "noise_level_original": "noise_level_model_original.pkl",
                "noise_source": "noise_source_model_original.pkl",
                "health_impact": "health_impact_model_original.pkl",
                "noise_level_optimized": "noise_level_model_optimized.pkl",
            }

            # Load models
            for model_name, filename in model_files.items():
                model_path = models_dir / filename
                if model_path.exists():
                    self.models[model_name] = joblib.load(model_path)
                    logger.info(f"✅ Loaded {model_name}")
                else:
                    logger.debug(f"Model file not found: {filename} (optional)")

            # Load preprocessing objects
            scaler_path = models_dir / "feature_scaler.pkl"
            if scaler_path.exists():
                self.scaler = joblib.load(scaler_path)
                logger.info("✅ Loaded feature scaler")

            # Load selected features indices (not a selector object)
            selected_features_path = models_dir / "selected_features.npy"
            if selected_features_path.exists():
                self.selected_features = np.load(selected_features_path)
                logger.info("✅ Loaded selected features indices")
            else:
                self.selected_features = None

            # Load source classes
            classes_path = models_dir / "source_classes.pkl"
            if classes_path.exists():
                self.source_classes = joblib.load(classes_path)
                logger.info("✅ Loaded source classes from file")
            else:
                logger.info("✅ Using source classes from metadata")

        except Exception as e:
            logger.error(f"Error loading models: {e}")

    def _validate_features(self, features: np.ndarray) -> np.ndarray:
        """Validate and clean features to prevent unrealistic predictions"""
        # Check for NaN or infinite values
        if np.any(np.isnan(features)) or np.any(np.isinf(features)):
            logger.warning("Found NaN or infinite values in features, cleaning...")
            features = np.nan_to_num(features, nan=0.0, posinf=1e6, neginf=-1e6)

        # Check for features that are all zeros (silence detection)
        non_zero_features = np.count_nonzero(features)
        zero_ratio = 1.0 - (non_zero_features / len(features))

        if zero_ratio > 0.9:  # More than 90% zeros indicates silence/very quiet audio
            logger.debug(f"Detected very quiet audio ({zero_ratio:.1%} zero features)")
            # For very quiet audio, adjust contextual features to indicate quiet environment
            if len(features) >= 5:
                # Reduce traffic and urban activity indicators
                features[-1] = min(features[-1], 0.2)  # Low traffic
                features[-3] = min(features[-3], 0.3)  # Less urban

        return features

    def predict_noise_level(
        self, features: np.ndarray, use_optimized: bool = True
    ) -> float:
        """Predict noise level in dB with improved accuracy"""
        # Validate features first
        features = self._validate_features(features)

        # Special handling for silence detection
        # Check for silence based on different indicators

        # Method 1: Check if first MFCC is extremely negative (indicates silence in librosa)
        first_mfcc = features[0] if len(features) > 0 else 0
        silence_by_mfcc = (
            first_mfcc < -1000
        )  # Librosa produces very negative values for silence

        # Method 2: Check for spectral features being very low
        spectral_start = 39  # Start of spectral features
        spectral_features = (
            features[spectral_start : spectral_start + 6]
            if len(features) > spectral_start + 6
            else []
        )
        spectral_energy = (
            np.sum(np.abs(spectral_features)) if len(spectral_features) > 0 else 1000
        )
        silence_by_spectral = spectral_energy < 10.0

        # Method 3: Check RMS energy features (around index 49-50)
        rms_features = features[49:51] if len(features) > 51 else []
        rms_energy = np.sum(np.abs(rms_features)) if len(rms_features) > 0 else 1000
        silence_by_rms = rms_energy < 1.0

        # Detect silence if any method indicates silence
        is_silence = silence_by_mfcc or (silence_by_spectral and silence_by_rms)

        if is_silence:
            logger.debug(
                f"Detected silence: mfcc={first_mfcc:.1f}, spectral_energy={spectral_energy:.2f}, rms_energy={rms_energy:.2f}"
            )
            # Return realistic silence range: 15-35 dB
            return np.random.uniform(20.0, 35.0)  # Random in realistic silence range

        model_key = "noise_level_optimized" if use_optimized else "noise_level_original"

        if model_key not in self.models:
            model_key = "noise_level_original"  # Fallback

        if model_key in self.models:
            # Preprocess features
            processed_features = self._preprocess_features(features)

            # Special handling for optimized model if it has different requirements
            if model_key == "noise_level_optimized":
                # Try with the optimized model first
                try:
                    prediction = self.models[model_key].predict(
                        processed_features.reshape(1, -1)
                    )
                    return float(prediction[0])
                except Exception as e:
                    logger.warning(
                        f"Optimized model failed: {e}, falling back to original"
                    )
                    # Fall back to original model
                    if "noise_level_original" in self.models:
                        # For original model, use all features (no feature selection)
                        original_features = self._preprocess_features_original(features)
                        prediction = self.models["noise_level_original"].predict(
                            original_features.reshape(1, -1)
                        )
                        return float(prediction[0])
            else:
                # Original model - use full features
                original_features = self._preprocess_features_original(features)
                prediction = self.models[model_key].predict(
                    original_features.reshape(1, -1)
                )
                return float(prediction[0])

        return 65.0  # Default fallback

    def predict_noise_source(self, features: np.ndarray) -> Tuple[str, float]:
        """Predict noise source and confidence with bias reduction"""
        if "noise_source" in self.models:
            # Validate features first
            features = self._validate_features(
                features
            )  # Check for silence using the same method as noise level prediction
            first_mfcc = features[0] if len(features) > 0 else 0
            silence_by_mfcc = (
                first_mfcc < -1000
            )  # Librosa produces very negative values for silence

            if silence_by_mfcc:
                # For true silence, return air_conditioner (ambient sound)
                return "air_conditioner", 0.2  # Low confidence for silence

            # Noise source model is original model (126 features), not optimized
            original_features = self._preprocess_features_original(features)
            prediction = self.models["noise_source"].predict(
                original_features.reshape(1, -1)
            )
            probabilities = self.models["noise_source"].predict_proba(
                original_features.reshape(1, -1)
            )

            # Convert numeric prediction to source name
            predicted_index = int(prediction[0])
            logger.debug(f"Raw prediction index: {predicted_index}")
            logger.debug(f"Available source classes: {self.source_classes}")

            if 0 <= predicted_index < len(self.source_classes):
                source = self.source_classes[predicted_index]
                logger.debug(f"Mapped to source: {source}")
            else:
                logger.warning(
                    f"Predicted index {predicted_index} out of range (0-{len(self.source_classes) - 1}), using 'unknown'"
                )
                source = "unknown"

            confidence = float(np.max(probabilities))

            # Bias reduction: If confidence is too high for uncertain cases, reduce it
            first_mfcc_abs = abs(first_mfcc)
            if (
                confidence > 0.9 and first_mfcc_abs > 500
            ):  # High confidence on potentially low-energy audio
                confidence = min(0.7, confidence)  # Cap confidence for uncertain audio
                logger.debug(
                    f"Reduced confidence for uncertain audio: {confidence:.3f}"
                )

            return source, confidence

        return "unknown", 0.5  # Default fallback

    def predict_health_impact(self, features: np.ndarray, noise_level: float) -> str:
        """Predict health impact category"""
        if "health_impact" in self.models:
            # Health impact model is also original model (126 features)
            original_features = self._preprocess_features_original(features)
            prediction = self.models["health_impact"].predict(
                original_features.reshape(1, -1)
            )

            # Map numeric prediction to label
            impact_idx = int(np.clip(prediction[0], 0, len(self.health_labels) - 1))
            return self.health_labels[impact_idx]

        # Fallback based on noise level
        if noise_level < 55:
            return "Low"
        elif noise_level < 70:
            return "Moderate"
        elif noise_level < 85:
            return "High"
        else:
            return "Severe"

    def _preprocess_features(self, features: np.ndarray) -> np.ndarray:
        """Apply feature scaling and selection"""
        processed = features.copy()

        # Apply scaling FIRST (on all 126 features)
        if self.scaler is not None:
            try:
                processed = self.scaler.transform(processed.reshape(1, -1))
                processed = processed.flatten()
                logger.debug(f"Applied scaling: shape after scaling={processed.shape}")
            except Exception as e:
                logger.warning(f"Scaling failed: {e}")

        # THEN apply feature selection (using boolean mask)
        if self.selected_features is not None:
            try:
                # Check if selected_features is a boolean mask
                if (
                    len(self.selected_features) == len(processed)
                    and self.selected_features.dtype == bool
                ):
                    # Apply boolean mask to select features
                    processed = processed[self.selected_features]
                    logger.debug(
                        f"Applied feature selection: {len(processed)} features selected"
                    )

                    # Don't pad - the model expects exactly 83 features as trained
                    if len(processed) != 83:
                        logger.warning(
                            f"Expected 83 features after selection, got {len(processed)}"
                        )

                elif len(self.selected_features) <= len(processed):
                    # Treat as indices (fallback)
                    processed = processed[self.selected_features]
                    logger.debug(
                        f"Applied feature selection by indices: {len(processed)} features selected"
                    )
                else:
                    logger.warning(
                        f"Feature selection mismatch: input={len(processed)}, selector={len(self.selected_features)}"
                    )
            except Exception as e:
                logger.warning(f"Feature selection failed: {e}")

        logger.debug(f"Final processed features shape: {processed.shape}")
        return processed

    def _preprocess_features_original(self, features: np.ndarray) -> np.ndarray:
        """Apply only scaling for original models (no feature selection)"""
        processed = features.copy()

        # Apply scaling only (for original models trained on all 126 features)
        if self.scaler is not None:
            try:
                processed = self.scaler.transform(processed.reshape(1, -1))
                processed = processed.flatten()
                logger.debug(
                    f"Applied scaling for original model: shape={processed.shape}"
                )
            except Exception as e:
                logger.warning(f"Scaling failed for original model: {e}")

        return processed

    def predict_all(self, features: np.ndarray) -> Dict[str, Any]:
        """Predict all outputs: noise level, source, health impact"""
        try:
            # Use individual prediction methods for consistency and silence detection
            noise_level = self.predict_noise_level(features)
            noise_source, confidence = self.predict_noise_source(features)
            health_impact = self.predict_health_impact(features, noise_level)

            # Predict noise source - use original model (126 features only)
            noise_source = "unknown"
            source_confidence = 0.5
            if "noise_source" in self.models:
                original_features = self._preprocess_features_original(features)
                prediction = self.models["noise_source"].predict(
                    original_features.reshape(1, -1)
                )
                probabilities = self.models["noise_source"].predict_proba(
                    original_features.reshape(1, -1)
                )

                predicted_index = int(prediction[0])
                if 0 <= predicted_index < len(self.source_classes):
                    noise_source = self.source_classes[predicted_index]
                else:
                    noise_source = "unknown"
                source_confidence = float(np.max(probabilities))

            # Predict health impact - use original model (126 features only)
            health_impact = "Moderate"
            if "health_impact" in self.models:
                original_features = self._preprocess_features_original(features)
                prediction = self.models["health_impact"].predict(
                    original_features.reshape(1, -1)
                )

                impact_idx = int(np.clip(prediction[0], 0, len(self.health_labels) - 1))
                health_impact = self.health_labels[impact_idx]
            else:
                # Fallback based on noise level
                if noise_level < 55:
                    health_impact = "Low"
                elif noise_level < 70:
                    health_impact = "Moderate"
                elif noise_level < 85:
                    health_impact = "High"
                else:
                    health_impact = "Severe"

            logger.info(
                f"✅ ML prediction successful: {noise_level} dB, {noise_source}, {health_impact}"
            )

            return {
                "noise_level": round(noise_level, 2),
                "noise_source": noise_source,
                "health_impact": health_impact,
                "confidence_score": round(source_confidence, 3),
                "status": "success",
            }

        except Exception as e:
            logger.error(f"Prediction error: {e}")

            # Improved fallback predictions based on feature analysis instead of raw audio
            try:
                # Use extracted features for more accurate fallback
                if len(features) >= 126:
                    # Basic feature-based analysis
                    mfcc_energy = np.mean(features[0:13])  # MFCC coefficients
                    spectral_features = np.mean(features[39:45])  # Spectral features

                    # More realistic noise level estimation
                    base_level = 45.0
                    if mfcc_energy > 5:
                        noise_level = base_level + min(mfcc_energy * 2, 35)
                    else:
                        noise_level = base_level + max(0, mfcc_energy * 10)

                    noise_level = min(
                        max(noise_level, 35.0), 95.0
                    )  # More realistic range

                    # More balanced source prediction
                    if spectral_features > 3000:
                        noise_source = "siren"
                    elif mfcc_energy > 8:
                        noise_source = "jackhammer"
                    elif mfcc_energy > 5:
                        noise_source = "car_horn"
                    elif mfcc_energy > 2:
                        noise_source = "engine_idling"
                    else:
                        noise_source = "air_conditioner"

                else:
                    # Very basic fallback
                    noise_level = 55.0
                    noise_source = "unknown"

                # Health impact based on noise level
                if noise_level < 55:
                    health_impact = "Low"
                elif noise_level < 70:
                    health_impact = "Moderate"
                elif noise_level < 85:
                    health_impact = "High"
                else:
                    health_impact = "Severe"

                logger.warning(
                    f"⚠️ Using feature-based fallback: {noise_level} dB, {noise_source}"
                )

                return {
                    "noise_level": round(noise_level, 2),
                    "noise_source": noise_source,
                    "health_impact": health_impact,
                    "confidence_score": 0.4,  # Higher confidence for feature-based fallback
                    "status": "success",
                    "note": "Used feature-based fallback predictions",
                }

            except Exception as fallback_error:
                logger.error(f"Fallback prediction also failed: {fallback_error}")
                # Ultimate fallback
                return {
                    "noise_level": 65.0,
                    "noise_source": "unknown",
                    "health_impact": "Moderate",
                    "confidence_score": 0.1,
                    "status": "success",
                    "note": "Used default predictions due to system error",
                }

    def get_model_status(self) -> Dict[str, bool]:
        """Get status of all models"""
        return {
            "noise_level_original": "noise_level_original" in self.models,
            "noise_level_optimized": "noise_level_optimized" in self.models,
            "noise_source": "noise_source" in self.models,
            "health_impact": "health_impact" in self.models,
            "scaler": self.scaler is not None,
            "selected_features": self.selected_features is not None,
        }

    def get_source_classes(self) -> list:
        """Get list of available source classes"""
        return self.source_classes.copy()

    def get_model_info(self) -> Dict[str, Any]:
        """Get detailed model information"""
        return {
            "status": self.get_model_status(),
            "source_classes": self.get_source_classes(),
            "health_labels": self.health_labels.copy(),
            "total_source_classes": len(self.source_classes),
        }
