// src/services/mapService.ts
import { NoiseLocation, SearchResult } from '../types/mapTypes';
import { PredictionResult } from './api'; // Import PredictionResult type

class MapService {
  private noiseLocations: NoiseLocation[] = [];
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
  setAnalysisRequest(context: { position: [number, number]; address: string; }) {
    this.analysisRequestContext = context;
  }

  // NEW: Function for HomePage to retrieve and clear the request
  getAndClearAnalysisRequest(): { position: [number, number]; address: string; } | null {
    const context = this.analysisRequestContext;
    this.analysisRequestContext = null; // Clear after retrieval
    return context;
  }

  // Add noise analysis location
  addNoiseLocation(location: Omit<NoiseLocation, 'id' | 'timestamp'>): NoiseLocation {
    const newLocation: NoiseLocation = {
      ...location,
      id: this.generateId(),
      timestamp: new Date(),
    };
    
    this.noiseLocations.push(newLocation);
    return newLocation;
  }

  // Get all noise locations
  getNoiseLocations(): NoiseLocation[] {
    return [...this.noiseLocations];
  }

  // Get noise location by ID
  getNoiseLocationById(id: string): NoiseLocation | undefined {
    return this.noiseLocations.find(location => location.id === id);
  }

  // Remove noise location
  removeNoiseLocation(id: string): boolean {
    const index = this.noiseLocations.findIndex(location => location.id === id);
    if (index !== -1) {
      this.noiseLocations.splice(index, 1);
      return true;
    }
    return false;
  }

  // Update noise location
  updateNoiseLocation(id: string, updates: Partial<NoiseLocation>): NoiseLocation | null {
    const index = this.noiseLocations.findIndex(location => location.id === id);
    if (index !== -1) {
      this.noiseLocations[index] = { ...this.noiseLocations[index], ...updates };
      return this.noiseLocations[index];
    }
    return null;
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
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      
      return data.map((item: any) => ({
        id: item.place_id.toString(),
        name: item.display_name,
        coordinates: [parseFloat(item.lat), parseFloat(item.lon)] as [number, number],
        address: item.display_name,
        type: item.type || 'location',
      }));
    } catch (error) {
      console.error('Search error:', error);
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

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Clear all noise locations
  clearAllNoiseLocations(): void {
    this.noiseLocations = [];
  }

  // Export noise data
  exportNoiseData(): string {
    return JSON.stringify(this.noiseLocations, null, 2);
  }

  // Import noise data
  importNoiseData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (Array.isArray(data)) {
        this.noiseLocations = data.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  // UPDATED: Function to share analysis data back to the map
  shareNoiseData(data: { analysis: PredictionResult; position?: [number, number]; address?: string; }) {
    this.sharedData = data;
  }

  // UPDATED: Function for MapComponent to retrieve the shared data
  getSharedNoiseData(): { analysis: PredictionResult; position?: [number, number]; address?: string; } | null {
    const data = this.sharedData;
    this.sharedData = null; // Clear after retrieval
    return data;
  }
}

export const mapService = new MapService();