import { supabase } from '../lib/supabase'

// Types
export interface PredictionResponse {
  noise_level: number;
  health_impact: string;
  confidence_score: number;
  noise_source: string;
}

export interface UploadResult {
  status: string;
  predictions: PredictionResponse;
  file_info: {
    name: string;
    size: number;
  };
  processing_time: number;
}

export interface ModelStatus {
  model_loaded: boolean;
  model_version: string;
  last_updated: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  noise_level: number;
  health_impact: string;
  confidence_score: number;
  noise_source: string;
  file_name?: string;
}

export const apiService = {
  // Authentication
  async signUp(email: string, password: string, userData: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get prediction history
  async getPredictionHistory(limit: number = 50): Promise<HistoryItem[]> {
    const { data, error } = await supabase
      .from('prediction_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching prediction history:', error);
      return [];
    }
    
    return data || [];
  },

  // Noise areas
  async getNoiseAreas() {
    const { data, error } = await supabase
      .from('noise_areas')
      .select('*')
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  async createNoiseArea(noiseArea: any) {
    const { data, error } = await supabase
      .from('noise_areas')
      .insert(noiseArea)
      .select()
      .single()
    
    return { data, error }
  },

  // Audio upload and prediction
  async uploadAudioFile(file: File): Promise<UploadResult> {
    const startTime = performance.now();
    
    try {
      // Import audio classification service
      const { audioClassificationService } = await import('./audioClassificationService');
      
      // Convert file to blob and make prediction
      const audioBlob = new Blob([file], { type: file.type });
      const prediction = await audioClassificationService.predictFromAudio(audioBlob);
      
      const endTime = performance.now();
      const processingTime = (endTime - startTime) / 1000; // Convert to seconds
      
      return {
        status: "success",
        predictions: {
          noise_level: 75, // Default value, can be enhanced later
          health_impact: prediction.healthImpact,
          confidence_score: prediction.confidence,
          noise_source: prediction.noiseSource
        },
        file_info: {
          name: file.name,
          size: file.size
        },
        processing_time: Math.round(processingTime * 100) / 100
      };
    } catch (error) {
      console.error('Error processing audio file:', error);
      
      // Fallback to mock data if TensorFlow prediction fails
      const endTime = performance.now();
      const processingTime = (endTime - startTime) / 1000;
      
      return {
        status: "error",
        predictions: {
          noise_level: 0,
          health_impact: "unknown",
          confidence_score: 0,
          noise_source: "unknown"
        },
        file_info: {
          name: file.name,
          size: file.size
        },
        processing_time: Math.round(processingTime * 100) / 100
      };
    }
  },

  // Model status
  async getModelStatus(): Promise<ModelStatus> {
    try {
      const { audioClassificationService } = await import('./audioClassificationService');
      // For now, return a simple status - can be enhanced later
      return {
        model_loaded: true,
        model_version: "YAMNet-1.0.0",
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting model status:', error);
      return {
        model_loaded: false,
        model_version: "unknown",
        last_updated: new Date().toISOString()
      };
    }
  },

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    // Mock health check response
    return {
      status: "healthy",
      timestamp: new Date().toISOString()
    };
  }
}