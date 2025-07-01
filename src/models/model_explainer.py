import shap
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from catboost import CatBoostClassifier, CatBoostRegressor
from sklearn.metrics import accuracy_score, classification_report,mean_squared_error,confusion_matrix
import seaborn as sns
from sklearn.inspection import permutation_importance
from sklearn.feature_selection import mutual_info_classif


class NoiseModelExplainer:
    def __init__(self, models, feature_names=None, X_train=None, X_test=None, y_train=None, y_test=None):
        self.models = models
        self.feature_names = feature_names
        self.X_train = X_train
        self.X_test = X_test
        self.y_train = y_train
        self.y_test = y_test
        self.explainers = {}
        
        # Auto-initialize explainers jika data tersedia
        if X_train is not None:
            self.initialize_explainers(X_train)
    
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




class AdvancedModelExplainer:
    def __init__(self, model, X_train, X_test, y_train, y_test, feature_names=None):
        self.model = model
        self.X_train = X_train
        self.X_test = X_test
        self.y_train = y_train
        self.y_test = y_test
        self.feature_names = feature_names or [f'feature_{i}' for i in range(X_train.shape[1])]
        self.explainer = None
        self.shap_values = None
        
    def initialize_shap_explainer(self):
        """Initialize SHAP explainer for model interpretation"""
        print("Initializing SHAP explainer...")
        
        if isinstance(self.model, (CatBoostRegressor, CatBoostClassifier)):
            # Use TreeExplainer for CatBoost
            self.explainer = shap.TreeExplainer(self.model)
        else:
            # Use KernelExplainer for other models
            background = shap.sample(self.X_train, 100)
            self.explainer = shap.KernelExplainer(self.model.predict, background)
        
        # Calculate SHAP values
        self.shap_values = self.explainer.shap_values(self.X_test[:100])  # Limit for performance
        print("SHAP explainer initialized successfully!")
    
    def plot_feature_importance(self, save_path=None):
        """Plot feature importance using multiple methods"""
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # 1. Built-in feature importance
        if hasattr(self.model, 'feature_importances_'):
            importance_df = pd.DataFrame({
                'feature': self.feature_names,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=True)
            
            axes[0, 0].barh(importance_df['feature'][-20:], importance_df['importance'][-20:])
            axes[0, 0].set_title('Built-in Feature Importance (Top 20)')
            axes[0, 0].set_xlabel('Importance')
        
        # 2. Permutation importance
        perm_importance = permutation_importance(self.model, self.X_test, self.y_test, 
                                               n_repeats=5, random_state=42)
        perm_df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': perm_importance.importances_mean
        }).sort_values('importance', ascending=True)
        
        axes[0, 1].barh(perm_df['feature'][-20:], perm_df['importance'][-20:])
        axes[0, 1].set_title('Permutation Importance (Top 20)')
        axes[0, 1].set_xlabel('Importance')
        
        # 3. SHAP feature importance
        if self.shap_values is not None:
            # Handle multi-dimensional SHAP values (for multi-class classification)
            if isinstance(self.shap_values, list):
                # For multi-class classification, SHAP returns a list of arrays
                # Take the mean absolute SHAP values across all classes
                shap_importance = np.mean([np.abs(shap_vals).mean(axis=0) for shap_vals in self.shap_values], axis=0)
            elif len(self.shap_values.shape) == 3:  # (n_samples, n_features, n_classes)
                # Take mean across samples and classes
                shap_importance = np.abs(self.shap_values).mean(axis=(0, 2))
            elif len(self.shap_values.shape) == 2:  # (n_samples, n_features)
                # Take mean across samples only
                shap_importance = np.abs(self.shap_values).mean(axis=0)
            else:
                # Handle 1D case
                shap_importance = np.abs(self.shap_values)
            
            # Ensure shap_importance is 1D
            if len(shap_importance.shape) > 1:
                shap_importance = shap_importance.flatten()
            
            # Create DataFrame only if we have the right number of features
            if len(shap_importance) == len(self.feature_names):
                shap_df = pd.DataFrame({
                    'feature': self.feature_names,
                    'importance': shap_importance
                }).sort_values('importance', ascending=True)
                
                axes[1, 0].barh(shap_df['feature'][-20:], shap_df['importance'][-20:])
                axes[1, 0].set_title('SHAP Feature Importance (Top 20)')
                axes[1, 0].set_xlabel('Mean |SHAP value|')
            else:
                # Skip SHAP plot if dimensions don't match
                axes[1, 0].text(0.5, 0.5, 'SHAP values dimension mismatch\nSkipping SHAP plot', 
                               ha='center', va='center', transform=axes[1, 0].transAxes)
                axes[1, 0].set_title('SHAP Feature Importance (Skipped)')
        else:
            # No SHAP values available
            axes[1, 0].text(0.5, 0.5, 'SHAP values not available', 
                           ha='center', va='center', transform=axes[1, 0].transAxes)
            axes[1, 0].set_title('SHAP Feature Importance (Not Available)')
        # 4. Feature correlation with target
        X_with_target = pd.DataFrame(self.X_train, columns=self.feature_names)
        
        # Check if target is categorical (string) and handle accordingly
        if isinstance(self.y_train[0], str) or not np.issubdtype(self.y_train.dtype, np.number):
            # For categorical targets, use mutual information or skip correlation
            try:
                # Calculate mutual information for categorical targets
                mi_scores = mutual_info_classif(self.X_train, self.y_train, random_state=42)
                mi_df = pd.DataFrame({
                    'feature': self.feature_names,
                    'mutual_info': mi_scores
                }).sort_values('mutual_info', ascending=True)
                
                axes[1, 1].barh(mi_df['feature'][-20:], mi_df['mutual_info'][-20:])
                axes[1, 1].set_title('Feature-Target Mutual Information (Top 20)')
                axes[1, 1].set_xlabel('Mutual Information Score')
            except Exception as e:
                # If mutual information fails, show a message
                axes[1, 1].text(0.5, 0.5, f'Categorical target detected\nCorrelation not applicable\nError: {str(e)[:50]}...', 
                               ha='center', va='center', transform=axes[1, 1].transAxes)
                axes[1, 1].set_title('Feature-Target Analysis (Skipped)')
        else:
            # For numeric targets, use correlation as before
            X_with_target['target'] = self.y_train
            correlations = X_with_target.corr()['target'].abs().sort_values(ascending=True)
            
            axes[1, 1].barh(correlations.index[-21:-1], correlations.values[-21:-1])
            axes[1, 1].set_title('Feature-Target Correlation (Top 20)')
            axes[1, 1].set_xlabel('|Correlation|')
        
        plt.tight_layout()
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.show()
    
    def plot_shap_summary(self, save_path=None):
        """Plot SHAP summary plots"""
        if self.shap_values is None:
            print("SHAP values not available. Please run initialize_shap_explainer first.")
            return
        
        fig, axes = plt.subplots(1, 2, figsize=(15, 6))
        
        # Summary plot
        plt.sca(axes[0])
        shap.summary_plot(self.shap_values, self.X_test[:100], 
                         feature_names=self.feature_names, show=False)
        axes[0].set_title('SHAP Summary Plot')
        
        # Waterfall plot for first prediction
        plt.sca(axes[1])
        
        # Handle different SHAP value formats
        if isinstance(self.shap_values, list):
            # Multi-class classification: use first class, first sample
            shap_vals_single = self.shap_values[0][0]  # First class, first sample
            expected_val = self.explainer.expected_value[0] if isinstance(self.explainer.expected_value, (list, np.ndarray)) else self.explainer.expected_value
        else:
            # Single output: use first sample
            if len(self.shap_values.shape) == 3:
                # Multi-class with shape (n_samples, n_features, n_classes)
                shap_vals_single = self.shap_values[0, :, 0]  # First sample, first class
            else:
                # Binary classification or regression with shape (n_samples, n_features)
                shap_vals_single = self.shap_values[0]  # First sample
            expected_val = self.explainer.expected_value[0] if isinstance(self.explainer.expected_value, (list, np.ndarray)) else self.explainer.expected_value
        
        # Get the data for the first sample
        if hasattr(self.X_test, 'iloc'):
            data_single = self.X_test.iloc[0]
        else:
            data_single = self.X_test[0]
        
        try:
            shap.waterfall_plot(shap.Explanation(values=shap_vals_single, 
                                               base_values=expected_val,
                                               data=data_single,
                                               feature_names=self.feature_names), show=False)
            axes[1].set_title('SHAP Waterfall Plot (First Prediction)')
        except Exception as e:
            # If waterfall plot fails, show error message
            axes[1].text(0.5, 0.5, f'Waterfall plot failed:\n{str(e)[:100]}...', 
                        ha='center', va='center', transform=axes[1].transAxes)
            axes[1].set_title('SHAP Waterfall Plot (Failed)')
        
        plt.tight_layout()
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.show()
    
    def analyze_prediction_errors(self, save_path=None):
        """Analyze model prediction errors"""
        y_pred = self.model.predict(self.X_test)
        
        # Better classification detection logic
        is_classification = False
        
        # Check if model has classes_ attribute (sklearn classifiers)
        if hasattr(self.model, 'classes_'):
            is_classification = True
        # Check if y_test contains string/categorical data
        elif hasattr(self.y_test, 'dtype') and self.y_test.dtype == 'object':
            is_classification = True
        # Check if y_test contains only a small number of unique integer values (likely classes)
        elif np.issubdtype(self.y_test.dtype, np.integer):
            unique_values = np.unique(self.y_test)
            if len(unique_values) <= 20:  # Assume classification if <= 20 unique integer values
                is_classification = True
        # Check if all values in y_test are strings
        elif isinstance(self.y_test, (list, np.ndarray)) and len(self.y_test) > 0 and isinstance(self.y_test[0], str):
            is_classification = True
        
        if is_classification:
            # For classification, show confusion matrix and classification metrics
            from sklearn.metrics import confusion_matrix, classification_report
            import seaborn as sns
            
            fig, axes = plt.subplots(1, 2, figsize=(15, 6))
            
            # Confusion Matrix
            try:
                cm = confusion_matrix(self.y_test, y_pred)
                sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[0])
                axes[0].set_title('Confusion Matrix')
                axes[0].set_xlabel('Predicted')
                axes[0].set_ylabel('Actual')
                
                # Classification Report as text
                report = classification_report(self.y_test, y_pred)
                axes[1].text(0.1, 0.5, report, fontsize=10, fontfamily='monospace',
                            verticalalignment='center', transform=axes[1].transAxes)
                axes[1].set_title('Classification Report')
                axes[1].axis('off')
            except Exception as e:
                # If classification analysis fails, fall back to regression analysis
                axes[0].text(0.5, 0.5, f'Classification analysis failed:\n{str(e)[:100]}...\nFalling back to regression analysis', 
                            ha='center', va='center', transform=axes[0].transAxes)
                axes[0].set_title('Classification Analysis (Failed)')
                axes[1].axis('off')
                is_classification = False
        
        if not is_classification:
            # Handle as regression task
            if len(y_pred.shape) > 1 and y_pred.shape[1] > 1:  # Multi-output regression
                # For multi-output regression, analyze each output separately
                n_outputs = y_pred.shape[1]
                fig, axes = plt.subplots(2, n_outputs, figsize=(5*n_outputs, 10))
                
                for i in range(n_outputs):
                    # Prediction vs Actual
                    axes[0, i].scatter(self.y_test[:, i], y_pred[:, i], alpha=0.6)
                    axes[0, i].plot([self.y_test[:, i].min(), self.y_test[:, i].max()], 
                                   [self.y_test[:, i].min(), self.y_test[:, i].max()], 'r--')
                    axes[0, i].set_xlabel('Actual')
                    axes[0, i].set_ylabel('Predicted')
                    axes[0, i].set_title(f'Output {i+1}: Predicted vs Actual')
                    
                    # Residuals
                    residuals = self.y_test[:, i] - y_pred[:, i]
                    axes[1, i].scatter(y_pred[:, i], residuals, alpha=0.6)
                    axes[1, i].axhline(y=0, color='r', linestyle='--')
                    axes[1, i].set_xlabel('Predicted')
                    axes[1, i].set_ylabel('Residuals')
                    axes[1, i].set_title(f'Output {i+1}: Residual Plot')
            else:
                # Single output regression
                fig, axes = plt.subplots(1, 2, figsize=(12, 5))
                
                # Flatten arrays if needed
                y_test_flat = self.y_test.flatten() if len(self.y_test.shape) > 1 else self.y_test
                y_pred_flat = y_pred.flatten() if len(y_pred.shape) > 1 else y_pred
                
                # Prediction vs Actual
                axes[0].scatter(y_test_flat, y_pred_flat, alpha=0.6)
                axes[0].plot([y_test_flat.min(), y_test_flat.max()], 
                            [y_test_flat.min(), y_test_flat.max()], 'r--')
                axes[0].set_xlabel('Actual')
                axes[0].set_ylabel('Predicted')
                axes[0].set_title('Predicted vs Actual')
                
                # Residuals
                residuals = y_test_flat - y_pred_flat
                axes[1].scatter(y_pred_flat, residuals, alpha=0.6)
                axes[1].axhline(y=0, color='r', linestyle='--')
                axes[1].set_xlabel('Predicted')
                axes[1].set_ylabel('Residuals')
                axes[1].set_title('Residual Plot')
        
        plt.tight_layout()
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.show()
    
    def generate_model_report(self):
        """Generate comprehensive model analysis report"""
        print("=" * 60)
        print("           MODEL ANALYSIS REPORT")
        print("=" * 60)
        
        # Model info
        print(f"\n📊 Model Type: {type(self.model).__name__}")
        print(f"📊 Training samples: {self.X_train.shape[0]}")
        print(f"📊 Test samples: {self.X_test.shape[0]}")
        print(f"📊 Features: {self.X_train.shape[1]}")
        
        # Performance metrics
        y_pred = self.model.predict(self.X_test)
        
        # Determine if this is a classification or regression task
        
        if isinstance(self.model, CatBoostClassifier):
            # Classification metrics
            accuracy = accuracy_score(self.y_test, y_pred)
            print(f"\n🎯 Classification Performance:")
            print(f"   Accuracy: {accuracy:.4f}")
            
            # Classification report
            print(f"\n📋 Detailed Classification Report:")
            report = classification_report(self.y_test, y_pred, output_dict=True)
            for class_name, metrics in report.items():
                if isinstance(metrics, dict) and class_name not in ['accuracy', 'macro avg', 'weighted avg']:
                    print(f"   {class_name}: Precision={metrics['precision']:.3f}, Recall={metrics['recall']:.3f}, F1={metrics['f1-score']:.3f}")
            
            print(f"   Macro Avg: Precision={report['macro avg']['precision']:.3f}, Recall={report['macro avg']['recall']:.3f}, F1={report['macro avg']['f1-score']:.3f}")
            
        else:
            # Regression metrics
            # Handle multi-dimensional arrays
            if len(y_pred.shape) > 1 and len(self.y_test.shape) > 1:
                print(f"\n🎯 Multi-output Regression Performance:")
                for i in range(y_pred.shape[1]):
                    mse = mean_squared_error(self.y_test[:, i], y_pred[:, i])
                    rmse = np.sqrt(mse)
                    print(f"   Output {i+1} - RMSE: {rmse:.4f}, MSE: {mse:.4f}")
            else:
                # Handle single output case
                if len(y_pred.shape) > 1:
                    y_pred = y_pred.flatten()
                if len(self.y_test.shape) > 1:
                    y_test_flat = self.y_test.flatten()
                else:
                    y_test_flat = self.y_test
                    
                mse = mean_squared_error(y_test_flat, y_pred)
                rmse = np.sqrt(mse)
                print(f"\n🎯 Regression Performance:")
                print(f"   RMSE: {rmse:.4f}")
                print(f"   MSE: {mse:.4f}")
        
        # Feature importance summary
        if hasattr(self.model, 'feature_importances_'):
            top_features = pd.DataFrame({
                'feature': self.feature_names,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False).head(10)
            
            print(f"\n🔍 Top 10 Important Features:")
            for idx, row in top_features.iterrows():
                print(f"   {row['feature']}: {row['importance']:.4f}")
        
        print("\n" + "="*60)
    
    def run_full_analysis(self, save_plots=True):
        """Run complete model analysis pipeline"""
        print("🚀 Starting comprehensive model analysis...\n")
        
        # Initialize SHAP
        self.initialize_shap_explainer()
        
        # Generate report
        self.generate_model_report()
        
        # Create visualizations
        if save_plots:
            self.plot_feature_importance('feature_importance_analysis.png')
            self.plot_shap_summary('shap_analysis.png')
            self.analyze_prediction_errors('prediction_analysis.png')
        else:
            self.plot_feature_importance()
            self.plot_shap_summary()
            self.analyze_prediction_errors()
        
        print("\n✅ Model analysis completed!")