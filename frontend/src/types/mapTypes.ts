// src/types/mapTypes.ts
export interface NoiseLocation {
  id: string;
  coordinates: [number, number]; 
  noiseLevel: number;
  source: string; 
  healthImpact: string; 
  description?: string;
  address?: string; 
  timestamp: Date;
  radius?: number;
  color?: string;
  userId?: string; 
  userName?: string; 
  canDelete?: boolean; 
  expires_at?: Date; 
  final_category?: string;
  status?: NoiseAreaStatus; 
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

export type NoiseAreaStatus = "active" | "expiring" | "expired" | "permanent";
