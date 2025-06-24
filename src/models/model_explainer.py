import shap
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

class NoiseModelExplainer:
    def __init__(self, models, feature_names=None):
        self.models = models
        self.feature_names = feature_names
        self.explainers = {}
        
    def initialize_explainers(self, X_background):
        """Initialize SHAP explainers untuk semua models"""
        print("Initializing SHAP explainers...")
        
        for model_name, model in self.models.items():
            if model is not None:
                try:
                    # Use TreeExplainer for CatBoost
                    self.explainers[model_name] = shap.TreeExplainer(model)
                    print(f"✓ {model_name} explainer initialized")
                except Exception as e:
                    print(f"✗ Failed to initialize {model_name} explainer: {e}")
                    # Fallback to KernelExplainer
                    try:
                        background = shap.sample(X_background, 100)
                        self.explainers[model_name] = shap.KernelExplainer(
                            model.predict, background
                        )
                        print(f"✓ {model_name} fallback explainer initialized")
                    except Exception as e2:
                        print(f"✗ Failed to initialize fallback explainer: {e2}")
    
    def explain_prediction(self, X_sample, model_name='noise_level'):
        """Generate SHAP explanations untuk single prediction"""
        if model_name not in self.explainers:
            raise ValueError(f"Explainer for {model_name} not found")
        
        explainer = self.explainers[model_name]
        shap_values = explainer.shap_values(X_sample)
        
        return shap_values
    
    def plot_waterfall(self, X_sample, model_name='noise_level', max_display=10):
        """Create waterfall plot untuk single prediction"""
        shap_values = self.explain_prediction(X_sample, model_name)
        
        if len(X_sample.shape) > 1:
            X_sample = X_sample[0]
            shap_values = shap_values[0] if len(shap_values.shape) > 1 else shap_values
        
        # Create SHAP explanation object
        explanation = shap.Explanation(
            values=shap_values,
            base_values=self.explainers[model_name].expected_value,
            data=X_sample,
            feature_names=self.feature_names
        )
        
        # Plot waterfall
        shap.plots.waterfall(explanation, max_display=max_display, show=False)
        plt.title(f'SHAP Waterfall Plot - {model_name.replace("_", " ").title()}')
        plt.tight_layout()
        return plt.gcf()
    
    def plot_summary(self, X_sample, model_name='noise_level', plot_type='dot'):
        """Create summary plot"""
        shap_values = self.explain_prediction(X_sample, model_name)
        
        shap.summary_plot(
            shap_values, X_sample, 
            feature_names=self.feature_names,
            plot_type=plot_type,
            show=False
        )
        plt.title(f'SHAP Summary Plot - {model_name.replace("_", " ").title()}')
        plt.tight_layout()
        return plt.gcf()
    
    def create_interactive_explanation(self, X_sample, model_name='noise_level'):
        """Create interactive Plotly explanation"""
        shap_values = self.explain_prediction(X_sample, model_name)
        
        if len(X_sample.shape) > 1:
            X_sample = X_sample[0]
            shap_values = shap_values[0] if len(shap_values.shape) > 1 else shap_values
        
        # Prepare data
        feature_names = self.feature_names if self.feature_names else [f'Feature_{i}' for i in range(len(X_sample))]
        
        df = pd.DataFrame({
            'feature': feature_names,
            'value': X_sample,
            'shap_value': shap_values,
            'abs_shap': np.abs(shap_values)
        })
        
        # Sort by absolute SHAP value
        df = df.sort_values('abs_shap', ascending=True)
        
        # Create horizontal bar plot
        fig = go.Figure()
        
        colors = ['red' if x < 0 else 'blue' for x in df['shap_value']]
        
        fig.add_trace(go.Bar(
            y=df['feature'],
            x=df['shap_value'],
            orientation='h',
            marker_color=colors,
            text=[f'Value: {v:.3f}' for v in df['value']],
            textposition='auto',
            hovertemplate='<b>%{y}</b><br>' +
                         'SHAP Value: %{x:.4f}<br>' +
                         'Feature Value: %{text}<br>' +
                         '<extra></extra>'
        ))
        
        fig.update_layout(
            title=f'SHAP Feature Importance - {model_name.replace("_", " ").title()}',
            xaxis_title='SHAP Value',
            yaxis_title='Features',
            height=max(400, len(df) * 25),
            showlegend=False
        )
        
        return fig
    
    def explain_health_impact(self, X_sample, noise_level_prediction):
        """Specialized explanation untuk health impact"""
        explanations = {}
        
        # Get SHAP values for health impact model
        if 'health_impact' in self.explainers:
            shap_values = self.explain_prediction(X_sample, 'health_impact')
            
            if len(X_sample.shape) > 1:
                X_sample_single = X_sample[0]
                shap_values_single = shap_values[0] if len(shap_values.shape) > 1 else shap_values
            else:
                X_sample_single = X_sample
                shap_values_single = shap_values
            
            # Health impact thresholds
            thresholds = {
                'sleep_disruption': 45,
                'stress_impact': 55,
                'hearing_damage': 85
            }
            
            # Analyze health risks
            health_risks = {}
            for risk_type, threshold in thresholds.items():
                if noise_level_prediction > threshold:
                    health_risks[risk_type] = {
                        'risk_level': 'High' if noise_level_prediction > threshold + 10 else 'Moderate',
                        'exceeded_by': noise_level_prediction - threshold
                    }
                else:
                    health_risks[risk_type] = {
                        'risk_level': 'Low',
                        'margin': threshold - noise_level_prediction
                    }
            
            explanations['health_risks'] = health_risks
            explanations['shap_values'] = shap_values_single
            explanations['feature_contributions'] = dict(zip(
                self.feature_names if self.feature_names else [f'Feature_{i}' for i in range(len(X_sample_single))],
                shap_values_single
            ))
        
        return explanations
    
    def generate_recommendation(self, explanations, noise_level, location_context=None):
        """Generate actionable recommendations berdasarkan SHAP explanations"""
        recommendations = []
        
        if 'feature_contributions' in explanations:
            # Sort features by impact
            sorted_features = sorted(
                explanations['feature_contributions'].items(),
                key=lambda x: abs(x[1]),
                reverse=True
            )
            
            # Generate recommendations based on top contributing features
            for feature, contribution in sorted_features[:5]:
                if 'traffic' in feature.lower() and contribution > 0:
                    recommendations.append({
                        'type': 'traffic_management',
                        'message': 'Consider alternative routes during peak traffic hours',
                        'impact': 'High',
                        'feature': feature
                    })
                elif 'hour' in feature.lower() and contribution > 0:
                    recommendations.append({
                        'type': 'timing',
                        'message': 'Avoid this area during current time period',
                        'impact': 'Medium',
                        'feature': feature
                    })
                elif 'weather' in feature.lower() and contribution > 0:
                    recommendations.append({
                        'type': 'weather_dependent',
                        'message': 'Noise levels affected by current weather conditions',
                        'impact': 'Low',
                        'feature': feature
                    })
        
        # Health-based recommendations
        if 'health_risks' in explanations:
            for risk_type, risk_info in explanations['health_risks'].items():
                if risk_info['risk_level'] in ['High', 'Moderate']:
                    if risk_type == 'sleep_disruption':
                        recommendations.append({
                            'type': 'health_protection',
                            'message': 'Use noise-canceling devices or earplugs for better sleep',
                            'impact': 'High',
                            'risk_type': risk_type
                        })
                    elif risk_type == 'hearing_damage':
                        recommendations.append({
                            'type': 'urgent_health',
                            'message': 'Immediate hearing protection required - leave area if possible',
                            'impact': 'Critical',
                            'risk_type': risk_type
                        })
        
        return recommendations