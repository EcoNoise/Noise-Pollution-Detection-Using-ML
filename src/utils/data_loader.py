import pandas as pd
import numpy as np
from sklearn.datasets import make_regression

class DataLoader:
    def generate_sample_data(self, n_samples=1000):
        """
        Generate synthetic noise data for testing
        """
        np.random.seed(42)
        
        # Audio features (MFCC-like)
        mfcc_features = np.random.normal(0, 1, (n_samples, 13))
        
        # Spectral features
        spectral_centroid = np.random.uniform(1000, 8000, n_samples)
        spectral_rolloff = np.random.uniform(2000, 12000, n_samples)
        zero_crossing_rate = np.random.uniform(0.01, 0.3, n_samples)
        
        # Contextual features
        time_of_day = np.random.randint(0, 24, n_samples)
        day_of_week = np.random.randint(0, 7, n_samples)
        weather_condition = np.random.randint(0, 4, n_samples)  # 0=sunny, 1=rainy, 2=cloudy, 3=windy
        location_type = np.random.randint(0, 5, n_samples)  # 0=residential, 1=commercial, 2=industrial, 3=traffic, 4=park
        
        # Combine all features
        features = np.column_stack([
            mfcc_features,
            spectral_centroid,
            spectral_rolloff,
            zero_crossing_rate,
            time_of_day,
            day_of_week,
            weather_condition,
            location_type
        ])
        
        # Generate realistic noise levels (30-120 dB)
        base_noise = np.random.uniform(30, 80, n_samples)
        
        # Add contextual effects
        traffic_effect = (location_type == 3) * np.random.uniform(10, 40, n_samples)
        industrial_effect = (location_type == 2) * np.random.uniform(15, 35, n_samples)
        time_effect = ((time_of_day >= 6) & (time_of_day <= 22)) * np.random.uniform(5, 15, n_samples)
        
        noise_levels = np.clip(base_noise + traffic_effect + industrial_effect + time_effect, 30, 120)
        
        # Generate noise sources
        noise_sources = np.random.choice(['traffic', 'construction', 'industrial', 'human', 'nature'], n_samples)
        
        # Generate health impacts based on noise levels (as numeric values)
        health_impact = np.where(noise_levels < 55, 0,  # low
                                np.where(noise_levels < 70, 1,  # moderate
                                       np.where(noise_levels < 85, 2, 3)))  # high, severe
        
        return {
            'features': features,
            'noise_levels': noise_levels,
            'noise_sources': noise_sources,
            'health_impact': health_impact
        }