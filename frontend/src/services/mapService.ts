// src/services/mapService.ts
import { NoiseLocation, SearchResult } from "../types/mapTypes";
import { PredictionResponse } from "./api";
import { repository, getCurrentUserId as repoGetUserId } from "./map.repository";
import { toNoiseLocation, generateId, deriveFinalCategory } from "./map.transformers";
import { analyzeAudioFile } from "./map.analysis";
import { exportUserNoiseData } from "./map.export";
import { logger, appConfig } from "../config/appConfig";
import { supabase } from "../config/supabaseConfig";

// Helper functions
const getCurrentUserId = (): string | null => repoGetUserId();
const loadUserNoiseAreas = (userId: string): any[] => repository.loadUserNoiseAreas(userId);
const saveUserNoiseAreas = (userId: string, areas: any[]) => repository.saveUserNoiseAreas(userId, areas);
const loadAllNoiseAreas = (): any[] => repository.loadAllNoiseAreas();
const saveAllNoiseAreas = (areas: any[]) => repository.saveAllNoiseAreas(areas);

class MapService {
  private sharedData: {
    analysis: PredictionResponse;
    position?: [number, number];
    address?: string;
  } | null = null;

  private analysisRequestContext: {
    position: [number, number];
    address: string;
  } | null = null;

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

