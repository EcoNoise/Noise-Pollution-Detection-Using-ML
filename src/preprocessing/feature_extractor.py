import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import yaml
import os

class UrbanSoundFeatureExtractor:
    def __init__(self, config_path='config.yaml'):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Class mappings from config
        self.class_mapping = self.config['features']['noise_source_mapping']
        self.noise_level_ranges = self.config['features']['noise_level_ranges']
        self.health_thresholds = self.config['health_impact']
        
        # Encoders
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        
    def map_noise_sources(self, original_classes):
        """Map UrbanSound8K classes to NoiseMap categories"""
        mapped_sources = [self.class_mapping.get(cls, 'unknown') for cls in original_classes]
        return self.label_encoder.fit_transform(mapped_sources)
    
    def estimate_noise_levels(self, original_classes, rms_features):
        """Estimate realistic noise levels based on class and RMS energy"""
        noise_levels = []
        
        for cls, rms in zip(original_classes, rms_features):
            if cls in self.noise_level_ranges:
                min_db, max_db = self.noise_level_ranges[cls]
                
                # Normalize RMS to 0-1 range
                normalized_rms = np.clip(rms * 100, 0, 1)
                
                # Map to noise level range
                estimated_db = min_db + normalized_rms * (max_db - min_db)
                
                # Add realistic variation
                estimated_db += np.random.normal(0, 3)  # ±3 dB variation
                
                # Clip to realistic range
                estimated_db = np.clip(estimated_db, 30, 140)
                
                noise_levels.append(estimated_db)
            else:
                # Default for unknown classes
                noise_levels.append(np.random.uniform(50, 80))
        
        return np.array(noise_levels)
    
    def estimate_health_impacts(self, noise_levels):
        """Estimate health impacts based on noise levels"""
        health_impacts = []
        
        for db in noise_levels:
            if db < self.health_thresholds['low_threshold']:
                health_impacts.append(0)  # low
            elif db < self.health_thresholds['moderate_threshold']:
                health_impacts.append(1)  # moderate
            elif db < self.health_thresholds['high_threshold']:
                health_impacts.append(2)  # high
            else:
                health_impacts.append(3)  # severe
        
        return np.array(health_impacts)
    
    def add_contextual_features(self, base_features, metadata_df):
        """Add contextual features based on metadata"""
        contextual_features = []
        
        for _, row in metadata_df.iterrows():
            # Time-based features (simulated)
            hour_of_day = np.random.randint(0, 24)
            day_of_week = np.random.randint(0, 7)
            
            # Location-based features (inferred from class)
            location_mapping = {
                'air_conditioner': 0,  # residential
                'car_horn': 3,         # traffic
                'children_playing': 4, # park
                'dog_bark': 0,         # residential
                'drilling': 2,         # industrial
                'engine_idling': 3,    # traffic
                'gun_shot': 1,         # commercial
                'jackhammer': 2,       # industrial
                'siren': 3,            # traffic
                'street_music': 1      # commercial
            }
            
            location_type = location_mapping.get(row['class'], 0)
            
            # Weather (simulated)
            weather_condition = np.random.randint(0, 4)  # 0=sunny, 1=rainy, 2=cloudy, 3=windy
            
            # Traffic density (based on location and class)
            if row['class'] in ['car_horn', 'engine_idling', 'siren']:
                traffic_density = np.random.uniform(0.6, 1.0)  # high traffic
            else:
                traffic_density = np.random.uniform(0.0, 0.4)  # low traffic
            
            contextual_features.append([
                hour_of_day, day_of_week, location_type, 
                weather_condition, traffic_density
            ])
        
        contextual_array = np.array(contextual_features)
        
        # Combine with base features
        combined_features = np.hstack([base_features, contextual_array])
        
        return combined_features
    
    def process_labels(self, metadata_df, rms_features):
        """Process all labels from metadata"""
        print("🏷️ Processing labels...")
        
        # Extract original classes
        original_classes = metadata_df['class'].values
        
        # Map noise sources
        noise_sources = self.map_noise_sources(original_classes)
        
        # Estimate noise levels
        noise_levels = self.estimate_noise_levels(original_classes, rms_features)
        
        # Estimate health impacts
        health_impacts = self.estimate_health_impacts(noise_levels)
        
        print(f"📊 Label Statistics:")
        print(f"   Noise sources: {len(np.unique(noise_sources))} categories")
        print(f"   Noise levels: {noise_levels.min():.1f} - {noise_levels.max():.1f} dB")
        print(f"   Health impacts: {np.bincount(health_impacts)}")
        
        return {
            'noise_sources': noise_sources,
            'noise_levels': noise_levels,
            'health_impacts': health_impacts,
            'source_classes': self.label_encoder.classes_
        }
    
    def normalize_features(self, X_train, X_val=None, X_test=None):
        """Normalize features using StandardScaler"""
        print("📏 Normalizing features...")
        
        # Fit scaler on training data
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        results = {'X_train': X_train_scaled}
        
        if X_val is not None:
            results['X_val'] = self.scaler.transform(X_val)
        
        if X_test is not None:
            results['X_test'] = self.scaler.transform(X_test)
        
        return results
    
    def create_train_val_test_splits(self, X, y_dict, test_size=0.2, val_size=0.1, random_state=42):
        """Create train/validation/test splits"""
        print("✂️ Creating data splits...")
        
        # First split: train+val vs test
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y_dict['noise_sources'], 
            test_size=test_size, 
            random_state=random_state, 
            stratify=y_dict['noise_sources']
        )
        
        # Second split: train vs val
        val_size_adjusted = val_size / (1 - test_size)
        X_train, X_val, y_train_idx, y_val_idx = train_test_split(
            X_temp, range(len(X_temp)),
            test_size=val_size_adjusted,
            random_state=random_state,
            stratify=y_temp
        )
        
        # Create label splits
        splits = {
            'X_train': X_train, 'X_val': X_val, 'X_test': X_test,
        }
        
        for label_name, label_values in y_dict.items():
            if label_name != 'source_classes':
                # Get corresponding labels for temp split
                y_temp_labels = label_values[:-len(y_test)] if len(y_test) > 0 else label_values
                y_test_labels = label_values[-len(y_test):] if len(y_test) > 0 else []
                
                splits[f'y_{label_name}_train'] = y_temp_labels[y_train_idx]
                splits[f'y_{label_name}_val'] = y_temp_labels[y_val_idx]
                splits[f'y_{label_name}_test'] = y_test_labels
        
        print(f"📊 Data splits created:")
        print(f"   Training: {len(X_train)} samples")
        print(f"   Validation: {len(X_val)} samples")
        print(f"   Test: {len(X_test)} samples")
        
        return splits
    
    def save_processed_data(self, data_dict, output_dir):
        """Save processed data to files"""
        print(f"💾 Saving processed data to {output_dir}...")
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Save feature matrices
        for key, value in data_dict.items():
            if key.startswith('X_') or key.startswith('y_'):
                np.save(os.path.join(output_dir, f'{key}.npy'), value)
        
        # Save encoders
        import joblib
        joblib.dump(self.scaler, os.path.join(output_dir, 'feature_scaler.pkl'))
        joblib.dump(self.label_encoder, os.path.join(output_dir, 'label_encoder.pkl'))
        
        # Save metadata
        metadata = {
            'feature_shape': data_dict['X_train'].shape,
            'source_classes': data_dict.get('source_classes', []).tolist() if hasattr(data_dict.get('source_classes', []), 'tolist') else data_dict.get('source_classes', []),
            'config': self.config
        }
        
        import json
        with open(os.path.join(output_dir, 'preprocessing_metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print("✅ All processed data saved successfully!")