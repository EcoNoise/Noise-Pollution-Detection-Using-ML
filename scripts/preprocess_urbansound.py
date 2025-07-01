import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

import pandas as pd
import numpy as np
import yaml
from preprocessing.audio_processor import UrbanSoundAudioProcessor
from preprocessing.feature_extractor import UrbanSoundFeatureExtractor

def main():
    print("🎵 UrbanSound8K Preprocessing Pipeline")
    print("="*60)
    
    # Load configuration
    config_path = 'config.yaml'
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Paths
    metadata_path = config['paths']['metadata_path']
    audio_path = config['paths']['audio_path']
    processed_path = config['paths']['processed_data']
    
    print(f"📂 Loading metadata from: {metadata_path}")
    print(f"🎵 Audio files location: {audio_path}")
    print(f"💾 Output directory: {processed_path}")
    
    # Step 1: Load metadata
    print("\n📊 Step 1: Loading metadata...")
    metadata_df = pd.read_csv(metadata_path)
    
    # Data quality check
    print(f"   Total samples: {len(metadata_df)}")
    print(f"   Missing values: {metadata_df.isnull().sum().sum()}")
    print(f"   Unique classes: {metadata_df['class'].nunique()}")
    print(f"   Class distribution:\n{metadata_df['class'].value_counts()}")
    
    # Limit samples for faster processing (optional)
    max_samples = config['data'].get('max_samples_per_class', None)
    if max_samples:
        print(f"\n⚡ Limiting to {max_samples} samples per class for faster processing...")
        metadata_df = metadata_df.groupby('class').head(max_samples).reset_index(drop=True)
        print(f"   Reduced dataset size: {len(metadata_df)} samples")
    
    # Step 2: Audio processing and feature extraction
    print("\n🎵 Step 2: Processing audio files and extracting features...")
    audio_processor = UrbanSoundAudioProcessor(config)
    
    features_output = os.path.join(processed_path, 'raw_features')
    X, processed_metadata, feature_names = audio_processor.process_dataset(
        metadata_df, audio_path, features_output
    )
    
    # Step 3: Feature engineering and label processing
    print("\n🔧 Step 3: Feature engineering and label processing...")
    feature_extractor = UrbanSoundFeatureExtractor(config_path)
    
    # Extract RMS features for noise level estimation
    rms_feature_idx = [i for i, name in enumerate(feature_names) if 'rms_mean' in name]
    rms_features = X[:, rms_feature_idx[0]] if rms_feature_idx else X[:, -3]
    
    # Add contextual features
    X_enhanced = feature_extractor.add_contextual_features(X, processed_metadata)
    
    # Process labels
    labels_dict = feature_extractor.process_labels(processed_metadata, rms_features)
    
    # Step 4: Create data splits
    print("\n✂️ Step 4: Creating train/validation/test splits...")
    splits = feature_extractor.create_train_val_test_splits(
        X_enhanced, labels_dict,
        test_size=config['data']['test_size'],
        val_size=config['data']['val_size']
    )
    
    # Step 5: Feature normalization
    print("\n📏 Step 5: Normalizing features...")
    normalized = feature_extractor.normalize_features(
        splits['X_train'], splits['X_val'], splits['X_test']
    )
    
    # Update splits with normalized features
    splits.update(normalized)
    splits['source_classes'] = labels_dict['source_classes']
    
    # Step 6: Save processed data
    print("\n💾 Step 6: Saving processed data...")
    final_output = os.path.join(processed_path, 'final')
    feature_extractor.save_processed_data(splits, final_output)
    
    # Summary
    print("\n🎉 Preprocessing completed successfully!")
    print("="*60)
    print(f"📊 Final dataset statistics:")
    print(f"   Features: {splits['X_train'].shape[1]}")
    print(f"   Training samples: {splits['X_train'].shape[0]}")
    print(f"   Validation samples: {splits['X_val'].shape[0]}")
    print(f"   Test samples: {splits['X_test'].shape[0]}")
    print(f"   Noise source classes: {len(splits['source_classes'])}")
    print(f"\n📁 Processed data saved to: {final_output}")
    print(f"\n🚀 Ready for model training!")

if __name__ == "__main__":
    main()