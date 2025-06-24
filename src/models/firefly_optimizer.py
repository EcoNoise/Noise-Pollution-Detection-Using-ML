import numpy as np
import random
from sklearn.model_selection import cross_val_score
from catboost import CatBoostRegressor

class FireflyOptimizer:
    def __init__(self, config):
        self.population_size = config['model']['firefly']['population_size']
        self.max_generations = config['model']['firefly']['max_generations']
        self.alpha = config['model']['firefly']['alpha']
        self.beta = config['model']['firefly']['beta']
        self.gamma = config['model']['firefly']['gamma']
        
        # Parameter bounds untuk CatBoost
        self.param_bounds = {
            'learning_rate': (0.01, 0.3),
            'depth': (3, 10),
            'l2_leaf_reg': (1, 10),
            'iterations': (100, 1000)
        }
    
    def initialize_population(self):
        """Initialize firefly population dengan random parameters"""
        population = []
        for _ in range(self.population_size):
            firefly = {
                'learning_rate': random.uniform(*self.param_bounds['learning_rate']),
                'depth': random.randint(*self.param_bounds['depth']),
                'l2_leaf_reg': random.uniform(*self.param_bounds['l2_leaf_reg']),
                'iterations': random.randint(*self.param_bounds['iterations']),
                'brightness': 0.0
            }
            population.append(firefly)
        return population
    
    def calculate_brightness(self, params, X, y):
        """Calculate brightness (fitness) berdasarkan cross-validation score"""
        try:
            model = CatBoostRegressor(
                learning_rate=params['learning_rate'],
                depth=int(params['depth']),
                l2_leaf_reg=params['l2_leaf_reg'],
                iterations=int(params['iterations']),
                verbose=False,
                random_seed=42
            )
            
            # Cross-validation score sebagai brightness
            scores = cross_val_score(model, X, y, cv=3, scoring='neg_mean_squared_error')
            brightness = -np.mean(scores)  # Convert to positive (lower MSE = higher brightness)
            return 1.0 / (1.0 + brightness)  # Normalize brightness
            
        except Exception as e:
            return 0.0  # Invalid parameters
    
    def distance(self, firefly1, firefly2):
        """Calculate Euclidean distance between two fireflies"""
        dist = 0
        for key in ['learning_rate', 'depth', 'l2_leaf_reg', 'iterations']:
            dist += (firefly1[key] - firefly2[key]) ** 2
        return np.sqrt(dist)
    
    def move_firefly(self, firefly_i, firefly_j):
        """Move firefly i towards brighter firefly j"""
        r = self.distance(firefly_i, firefly_j)
        beta = self.beta * np.exp(-self.gamma * r * r)
        
        new_firefly = firefly_i.copy()
        
        for key in ['learning_rate', 'depth', 'l2_leaf_reg', 'iterations']:
            # Movement towards brighter firefly + random component
            movement = beta * (firefly_j[key] - firefly_i[key]) + \
                      self.alpha * (random.random() - 0.5)
            
            new_firefly[key] = firefly_i[key] + movement
            
            # Ensure bounds
            if key in ['depth', 'iterations']:
                new_firefly[key] = max(self.param_bounds[key][0], 
                                     min(self.param_bounds[key][1], int(new_firefly[key])))
            else:
                new_firefly[key] = max(self.param_bounds[key][0], 
                                     min(self.param_bounds[key][1], new_firefly[key]))
        
        return new_firefly
    
    def optimize(self, X, y):
        """Main optimization loop"""
        population = self.initialize_population()
        best_firefly = None
        best_brightness = 0
        
        print("Starting Firefly Optimization...")
        
        for generation in range(self.max_generations):
            # Calculate brightness for all fireflies
            for firefly in population:
                firefly['brightness'] = self.calculate_brightness(firefly, X, y)
                
                if firefly['brightness'] > best_brightness:
                    best_brightness = firefly['brightness']
                    best_firefly = firefly.copy()
            
            # Move fireflies
            new_population = []
            for i, firefly_i in enumerate(population):
                moved = False
                for j, firefly_j in enumerate(population):
                    if firefly_j['brightness'] > firefly_i['brightness']:
                        new_firefly = self.move_firefly(firefly_i, firefly_j)
                        new_population.append(new_firefly)
                        moved = True
                        break
                
                if not moved:
                    # Random movement if no brighter firefly found
                    new_firefly = firefly_i.copy()
                    for key in ['learning_rate', 'l2_leaf_reg']:
                        new_firefly[key] += self.alpha * (random.random() - 0.5)
                        new_firefly[key] = max(self.param_bounds[key][0], 
                                             min(self.param_bounds[key][1], new_firefly[key]))
                    new_population.append(new_firefly)
            
            population = new_population
            
            if generation % 10 == 0:
                print(f"Generation {generation}: Best brightness = {best_brightness:.6f}")
        
        print(f"Optimization completed. Best parameters:")
        for key, value in best_firefly.items():
            if key != 'brightness':
                print(f"  {key}: {value}")
        
        return best_firefly