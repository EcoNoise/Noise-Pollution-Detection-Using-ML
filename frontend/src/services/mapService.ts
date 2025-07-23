// src/services/mapService.ts
import { NoiseLocation, SearchResult } from "../types/mapTypes";
import { PredictionResult } from "./api"; // Import PredictionResult type
import APIInterceptor from "../utils/apiInterceptor";

// API base URL
const API_BASE_URL = "http://localhost:8000/api";

// Get API interceptor instance
const apiInterceptor = APIInterceptor.getInstance();

// Helper function to make authenticated API calls
const apiCall = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  return apiInterceptor.fetch(`${API_BASE_URL}${url}`, options);
};

// Helper function to make public API calls (no auth required)
const publicApiCall = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  return apiInterceptor.fetchPublic(`${API_BASE_URL}${url}`, options);
};

class MapService {
  // UPDATED: More specific type for shared data
  private sharedData: {
    analysis: PredictionResult;
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
        'audio/wav', 'audio/mp3', 'audio/mpeg', 
        'audio/mp4', 'audio/m4a', 'audio/ogg',
        'audio/webm', 'audio/flac'
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
          `Ukuran file terlalu besar: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB. ` +
          `Maksimal ukuran file adalah 50MB.`
        );
      }

      console.log('🔍 File audio details:', {
        name: audioFile.name,
        type: audioFile.type,
        size: `${(audioFile.size / 1024 / 1024).toFixed(2)}MB`,
        lastModified: new Date(audioFile.lastModified)
      });

      // LANGKAH 1: Siapkan FormData dengan validasi
      const formData = new FormData();
      formData.append("audio_file", audioFile); // Gunakan nama field yang sesuai dengan backend
      
      // TAMBAHAN: Log untuk debugging
      console.log('📤 Mengirim request ke /audio/predict/ dengan file:', audioFile.name);

      // LANGKAH 2: Kirim request dengan error handling yang lebih detail
      const predictResponse = await apiCall("/audio/predict/", {
        method: "POST",
        body: formData,
      });

      console.log('📥 Response status:', predictResponse.status);

      if (!predictResponse.ok) {
        let errorMessage = "Analisis audio gagal";
        
        try {
          const errorData = await predictResponse.json();
          console.error('❌ Error detail dari server:', errorData);
          
          // Tangani berbagai jenis error dari server
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } catch (parseError) {
          // Jika response bukan JSON, coba ambil sebagai text
          try {
            const errorText = await predictResponse.text();
            console.error('❌ Error response (text):', errorText);
            errorMessage = `Server error: ${predictResponse.status} - ${errorText}`;
          } catch (textError) {
            errorMessage = `Server error: ${predictResponse.status} - ${predictResponse.statusText}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const response = await predictResponse.json();
      console.log('✅ Response analisis:', response);

      // VALIDASI 3: Periksa hasil analisis
      if (!response.predictions || !response.predictions.noise_level || !response.predictions.noise_source) {
        console.error('❌ Response tidak lengkap:', response);
        throw new Error("Hasil analisis tidak lengkap dari server");
      }
      
      const analysisResult = response.predictions;

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

      console.log('🗺️ Menambahkan lokasi ke peta:', newLocationData);

      const newLocation = await this.addNoiseLocation(newLocationData);
      
      if (!newLocation) {
        throw new Error("Berhasil menganalisis audio, tetapi gagal menyimpan lokasi ke peta");
      }

      console.log('✅ Lokasi berhasil ditambahkan:', newLocation);
      return newLocation;

    } catch (error) {
      console.error("❌ Error during analysis and add area process:", error);
      
      // Berikan pesan error yang lebih user-friendly
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
        } else if (error.message.includes('NetworkError')) {
          throw new Error("Terjadi kesalahan jaringan. Coba lagi dalam beberapa saat.");
        }
        throw error; // Re-throw error asli jika sudah jelas
      } else {
        throw new Error("Terjadi kesalahan tidak dikenal saat menganalisis audio.");
      }
    }
  }
  // UPDATED: Add noise location via API
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

      console.log("🔍 Data yang dikirim ke backend:", requestData);

      const response = await apiCall("/noise-areas/", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ Error response dari backend:", errorData);
        throw new Error("Failed to add noise area");
      }

      const data = await response.json();
      if (data.status === "success") {
        // Convert API response to NoiseLocation format
        const apiArea = data.area;
        return {
          id: apiArea.id.toString(),
          coordinates: [apiArea.latitude, apiArea.longitude] as [number, number],
          noiseLevel: apiArea.noise_level,
          source: apiArea.noise_source,
          healthImpact: apiArea.health_impact,
          description: apiArea.description,
          address: apiArea.address,
          radius: apiArea.radius,
          timestamp: new Date(apiArea.created_at),
          userId: apiArea.user_info?.id,
          userName: apiArea.user_info?.username,
          canDelete: apiArea.can_delete,
        };
      }
      return null;
    } catch (error) {
      console.error("Error adding noise location:", error);
      return null;
    }
  }

  // UPDATED: Get all noise locations from API
  async getNoiseLocations(): Promise<NoiseLocation[]> {
    try {
      // Gunakan apiCall (authenticated) untuk mendapatkan can_delete yang benar
      const response = await apiCall("/noise-areas/");

      if (!response.ok) {
        throw new Error("Failed to fetch noise areas");
      }

      const data = await response.json();
      if (data.status === "success") {
        // Convert API response to NoiseLocation format
        return data.areas.map((area: any) => ({
          id: area.id.toString(),
          coordinates: [area.latitude, area.longitude] as [number, number],    
          noiseLevel: area.noise_level,
          source: area.noise_source,
          healthImpact: area.health_impact,
          description: area.description,
          address: area.address,
          radius: area.radius,
          timestamp: new Date(area.created_at),
          userId: area.user_info?.id,
          userName: area.user_info?.username,
          canDelete: area.can_delete,
        }));
      }
      return [];
    } catch (error) {
      console.error("Error fetching noise locations:", error);
      // Fallback ke public call jika user belum login
      try {
        const response = await publicApiCall("/noise-areas/");
        if (!response.ok) {
          throw new Error("Failed to fetch noise areas");
        }
        const data = await response.json();
        if (data.status === "success") {
          return data.areas.map((area: any) => ({
            id: area.id.toString(),
            coordinates: [area.longitude, area.latitude] as [number, number],
            noiseLevel: area.noise_level,
            source: area.noise_source,
            healthImpact: area.health_impact,
            description: area.description,
            address: area.address,
            radius: area.radius,
            timestamp: new Date(area.created_at),
            userId: area.user_info?.id,
            userName: area.user_info?.username,
            canDelete: false, // Tidak bisa delete jika tidak login
          }));
        }
      } catch (fallbackError) {
        console.error("Error in fallback fetch:", fallbackError);
      }
      return [];
    }
  }

  // UPDATED: Get noise location by ID from API
  async getNoiseLocationById(id: string): Promise<NoiseLocation | null> {
    try {
      const response = await apiCall(`/noise-areas/${id}/`);

      if (!response.ok) {
        throw new Error("Failed to fetch noise area");
      }

      const data = await response.json();
      if (data.status === "success") {
        const area = data.area;
        return {
          id: area.id.toString(),
          coordinates: [area.longitude, area.latitude] as [number, number],
          noiseLevel: area.noise_level,
          source: area.noise_source, // Backend mengirim 'noise_source'
          healthImpact: area.health_impact,
          description: area.description,
          address: area.address,
          radius: area.radius,
          timestamp: new Date(area.created_at),
          userId: area.user_info?.id,
          userName: area.user_info?.username,
          canDelete: area.can_delete,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching noise location:", error);
      return null;
    }
  }

  // UPDATED: Remove noise location via API
  async removeNoiseLocation(id: string): Promise<boolean> {
    try {
      const response = await apiCall(`/noise-areas/${id}/`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete noise area");
      }

      const data = await response.json();
      return data.status === "success";
    } catch (error) {
      console.error("Error removing noise location:", error);
      return false;
    }
  }

  // UPDATED: Update noise location via API
  async updateNoiseLocation(
    id: string,
    updates: Partial<NoiseLocation>
  ): Promise<NoiseLocation | null> {
    try {
      const updateData: any = {};

      if (updates.coordinates) {
        updateData.latitude = Number(updates.coordinates[1].toFixed(10)); // Bulatkan ke 10 decimal places
        updateData.longitude = Number(updates.coordinates[0].toFixed(10)); // Bulatkan ke 10 decimal places
      }
      if (updates.noiseLevel !== undefined)
        updateData.noise_level = updates.noiseLevel;
      if (updates.source !== undefined)
        updateData.noise_source = updates.source; // Backend mengharapkan 'noise_source'
      if (updates.healthImpact !== undefined)
        updateData.health_impact = updates.healthImpact;
      if (updates.description !== undefined)
        updateData.description = updates.description;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.radius !== undefined) updateData.radius = updates.radius;

      const response = await apiCall(`/areas/${id}/`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update noise area");
      }

      const data = await response.json();
      if (data.status === "success") {
        const area = data.area;
        return {
          id: area.id.toString(),
          coordinates: [area.longitude, area.latitude] as [number, number],
          noiseLevel: area.noise_level,
          source: area.noise_source, // Backend mengirim 'noise_source'
          healthImpact: area.health_impact,
          description: area.description,
          address: area.address,
          radius: area.radius,
          timestamp: new Date(area.created_at),
          userId: area.user_info?.id,
          userName: area.user_info?.username,
          canDelete: area.can_delete,
        };
      }
      return null;
    } catch (error) {
      console.error("Error updating noise location:", error);
      return null;
    }
  }
    async updateNoiseLocationWithAudio(
    id: string,
    audioFile: File,
    updates: Partial<Omit<NoiseLocation, 'noiseLevel' | 'source' | 'healthImpact'>> // Exclude analysis fields from updates
  ): Promise<NoiseLocation | null> {
    try {
      // Langkah 1: Upload audio baru untuk dianalisis ulang
      const formData = new FormData();
      formData.append("audio_file", audioFile);
      
      const predictResponse = await apiCall("/audio/predict/", {  // ✅ BENAR
        method: "POST",
        body: formData,
      });

      if (!predictResponse.ok) {
        const errorData = await predictResponse.json();
        throw new Error(errorData.detail || "Analisis audio ulang gagal");
      }

      const analysisResult: PredictionResult = await predictResponse.json();

      // Langkah 2: Gabungkan hasil analisis dengan data pembaruan lainnya
      const updateData: any = {
        // Data dari hasil analisis audio baru
        noise_level: analysisResult.noise_level,
        noise_source: analysisResult.noise_source,
        health_impact: analysisResult.health_impact,
        description: updates.description || `Analisis ulang dari file: ${audioFile.name}`, // Deskripsi default
        
        // Data pembaruan lainnya jika ada
        ...(updates.coordinates && { 
            latitude: Number(updates.coordinates[1].toFixed(10)), 
            longitude: Number(updates.coordinates[0].toFixed(10))
        }),
        ...(updates.address && { address: updates.address }),
        ...(updates.radius && { radius: updates.radius }),
      };
      
      // Langkah 3: Kirim pembaruan ke backend menggunakan method PUT
      const response = await apiCall(`/areas/${id}/`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Gagal memperbarui lokasi noise setelah analisis ulang");
      }

      const data = await response.json();
      if (data.status === "success") {
        const area = data.area;
        // Kembalikan data lokasi yang sudah diperbarui
        return {
          id: area.id.toString(),
          coordinates: [area.longitude, area.latitude],
          noiseLevel: area.noise_level,
          source: area.noise_source,
          healthImpact: area.health_impact,
          description: area.description,
          address: area.address,
          radius: area.radius,
          timestamp: new Date(area.created_at),
          userId: area.user_info?.id,
          userName: area.user_info?.username,
          canDelete: area.can_delete,
        };
      }
      return null;
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
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }

  // UPDATED: Clear all noise locations (only user's own areas)
  async clearAllNoiseLocations(): Promise<boolean> {
    try {
      // Get user's areas first
      const response = await apiCall("/my-noise-areas/");

      if (!response.ok) {
        throw new Error("Failed to fetch user areas");
      }

      const data = await response.json();
      if (data.status === "success") {
        // Delete each area
        const deletePromises = data.areas.map((area: any) =>
          this.removeNoiseLocation(area.id.toString())
        );

        const results = await Promise.all(deletePromises);
        return results.every((result) => result === true);
      }
      return false;
    } catch (error) {
      console.error("Error clearing noise locations:", error);
      return false;
    }
  }

  // UPDATED: Export noise data (user's own areas)
  async exportNoiseData(): Promise<string | null> {
    try {
      const response = await apiCall("/areas/my/");

      if (!response.ok) {
        throw new Error("Failed to fetch user areas");
      }

      const data = await response.json();
      if (data.status === "success") {
        return JSON.stringify(data.areas, null, 2);
      }
      return null;
    } catch (error) {
      console.error("Error exporting noise data:", error);
      return null;
    }
  }

  // Import noise data - removed as it's not practical with backend storage
  // Users should add areas individually through the UI

  // UPDATED: Function to share analysis data back to the map
  shareNoiseData(data: {
    analysis: PredictionResult;
    position?: [number, number];
    address?: string;
  }) {
    this.sharedData = data;
  }

  // UPDATED: Function for MapComponent to retrieve the shared data
  getSharedNoiseData(): {
    analysis: PredictionResult;
    position?: [number, number];
    address?: string;
  } | null {
    const data = this.sharedData;
    this.sharedData = null; // Clear after retrieval
    return data;
  }
}

export const mapService = new MapService();
