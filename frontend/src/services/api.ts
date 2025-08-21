import { logger } from "../config/appConfig";

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

// Mock user for testing
const mockUser = {
  id: "mock-user-123",
  email: "user@example.com",
  username: "testuser",
  fullName: "Test User",
};

// Mock data storage
let mockNoiseAreas: any[] = [];
let mockPredictionHistory: HistoryItem[] = [];

export const apiService = {
  // Authentication stubs
  async signUp(email: string, password: string, userData: any) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock validation
    if (!email || !password) {
      return { data: null, error: { message: "Email dan password harus diisi" } };
    }

    const user = {
      id: `user-${Date.now()}`,
      email: email,
      ...userData,
    };

    return {
      data: { user },
      error: null,
    };
  },

  async signIn(email: string, password: string) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simple mock authentication
    if (password === "wrongpassword") {
      return {
        data: null,
        error: { message: "Kredensial tidak valid" },
      };
    }

    return {
      data: {
        user: mockUser,
        session: { access_token: "mock-token-123" },
      },
      error: null,
    };
  },

  async signOut() {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Clear local storage
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");

    return { error: null };
  },

  // Get prediction history stub
  async getPredictionHistory(limit: number = 50): Promise<HistoryItem[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return mockPredictionHistory.slice(0, limit);
  },

  // Noise areas stubs
  async getNoiseAreas() {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return { data: mockNoiseAreas, error: null };
  },

  async createNoiseArea(noiseArea: any) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newArea = {
      id: `area-${Date.now()}`,
      user_id: localStorage.getItem("userId") || "mock-user-123",
      created_at: new Date().toISOString(),
      ...noiseArea,
    };

    mockNoiseAreas.push(newArea);
    return { data: newArea, error: null };
  },

  // Audio upload and prediction stub
  async uploadAudioFile(file: File): Promise<UploadResult> {
    const startTime = performance.now();

    try {
      // Import audio classification service
      const { audioClassificationService } = await import("./audioClassificationService");

      // Convert file to blob and make prediction
      const audioBlob = new Blob([file], { type: file.type });
      const prediction = await audioClassificationService.predictFromAudio(audioBlob);

      const endTime = performance.now();
      const processingTime = (endTime - startTime) / 1000;

      // Simpan ke history (mock)
      const historyItem: HistoryItem = {
        id: `hist-${Date.now()}`,
        timestamp: new Date().toISOString(),
        noise_level: 75, // Default/mock value until enhanced
        health_impact: prediction.healthImpact,
        confidence_score: prediction.confidence,
        noise_source: prediction.noiseSource,
        file_name: file.name,
      };
      mockPredictionHistory.unshift(historyItem);

      return {
        status: "success",
        predictions: {
          noise_level: historyItem.noise_level,
          health_impact: historyItem.health_impact,
          confidence_score: historyItem.confidence_score,
          noise_source: historyItem.noise_source,
        },
        file_info: {
          name: file.name,
          size: file.size,
        },
        processing_time: Math.round(processingTime * 100) / 100,
      };
    } catch (error) {
      logger.error("Error processing audio file:", error);

      // Fallback to mock data if TensorFlow prediction fails
      const endTime = performance.now();
      const processingTime = (endTime - startTime) / 1000;

      return {
        status: "error",
        predictions: {
          noise_level: 0,
          health_impact: "unknown",
          confidence_score: 0,
          noise_source: "unknown",
        },
        file_info: {
          name: file.name,
          size: file.size,
        },
        processing_time: Math.round(processingTime * 100) / 100,
      };
    }
  },

  // Model status stub
  async getModelStatus(): Promise<ModelStatus> {
    try {
      await import("./audioClassificationService");
      // For now, return a simple status - can be enhanced later
      return {
        model_loaded: true,
        model_version: "YAMNet-1.0.0",
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Error getting model status:", error);
      return {
        model_loaded: false,
        model_version: "unknown",
        last_updated: new Date().toISOString(),
      };
    }
  },

  // Health check stub
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    // Mock health check response
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  },
};