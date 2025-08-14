"""
Simple Audio Processing without AI Libraries
Basic audio processing for compatibility
"""

import numpy as np
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class AudioProcessor:
    """Simple audio processor without AI libraries"""
    
    def __init__(self):
        logger.info("✅ Simple AudioProcessor initialized (no AI libraries)")
    
    def process_audio_file(self, audio_file) -> np.ndarray:
        """Simple audio processing - returns dummy features for compatibility"""
        try:
            # Read file size as a simple feature
            file_size = audio_file.size
            
            # Generate simple features based on file characteristics
            # This is a placeholder - in real implementation, you'd use Web Audio API
            features = np.random.normal(0, 1, 126)  # 126 features for compatibility
            
            # Add some variation based on file size
            size_factor = min(file_size / 1000000, 10)  # Normalize file size
            features = features * (1 + size_factor * 0.1)
            
            logger.info(f"Processed audio file: {audio_file.name} ({file_size} bytes)")
            return features
            
        except Exception as e:
            logger.error(f"Audio processing error: {e}")
            # Return default features
            return np.random.normal(0, 1, 126)
    
    def extract_features_from_array(self, audio_data: np.ndarray, sample_rate: int = 44100) -> np.ndarray:
        """Extract features from audio array (for real-time processing)"""
        try:
            if len(audio_data) == 0:
                return np.zeros(126)
            
            # Simple feature extraction
            features = []
            
            # Basic statistical features
            features.extend([
                np.mean(audio_data),
                np.std(audio_data),
                np.max(audio_data),
                np.min(audio_data),
                np.median(audio_data)
            ])
            
            # RMS energy
            rms = np.sqrt(np.mean(audio_data ** 2))
            features.append(rms)
            
            # Zero crossing rate
            zero_crossings = np.sum(np.diff(np.sign(audio_data)) != 0)
            features.append(zero_crossings / len(audio_data))
            
            # Pad to 126 features for compatibility
            while len(features) < 126:
                features.append(0.0)
            
            return np.array(features[:126])
            
        except Exception as e:
            logger.error(f"Feature extraction error: {e}")
            return np.zeros(126)
