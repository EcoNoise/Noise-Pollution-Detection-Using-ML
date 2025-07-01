import pandas as pd
import numpy as np
import librosa
import os
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings('ignore')
import joblib
import json

class UrbanSoundDataLoader:
    def __init__(self, data_path='data/raw'):
        self.data_path = data_path
        self.metadata_path = os.path.join(data_path, 'metadata', 'UrbanSound8K.csv')
        self.audio_path = os.path.join(data_path, 'audio')
        
        # UrbanSound8K class mapping to NoiseMap categories
        self.class_mapping = {
            'air_conditioner': 'mechanical',
            'car_horn': 'traffic', 
            'children_playing': 'human',
            'dog_bark': 'nature',
            'drilling': 'construction',
            'engine_idling': 'traffic',
            'gun_shot': 'emergency',
            'jackhammer': 'construction', 
            'siren': 'emergency',
            'street_music': 'human'
        }
        
        # Noise level estimation based on sound type (dB)
        self.noise_level_mapping = {
            'air_conditioner': (45, 65),
            'car_horn': (100, 120),
            'children_playing': (60, 80),
            'dog_bark': (85, 110),
            'drilling': (90, 110),
            'engine_idling': (50, 70),
            'gun_shot': (140, 180),
            'jackhammer': (100, 120),
            'siren': (110, 130),
            'street_music': (70, 90)
        }
        
        # Health impact mapping based on noise levels
        self.health_impact_mapping = {
            0: 'low',      # < 55 dB
            1: 'moderate', # 55-70 dB  
            2: 'high',     # 70-85 dB
            3: 'severe'    # > 85 dB
        }
        
    def load_metadata(self):
        """Load and clean UrbanSound8K metadata"""
        print("📊 Loading UrbanSound8K metadata...")
        
        df = pd.read_csv(self.metadata_path)
        
        # Check for missing values
        print(f"Dataset shape: {df.shape}")
        print(f"Missing values: {df.isnull().sum().sum()}")
        print(f"Unique classes: {df['class'].unique()}")
        print(f"Class distribution:\n{df['class'].value_counts()}")
        
        # Clean data - remove any rows with missing critical info
        df_clean = df.dropna(subset=['slice_file_name', 'class', 'fold'])
        
        print(f"✅ Clean dataset shape: {df_clean.shape}")
        return df_clean
        
    def extract_audio_features(self, file_path, sr=22050, duration=4.0):
        """Extract comprehensive audio features from wav file"""
        try:
            # Load audio file
            y, sr = librosa.load(file_path, sr=sr, duration=duration)
            
            # Ensure consistent length
            target_length = int(sr * duration)
            if len(y) < target_length:
                y = np.pad(y, (0, target_length - len(y)), mode='constant')
            else:
                y = y[:target_length]
            
            features = []
            
            # 1. MFCC features (13 coefficients)
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            features.extend(np.mean(mfccs, axis=1))
            features.extend(np.std(mfccs, axis=1))
            
            # 2. Spectral features
            spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
            features.append(np.mean(spectral_centroid))
            features.append(np.std(spectral_centroid))
            
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
            features.append(np.mean(spectral_rolloff))
            features.append(np.std(spectral_rolloff))
            
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
            features.append(np.mean(spectral_bandwidth))
            features.append(np.std(spectral_bandwidth))
            
            # 3. Zero crossing rate
            zcr = librosa.feature.zero_crossing_rate(y)
            features.append(np.mean(zcr))
            features.append(np.std(zcr))
            
            # 4. Chroma features
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            features.extend(np.mean(chroma, axis=1))
            
            # 5. RMS Energy
            rms = librosa.feature.rms(y=y)
            features.append(np.mean(rms))
            features.append(np.std(rms))
            
            # 6. Tempo
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            features.append(tempo)
            
            return np.array(features)
            
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            return None
    
    def estimate_noise_level(self, class_name, rms_energy):
        """Estimate noise level based on class and RMS energy"""
        base_min, base_max = self.noise_level_mapping[class_name]
        
        # Normalize RMS energy to 0-1 range and map to noise level range
        normalized_rms = np.clip(rms_energy * 1000, 0, 1)  # Scale RMS
        noise_level = base_min + normalized_rms * (base_max - base_min)
        
        # Add some realistic variation
        noise_level += np.random.normal(0, 5)  # ±5 dB variation
        
        return np.clip(noise_level, 30, 140)  # Realistic dB range
    
    def estimate_health_impact(self, noise_level):
        """Estimate health impact based on noise level"""
        if noise_level < 55:
            return 0  # low
        elif noise_level < 70:
            return 1  # moderate
        elif noise_level < 85:
            return 2  # high
        else:
            return 3  # severe
    
    def load_dataset(self, max_samples_per_class=None, test_size=0.2, val_size=0.1):
        """Load complete UrbanSound8K dataset with features and labels"""
        print("🎵 Loading UrbanSound8K dataset...")
        
        # Load metadata
        df = self.load_metadata()
        
        # Limit samples per class if specified
        if max_samples_per_class:
            df = df.groupby('class').head(max_samples_per_class).reset_index(drop=True)
            print(f"📊 Limited to {max_samples_per_class} samples per class")
        
        features_list = []
        noise_levels = []
        noise_sources = []
        health_impacts = []
        valid_files = []
        
        print("🔄 Extracting audio features...")
        
        for idx, row in df.iterrows():
            if idx % 100 == 0:
                print(f"   Processed {idx}/{len(df)} files...")
            
            # Construct file path
            file_path = os.path.join(
                self.audio_path, 
                f"fold{row['fold']}", 
                row['slice_file_name']
            )
            
            if not os.path.exists(file_path):
                print(f"⚠️ File not found: {file_path}")
                continue
            
            # Extract features
            features = self.extract_audio_features(file_path)
            
            if features is not None:
                features_list.append(features)
                
                # Get RMS energy for noise level estimation
                rms_energy = features[-3]  # RMS mean is near the end
                
                # Generate labels
                estimated_noise_level = self.estimate_noise_level(row['class'], rms_energy)
                noise_levels.append(estimated_noise_level)
                
                mapped_source = self.class_mapping[row['class']]
                noise_sources.append(mapped_source)
                
                health_impact = self.estimate_health_impact(estimated_noise_level)
                health_impacts.append(health_impact)
                
                valid_files.append(row['slice_file_name'])
        
        print(f"✅ Successfully processed {len(features_list)} audio files")
        
        # Convert to numpy arrays
        X = np.array(features_list)
        y_noise_levels = np.array(noise_levels)
        y_noise_sources = np.array(noise_sources)
        y_health_impacts = np.array(health_impacts)
        
        # Encode categorical labels
        source_encoder = LabelEncoder()
        y_noise_sources_encoded = source_encoder.fit_transform(y_noise_sources)
        
        print(f"📊 Dataset Statistics:")
        print(f"   Features shape: {X.shape}")
        print(f"   Noise levels range: {y_noise_levels.min():.1f} - {y_noise_levels.max():.1f} dB")
        print(f"   Noise sources: {np.unique(y_noise_sources)}")
        print(f"   Health impact distribution: {np.bincount(y_health_impacts)}")
        
        # Split data
        X_temp, X_test, y_nl_temp, y_nl_test, y_ns_temp, y_ns_test, y_hi_temp, y_hi_test = train_test_split(
            X, y_noise_levels, y_noise_sources_encoded, y_health_impacts,
            test_size=test_size, random_state=42, stratify=y_noise_sources_encoded
        )
        
        X_train, X_val, y_nl_train, y_nl_val, y_ns_train, y_ns_val, y_hi_train, y_hi_val = train_test_split(
            X_temp, y_nl_temp, y_ns_temp, y_hi_temp,
            test_size=val_size/(1-test_size), random_state=42, stratify=y_ns_temp
        )
        
        return {
            'X_train': X_train, 'X_val': X_val, 'X_test': X_test,
            'y_noise_levels_train': y_nl_train, 'y_noise_levels_val': y_nl_val, 'y_noise_levels_test': y_nl_test,
            'y_noise_sources_train': y_ns_train, 'y_noise_sources_val': y_ns_val, 'y_noise_sources_test': y_ns_test,
            'y_health_impacts_train': y_hi_train, 'y_health_impacts_val': y_hi_val, 'y_health_impacts_test': y_hi_test,
            'source_encoder': source_encoder,
            'feature_names': self.get_feature_names(),
            'valid_files': valid_files
        }
    
    def get_feature_names(self):
        """Get feature names for interpretability"""
        names = []
        
        # MFCC features
        for i in range(13):
            names.append(f'mfcc_{i}_mean')
        for i in range(13):
            names.append(f'mfcc_{i}_std')
        
        # Spectral features
        names.extend([
            'spectral_centroid_mean', 'spectral_centroid_std',
            'spectral_rolloff_mean', 'spectral_rolloff_std', 
            'spectral_bandwidth_mean', 'spectral_bandwidth_std',
            'zcr_mean', 'zcr_std'
        ])
        
        # Chroma features
        for i in range(12):
            names.append(f'chroma_{i}')
        
        # RMS and tempo
        names.extend(['rms_mean', 'rms_std', 'tempo'])
        
        return names