      return newLocation;
    } catch (error) {
      logger.error("Error analyzing audio:", error);
      if (error instanceof Error) {
        throw error;
      }
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

      // Tentukan final_category dan expires_at sesuai aturan di map.md (Bagian 2)
      const finalCategory = deriveFinalCategory(requestData.noise_source);
      const now = new Date();
      const addDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      const expiresAt: Date | null = (() => {
        switch (finalCategory) {
          case "Event":
            return addDays(1);
          case "Construction":
            return addDays(14);
          case "Traffic":
            return addDays(3);
          case "Industry":
            return addDays(90);
          case "Nature":
            return addDays(7);
          case "Other":
          default:
            return addDays(7);
        }
      })();

      // Backend path (Supabase)
      if (appConfig.backendEnabled) {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          logger.error("Supabase auth error:", authError);
        }
        const userId = userData?.user?.id;
        if (!userId) throw new Error("User must be authenticated to add noise areas");

        // Prevent duplicates at same exact lat/lng for same user (optional best-effort check)
        const nowIso = new Date().toISOString();
        const { data: dupCheck } = await supabase
          .from("noise_areas")
          .select("id")
          .eq("user_id", userId)
          .eq("latitude", requestData.latitude)
          .eq("longitude", requestData.longitude)
          .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
          .limit(1);
        if (dupCheck && dupCheck.length > 0) {
          throw new Error("Koordinat sudah digunakan, pilih lokasi lain");
        }

        const { data, error } = await supabase
          .from("noise_areas")
          .insert({
            user_id: userId,
            ...requestData,
            final_category: finalCategory,
            expires_at: expiresAt ? expiresAt.toISOString() : null,
          })
          .select("*")
          .single();

        if (error) {
          logger.error("Failed to insert noise area:", error);
          throw new Error(error.message || "Gagal menyimpan area kebisingan");
        }

        // Fetch username from profiles for nicer display (falls back if not available)
        let userName: string | undefined = undefined;
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username")
            .eq("id", userId)
            .maybeSingle();
          if (profile?.username) userName = profile.username;
        } catch (e) {
          logger.warn?.("Unable to fetch username after insert", e);
        }

        const currentUserId = userId;
        const locationObj = toNoiseLocation({ ...data, userName }, currentUserId);
        return locationObj;
      }

      // Fallback: LocalStorage path
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
        final_category: finalCategory,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
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
        final_category: newArea.final_category,
      };
    } catch (error) {
      logger.error("Error adding noise location:", error);
      throw error;
    }
  }

  async getNoiseLocations(): Promise<NoiseLocation[]> {
    try {
      if (appConfig.backendEnabled) {
        const nowIso = new Date().toISOString();
        const { data, error } = await supabase
          .from("noise_areas")
          .select("*")
          .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
          .order("created_at", { ascending: false });
        if (error) {
          logger.error("Failed to fetch noise areas:", error);
          return [];
        }

        // Fetch usernames for involved user_ids from profiles (publicly readable when active)
        const userIds = Array.from(new Set((data || []).map((a: any) => a.user_id).filter(Boolean)));
        let usernameMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesErr } = await supabase
            .from("profiles")
            .select("id, username")
            .in("id", userIds);
          if (profilesErr) {
            logger.error("Failed to fetch profiles for usernames:", profilesErr);
          } else if (profilesData) {
            usernameMap = Object.fromEntries(profilesData.map((p: any) => [p.id, p.username]));
          }
        }

        const { data: userData } = await supabase.auth.getUser();
        const currentUserId = userData?.user?.id;
        return (data || []).map((area: any) =>
          toNoiseLocation(
            { ...area, userName: usernameMap[area.user_id] },
            currentUserId
          )
        );
      }
      const allAreas = loadAllNoiseAreas();
      const currentUserId = getCurrentUserId();
      return allAreas.map((area: any) => toNoiseLocation(area, currentUserId || undefined));
    } catch (error) {
      logger.error("Error fetching noise locations:", error);
      return [];
    }
  }

  async getNoiseLocationById(id: string): Promise<NoiseLocation | null> {
    try {
      if (appConfig.backendEnabled) {
        const { data, error } = await supabase
          .from("noise_areas")
          .select("*")
          .eq("id", id)
          .single();
        if (error) {
          logger.error("Failed to fetch noise area by id:", error);
          return null;
        }
        // Enrich with username
        let userName: string | undefined = undefined;
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username")
            .eq("id", data.user_id)
            .maybeSingle();
          if (profile?.username) userName = profile.username;
        } catch (e) {
          logger.warn?.("Unable to fetch username for area", e);
        }
        const { data: userData } = await supabase.auth.getUser();
        const currentUserId = userData?.user?.id;
        return toNoiseLocation({ ...data, userName }, currentUserId);
      }

      const userId = getCurrentUserId();
      if (!userId) throw new Error("User must be authenticated to fetch noise areas");

      const allAreas = loadAllNoiseAreas();
      const area = allAreas.find(a => a.id === id);
      if (!area) return null;
      return toNoiseLocation(area, userId);
    } catch (error) {
      logger.error("Error fetching noise location by id:", error);
      return null;
    }
  }

  async removeNoiseLocation(id: string): Promise<boolean> {
    try {
      if (appConfig.backendEnabled) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) throw new Error('User not authenticated');
        const { error } = await supabase
          .from("noise_areas")
          .delete()
          .eq("id", id);
        if (error) {
          logger.error("Failed to delete noise area:", error);
          return false;
        }
        return true;
      }

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
      logger.error("Error removing noise location:", error);
      return false;
    }
  }

  async updateNoiseLocation(id: string, updates: Partial<NoiseLocation>): Promise<NoiseLocation | null> {
    try {
      if (appConfig.backendEnabled) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) throw new Error('User not authenticated');

        const payload: any = {};
        if (updates.coordinates) {
          payload.latitude = updates.coordinates[0];
          payload.longitude = updates.coordinates[1];
        }
        if (typeof updates.noiseLevel === 'number') payload.noise_level = updates.noiseLevel;
        if (typeof updates.source === 'string') payload.noise_source = updates.source;
        if (typeof updates.healthImpact === 'string') payload.health_impact = updates.healthImpact;
        if (typeof updates.description === 'string') payload.description = updates.description;
        if (typeof updates.address === 'string') payload.address = updates.address;
        if (typeof updates.radius === 'number') payload.radius = updates.radius;

        const { data, error } = await supabase
          .from("noise_areas")
          .update(payload)
          .eq("id", id)
          .select("*")
          .single();

        if (error) {
          logger.error("Failed to update noise area:", error);
          return null;
        }
        const currentUserId = userData.user.id;
        return toNoiseLocation(data, currentUserId);
      }

      // Local fallback not implemented for update in legacy flow (kept minimal)
      const current = await this.getNoiseLocationById(id);
      if (!current) return null;
      const merged: NoiseLocation = { ...current, ...updates } as NoiseLocation;
      return merged;
    } catch (error) {
      logger.error("Error updating noise location:", error);
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
        } as any;
      }

      const updateData: any = {
        noise_level: analysisResult.predictions.noise_level,
        noise_source: analysisResult.predictions.noise_source,
        health_impact: analysisResult.predictions.health_impact,
        latitude: updates.coordinates ? Number(updates.coordinates[0].toFixed(10)) : currentLocation.coordinates[0],
        longitude: updates.coordinates ? Number(updates.coordinates[1].toFixed(10)) : currentLocation.coordinates[1],
      };

      if (appConfig.backendEnabled) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from("noise_areas")
          .update(updateData)
          .eq("id", id)
          .select("*")
          .single();
        if (error) {
          logger.error("Failed to update noise area with audio:", error);
          return null;
        }
        return toNoiseLocation(data, userData.user.id);
      }

      // Local fallback (no persistent update to local storage for brevity)
      return {
        id,
        coordinates: [updateData.latitude, updateData.longitude],
        noiseLevel: updateData.noise_level,
        source: updateData.noise_source,
        healthImpact: updateData.health_impact,
        description: currentLocation.description,
        address: currentLocation.address,
        radius: currentLocation.radius,
        timestamp: currentLocation.timestamp || new Date(),
        userId: currentLocation.userId,
        userName: currentLocation.userName,
        canDelete: currentLocation.canDelete,
      } as NoiseLocation;
    } catch (error) {
      logger.error("Error updating noise location with audio:", error);
      return null;
    }
  }

  async searchLocations(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`
      );
      const results = await response.json();
      return (results || []).map((item: any) => ({
        id: item.place_id.toString(),
        name: item.display_name,
        coordinates: [parseFloat(item.lat), parseFloat(item.lon)] as [number, number],
        address: item.display_name,
        type: item.type || "unknown",
      }));
    } catch (error) {
      logger.error("Error searching locations:", error);
      return [];
    }
  }

  async getCurrentLocation(): Promise<[number, number] | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolokasi tidak didukung oleh browser Anda."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          let errorMessage = "";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Izin lokasi ditolak. Mohon aktifkan di pengaturan browser.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Informasi lokasi tidak tersedia.";
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
      if (appConfig.backendEnabled) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) throw new Error('User not authenticated');
        const { error } = await supabase
          .from("noise_areas")
          .delete()
          .eq("user_id", userData.user.id);
        if (error) {
          logger.error("Failed to clear user noise areas:", error);
          return false;
        }
        return true;
      }

      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      saveUserNoiseAreas(userId, []);

      const allAreas = loadAllNoiseAreas();
      const filteredAreas = allAreas.filter(area => area.user_id !== userId);
      saveAllNoiseAreas(filteredAreas);

      return true;
    } catch (error) {
      logger.error("Error clearing noise locations:", error);
      return false;
    }
  }

  async exportNoiseData(): Promise<string | null> {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');
      return exportUserNoiseData(userId);
    } catch (error) {
      logger.error("Error exporting noise data:", error);
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
