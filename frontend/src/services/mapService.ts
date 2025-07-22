// src/services/mapService.ts
import { NoiseLocation, SearchResult } from "../types/mapTypes";
import { PredictionResult } from "./api"; // Import PredictionResult type

// API base URL
const API_BASE_URL = "http://localhost:8000/api";

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem("accessToken");
};

// Helper function to make authenticated API calls
const apiCall = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });
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

  // UPDATED: Add noise location via API
  async addNoiseLocation(
    location: Omit<NoiseLocation, "id" | "timestamp">
  ): Promise<NoiseLocation | null> {
    try {
      const requestData = {
        latitude: location.coordinates[1],  // coordinates[1] adalah latitude
        longitude: location.coordinates[0], // coordinates[0] adalah longitude
        noise_level: location.noiseLevel,
        noise_source: location.source,     // Backend mengharapkan 'noise_source'
        health_impact: location.healthImpact,
        description: location.description || "",
        address: location.address || "",
        radius: location.radius || 100,
      };
      
      console.log("🔍 Data yang dikirim ke backend:", requestData);
      
      const response = await apiCall("/areas/", {
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
          coordinates: [apiArea.longitude, apiArea.latitude] as [
            number,
            number
          ],
          noiseLevel: apiArea.noise_level,
          source: apiArea.noise_source,  // Backend mengirim 'noise_source'
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
      const response = await apiCall("/areas/");

      if (!response.ok) {
        throw new Error("Failed to fetch noise areas");
      }

      const data = await response.json();
      if (data.status === "success") {
        // Convert API response to NoiseLocation format
        return data.areas.map((area: any) => ({
          id: area.id.toString(),
          coordinates: [area.longitude, area.latitude] as [number, number],
          noiseLevel: area.noise_level,
          source: area.noise_source,  // Backend mengirim 'noise_source'
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
      return [];
    }
  }

  // UPDATED: Get noise location by ID from API
  async getNoiseLocationById(id: string): Promise<NoiseLocation | null> {
    try {
      const response = await apiCall(`/areas/${id}/`);

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
          source: area.noise_source,  // Backend mengirim 'noise_source'
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
      const response = await apiCall(`/areas/${id}/`, {
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
        updateData.latitude = updates.coordinates[1];   // coordinates[1] adalah latitude
        updateData.longitude = updates.coordinates[0];  // coordinates[0] adalah longitude
      }
      if (updates.noiseLevel !== undefined)
        updateData.noise_level = updates.noiseLevel;
      if (updates.source !== undefined) 
        updateData.noise_source = updates.source;       // Backend mengharapkan 'noise_source'
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
          source: area.noise_source,  // Backend mengirim 'noise_source'
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
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }

  // UPDATED: Clear all noise locations (only user's own areas)
  async clearAllNoiseLocations(): Promise<boolean> {
    try {
      // Get user's areas first
      const response = await apiCall("/areas/my/");

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
