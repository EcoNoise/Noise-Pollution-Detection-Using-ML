import numpy as np
import random
from sklearn.model_selection import cross_val_score
from catboost import CatBoostRegressor

class FruitFlyOptimizer:
    def __init__(self, config):
        self.population_size = config['model']['fruitfly']['population_size']
        self.max_iterations = config['model']['fruitfly']['max_iterations']
        self.step_size = config['model']['fruitfly']['step_size']
        
        # FOA specific parameters
        self.X_axis = 0.0  # Pusat swarm X
        self.Y_axis = 0.0  # Pusat swarm Y
        self.best_smell = 0.0
        self.best_X = 0.0
        self.best_Y = 0.0
        self.best_fitness = float('-inf')
        
    def initialize_swarm_center(self, param_bounds):
        """Inisialisasi pusat swarm (X_axis, Y_axis) - FOA asli"""
        # FOA asli: inisialisasi koordinat pusat swarm secara random
        param_names = list(param_bounds.keys())
        n_params = len(param_names)
        
        # Inisialisasi pusat swarm di tengah search space
        self.X_axis = np.random.uniform(-5, 5)  # Koordinat X pusat
        self.Y_axis = np.random.uniform(-5, 5)  # Koordinat Y pusat
        
        print(f"Swarm center initialized at: X_axis={self.X_axis:.3f}, Y_axis={self.Y_axis:.3f}")
        
    def generate_fly_positions(self, param_bounds):
        """Generate posisi individual flies dengan random walk dari pusat - FOA asli"""
        param_names = list(param_bounds.keys())
        n_params = len(param_names)
        
        fly_positions = []
        
        for i in range(self.population_size):
            # FOA asli: Random walk dari pusat swarm
            Xi = self.X_axis + np.random.uniform(-self.step_size, self.step_size)
            Yi = self.Y_axis + np.random.uniform(-self.step_size, self.step_size)
            
            # Convert 2D coordinates ke parameter space
            # Mapping dari (Xi, Yi) ke actual parameters
            position = []
            for j, (param_name, (min_val, max_val)) in enumerate(param_bounds.items()):
                # Map coordinate ke parameter range
                if j % 2 == 0:  # Even index menggunakan Xi
                    normalized = (Xi + 10) / 20  # Normalize [-10,10] to [0,1]
                else:  # Odd index menggunakan Yi
                    normalized = (Yi + 10) / 20  # Normalize [-10,10] to [0,1]
                
                # Scale ke parameter bounds
                param_value = min_val + normalized * (max_val - min_val)
                param_value = np.clip(param_value, min_val, max_val)
                position.append(param_value)
            
            fly_positions.append({
                'Xi': Xi,
                'Yi': Yi,
                'position': np.array(position),
                'distance': 0.0,
                'smell': 0.0,
                'fitness': 0.0
            })
        
        return fly_positions
    
    def calculate_distance_and_smell(self, fly):
        """FOA asli: Disti = sqrt(Xi² + Yi²), Si = 1/Disti"""
        # FOA formula asli
        distance = np.sqrt(fly['Xi']**2 + fly['Yi']**2)
        
        if distance == 0:
            smell = float('inf')
        else:
            smell = 1.0 / distance
        
        fly['distance'] = distance
        fly['smell'] = smell
        
        return fly
    
    def position_to_params(self, position, param_bounds):
        """Convert position vector to CatBoost parameters"""
        params = {}
        
        for i, (param_name, (min_val, max_val)) in enumerate(param_bounds.items()):
            if param_name in ['depth', 'iterations']:
                params[param_name] = int(np.clip(position[i], min_val, max_val))
            else:
                params[param_name] = np.clip(position[i], min_val, max_val)
        
        return params
    
    def evaluate_fitness(self, position, X, y, param_bounds):
        """Evaluate fitness dari parameter position"""
        try:
            params = self.position_to_params(position, param_bounds)
            
            model = CatBoostRegressor(
                learning_rate=params['learning_rate'],
                depth=params['depth'],
                l2_leaf_reg=params['l2_leaf_reg'],
                iterations=params['iterations'],
                verbose=False,
                random_seed=42
            )
            
            scores = cross_val_score(model, X, y, cv=3, scoring='neg_mean_squared_error')
            fitness = -np.mean(scores)
            
            return 1.0 / (1.0 + fitness)
            
        except Exception as e:
            return 0.0
    
    def optimize_hyperparameters(self, X, y, param_bounds):
        """FOA Algorithm Implementation - Sesuai Paper Asli"""
        
        print("Starting Fruit Fly Optimization Algorithm (Original FOA)...")
        print(f"Population size: {self.population_size}")
        
        # Step 1: Inisialisasi pusat swarm
        self.initialize_swarm_center(param_bounds)
        
        for iteration in range(self.max_iterations):
            # Step 2: Generate fly positions dengan random walk
            flies = self.generate_fly_positions(param_bounds)
            
            # Step 3: Osphresis Phase - Calculate distance dan smell
            for fly in flies:
                fly = self.calculate_distance_and_smell(fly)
                
                # Evaluate fitness
                fitness = self.evaluate_fitness(fly['position'], X, y, param_bounds)
                fly['fitness'] = fitness
            
            # Step 4: Find best smell concentration
            best_fly = max(flies, key=lambda f: f['smell'])
            
            # Step 5: Vision Phase - Update global best
            if best_fly['fitness'] > self.best_fitness:
                self.best_fitness = best_fly['fitness']
                self.best_smell = best_fly['smell']
                self.best_X = best_fly['Xi']
                self.best_Y = best_fly['Yi']
                self.best_position = best_fly['position'].copy()
            
            # Step 6: Update swarm center ke best location (FOA characteristic)
            # Seluruh swarm bergerak ke lokasi best smell
            self.X_axis = self.best_X
            self.Y_axis = self.best_Y
            
            # Progress reporting
            if iteration % 20 == 0 or iteration == self.max_iterations - 1:
                print(f"Iteration {iteration}: Best fitness = {self.best_fitness:.6f}, "
                      f"Best smell = {self.best_smell:.6f}")
                print(f"Swarm center moved to: X={self.X_axis:.3f}, Y={self.Y_axis:.3f}")
        
        # Return best parameters
        best_params = self.position_to_params(self.best_position, param_bounds)
        
        print(f"\nOptimization completed!")
        print(f"Best parameters: {best_params}")
        print(f"Best fitness: {self.best_fitness:.6f}")
        
        return best_params
    
    def optimize_features(self, X, y, model_params=None):
        """Feature selection using FOA (backward compatibility)"""
        n_features = X.shape[1]
        param_bounds = {f'feature_{i}': (0.0, 1.0) for i in range(n_features)}
        
        best_params = self.optimize_hyperparameters(X, y, param_bounds)
        
        feature_weights = np.array([best_params[f'feature_{i}'] for i in range(n_features)])
        feature_mask = feature_weights > 0.5
        
        print(f"Selected {np.sum(feature_mask)} out of {n_features} features")
        
        return feature_mask, feature_weights