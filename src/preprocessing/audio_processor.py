import librosa
import numpy as np
import pandas as pd
import os
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

class UrbanSoundAudioProcessor:
    def __init__(self, config):
        self.config = config
        self.sample_rate = config['data']['sample_rate']
        self.duration = config['data']['duration']
        self.n_mfcc = config['data']['n_mfcc']
        self.n_fft = config['data']['n_fft']
        self.hop_length = config['data']['hop_length']
        self.n_chroma = config['data']['n_chroma']
        
    def load_and_preprocess_audio(self, file_path):
        """Load and preprocess single audio file"""
        try:
            # Load audio
            y, sr = librosa.load(file_path, sr=self.sample_rate, duration=self.duration)
            
            # Normalize audio length
            target_length = int(self.sample_rate * self.duration)
            if len(y) < target_length:
                y = np.pad(y, (0, target_length - len(y)), mode='constant')
            else:
                y = y[:target_length]
            
            # Normalize amplitude
            y = librosa.util.normalize(y)
            
            return y, sr
            
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            return None, None
    
    def extract_features(self, y, sr):
        """Extract comprehensive audio features"""
        features = {}
        
        try:
            # 1. MFCC Features
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=self.n_mfcc, 
                                       n_fft=self.n_fft, hop_length=self.hop_length)
            features['mfcc_mean'] = np.mean(mfccs, axis=1)
            features['mfcc_std'] = np.std(mfccs, axis=1)
            features['mfcc_delta'] = np.mean(librosa.feature.delta(mfccs), axis=1)
            
            # 2. Spectral Features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=self.hop_length)
            features['spectral_centroid_mean'] = np.mean(spectral_centroids)
            features['spectral_centroid_std'] = np.std(spectral_centroids)
            
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, hop_length=self.hop_length)
            features['spectral_rolloff_mean'] = np.mean(spectral_rolloff)
            features['spectral_rolloff_std'] = np.std(spectral_rolloff)
            
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr, hop_length=self.hop_length)
            features['spectral_bandwidth_mean'] = np.mean(spectral_bandwidth)
            features['spectral_bandwidth_std'] = np.std(spectral_bandwidth)
            
            # 3. Zero Crossing Rate
            zcr = librosa.feature.zero_crossing_rate(y, hop_length=self.hop_length)
            features['zcr_mean'] = np.mean(zcr)
            features['zcr_std'] = np.std(zcr)
            
            # 4. Chroma Features
            chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=self.hop_length)
            features['chroma_mean'] = np.mean(chroma, axis=1)
            features['chroma_std'] = np.std(chroma, axis=1)
            
            # 5. RMS Energy
            rms = librosa.feature.rms(y=y, hop_length=self.hop_length)
            features['rms_mean'] = np.mean(rms)
            features['rms_std'] = np.std(rms)
            
            # 6. Spectral Contrast
            contrast = librosa.feature.spectral_contrast(y=y, sr=sr, hop_length=self.hop_length)
            features['contrast_mean'] = np.mean(contrast, axis=1)
            features['contrast_std'] = np.std(contrast, axis=1)
            
            # 7. Tonnetz
            tonnetz = librosa.feature.tonnetz(y=librosa.effects.harmonic(y), sr=sr)
            features['tonnetz_mean'] = np.mean(tonnetz, axis=1)
            features['tonnetz_std'] = np.std(tonnetz, axis=1)
            
            # 8. Tempo and Beat
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            features['tempo'] = tempo
            features['beat_count'] = len(beats)
            
            # 9. Mel-frequency Spectral Coefficients
            mel_spectrogram = librosa.feature.melspectrogram(y=y, sr=sr, hop_length=self.hop_length)
            features['mel_mean'] = np.mean(mel_spectrogram, axis=1)
            features['mel_std'] = np.std(mel_spectrogram, axis=1)
            
            return features
            
        except Exception as e:
            print(f"Error extracting features: {e}")
            return None
    
    def flatten_features(self, features_dict):
        """Flatten nested feature dictionary to 1D array"""
        flattened = []
        feature_names = []
        
        for key, value in features_dict.items():
            if isinstance(value, np.ndarray):
                for i, v in enumerate(value):
                    flattened.append(v)
                    feature_names.append(f"{key}_{i}")
            else:
                flattened.append(value)
                feature_names.append(key)
        
        return np.array(flattened), feature_names
    
    def process_dataset(self, metadata_df, audio_base_path, output_path):
        """Process entire UrbanSound8K dataset"""
        print("🎵 Processing UrbanSound8K Audio Dataset")
        print("="*50)
        
        all_features = []
        all_feature_names = None
        processed_metadata = []
        
        total_files = len(metadata_df)
        
        for idx, row in metadata_df.iterrows():
            if idx % 100 == 0:
                print(f"Processing {idx}/{total_files} files...")
            
            # Construct file path
            file_path = os.path.join(
                audio_base_path, 
                f"fold{row['fold']}", 
                row['slice_file_name']
            )
            
            if not os.path.exists(file_path):
                print(f"⚠️ File not found: {file_path}")
                continue
            
            # Load and preprocess audio
            y, sr = self.load_and_preprocess_audio(file_path)
            
            if y is not None:
                # Extract features
                features_dict = self.extract_features(y, sr)
                
                if features_dict is not None:
                    # Flatten features
                    features_array, feature_names = self.flatten_features(features_dict)
                    
                    all_features.append(features_array)
                    processed_metadata.append(row)
                    
                    if all_feature_names is None:
                        all_feature_names = feature_names
        
        # Convert to numpy arrays
        X = np.array(all_features)
        processed_df = pd.DataFrame(processed_metadata)
        
        print(f"✅ Successfully processed {len(all_features)} audio files")
        print(f"📊 Feature matrix shape: {X.shape}")
        
        # Save processed data
        os.makedirs(output_path, exist_ok=True)
        
        np.save(os.path.join(output_path, 'features.npy'), X)
        processed_df.to_csv(os.path.join(output_path, 'processed_metadata.csv'), index=False)
        
        with open(os.path.join(output_path, 'feature_names.txt'), 'w') as f:
            for name in all_feature_names:
                f.write(f"{name}\n")
        
        print(f"💾 Processed data saved to: {output_path}")
        
        return X, processed_df, all_feature_names