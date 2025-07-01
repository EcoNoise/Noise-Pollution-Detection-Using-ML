import numpy as np
import time
from sklearn.model_selection import train_test_split, cross_val_score
from catboost import CatBoostRegressor, CatBoostClassifier
import random
import matplotlib.pyplot as plt

class IntegratedNoisePredictor:
    """Model gabungan yang mengintegrasikan CatBoost + Firefly + Fruitfly dalam satu proses pelatihan"""
    
    def __init__(self, config):
        self.config = config
        self.noise_level_model = None
        self.noise_source_model = None
        self.health_impact_model = None
        
        # Firefly parameters
        self.firefly_population_size = config['model']['firefly']['population_size']
        self.firefly_generations = config['model']['firefly']['max_generations']
        
        # Fruitfly parameters
        self.fruitfly_population_size = config['model']['fruitfly']['population_size']
        self.fruitfly_iterations = config['model']['fruitfly']['max_iterations']
        
        # Parameter bounds
        self.param_bounds = {
            'learning_rate': (0.01, 0.3),
            'depth': (3, 10),
            'l2_leaf_reg': (1, 10),
            'iterations': (100, 1000)
        }
        
    def integrated_optimization_and_training(self, X, y_noise_level, y_noise_source, y_health_impact):
        """Optimasi dan pelatihan terintegrasi untuk semua model sekaligus"""
        
        print("🚀 Starting Integrated Optimization & Training")
        print("="*80)
        
        # Split data
        X_train, X_test, y_nl_train, y_nl_test = train_test_split(
            X, y_noise_level, test_size=0.2, random_state=42
        )
        _, _, y_ns_train, y_ns_test = train_test_split(
            X, y_noise_source, test_size=0.2, random_state=42
        )
        _, _, y_hi_train, y_hi_test = train_test_split(
            X, y_health_impact, test_size=0.2, random_state=42
        )
        
        print(f"📊 Dataset: {X_train.shape[0]} training, {X_test.shape[0]} test samples")
        print(f"📊 Features: {X_train.shape[1]} dimensions")
        
        # Phase 1: Simultaneous Hyperparameter & Feature Optimization
        print("\n🔥 Phase 1: Simultaneous Firefly-Fruitfly Optimization")
        best_params, selected_features = self._simultaneous_optimization(
            X_train, y_nl_train, y_ns_train, y_hi_train
        )
        
        # Apply feature selection
        X_train_opt = X_train[:, selected_features]
        X_test_opt = X_test[:, selected_features]
        
        print(f"\n✅ Optimization Complete:")
        print(f"   - Selected Features: {np.sum(selected_features)}/{X_train.shape[1]}")
        print(f"   - Best Learning Rate: {best_params['learning_rate']:.4f}")
        print(f"   - Best Depth: {best_params['depth']}")
        print(f"   - Best Iterations: {best_params['iterations']}")
        
        # Phase 2: Integrated Model Training
        print("\n🎯 Phase 2: Integrated Model Training")
        self._train_all_models_simultaneously(
            X_train_opt, X_test_opt,
            y_nl_train, y_nl_test,
            y_ns_train, y_ns_test, 
            y_hi_train, y_hi_test,
            best_params
        )
        
        return {
            'best_params': best_params,
            'selected_features': selected_features,
            'feature_count': np.sum(selected_features)
        }
    
    def _simultaneous_optimization(self, X_train, y_nl_train, y_ns_train, y_hi_train):
        """Optimasi simultan menggunakan hybrid Firefly-Fruitfly algorithm"""
        
        n_features = X_train.shape[1]
        best_fitness = float('-inf')
        best_params = None
        best_features = None
        
        # Initialize hybrid population (params + features)
        population = self._initialize_hybrid_population(n_features)
        
        print(f"🔄 Running {self.firefly_generations} generations with {self.firefly_population_size} individuals")
        
        for generation in range(self.firefly_generations):
            start_time = time.time()
            
            # Evaluate all individuals
            for i, individual in enumerate(population):
                fitness = self._evaluate_hybrid_fitness(
                    individual, X_train, y_nl_train, y_ns_train, y_hi_train
                )
                individual['fitness'] = fitness
                
                if fitness > best_fitness:
                    best_fitness = fitness
                    best_params = individual['params'].copy()
                    best_features = individual['features'].copy()
            
            # Firefly movement with feature evolution
            population = self._hybrid_firefly_movement(population)
            
            # Fruitfly-inspired feature refinement
            if generation % 5 == 0:  # Every 5 generations
                population = self._fruitfly_feature_refinement(population, X_train, y_nl_train)
            
            elapsed = time.time() - start_time
            print(f"Generation {generation+1:3d}: Best Fitness: {best_fitness:.6f} | Time: {elapsed:.2f}s")
        
        return best_params, best_features
    
    def _initialize_hybrid_population(self, n_features):
        """Initialize population dengan params dan features"""
        population = []
        
        for _ in range(self.firefly_population_size):
            individual = {
                'params': {
                    'learning_rate': random.uniform(*self.param_bounds['learning_rate']),
                    'depth': random.randint(*self.param_bounds['depth']),
                    'l2_leaf_reg': random.uniform(*self.param_bounds['l2_leaf_reg']),
                    'iterations': random.randint(*self.param_bounds['iterations'])
                },
                'features': np.random.random(n_features) > 0.5,  # Binary feature selection
                'fitness': 0.0
            }
            population.append(individual)
        
        return population
    
    def _evaluate_hybrid_fitness(self, individual, X_train, y_nl_train, y_ns_train, y_hi_train):
        """Evaluate fitness berdasarkan performa gabungan semua model"""
        try:
            # Apply feature selection
            selected_features = individual['features']
            if np.sum(selected_features) < 3:  # Minimal 3 features
                return float('-inf')
            
            X_selected = X_train[:, selected_features]
            
            # Test noise level model (regression)
            nl_model = CatBoostRegressor(
                **individual['params'],
                verbose=False,
                random_seed=42
            )
            nl_scores = cross_val_score(nl_model, X_selected, y_nl_train, cv=3, scoring='neg_mean_squared_error')
            nl_fitness = -np.mean(nl_scores)
            
            # Test noise source model (classification)
            ns_model = CatBoostClassifier(
                **individual['params'],
                verbose=False,
                random_seed=42
            )
            ns_scores = cross_val_score(ns_model, X_selected, y_ns_train, cv=3, scoring='accuracy')
            ns_fitness = np.mean(ns_scores)
            
            # Test health impact model (classification)
            hi_model = CatBoostClassifier(
                **individual['params'],
                verbose=False,
                random_seed=42
            )
            hi_scores = cross_val_score(hi_model, X_selected, y_hi_train, cv=3, scoring='accuracy')
            hi_fitness = np.mean(hi_scores)
            
            # Combined fitness (weighted average)
            # Normalize nl_fitness to [0,1] range for fair comparison
            nl_fitness_norm = 1.0 / (1.0 + nl_fitness)  # Lower MSE = higher fitness
            
            combined_fitness = (0.4 * nl_fitness_norm + 0.3 * ns_fitness + 0.3 * hi_fitness)
            
            # Penalty for too many features
            feature_penalty = np.sum(selected_features) / len(selected_features) * 0.1
            
            return combined_fitness - feature_penalty
            
        except Exception as e:
            return float('-inf')
    
    def _hybrid_firefly_movement(self, population):
        """Firefly movement dengan feature evolution"""
        new_population = []
        
        for i, firefly_i in enumerate(population):
            moved = False
            
            for j, firefly_j in enumerate(population):
                if firefly_j['fitness'] > firefly_i['fitness']:
                    # Move towards brighter firefly
                    new_individual = self._move_towards(firefly_i, firefly_j)
                    new_population.append(new_individual)
                    moved = True
                    break
            
            if not moved:
                # Random movement
                new_individual = self._random_movement(firefly_i)
                new_population.append(new_individual)
        
        return new_population
    
    def _move_towards(self, firefly_i, firefly_j):
        """Move firefly i towards brighter firefly j"""
        new_individual = {
            'params': {},
            'features': firefly_i['features'].copy(),
            'fitness': 0.0
        }
        
        # Move parameters
        for param in self.param_bounds:
            diff = firefly_j['params'][param] - firefly_i['params'][param]
            movement = 0.5 * diff + 0.2 * random.uniform(-1, 1)
            
            new_value = firefly_i['params'][param] + movement
            
            # Clamp to bounds
            min_val, max_val = self.param_bounds[param]
            if param in ['depth', 'iterations']:
                new_value = int(np.clip(new_value, min_val, max_val))
            else:
                new_value = np.clip(new_value, min_val, max_val)
            
            new_individual['params'][param] = new_value
        
        # Move features (probabilistic)
        for k in range(len(firefly_i['features'])):
            if random.random() < 0.1:  # 10% chance to flip
                new_individual['features'][k] = firefly_j['features'][k]
        
        return new_individual
    
    def _random_movement(self, firefly):
        """Random movement for firefly"""
        new_individual = {
            'params': {},
            'features': firefly['features'].copy(),
            'fitness': 0.0
        }
        
        # Random parameter movement
        for param in self.param_bounds:
            min_val, max_val = self.param_bounds[param]
            if param in ['depth', 'iterations']:
                new_individual['params'][param] = random.randint(min_val, max_val)
            else:
                new_individual['params'][param] = random.uniform(min_val, max_val)
        
        # Random feature flip
        for k in range(len(firefly['features'])):
            if random.random() < 0.05:  # 5% chance to flip
                new_individual['features'][k] = not new_individual['features'][k]
        
        return new_individual
    
    def _fruitfly_feature_refinement(self, population, X_train, y_train):
        """Fruitfly-inspired feature refinement"""
        # Find best individual
        best_individual = max(population, key=lambda x: x['fitness'])
        
        # Create refined population around best features
        refined_population = []
        
        for individual in population:
            refined = {
                'params': individual['params'].copy(),
                'features': individual['features'].copy(),
                'fitness': individual['fitness']
            }
            
            # Fruitfly-style feature exploration around best
            for i in range(len(individual['features'])):
                if random.random() < 0.1:  # 10% exploration rate
                    # Move towards best individual's feature selection
                    if random.random() < 0.7:
                        refined['features'][i] = best_individual['features'][i]
                    else:
                        refined['features'][i] = random.random() > 0.5
            
            refined_population.append(refined)
        
        return refined_population
    
    def _train_all_models_simultaneously(self, X_train, X_test, y_nl_train, y_nl_test, 
                                       y_ns_train, y_ns_test, y_hi_train, y_hi_test, best_params):
        """Train semua model secara bersamaan dengan parameter optimal"""
        
        print("\n🎯 Training All Models Simultaneously...")
        print("="*60)
        
        # Setup progress tracking
        total_iterations = best_params['iterations']
        callback = IntegratedProgressCallback(print_every=max(1, total_iterations // 20))
        
        # Train Noise Level Model (Regression)
        print("\n1️⃣ Noise Level Predictor (Regression)")
        self.noise_level_model = CatBoostRegressor(**best_params, verbose=False, random_seed=42)
        self.noise_level_model.fit(
            X_train, y_nl_train,
            eval_set=(X_test, y_nl_test),
            callbacks=[callback]
        )
        
        # Train Noise Source Model (Classification)
        print("\n2️⃣ Noise Source Classifier")
        self.noise_source_model = CatBoostClassifier(**best_params, verbose=False, random_seed=42)
        self.noise_source_model.fit(
            X_train, y_ns_train,
            eval_set=(X_test, y_ns_test),
            callbacks=[callback]
        )
        
        # Train Health Impact Model (Classification)
        print("\n3️⃣ Health Impact Predictor")
        self.health_impact_model = CatBoostClassifier(**best_params, verbose=False, random_seed=42)
        self.health_impact_model.fit(
            X_train, y_hi_train,
            eval_set=(X_test, y_hi_test),
            callbacks=[callback]
        )
        
        print("\n🎉 All models trained successfully!")
    
    def predict_all(self, X):
        """Prediksi semua target sekaligus"""
        if any(model is None for model in [self.noise_level_model, self.noise_source_model, self.health_impact_model]):
            raise ValueError("Models not trained yet. Call integrated_optimization_and_training first.")
        
        noise_level = self.noise_level_model.predict(X)
        noise_source = self.noise_source_model.predict(X)
        health_impact = self.health_impact_model.predict(X)
        
        return {
            'noise_level': noise_level,
            'noise_source': noise_source,
            'health_impact': health_impact
        }
    
    def save_models(self, path):
        """Save semua model"""
        import os
        import joblib
        
        os.makedirs(path, exist_ok=True)
        
        joblib.dump(self.noise_level_model, f"{path}/integrated_noise_level_model.pkl")
        joblib.dump(self.noise_source_model, f"{path}/integrated_noise_source_model.pkl")
        joblib.dump(self.health_impact_model, f"{path}/integrated_health_impact_model.pkl")
        
        print(f"💾 All integrated models saved to {path}")

class IntegratedProgressCallback:
    """Progress callback untuk integrated training"""
    
    def __init__(self, print_every=10):
        self.iteration = 0
        self.print_every = print_every
        self.start_time = None
    
    def after_iteration(self, info):
        if self.start_time is None:
            self.start_time = time.time()
        
        self.iteration += 1
        
        if self.iteration % self.print_every == 0 or self.iteration == 1:
            elapsed_time = time.time() - self.start_time
            avg_time_per_iter = elapsed_time / self.iteration
            
            print(f"Epoch {self.iteration:3d}: time: {elapsed_time:.1f}s ({avg_time_per_iter*1000:.1f}ms/iter)")
        
        return True