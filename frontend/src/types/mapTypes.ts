// src/types/mapTypes.ts
export interface NoiseLocation {
  id: string;
  coordinates: [number, number]; // Changed from separate latitude/longitude to coordinates array
  noiseLevel: number;
  source: string; // Added source field
  healthImpact: string; // Added health impact field
  description?: string;
  address?: string; // Added address field
  timestamp: Date;
  radius?: number;
  color?: string;
  userId?: string; // Added user ID field
  userName?: string; // Added user name field
  canDelete?: boolean; // Added permission field
  expires_at?: Date; // Added expiration time field
  // Final category mapped from classifier or heuristics (e.g., Traffic, Construction, Event, etc.)
  final_category?: string;
}

export interface MapMarkerData {
  id: string;
  position: [number, number];
  title: string;
  description?: string;
  type: "analysis" | "noise";
  data?: any;
}

export interface NoiseArea {
  id: string;
  center: [number, number];
  radius: number;
  noiseLevel: number;
  color: string;
  opacity: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SearchResult {
  id: string;
  name: string;
  coordinates: [number, number];
  address?: string;
  type: string;
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
  maxZoom: number;
  minZoom: number;
  attributionControl: boolean;
  zoomControl: boolean;
}
