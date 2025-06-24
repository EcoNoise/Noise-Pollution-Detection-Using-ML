import yaml
from utils.data_loader import DataLoader
from models.catboost_model import NoisePredictor
from models.firefly_optimizer import FireflyOptimizer
from models.fruitfly_optimizer import FruitFlyOptimizer
from models.model_explainer import NoiseModelExplainer

def main():
    # Load config
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # Generate sample data
    data_loader = DataLoader()
    data = data_loader.generate_sample_data(1000)
    
    # Train basic model
    predictor = NoisePredictor()
    model = predictor.train_noise_level_predictor(data['features'], data['noise_levels'])
    
    print("✅ Basic model training successful!")

def quick_training_test():
    # Load config
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # Generate sample data
    data_loader = DataLoader()
    data = data_loader.generate_sample_data(1000)
    
    # Initialize predictor
    predictor = NoisePredictor('config.yaml')
    
    # Train models
    print("Training noise level predictor...")
    predictor.train_noise_level_predictor(data['features'], data['noise_levels'])
    
    print("Training noise source classifier...")
    predictor.train_noise_source_classifier(data['features'], data['noise_sources'])
    
    print("Training health impact predictor...")
    predictor.train_health_impact_predictor(data['features'], data['health_impact'])
    
    return predictor

if __name__ == "__main__":
    # Run quick training test
    trained_predictor = quick_training_test()
    main()