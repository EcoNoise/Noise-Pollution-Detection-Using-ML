import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, mean_squared_error, classification_report
import yaml
import json
import joblib
from utils.data_loader import UrbanSoundDataLoader
from models.catboost_model import NoisePredictor
from models.firefly_optimizer import FireflyOptimizer
from models.fruitfly_optimizer import FruitFlyOptimizer
from models.model_explainer import AdvancedModelExplainer
from models.integrated_optimizer import IntegratedNoisePredictor

def load_preprocessed_data():
    """Load preprocessed UrbanSound8K dataset from data/processed/final/"""
    print("📂 Loading Preprocessed UrbanSound8K Dataset")
    print("="*50)
    
    processed_path = 'data/processed/final'
    
    try:
        # Load features
        X_train = np.load(f'{processed_path}/X_train.npy')
        X_val = np.load(f'{processed_path}/X_val.npy')
        X_test = np.load(f'{processed_path}/X_test.npy')
        
        # Load labels
        y_noise_levels_train = np.load(f'{processed_path}/y_noise_levels_train.npy')
        y_noise_levels_val = np.load(f'{processed_path}/y_noise_levels_val.npy')
        y_noise_levels_test = np.load(f'{processed_path}/y_noise_levels_test.npy')
        
        y_noise_sources_train = np.load(f'{processed_path}/y_noise_sources_train.npy')
        y_noise_sources_val = np.load(f'{processed_path}/y_noise_sources_val.npy')
        y_noise_sources_test = np.load(f'{processed_path}/y_noise_sources_test.npy')
        
        y_health_impacts_train = np.load(f'{processed_path}/y_health_impacts_train.npy')
        y_health_impacts_val = np.load(f'{processed_path}/y_health_impacts_val.npy')
        y_health_impacts_test = np.load(f'{processed_path}/y_health_impacts_test.npy')
        
        # Load encoders and metadata
        source_encoder = joblib.load(f'{processed_path}/label_encoder.pkl')
        feature_scaler = joblib.load(f'{processed_path}/feature_scaler.pkl')
        
        with open(f'{processed_path}/preprocessing_metadata.json', 'r') as f:
            metadata = json.load(f)
        
        print(f"✅ Preprocessed dataset loaded successfully!")
        print(f"   Training samples: {X_train.shape[0]}")
        print(f"   Validation samples: {X_val.shape[0]}")
        print(f"   Test samples: {X_test.shape[0]}")
        print(f"   Features: {X_train.shape[1]}")
        print(f"   Source classes: {len(source_encoder.classes_)}")
        
        return {
            'X_train': X_train, 'X_val': X_val, 'X_test': X_test,
            'y_noise_levels_train': y_noise_levels_train, 
            'y_noise_levels_val': y_noise_levels_val, 
            'y_noise_levels_test': y_noise_levels_test,
            'y_noise_sources_train': y_noise_sources_train, 
            'y_noise_sources_val': y_noise_sources_val, 
            'y_noise_sources_test': y_noise_sources_test,
            'y_health_impacts_train': y_health_impacts_train, 
            'y_health_impacts_val': y_health_impacts_val, 
            'y_health_impacts_test': y_health_impacts_test,
            'source_encoder': source_encoder,
            'feature_scaler': feature_scaler,
            'feature_names': metadata.get('feature_names', []),
            'preprocessing_metadata': metadata
        }
        
    except FileNotFoundError as e:
        print(f"❌ Error: Preprocessed data not found: {e}")
        print("💡 Please run preprocessing first: python scripts/preprocess_urbansound.py")
        return None
    except Exception as e:
        print(f"❌ Error loading preprocessed data: {e}")
        return None

def load_urbansound_data(max_samples_per_class=200):
    """Load UrbanSound8K dataset"""
    print("🎵 Loading UrbanSound8K Dataset")
    print("="*50)
    
    data_loader = UrbanSoundDataLoader()
    dataset = data_loader.load_dataset(max_samples_per_class=max_samples_per_class)
    
    print(f"✅ Dataset loaded successfully!")
    print(f"   Training samples: {dataset['X_train'].shape[0]}")
    print(f"   Validation samples: {dataset['X_val'].shape[0]}")
    print(f"   Test samples: {dataset['X_test'].shape[0]}")
    print(f"   Features: {dataset['X_train'].shape[1]}")
    
    return dataset

