import * as tf from '@tensorflow/tfjs';

export interface AudioFeatures {
  mfcc: number[];
  spectralCentroid: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  rms: number;
}

export interface PredictionResult {
  noiseLevel: number;
  healthImpact: string;
  confidenceScore: number;
  noiseSource: string;
}

class TensorFlowService {
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;

  async loadModel(): Promise<void> {
    try {
      if (this.isModelLoaded && this.model) {
        return;
      }

      console.log('Loading TensorFlow.js model...');
      this.model = await tf.loadLayersModel('/models/tfjs_model/model.json');
      this.isModelLoaded = true;
      console.log('Model loaded successfully');
    } catch (error) {
      console.error('Error loading model:', error);
      throw new Error('Failed to load TensorFlow.js model');
    }
  }

  async extractAudioFeatures(audioBuffer: AudioBuffer): Promise<number[]> {
    // This is a simplified feature extraction
    // In a real implementation, you would extract MFCC, spectral features, etc.
    const channelData = audioBuffer.getChannelData(0);
    const features: number[] = [];

    // Extract basic statistical features
    const mean = channelData.reduce((sum, val) => sum + val, 0) / channelData.length;
    const variance = channelData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / channelData.length;
    const rms = Math.sqrt(channelData.reduce((sum, val) => sum + val * val, 0) / channelData.length);
    
    // Zero crossing rate
    let zeroCrossings = 0;
    for (let i = 1; i < channelData.length; i++) {
      if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / channelData.length;

    // Create a feature vector (this should match your model's input size: 1024)
    // For now, we'll create a simplified feature vector
    features.push(mean, variance, rms, zcr);
    
    // Pad or truncate to match model input size (1024 features)
    while (features.length < 1024) {
      features.push(0);
    }
    
    return features.slice(0, 1024);
  }

  async predict(audioFile: File): Promise<PredictionResult> {
    try {
      await this.loadModel();
      
      if (!this.model) {
        throw new Error('Model not loaded');
      }

      // Convert audio file to AudioBuffer
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Extract features
      const features = await this.extractAudioFeatures(audioBuffer);
      
      // Create tensor from features
      const inputTensor = tf.tensor2d([features], [1, 1024]);
      
      // Make prediction
      const prediction = this.model.predict(inputTensor) as tf.Tensor;
      const predictionData = await prediction.data();
      
      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();
      
      // Process prediction results
      // Assuming the model outputs 6 values for different noise categories
      const [traffic, construction, industrial, aircraft, music, nature] = Array.from(predictionData);
      
      // Find the category with highest probability
      const categories = ['traffic', 'construction', 'industrial', 'aircraft', 'music', 'nature'];
      const probabilities = [traffic, construction, industrial, aircraft, music, nature];
      const maxIndex = probabilities.indexOf(Math.max(...probabilities));
      const noiseSource = categories[maxIndex];
      const confidenceScore = probabilities[maxIndex];
      
      // Estimate noise level based on RMS and other features
      const rmsValue = features[2]; // RMS is at index 2
      const noiseLevel = Math.min(130, Math.max(30, 50 + (rmsValue * 1000))); // Scale to dB range
      
      // Determine health impact based on noise level
      let healthImpact: string;
      if (noiseLevel < 55) {
        healthImpact = 'low';
      } else if (noiseLevel < 70) {
        healthImpact = 'moderate';
      } else if (noiseLevel < 85) {
        healthImpact = 'high';
      } else {
        healthImpact = 'severe';
      }
      
      return {
        noiseLevel: Math.round(noiseLevel),
        healthImpact,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        noiseSource
      };
      
    } catch (error) {
      console.error('Prediction error:', error);
      throw new Error('Failed to make prediction');
    }
  }

  getModelStatus(): { loaded: boolean; version: string } {
    return {
      loaded: this.isModelLoaded,
      version: '1.0.0'
    };
  }
}

export const tensorflowService = new TensorFlowService();