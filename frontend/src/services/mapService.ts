// src/services/mapService.ts
import { NoiseLocation, SearchResult } from "../types/mapTypes";
import { PredictionResponse } from "./api"; // Import PredictionResponse type

// Helper for auth and storage
const getCurrentUserId = (): string | null => localStorage.getItem('userId');
const noiseAreasKey = (userId: string) => `noise_areas_${userId}`;
const globalNoiseAreasKey = 'all_noise_areas';

// Mock storage helpers
const loadUserNoiseAreas = (userId: string): any[] => {
  const raw = localStorage.getItem(noiseAreasKey(userId));
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};

const saveUserNoiseAreas = (userId: string, areas: any[]) => {
  localStorage.setItem(noiseAreasKey(userId), JSON.stringify(areas));
};

const loadAllNoiseAreas = (): any[] => {
  const raw = localStorage.getItem(globalNoiseAreasKey);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};

const saveAllNoiseAreas = (areas: any[]) => {
  localStorage.setItem(globalNoiseAreasKey, JSON.stringify(areas));
};

// Generate unique ID
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

class MapService {
  // UPDATED: More specific type for shared data
  private sharedData: {
    analysis: PredictionResponse;
    position?: [number, number];
    address?: string;
  } | null = null;

  // NEW: Property to hold the analysis request context from the map
  private analysisRequestContext: {
    position: [number, number];
    address: string;
  } | null = null;

  // NEW: Function to set the analysis request context before navigating to HomePage
  setAnalysisRequest(context: { position: [number, number]; address: string }) {
    this.analysisRequestContext = context;
  }

