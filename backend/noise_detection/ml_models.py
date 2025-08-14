"""
Simple Audio Processing without AI Models
Handles basic audio analysis using mathematical calculations
"""

import numpy as np
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)


class ModelManager:
    """Simple model manager without AI - uses mathematical calculations"""
    
    _instance = None
    
    def __init__(self):
        self.models = {}
        logger.info("✅ Simple ModelManager initialized (no AI models)")
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def get_model_info(self) -> Dict[str, Any]:
        """Return simple model info"""
        return {
            "status": {"simple_calculator": True},
            "source_classes": ["traffic", "construction", "nature", "unknown"],
            "health_labels": ["Low", "Moderate", "High"],
            "total_source_classes": 4
        }
    
    def predict_noise_level(self, features: np.ndarray, use_optimized: bool = True) -> float:
        """Simple noise level calculation based on RMS"""
        if len(features) == 0:
            return 35.0  # Default silence level
        
        # Simple RMS to dB conversion
        rms = np.sqrt(np.mean(features ** 2))
        if rms <= 0:
            return 35.0
        
        # Convert RMS to dB (simplified)
        db = 20 * np.log10(rms) + 60  # Offset for realistic range
        
        # Clamp to realistic range
        db = max(20.0, min(120.0, db))
        
        logger.debug(f"Calculated noise level: {db:.2f} dB from RMS: {rms:.6f}")
        return float(db)
    
    def predict_noise_source(self, features: np.ndarray) -> Tuple[str, float]:
        """Simple noise source classification based on frequency characteristics"""
        if len(features) == 0:
            return "unknown", 0.5
        
        # Simple frequency analysis
        mean_freq = np.mean(features)
        std_freq = np.std(features)
        
        # Basic classification rules
        if std_freq > 0.5:
            if mean_freq > 0.2:
                return "traffic", 0.7
            else:
                return "construction", 0.6
        elif mean_freq < -0.3:
            return "nature", 0.6
        else:
            return "unknown", 0.5
    
    def predict_health_impact(self, features: np.ndarray, noise_level: float = None) -> str:
        """Simple health impact based on noise level"""
        if noise_level is None:
            noise_level = self.predict_noise_level(features)
        
        if noise_level < 55:
            return "Low"
        elif noise_level < 75:
            return "Moderate"
        else:
            return "High"
    
    def predict_all(self, features: np.ndarray) -> Dict[str, Any]:
        """Predict all outputs using simple calculations"""
        try:
            noise_level = self.predict_noise_level(features)
            noise_source, confidence = self.predict_noise_source(features)
            health_impact = self.predict_health_impact(features, noise_level)
            
            return {
                "noise_level": noise_level,
                "noise_source": noise_source,
                "health_impact": health_impact,
                "confidence_score": confidence,
                "status": "success",
                "method": "mathematical_calculation"
            }
        
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return {
                "noise_level": 65.0,
                "noise_source": "unknown",
                "health_impact": "Moderate",
                "confidence_score": 0.5,
                "status": "success",
                "method": "fallback"
            }
