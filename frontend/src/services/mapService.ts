// src/services/mapService.ts
import { NoiseLocation, SearchResult } from "../types/mapTypes";
import { PredictionResponse } from "./api";
import { repository, getCurrentUserId as repoGetUserId } from "./map.repository";
import { toNoiseLocation, generateId } from "./map.transformers";
import { analyzeAudioFile } from "./map.analysis";
import { exportUserNoiseData } from "./map.export";

// Helper functions
const getCurrentUserId = (): string | null => repoGetUserId();
const loadUserNoiseAreas = (userId: string): any[] => repository.loadUserNoiseAreas(userId);
const saveUserNoiseAreas = (userId: string, areas: any[]) => repository.saveUserNoiseAreas(userId, areas);
const loadAllNoiseAreas = (): any[] => repository.loadAllNoiseAreas();
const saveAllNoiseAreas = (areas: any[]) => repository.saveAllNoiseAreas(areas);

class MapService {
  // Properties for shared data and analysis context
  private sharedData: {
    analysis: PredictionResponse;
    position?: [number, number];
    address?: string;
  } | null = null;

  private analysisRequestContext: {
    position: [number, number];
    address: string;
  } | null = null;

  // Analysis request context methods
  setAnalysisRequest(context: { position: [number, number]; address: string }) {
    this.analysisRequestContext = context;
  }

  getAndClearAnalysisRequest(): {
    position: [number, number];
    address: string;
  } | null {
    const context = this.analysisRequestContext;
    this.analysisRequestContext = null;
    return context;
  }

  // Audio analysis and noise location management
  async analyzeAudioAndAddArea(
    audioFile: File,
    position: [number, number],
    address: string,
    description: string
  ): Promise<NoiseLocation | null> {
    try {
      const allowedTypes = [
        "audio/wav", "audio/mp3", "audio/mpeg", "audio/mp4",
        "audio/m4a", "audio/ogg", "audio/webm", "audio/flac",
      ];

      if (!allowedTypes.includes(audioFile.type)) {
        throw new Error(
          `Format file tidak didukung: ${audioFile.type}. Format yang didukung: WAV, MP3, M4A, OGG, WebM, FLAC`
        );
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (audioFile.size > maxSize) {
        throw new Error(
          `Ukuran file terlalu besar: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB. Maksimal ukuran file adalah 50MB.`
        );
      }

      const analysisResult = await analyzeAudioFile(audioFile);

      const newLocationData = {
        coordinates: position,
        noiseLevel: analysisResult.noise_level,
        source: analysisResult.noise_source,
        healthImpact: analysisResult.health_impact || "Tidak diketahui",
        description: description || `Analisis dari file: ${audioFile.name}`,
        address: address || "Alamat tidak spesifik",
        radius: 100,
      };

      const newLocation = await this.addNoiseLocation(newLocationData);

      if (!newLocation) {
        throw new Error("Berhasil menganalisis audio, tetapi gagal menyimpan lokasi ke peta");
      }

      // Refresh daily audio cache
      try {
        const { DailyAudioService } = await import("./dailyAudioService");
        await DailyAudioService.refreshTodayAudioSummary();
      } catch (cacheError) {
        console.warn("⚠️ Gagal refresh cache laporan harian:", cacheError);
      }

      return newLocation;
    } catch (error) {
      console.error("❌ Error during analysis and add area process:", error);
      if (error instanceof Error) throw error;
      throw new Error("Terjadi kesalahan tidak dikenal saat menganalisis audio.");
    }
  }

  async addNoiseLocation(location: Omit<NoiseLocation, "id" | "timestamp">): Promise<NoiseLocation | null> {
    try {
      const requestData = {
        latitude: location.coordinates[0],
        longitude: location.coordinates[1],
        noise_level: location.noiseLevel,
        noise_source: location.source,
        health_impact: location.healthImpact,
        description: location.description || "",
        address: location.address || "",
        radius: location.radius || 100,
      };

      const userId = getCurrentUserId();
      if (!userId) throw new Error("User must be authenticated to add noise areas");

      // Check for duplicates
      const allAreas = loadAllNoiseAreas();
      const duplicate = allAreas.find(area => 
        area.latitude === requestData.latitude && 
        area.longitude === requestData.longitude
      );

      if (duplicate) {
        throw new Error("Koordinat sudah digunakan, pilih lokasi lain");
      }

      // Create new area
      const id = generateId();
      const newArea = {
        id,
        ...requestData,
        user_id: userId,
        created_at: new Date().toISOString(),
        expires_at: null
      };

      // Save to storage
      const userAreas = loadUserNoiseAreas(userId);
      userAreas.push(newArea);
      saveUserNoiseAreas(userId, userAreas);

      allAreas.push(newArea);
      saveAllNoiseAreas(allAreas);

      const userName = localStorage.getItem('username') || 'Unknown';

      return {
        id: newArea.id,
        coordinates: [newArea.latitude, newArea.longitude] as [number, number],
        noiseLevel: newArea.noise_level,
        source: newArea.noise_source,
        healthImpact: newArea.health_impact,
        description: newArea.description,
        address: newArea.address,
        radius: newArea.radius,
        timestamp: new Date(newArea.created_at),
        userId: newArea.user_id,
        userName: userName,
        canDelete: true,
        expires_at: newArea.expires_at ? new Date(newArea.expires_at) : undefined,
      };
    } catch (error) {
      console.error("Error adding noise location:", error);
      throw error;
    }
  }

  async getNoiseLocations(): Promise<NoiseLocation[]> {
    try {
      const allAreas = loadAllNoiseAreas();
      const currentUserId = getCurrentUserId();
      return allAreas.map((area: any) => toNoiseLocation(area, currentUserId || undefined));
    } catch (error) {
      console.error("Error fetching noise locations:", error);
      return [];
    }
  }

  async getNoiseLocationById(id: string): Promise<NoiseLocation | null> {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User must be authenticated to fetch noise areas");

      const allAreas = loadAllNoiseAreas();
      const area = allAreas.find(a => a.id === id);

      if (!area) return null;

      return {
        id: area.id.toString(),
        coordinates: [area.latitude, area.longitude] as [number, number],
        noiseLevel: area.noise_level,
        source: area.noise_source,
        healthImpact: area.health_impact,
        description: area.description,
        address: area.address,
        radius: area.radius,
        timestamp: new Date(area.created_at),
        userId: area.user_id,
        userName: this.getUserNameFromStorage(area.user_id),
        canDelete: area.user_id === userId,
        expires_at: area.expires_at ? new Date(area.expires_at) : undefined,
      };
    } catch (error) {
      console.error("Error fetching noise location:", error);
      return null;
    }
  }