def train_basic_models():
    """Train basic NoiseMap models with UrbanSound8K data"""
    print("🚀 NoiseMap - Basic Training with UrbanSound8K")
    print("="*60)
    
    # Load real data
    dataset = load_urbansound_data(max_samples_per_class=150)
    
    # Initialize predictor
    predictor = NoisePredictor('config.yaml')
    
    print("\n1️⃣ Training Noise Level Predictor...")
    predictor.train_noise_level_predictor(
        dataset['X_train'], 
        dataset['y_noise_levels_train'],
        show_progress=True
    )
    
    print("\n2️⃣ Training Noise Source Classifier...")
    predictor.train_noise_source_classifier(
        dataset['X_train'], 
        dataset['y_noise_sources_train'],
        show_progress=True
    )
    
    print("\n3️⃣ Training Health Impact Predictor...")
    predictor.train_health_impact_predictor(
        dataset['X_train'], 
        dataset['y_health_impacts_train'],
        show_progress=True
    )
    
    # Evaluate models
    print("\n📊 Model Evaluation")
    print("-"*30)
    
    # Predictions
    noise_level_pred = predictor.noise_level_model.predict(dataset['X_test'])
    noise_source_pred = predictor.noise_source_model.predict(dataset['X_test'])
    health_impact_pred = predictor.health_impact_model.predict(dataset['X_test'])
    
    # Metrics
    nl_rmse = np.sqrt(mean_squared_error(dataset['y_noise_levels_test'], noise_level_pred))
    ns_accuracy = accuracy_score(dataset['y_noise_sources_test'], noise_source_pred)
    hi_rmse = np.sqrt(mean_squared_error(dataset['y_health_impacts_test'], health_impact_pred))
    
    print(f"🎯 Noise Level RMSE: {nl_rmse:.2f} dB")
    print(f"🎯 Noise Source Accuracy: {ns_accuracy:.3f}")
    print(f"🎯 Health Impact RMSE: {hi_rmse:.3f}")
    
    # Save models
    print("\n💾 Saving models...")
    predictor.save_models('models/urbansound_models/')
    
    print("\n✅ Basic training completed successfully!")
    return predictor, dataset

def advanced_optimization_pipeline():
    """Advanced training with optimization"""
    print("🔥 NoiseMap - Advanced Optimization Pipeline")
    print("="*60)
    
    # Load configuration
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # Load real data
    dataset = load_urbansound_data(max_samples_per_class=200)
    
    X_train = dataset['X_train']
    y_nl_train = dataset['y_noise_levels_train']
    y_ns_train = dataset['y_noise_sources_train']
    y_hi_train = dataset['y_health_impacts_train']
    
    X_test = dataset['X_test']
    y_nl_test = dataset['y_noise_levels_test']
    y_ns_test = dataset['y_noise_sources_test']
    y_hi_test = dataset['y_health_impacts_test']
    
    print("\n🔥 Phase 1: Hyperparameter Optimization")
    firefly_optimizer = FireflyOptimizer(config)
    best_params = firefly_optimizer.optimize(X_train, y_nl_train)
    
    print("\n🍃 Phase 2: Feature Optimization")
    fruitfly_optimizer = FruitFlyOptimizer(config)
    selected_features, feature_weights = fruitfly_optimizer.optimize_features(
        X_train, y_nl_train, best_params
    )
    
    # Apply feature selection
    X_train_selected = X_train[:, selected_features]
    X_test_selected = X_test[:, selected_features]
    
    print(f"✅ Selected {np.sum(selected_features)} out of {X_train.shape[1]} features")
    
    print("\n🎯 Phase 3: Training Optimized Models")
    predictor = NoisePredictor('config.yaml')
    
    predictor.train_noise_level_predictor(
        X_train_selected, y_nl_train, best_params
    )
    predictor.train_noise_source_classifier(
        X_train_selected, y_ns_train, best_params
    )
    predictor.train_health_impact_predictor(
        X_train_selected, y_hi_train, best_params
    )
    
    # Evaluate optimized models
    print("\n📊 Optimized Model Evaluation")
    noise_level_pred = predictor.noise_level_model.predict(X_test_selected)
    noise_source_pred = predictor.noise_source_model.predict(X_test_selected)
    health_impact_pred = predictor.health_impact_model.predict(X_test_selected)
    
    nl_rmse = np.sqrt(mean_squared_error(y_nl_test, noise_level_pred))
    ns_accuracy = accuracy_score(y_ns_test, noise_source_pred)
    hi_rmse = np.sqrt(mean_squared_error(y_hi_test, health_impact_pred))
    
    print(f"🎯 Optimized Noise Level RMSE: {nl_rmse:.2f} dB")
    print(f"🎯 Optimized Noise Source Accuracy: {ns_accuracy:.3f}")
    print(f"🎯 Optimized Health Impact RMSE: {hi_rmse:.3f}")
    
    # Save results
    optimization_results = {
        'best_hyperparameters': best_params,
        'selected_features': selected_features.tolist(),
        'feature_weights': feature_weights.tolist(),
        'performance_metrics': {
            'noise_level_rmse': float(nl_rmse),
            'noise_source_accuracy': float(ns_accuracy),
            'health_impact_rmse': float(hi_rmse)
        },
        'feature_names': [dataset['feature_names'][i] for i in range(len(selected_features)) if selected_features[i]]
    }
    
    with open('urbansound_optimization_results.json', 'w') as f:
        json.dump(optimization_results, f, indent=2)
    
    predictor.save_models('models/optimized_urbansound_models/')
    
    print("\n✅ Advanced optimization completed!")
    print("📁 Results saved to:")
    print("   - models/optimized_urbansound_models/")
    print("   - urbansound_optimization_results.json")
    
    return predictor, dataset, optimization_results