  // NEW: Function for HomePage to retrieve and clear the request
  getAndClearAnalysisRequest(): {
    position: [number, number];
    address: string;
  } | null {
    const context = this.analysisRequestContext;
    this.analysisRequestContext = null; // Clear after retrieval
    return context;
  }
  async analyzeAudioAndAddArea(
    audioFile: File,
    position: [number, number],
    address: string,
    description: string
  ): Promise<NoiseLocation | null> {
    try {
      // VALIDASI 1: Periksa format file audio
      const allowedTypes = [
        "audio/wav",
        "audio/mp3",
        "audio/mpeg",
        "audio/mp4",
        "audio/m4a",
        "audio/ogg",
        "audio/webm",
        "audio/flac",
      ];

      if (!allowedTypes.includes(audioFile.type)) {
        throw new Error(
          `Format file tidak didukung: ${audioFile.type}. ` +
            `Format yang didukung: WAV, MP3, M4A, OGG, WebM, FLAC`
        );
      }

      // VALIDASI 2: Periksa ukuran file (maksimal 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB dalam bytes
      if (audioFile.size > maxSize) {
        throw new Error(
          `Ukuran file terlalu besar: ${(audioFile.size / 1024 / 1024).toFixed(
            1
          )}MB. ` + `Maksimal ukuran file adalah 50MB.`
        );
      }

      console.log("🔍 File audio details:", {
        name: audioFile.name,
        type: audioFile.type,
        size: `${(audioFile.size / 1024 / 1024).toFixed(2)}MB`,
        lastModified: new Date(audioFile.lastModified),
      });

      // LANGKAH 1: Analisis audio menggunakan TensorFlow.js
      console.log(
        "📤 Menganalisis audio dengan TensorFlow.js:",
        audioFile.name
      );

      // LANGKAH 2: Gunakan apiService untuk analisis audio
      const { apiService } = await import('./api');
      const uploadResult = await apiService.uploadAudioFile(audioFile);
      
      if (uploadResult.status === "error") {
        throw new Error("Analisis audio gagal");
      }

      console.log("✅ Response analisis:", uploadResult);

      // VALIDASI 3: Periksa hasil analisis
      if (
        !uploadResult.predictions ||
        !uploadResult.predictions.noise_level ||
        !uploadResult.predictions.noise_source
      ) {
        console.error("❌ Response tidak lengkap:", uploadResult);
        throw new Error("Hasil analisis tidak lengkap dari TensorFlow.js");
      }

      const analysisResult = uploadResult.predictions;

      // LANGKAH 3: Tambahkan lokasi noise dengan hasil analisis
      const newLocationData = {
        coordinates: position,
        noiseLevel: analysisResult.noise_level,
        source: analysisResult.noise_source,
        healthImpact: analysisResult.health_impact || "Tidak diketahui",
        description: description || `Analisis dari file: ${audioFile.name}`,
        address: address || "Alamat tidak spesifik",
        radius: 100, // Radius default
      };

      console.log("🗺️ Menambahkan lokasi ke peta:", newLocationData);

      const newLocation = await this.addNoiseLocation(newLocationData);

      if (!newLocation) {
        throw new Error(
          "Berhasil menganalisis audio, tetapi gagal menyimpan lokasi ke peta"
        );
      }

      console.log("✅ Lokasi berhasil ditambahkan:", newLocation);

      // PERBAIKAN: Refresh cache laporan harian setelah analisis berhasil
      try {
        const { DailyAudioService } = await import("./dailyAudioService");
        await DailyAudioService.refreshTodayAudioSummary();
        console.log("🔄 Cache laporan harian telah di-refresh");
      } catch (cacheError) {
        console.warn("⚠️ Gagal refresh cache laporan harian:", cacheError);
      }

      return newLocation;
    } catch (error) {
      console.error("❌ Error during analysis and add area process:", error);

      // Berikan pesan error yang lebih user-friendly
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          throw new Error(
            "Tidak dapat terhubung ke server. Periksa koneksi internet Anda."
          );
        } else if (error.message.includes("NetworkError")) {
          throw new Error(
            "Terjadi kesalahan jaringan. Coba lagi dalam beberapa saat."
          );
        }
        throw error; // Re-throw error asli jika sudah jelas
      } else {
        throw new Error(
          "Terjadi kesalahan tidak dikenal saat menganalisis audio."
        );
      }
    }
  }

  // Add noise location via localStorage
  async addNoiseLocation(
    location: Omit<NoiseLocation, "id" | "timestamp">
  ): Promise<NoiseLocation | null> {
    try {
      console.log("Received coordinates:", location.coordinates);
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

      console.log("🔍 Data yang dikirim ke storage:", requestData);

      // Get current user
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User must be authenticated to add noise areas");

      // Check for duplicate coordinates (mock)
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

      // Add to both user storage and global storage
      const userAreas = loadUserNoiseAreas(userId);
      userAreas.push(newArea);
      saveUserNoiseAreas(userId, userAreas);

      allAreas.push(newArea);
      saveAllNoiseAreas(allAreas);

      // Get username from localStorage
      const userName = localStorage.getItem('username') || 'Unknown';

      // Convert to NoiseLocation format
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

  // Get all noise locations from localStorage
  async getNoiseLocations(): Promise<NoiseLocation[]> {
    try {
      const allAreas = loadAllNoiseAreas();
      const currentUserId = getCurrentUserId();

      // Convert to NoiseLocation format
      return allAreas.map((area: any) => ({
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
        canDelete: area.user_id === currentUserId,
        expires_at: area.expires_at ? new Date(area.expires_at) : undefined,
      }));
    } catch (error) {
      console.error("Error fetching noise locations:", error);
      return [];
    }
  }

  // Helper to get username from storage or generate one
  private getUserNameFromStorage(userId: string): string {
    // Try to get from current user if it's the same
    const currentUserId = getCurrentUserId();
    if (userId === currentUserId) {
      return localStorage.getItem('username') || 'You';
    }
    // For other users, generate a generic name
    return `User${userId.slice(-4)}`;
  }

  // Get noise location by ID from localStorage
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

  // Remove noise location from localStorage
  async removeNoiseLocation(id: string): Promise<boolean> {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // Remove from user storage
      const userAreas = loadUserNoiseAreas(userId);
      const userIndex = userAreas.findIndex(area => area.id === id && area.user_id === userId);
      if (userIndex === -1) return false;

      userAreas.splice(userIndex, 1);
      saveUserNoiseAreas(userId, userAreas);

      // Remove from global storage
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

  // Update noise location using localStorage
  async updateNoiseLocation(
    id: string,
    updates: Partial<NoiseLocation>
  ): Promise<NoiseLocation | null> {
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

      // Update in user storage
      const userAreas = loadUserNoiseAreas(userId);
      const userIndex = userAreas.findIndex(area => area.id === id && area.user_id === userId);
      if (userIndex === -1) throw new Error("Area not found or access denied");

      Object.assign(userAreas[userIndex], updateData);
      saveUserNoiseAreas(userId, userAreas);

      // Update in global storage
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
    updates: Partial<
      Omit<NoiseLocation, "noiseLevel" | "source" | "healthImpact">
    > // Exclude analysis fields from updates
  ): Promise<NoiseLocation | null> {
    try {
      console.log("🔄 Memulai analisis ulang untuk area:", id);
      console.log(
        "📁 File audio:",
        audioFile.name,
        audioFile.type,
        `${(audioFile.size / 1024 / 1024).toFixed(2)}MB`
      );

      // Langkah 1: Analisis audio menggunakan TensorFlow.js
      const { apiService } = await import('./api');
      const uploadResult = await apiService.uploadAudioFile(audioFile);
      const analysisResult = {
        predictions: uploadResult.predictions
      };
      
      console.log("📥 Hasil analisis:", analysisResult);

      if (!analysisResult.predictions) {
        throw new Error("Hasil analisis tidak valid");
      }

      // Langkah 2: Gabungkan hasil analisis dengan data pembaruan lainnya
      console.log("Memproses hasil analisis untuk update:", analysisResult);

      // Pastikan predictions ada dan valid
      if (!analysisResult.predictions) {
        console.error(
          "❌ Hasil analisis tidak memiliki predictions:",
          analysisResult
        );
        throw new Error("Hasil analisis tidak valid");
      }

      let currentLocation;
      try {
        // Dapatkan data lokasi saat ini
        currentLocation = await this.getNoiseLocationById(id);
        if (!currentLocation) {
          throw new Error("Lokasi tidak ditemukan");
        }
      } catch (error) {
        console.error("Error saat mengambil data lokasi:", error);
        // Lanjutkan dengan data minimal yang diperlukan
        currentLocation = {
          coordinates: updates.coordinates || [0, 0],
          address: updates.address || "Alamat tidak spesifik",
          radius: updates.radius || 100,
          description: "",
        };
      }

      const updateData: any = {
        // Data baru dari hasil analisis
        noise_level: analysisResult.predictions.noise_level,
        noise_source: analysisResult.predictions.noise_source,
        health_impact: analysisResult.predictions.health_impact,

        // Gunakan koordinat yang ada jika tidak ada yang baru
        latitude: updates.coordinates
          ? Number(updates.coordinates[0].toFixed(10))
          : currentLocation.coordinates[0],
        longitude: updates.coordinates
          ? Number(updates.coordinates[1].toFixed(10))
          : currentLocation.coordinates[1],

        // Gunakan data yang ada jika tidak ada yang baru
        address: updates.address || currentLocation.address,
        radius: updates.radius || currentLocation.radius,

        // Update deskripsi dengan informasi analisis baru
        description: `${
          currentLocation.description
        } (Dianalisis ulang: ${new Date().toLocaleString()})`,
      };

      console.log("📤 Data yang akan dikirim untuk update:", updateData);

      // Langkah 3: Update ke localStorage
      console.log("Mengirim update ke storage...");
      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // Update in user storage
      const userAreas = loadUserNoiseAreas(userId);
      const userIndex = userAreas.findIndex(area => area.id === id && area.user_id === userId);
      if (userIndex === -1) throw new Error("Area not found or access denied");

      Object.assign(userAreas[userIndex], updateData);
      saveUserNoiseAreas(userId, userAreas);

      // Update in global storage
      const allAreas = loadAllNoiseAreas();
      const globalIndex = allAreas.findIndex(area => area.id === id && area.user_id === userId);
      if (globalIndex !== -1) {
        Object.assign(allAreas[globalIndex], updateData);
        saveAllNoiseAreas(allAreas);
      }

      const updatedArea = userAreas[userIndex];

      // Pastikan lokasi berhasil diupdate
      const updatedLocation = {
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

      console.log("✅ Berhasil memperbarui lokasi:", updatedLocation);

      // PERBAIKAN: Refresh cache laporan harian setelah analisis ulang berhasil
      try {
        const { DailyAudioService } = await import("./dailyAudioService");
        await DailyAudioService.refreshTodayAudioSummary();
        console.log(
          "🔄 Cache laporan harian telah di-refresh setelah analisis ulang"
        );
      } catch (cacheError) {
        console.warn("⚠️ Gagal refresh cache laporan harian:", cacheError);
      }

      return updatedLocation;
    } catch (error) {
      console.error("Error during update with audio analysis:", error);
      throw error; // Lempar error agar bisa ditangani di komponen UI
    }
  }

  // Search locations using Nominatim (OpenStreetMap)
  async searchLocations(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1`
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      return data.map((item: any) => ({
        id: item.place_id.toString(),
        name: item.display_name,
        coordinates: [parseFloat(item.lat), parseFloat(item.lon)] as [
          number,
          number
        ],
        address: item.display_name,
        type: item.type || "location",
      }));
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  }

  // Get current location
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
              errorMessage =
                "Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage =
                "Informasi lokasi tidak tersedia. Pastikan GPS aktif.";
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
          timeout: 10000, // Kurangi timeout menjadi 10 detik
          maximumAge: 60000, // Izinkan cache lokasi hingga 1 menit
        }
      );
    });
  }

  // Clear all noise locations (only user's own areas) using localStorage
  async clearAllNoiseLocations(): Promise<boolean> {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // Clear user storage
      saveUserNoiseAreas(userId, []);

      // Remove user's areas from global storage
      const allAreas = loadAllNoiseAreas();
      const filteredAreas = allAreas.filter(area => area.user_id !== userId);
      saveAllNoiseAreas(filteredAreas);

      return true;
    } catch (error) {
      console.error("Error clearing noise locations:", error);
      return false;
    }
  }

  // Export noise data (user's own areas) using localStorage
  async exportNoiseData(): Promise<string | null> {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const userAreas = loadUserNoiseAreas(userId);
      return JSON.stringify(userAreas, null, 2);
    } catch (error) {
      console.error("Error exporting noise data:", error);
      return null;
    }
  }

  // Import noise data - removed as it's not practical with server storage
  // Users should add areas individually through the UI

  // UPDATED: Function to share analysis data back to the map
  shareNoiseData(data: {
    analysis: PredictionResponse;
    position?: [number, number];
    address?: string;
  }) {
    this.sharedData = data;
  }

  // UPDATED: Function for MapComponent to retrieve the shared data
  getSharedNoiseData(): {
    analysis: PredictionResponse;
    position?: [number, number];
    address?: string;
  } | null {
    const data = this.sharedData;
    this.sharedData = null; // Clear after retrieval
    return data;
  }
}

export const mapService = new MapService();