  async removeNoiseLocation(id: string): Promise<boolean> {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const userAreas = loadUserNoiseAreas(userId);
      const userIndex = userAreas.findIndex(area => area.id === id && area.user_id === userId);
      if (userIndex === -1) return false;

      userAreas.splice(userIndex, 1);
      saveUserNoiseAreas(userId, userAreas);

      const allAreas = loadAllNoiseAreas();
      const globalIndex = allAreas.findIndex(area => area.id === id && area.user_id === userId);
      if (globalIndex !== -1) {
        allAreas.splice(globalIndex, 1);
        saveAllNoiseAreas(allAreas);
      }

      return true;
    } catch (error) {
      console.error("Error removing noise location:", error);
      return false;
    }
  }

  async updateNoiseLocation(id: string, updates: Partial<NoiseLocation>): Promise<NoiseLocation | null> {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const updateData: any = {};

      if (updates.coordinates) {
        updateData.latitude = Number(updates.coordinates[0].toFixed(10));
        updateData.longitude = Number(updates.coordinates[1].toFixed(10));
      }
      if (updates.noiseLevel !== undefined) updateData.noise_level = updates.noiseLevel;
      if (updates.source !== undefined) updateData.noise_source = updates.source;
      if (updates.healthImpact !== undefined) updateData.health_impact = updates.healthImpact;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.radius !== undefined) updateData.radius = updates.radius;

      const userAreas = loadUserNoiseAreas(userId);
      const userIndex = userAreas.findIndex(area => area.id === id && area.user_id === userId);
      if (userIndex === -1) throw new Error("Area not found or access denied");

      Object.assign(userAreas[userIndex], updateData);
      saveUserNoiseAreas(userId, userAreas);

      const allAreas = loadAllNoiseAreas();
      const globalIndex = allAreas.findIndex(area => area.id === id && area.user_id === userId);
      if (globalIndex !== -1) {
        Object.assign(allAreas[globalIndex], updateData);
        saveAllNoiseAreas(allAreas);
      }

      const updatedArea = userAreas[userIndex];

      return {
        id: updatedArea.id,
        coordinates: [updatedArea.latitude, updatedArea.longitude] as [number, number],
        noiseLevel: updatedArea.noise_level,
        source: updatedArea.noise_source,
        healthImpact: updatedArea.health_impact,
        description: updatedArea.description,
        address: updatedArea.address,
        radius: updatedArea.radius,
        timestamp: new Date(updatedArea.created_at),
        userId: updatedArea.user_id,
        userName: this.getUserNameFromStorage(updatedArea.user_id),
        canDelete: true,
        expires_at: updatedArea.expires_at ? new Date(updatedArea.expires_at) : undefined,
      };
    } catch (error) {
      console.error("Error updating noise location:", error);
      return null;
    }
  }

  async updateNoiseLocationWithAudio(
    id: string,
    audioFile: File,
    updates: Partial<Omit<NoiseLocation, "noiseLevel" | "source" | "healthImpact">>
  ): Promise<NoiseLocation | null> {
    try {
      // Analysis using new module
      const { apiService } = await import('./api');
      const uploadResult = await apiService.uploadAudioFile(audioFile);
      const analysisResult = { predictions: uploadResult.predictions };

      if (!analysisResult.predictions) {
        throw new Error("Hasil analisis tidak valid");
      }

      let currentLocation;
      try {
        currentLocation = await this.getNoiseLocationById(id);
        if (!currentLocation) {
          throw new Error("Lokasi tidak ditemukan");
        }
      } catch (error) {
        currentLocation = {
          coordinates: updates.coordinates || [0, 0],
          address: updates.address || "Alamat tidak spesifik",
          radius: updates.radius || 100,
          description: "",
        };
      }

      const updateData: any = {
        noise_level: analysisResult.predictions.noise_level,
        noise_source: analysisResult.predictions.noise_source,
        health_impact: analysisResult.predictions.health_impact,
        latitude: updates.coordinates ? Number(updates.coordinates[0].toFixed(10)) : currentLocation.coordinates[0],
        longitude: updates.coordinates ? Number(updates.coordinates[1].toFixed(10)) : currentLocation.coordinates[1],
        address: updates.address || currentLocation.address,
        radius: updates.radius || currentLocation.radius,
        description: `${currentLocation.description} (Dianalisis ulang: ${new Date().toLocaleString()})`,
      };

      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const userAreas = loadUserNoiseAreas(userId);
      const userIndex = userAreas.findIndex(area => area.id === id && area.user_id === userId);
      if (userIndex === -1) throw new Error("Area not found or access denied");

      Object.assign(userAreas[userIndex], updateData);
      saveUserNoiseAreas(userId, userAreas);

      const allAreas = loadAllNoiseAreas();
      const globalIndex = allAreas.findIndex(area => area.id === id && area.user_id === userId);
      if (globalIndex !== -1) {
        Object.assign(allAreas[globalIndex], updateData);
        saveAllNoiseAreas(allAreas);
      }

      const updatedArea = userAreas[userIndex];

      // Refresh daily cache
      try {
        const { DailyAudioService } = await import("./dailyAudioService");
        await DailyAudioService.refreshTodayAudioSummary();
      } catch (cacheError) {
        console.warn("⚠️ Gagal refresh cache laporan harian:", cacheError);
      }

      return {
        id: updatedArea.id,
        coordinates: [updatedArea.latitude, updatedArea.longitude] as [number, number],
        noiseLevel: updatedArea.noise_level,
        source: updatedArea.noise_source,
        healthImpact: updatedArea.health_impact,
        description: updatedArea.description,
        address: updatedArea.address,
        radius: updatedArea.radius,
        timestamp: new Date(updatedArea.created_at),
        userId: updatedArea.user_id,
        userName: this.getUserNameFromStorage(updatedArea.user_id),
        canDelete: true,
        expires_at: updatedArea.expires_at ? new Date(updatedArea.expires_at) : undefined,
      };
    } catch (error) {
      console.error("Error during update with audio analysis:", error);
      throw error;
    }
  }

  async searchLocations(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      return data.map((item: any) => ({
        id: item.place_id.toString(),
        name: item.display_name,
        coordinates: [parseFloat(item.lat), parseFloat(item.lon)] as [number, number],
        address: item.display_name,
        type: item.type || "location",
      }));
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  }

  async getCurrentLocation(): Promise<[number, number] | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolokasi tidak didukung oleh browser ini"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          let errorMessage = "Gagal mendapatkan lokasi";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Informasi lokasi tidak tersedia. Pastikan GPS aktif.";
              break;
            case error.TIMEOUT:
              errorMessage = "Permintaan lokasi timeout. Coba lagi.";
              break;
            default:
              errorMessage = "Terjadi kesalahan saat mengakses lokasi.";
              break;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }

  async clearAllNoiseLocations(): Promise<boolean> {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      saveUserNoiseAreas(userId, []);

      const allAreas = loadAllNoiseAreas();
      const filteredAreas = allAreas.filter(area => area.user_id !== userId);
      saveAllNoiseAreas(filteredAreas);

      return true;
    } catch (error) {
      console.error("Error clearing noise locations:", error);
      return false;
    }
  }

  async exportNoiseData(): Promise<string | null> {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');
      return exportUserNoiseData(userId);
    } catch (error) {
      console.error("Error exporting noise data:", error);
      return null;
    }
  }

  // Shared data methods
  shareNoiseData(data: {
    analysis: PredictionResponse;
    position?: [number, number];
    address?: string;
  }) {
    this.sharedData = data;
  }

  getSharedNoiseData(): {
    analysis: PredictionResponse;
    position?: [number, number];
    address?: string;
  } | null {
    const data = this.sharedData;
    this.sharedData = null;
    return data;
  }

  // Helper method
  private getUserNameFromStorage(userId: string): string {
    const currentUserId = getCurrentUserId();
    if (userId === currentUserId) {
      return localStorage.getItem('username') || 'You';
    }
    return `User${userId.slice(-4)}`;
  }
}

export const mapService = new MapService();