def integrated_training_demo():
    """Demo pelatihan terintegrasi dengan data UrbanSound8K yang sudah diproses"""
    print("🚀 NoiseMap - Integrated Training with Preprocessed UrbanSound8K")
    print("="*60)
    
    # Load configuration
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # Load preprocessed data (FASTER!)
    dataset = load_preprocessed_data()
    
    if dataset is None:
        print("❌ Failed to load preprocessed data. Falling back to real-time processing...")
        dataset = load_urbansound_data(max_samples_per_class=200)
    
    # Initialize integrated predictor
    integrated_predictor = IntegratedNoisePredictor(config)
    
    # Run integrated optimization and training
    results = integrated_predictor.integrated_optimization_and_training(
        dataset['X_train'],
        dataset['y_noise_levels_train'],
        dataset['y_noise_sources_train'], 
        dataset['y_health_impacts_train']
    )
    
    # Save models
    integrated_predictor.save_models('models/integrated_urbansound_models/')
    
    print("\n📊 Integrated Training Results:")
    print(f"   - Optimized Parameters: {results['best_params']}")
    print(f"   - Selected Features: {results['feature_count']} features")
    print("\n🎉 Integrated training completed successfully!")
    
    return integrated_predictor, dataset

def data_analysis():
    """Analyze UrbanSound8K dataset"""
    print("📊 UrbanSound8K Data Analysis")
    print("="*40)
    
    dataset = load_urbansound_data(max_samples_per_class=100)
    
    # Feature analysis
    print("\n🔍 Feature Analysis:")
    print(f"Feature matrix shape: {dataset['X_train'].shape}")
    print(f"Feature names: {len(dataset['feature_names'])}")
    
    # Label analysis
    print("\n🏷️ Label Analysis:")
    print(f"Noise levels range: {dataset['y_noise_levels_train'].min():.1f} - {dataset['y_noise_levels_train'].max():.1f} dB")
    print(f"Unique noise sources: {len(np.unique(dataset['y_noise_sources_train']))}")
    print(f"Health impact distribution: {np.bincount(dataset['y_health_impacts_train'])}")
    
    return dataset

if __name__ == "__main__":
    print("🎵 NoiseMap with UrbanSound8K Dataset - Integrated Training")
    print("="*60)
    print("Running Integrated Training with optimized models...")
    print()
    
    # Langsung jalankan integrated training
    integrated_training_demo()
    