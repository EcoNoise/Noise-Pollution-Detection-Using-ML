import numpy as np
import pandas as pd
from catboost import CatBoostRegressor, CatBoostClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, accuracy_score
import joblib
import yaml
import os
import numpy as np
import matplotlib.pyplot as plt
import time

class CatBoostProgressCallback:
    def __init__(self, print_every=10):
        self.iteration = 0
        self.print_every = print_every
        self.start_time = None
        self.train_losses = []
        self.val_losses = []
    
    def after_iteration(self, info):
        if self.start_time is None:
            self.start_time = time.time()
        
        self.iteration += 1
        
        # Perbaikan: Ambil metrics dengan cara yang benar
        train_loss = None
        val_loss = None
        
        # Untuk CatBoost, metrics adalah dictionary dengan struktur:
        # info.metrics = {'learn': {'Logloss': [value]}, 'validation': {'Logloss': [value]}}
        # atau untuk regression: {'learn': {'RMSE': [value]}, 'validation': {'RMSE': [value]}}
        
        if 'learn' in info.metrics:
            learn_metrics = info.metrics['learn']
            if isinstance(learn_metrics, dict):
                # Ambil metric pertama (biasanya loss utama)
                first_metric = list(learn_metrics.values())[0] if learn_metrics else None
                # Jika metric adalah list, ambil elemen terakhir
                if isinstance(first_metric, list) and first_metric:
                    train_loss = first_metric[-1]
                elif isinstance(first_metric, (int, float)):
                    train_loss = first_metric
            else:
                # Fallback jika format berbeda
                if isinstance(learn_metrics, list) and learn_metrics:
                    train_loss = learn_metrics[-1]
                else:
                    train_loss = learn_metrics
        
        if 'validation' in info.metrics:
            val_metrics = info.metrics['validation']
            if isinstance(val_metrics, dict):
                # Ambil metric pertama (biasanya loss utama)
                first_metric = list(val_metrics.values())[0] if val_metrics else None
                # Jika metric adalah list, ambil elemen terakhir
                if isinstance(first_metric, list) and first_metric:
                    val_loss = first_metric[-1]
                elif isinstance(first_metric, (int, float)):
                    val_loss = first_metric
            else:
                # Fallback jika format berbeda
                if isinstance(val_metrics, list) and val_metrics:
                    val_loss = val_metrics[-1]
                else:
                    val_loss = val_metrics
        
        # Store metrics jika ada
        if train_loss is not None:
            self.train_losses.append(train_loss)
        if val_loss is not None:
            self.val_losses.append(val_loss)
        
        # Print setiap N iterasi atau iterasi terakhir
        if self.iteration % self.print_every == 0 or self.iteration == 1:
            elapsed_time = time.time() - self.start_time
            avg_time_per_iter = elapsed_time / self.iteration
            
            print(f"Epoch {self.iteration:3d}: ", end="")
            
            if train_loss is not None:
                print(f"train_loss: {train_loss:.6f} ", end="")
            
            if val_loss is not None:
                print(f"val_loss: {val_loss:.6f} ", end="")
            
            print(f"time: {elapsed_time:.1f}s ({avg_time_per_iter*1000:.1f}ms/iter)")
        
        return True
    
    def plot_training_curves(self, save_path='catboost_training_curves.png'):
        """Plot kurva training CatBoost"""
        if not self.train_losses and not self.val_losses:
            print("No training data to plot")
            return
            
        plt.figure(figsize=(12, 4))
        
        # Plot Loss
        plt.subplot(1, 2, 1)
        if self.train_losses:
            plt.plot(range(1, len(self.train_losses) + 1), self.train_losses, 'b-', label='Train Loss', linewidth=2)
        if self.val_losses:
            plt.plot(range(1, len(self.val_losses) + 1), self.val_losses, 'r--', label='Validation Loss', linewidth=2)
        
        plt.title('CatBoost Training Loss', fontsize=14, fontweight='bold')
        plt.xlabel('Iteration')
        plt.ylabel('Loss')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # Plot Learning Curve (smoothed)
        plt.subplot(1, 2, 2)
        if len(self.val_losses) > 10:
            # Smooth the validation loss untuk melihat trend
            window_size = min(20, len(self.val_losses) // 5)
            smoothed_val = np.convolve(self.val_losses, np.ones(window_size)/window_size, mode='valid')
            plt.plot(range(window_size, len(self.val_losses) + 1), smoothed_val, 'g-', label='Smoothed Val Loss', linewidth=2)
        
        if self.val_losses:
            plt.plot(range(1, len(self.val_losses) + 1), self.val_losses, 'r-', alpha=0.3, label='Raw Val Loss')
        
        plt.title('Learning Curve (Smoothed)', fontsize=14, fontweight='bold')
        plt.xlabel('Iteration')
        plt.ylabel('Loss')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.show()
        print(f"Training curves saved to {save_path}")

class NoisePredictor:
    def __init__(self, config_path='config.yaml'):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.noise_level_model = None
        self.noise_source_model = None
        self.health_impact_model = None
        
    def prepare_features(self, audio_features, contextual_features):
        """Combine audio and contextual features"""
        features = np.concatenate([audio_features, contextual_features], axis=1)
        return features
    
    def train_noise_level_predictor(self, X, y_noise_level, optimized_params=None, show_progress=True):
        """Train model untuk prediksi noise level (dB) dengan progress tracking"""
        print("🔧 Preparing data for Noise Level Prediction...")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_noise_level, test_size=0.2, random_state=42
        )
        
        print(f"📊 Training set: {X_train.shape[0]} samples")
        print(f"📊 Test set: {X_test.shape[0]} samples")
        print(f"📊 Features: {X_train.shape[1]} dimensions")
        
        # Setup model parameters
        if optimized_params:
            model_params = {
                'iterations': int(optimized_params.get('iterations', self.config['model']['catboost']['iterations'])),
                'learning_rate': optimized_params.get('learning_rate', self.config['model']['catboost']['learning_rate']),
                'depth': int(optimized_params.get('depth', self.config['model']['catboost']['depth'])),
                'l2_leaf_reg': optimized_params.get('l2_leaf_reg', self.config['model']['catboost']['l2_leaf_reg']),
                'random_seed': self.config['model']['catboost']['random_seed'],
                'verbose': False
            }
        else:
            model_params = {
                'iterations': self.config['model']['catboost']['iterations'],
                'learning_rate': self.config['model']['catboost']['learning_rate'],
                'depth': self.config['model']['catboost']['depth'],
                'l2_leaf_reg': self.config['model']['catboost']['l2_leaf_reg'],
                'random_seed': self.config['model']['catboost']['random_seed'],
                'verbose': False
            }
        
        print(f"\n🚀 Starting CatBoost Training...")
        print(f"⚙️  Model Parameters:")
        print(f"   - Iterations: {model_params['iterations']}")
        print(f"   - Learning Rate: {model_params['learning_rate']}")
        print(f"   - Depth: {model_params['depth']}")
        print(f"   - L2 Regularization: {model_params['l2_leaf_reg']}")
        print(f"   - Random Seed: {model_params['random_seed']}")
        print("="*80)
        
        self.noise_level_model = CatBoostRegressor(**model_params)
        
        if show_progress:
            # Setup callback untuk tracking progress
            callback = CatBoostProgressCallback(print_every=max(1, model_params['iterations'] // 20))
            
            # Train dengan callback
            self.noise_level_model.fit(
                X_train, y_train,
                eval_set=(X_test, y_test),
                verbose=False,
                callbacks=[callback]
            )
            
            print("="*80)
            print("📈 Generating training curves...")
            callback.plot_training_curves('noise_level_catboost_curves.png')
            
        else:
            self.noise_level_model.fit(X_train, y_train, eval_set=(X_test, y_test), verbose=False)
        
        # Final evaluation
        print("\n📊 Final Model Evaluation:")
        y_pred_train = self.noise_level_model.predict(X_train)
        y_pred_test = self.noise_level_model.predict(X_test)
        
        train_mse = mean_squared_error(y_train, y_pred_train)
        test_mse = mean_squared_error(y_test, y_pred_test)
        
        print(f"   - Training MSE: {train_mse:.6f}")
        print(f"   - Validation MSE: {test_mse:.6f}")
        print(f"   - Overfitting Ratio: {test_mse/train_mse:.3f}")
        
        # Feature importance
        feature_importance = self.noise_level_model.get_feature_importance()
        print(f"\n🔍 Top 5 Most Important Features:")
        for i, importance in enumerate(feature_importance[:5]):
            print(f"   {i+1}. Feature {i}: {importance:.4f}")
        
        print(f"\n✅ Noise Level Predictor Training Completed!")
        return self.noise_level_model
    
    def train_noise_source_classifier(self, X, y_source, optimized_params=None, show_progress=True):
        """Train model untuk klasifikasi sumber noise dengan progress tracking"""
        print("\n🔧 Preparing data for Noise Source Classification...")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_source, test_size=0.2, random_state=42
        )
        
        unique_sources = np.unique(y_source)
        print(f"📊 Training set: {X_train.shape[0]} samples")
        print(f"📊 Test set: {X_test.shape[0]} samples")
        print(f"📊 Classes: {len(unique_sources)} ({', '.join(map(str, unique_sources))})")
        
        # Setup model parameters
        if optimized_params:
            model_params = {
                'iterations': int(optimized_params.get('iterations', self.config['model']['catboost']['iterations'])),
                'learning_rate': optimized_params.get('learning_rate', self.config['model']['catboost']['learning_rate']),
                'depth': int(optimized_params.get('depth', self.config['model']['catboost']['depth'])),
                'l2_leaf_reg': optimized_params.get('l2_leaf_reg', self.config['model']['catboost']['l2_leaf_reg']),
                'random_seed': self.config['model']['catboost']['random_seed'],
                'verbose': False
            }
        else:
            model_params = {
                'iterations': self.config['model']['catboost']['iterations'],
                'learning_rate': self.config['model']['catboost']['learning_rate'],
                'depth': self.config['model']['catboost']['depth'],
                'l2_leaf_reg': self.config['model']['catboost']['l2_leaf_reg'],
                'random_seed': self.config['model']['catboost']['random_seed'],
                'verbose': False
            }
        
        print(f"\n🚀 Starting CatBoost Classification Training...")
        print("="*80)
        
        self.noise_source_model = CatBoostClassifier(**model_params)
        
        if show_progress:
            callback = CatBoostProgressCallback(print_every=max(1, model_params['iterations'] // 20))
            
            self.noise_source_model.fit(
                X_train, y_train,
                eval_set=(X_test, y_test),
                verbose=False,
                callbacks=[callback]
            )
            
            print("="*80)
            callback.plot_training_curves('noise_source_catboost_curves.png')
            
        else:
            self.noise_source_model.fit(X_train, y_train, eval_set=(X_test, y_test), verbose=False)
        
        # Final evaluation
        print("\n📊 Final Classification Evaluation:")
        y_pred_train = self.noise_source_model.predict(X_train)
        y_pred_test = self.noise_source_model.predict(X_test)
        
        train_accuracy = accuracy_score(y_train, y_pred_train)
        test_accuracy = accuracy_score(y_test, y_pred_test)
        
        print(f"   - Training Accuracy: {train_accuracy:.6f}")
        print(f"   - Validation Accuracy: {test_accuracy:.6f}")
        
        print(f"\n✅ Noise Source Classifier Training Completed!")
        return self.noise_source_model
    
    def train_health_impact_predictor(self, X, y_health, optimized_params=None, show_progress=True):
        """Train model untuk prediksi health impact dengan progress tracking"""
        print("\n🔧 Preparing data for Health Impact Prediction...")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_health, test_size=0.2, random_state=42
        )
        
        print(f"📊 Training set: {X_train.shape[0]} samples")
        print(f"📊 Test set: {X_test.shape[0]} samples")
        
        # Setup model parameters
        if optimized_params:
            model_params = {
                'iterations': int(optimized_params.get('iterations', self.config['model']['catboost']['iterations'])),
                'learning_rate': optimized_params.get('learning_rate', self.config['model']['catboost']['learning_rate']),
                'depth': int(optimized_params.get('depth', self.config['model']['catboost']['depth'])),
                'l2_leaf_reg': optimized_params.get('l2_leaf_reg', self.config['model']['catboost']['l2_leaf_reg']),
                'random_seed': self.config['model']['catboost']['random_seed'],
                'verbose': False
            }
        else:
            model_params = {
                'iterations': self.config['model']['catboost']['iterations'],
                'learning_rate': self.config['model']['catboost']['learning_rate'],
                'depth': self.config['model']['catboost']['depth'],
                'l2_leaf_reg': self.config['model']['catboost']['l2_leaf_reg'],
                'random_seed': self.config['model']['catboost']['random_seed'],
                'verbose': False
            }
        
        print(f"\n🚀 Starting Health Impact Training...")
        print("="*80)
        
        self.health_impact_model = CatBoostClassifier(**model_params)
        
        if show_progress:
            callback = CatBoostProgressCallback(print_every=max(1, model_params['iterations'] // 20))
            
            self.health_impact_model.fit(
                X_train, y_train,
                eval_set=(X_test, y_test),
                verbose=False,
                callbacks=[callback]
            )
            
            print("="*80)
            callback.plot_training_curves('health_impact_catboost_curves.png')
            
        else:
            self.health_impact_model.fit(X_train, y_train, eval_set=(X_test, y_test), verbose=False)
        
        # Final evaluation
        print("\n📊 Final Health Impact Evaluation:")
        y_pred_train = self.health_impact_model.predict(X_train)
        y_pred_test = self.health_impact_model.predict(X_test)
        
        train_accuracy = accuracy_score(y_train, y_pred_train)
        test_accuracy = accuracy_score(y_test, y_pred_test)
        
        print(f"   - Training Accuracy: {train_accuracy:.6f}")
        print(f"   - Validation Accuracy: {test_accuracy:.6f}")
        
        print(f"\n✅ Health Impact Predictor Training Completed!")
        return self.health_impact_model

    def predict_all(self, features):
        """Prediksi semua output: noise level, source, health impact"""
        results = {}
        
        if self.noise_level_model:
            results['noise_level'] = self.noise_level_model.predict(features)
        
        if self.noise_source_model:
            results['noise_source'] = self.noise_source_model.predict(features)
            results['source_probability'] = self.noise_source_model.predict_proba(features)
        
        if self.health_impact_model:
            results['health_impact'] = self.health_impact_model.predict(features)
        
        return results

    def save_models(self, path='models/'):
        """Save trained models"""
        
        
        # Create directory if it doesn't exist
        os.makedirs(path, exist_ok=True)
        
        if self.noise_level_model:
            joblib.dump(self.noise_level_model, f'{path}/noise_level_model.pkl')
        if self.noise_source_model:
            joblib.dump(self.noise_source_model, f'{path}/noise_source_model.pkl')
        if self.health_impact_model:
            joblib.dump(self.health_impact_model, f'{path}/health_impact_model.pkl')

    def load_models(self, path='models/'):
        """Load trained models"""
        try:
            self.noise_level_model = joblib.load(f'{path}/noise_level_model.pkl')
            self.noise_source_model = joblib.load(f'{path}/noise_source_model.pkl')
            self.health_impact_model = joblib.load(f'{path}/health_impact_model.pkl')
            print("Models loaded successfully!")
        except FileNotFoundError as e:
            print(f"Model file not found: {e}")