# Legacy class for backward compatibility (now empty)
class DataLoader:
    def __init__(self):
        print("⚠️ DataLoader is deprecated. Use UrbanSoundDataLoader instead.")
        
    def generate_sample_data(self, n_samples=1000):
        print("❌ Synthetic data generation is disabled. Use real UrbanSound8K data.")
        raise NotImplementedError("Use UrbanSoundDataLoader.load_dataset() instead")


class ProcessedUrbanSoundLoader:
    """Loader for preprocessed UrbanSound8K data"""
    
    def __init__(self, processed_data_path='data/processed/final'):
        self.processed_data_path = processed_data_path
        self.metadata = None
        self.scaler = None
        self.label_encoder = None
        
    def load_preprocessed_data(self):
        """Load preprocessed data from files"""
        print(f"📂 Loading preprocessed data from {self.processed_data_path}...")
        
        # Check if processed data exists
        if not os.path.exists(self.processed_data_path):
            raise FileNotFoundError(
                f"Processed data not found at {self.processed_data_path}. "
                "Please run preprocessing first: python scripts/preprocess_urbansound.py"
            )
        
        # Load metadata
        metadata_path = os.path.join(self.processed_data_path, 'preprocessing_metadata.json')
        with open(metadata_path, 'r') as f:
            self.metadata = json.load(f)
        
        # Load encoders
        self.scaler = joblib.load(os.path.join(self.processed_data_path, 'feature_scaler.pkl'))
        self.label_encoder = joblib.load(os.path.join(self.processed_data_path, 'label_encoder.pkl'))
        
        # Load data splits
        data = {}
        for file_name in os.listdir(self.processed_data_path):
            if file_name.endswith('.npy'):
                key = file_name.replace('.npy', '')
                data[key] = np.load(os.path.join(self.processed_data_path, file_name))
        
        print(f"✅ Loaded preprocessed data:")
        print(f"   Features: {data['X_train'].shape[1]}")
        print(f"   Training samples: {data['X_train'].shape[0]}")
        print(f"   Validation samples: {data['X_val'].shape[0]}")
        print(f"   Test samples: {data['X_test'].shape[0]}")
        
        return data
    
    def get_feature_names(self):
        """Get feature names from metadata"""
        if self.metadata is None:
            raise ValueError("Metadata not loaded. Call load_preprocessed_data() first.")
        
        # Generate feature names based on the preprocessing pipeline
        feature_names = []
        
        # Audio features (from audio processor)
        audio_features = [
            'mfcc_mean', 'mfcc_std', 'mfcc_delta',
            'spectral_centroid', 'spectral_rolloff', 'spectral_bandwidth',
            'zcr', 'chroma', 'rms', 'contrast', 'tonnetz', 
            'tempo', 'beat_count', 'mel'
        ]
        
        # Contextual features
        contextual_features = [
            'hour_of_day', 'day_of_week', 'location_type', 
            'weather_condition', 'traffic_density'
        ]
        
        return audio_features + contextual_features
    
    def get_class_names(self):
        """Get noise source class names"""
        if self.metadata is None:
            raise ValueError("Metadata not loaded. Call load_preprocessed_data() first.")
        
        return self.metadata.get('source_classes', [])

# Legacy compatibility
class DataLoader:
    def __init__(self):
        print("⚠️ Legacy DataLoader. Use ProcessedUrbanSoundLoader for preprocessed data.")
        
    def generate_sample_data(self, n_samples=1000):
        raise NotImplementedError(
            "Synthetic data generation is disabled. "
            "Use ProcessedUrbanSoundLoader.load_preprocessed_data() instead."
        )