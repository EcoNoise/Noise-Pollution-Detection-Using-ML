// src/types/mapTypes.ts
export interface NoiseLocation {
  id: string;
  latitude: number;
  longitude: number;
  noiseLevel: number;
  description?: string;
  timestamp: Date;
  radius?: number;
  color?: string;
}

export interface MapMarkerData {
  id: string;
  position: [number, number];
  title: string;
  description?: string;
  type: 'analysis' | 'noise';
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