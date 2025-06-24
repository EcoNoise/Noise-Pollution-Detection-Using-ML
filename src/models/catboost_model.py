import numpy as np
import pandas as pd
from catboost import CatBoostRegressor, CatBoostClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, accuracy_score
import joblib
import yaml

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
    
    def train_noise_level_predictor(self, X, y_noise_level):
        """Train model untuk prediksi noise level (dB)"""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_noise_level, test_size=0.2, random_state=42
        )
        
        self.noise_level_model = CatBoostRegressor(
            iterations=self.config['model']['catboost']['iterations'],
            learning_rate=self.config['model']['catboost']['learning_rate'],
            depth=self.config['model']['catboost']['depth'],
            l2_leaf_reg=self.config['model']['catboost']['l2_leaf_reg'],
            random_seed=self.config['model']['catboost']['random_seed'],
            verbose=False
        )
        
        self.noise_level_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.noise_level_model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        print(f"Noise Level Prediction MSE: {mse:.4f}")
        
        return self.noise_level_model
    
    def train_noise_source_classifier(self, X, y_source):
        """Train model untuk klasifikasi sumber noise"""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_source, test_size=0.2, random_state=42
        )
        
        self.noise_source_model = CatBoostClassifier(
            iterations=self.config['model']['catboost']['iterations'],
            learning_rate=self.config['model']['catboost']['learning_rate'],
            depth=self.config['model']['catboost']['depth'],
            l2_leaf_reg=self.config['model']['catboost']['l2_leaf_reg'],
            random_seed=self.config['model']['catboost']['random_seed'],
            verbose=False
        )
        
        self.noise_source_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.noise_source_model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        print(f"Noise Source Classification Accuracy: {accuracy:.4f}")
        
        return self.noise_source_model
    
    def train_health_impact_predictor(self, X, y_health):
        """Train model untuk prediksi health impact"""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_health, test_size=0.2, random_state=42
        )
        
        self.health_impact_model = CatBoostRegressor(
            iterations=self.config['model']['catboost']['iterations'],
            learning_rate=self.config['model']['catboost']['learning_rate'],
            depth=self.config['model']['catboost']['depth'],
            l2_leaf_reg=self.config['model']['catboost']['l2_leaf_reg'],
            random_seed=self.config['model']['catboost']['random_seed'],
            verbose=False
        )
        
        self.health_impact_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.health_impact_model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        print(f"Health Impact Prediction MSE: {mse:.4f}")
        
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