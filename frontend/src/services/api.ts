import axios from 'axios';

// Base URL for API
const API_BASE_URL = (window as any).ENV?.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Types
export interface PredictionResult {
  noise_level: number;
  noise_source: string;
  health_impact: string;
  confidence_score: number;
}

export interface PredictionResponse {
  status: string;
  predictions: PredictionResult;
  processing_time: number;
  file_info: {
    name: string;
    size: number;
  };
}

export interface HistoryItem {
  id: number;
  timestamp: string;
  noise_level: number;
  noise_source: string;
  health_impact: string;
  confidence_score: number;
  file_name?: string;
  processing_time: number;
}

export interface ModelStatus {
  status: string;
  models: {
    [key: string]: boolean;
  };
  total_models: number;
  loaded_models: number;
}

// API Functions
export const apiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/health/');
    return response.data;
  },

  // Get model status
  async getModelStatus(): Promise<ModelStatus> {
    const response = await api.get('/models/status/');
    return response.data;
  },

  // Upload audio file for prediction
  async uploadAudioFile(file: File): Promise<PredictionResponse> {
    const formData = new FormData();
    formData.append('audio_file', file);

    const response = await api.post('/audio/predict/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Get prediction history
  async getPredictionHistory(limit: number = 50): Promise<HistoryItem[]> {
    const response = await api.get('/predictions/history/', {
      params: { limit },
    });
    return response.data.history || [];
  },

  // Batch prediction (if implemented)
  async batchPrediction(files: File[]) {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`audio_files`, file);
    });

    const response = await api.post('/predict/batch/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};

export default api;