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
  status?: NoiseAreaStatus; // Optional persisted status from backend (active|expiring|expired|permanent)
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

// NEW: Tipe hasil cluster dari RPC get_noise_clusters()
export interface NoiseCluster {
  id: string; // cluster_id (uuid)
  center: [number, number]; // [latitude_avg, longitude_avg]
  noiseLevelAvg: number | null; // rata-rata noise_level
  areaStatus?: NoiseAreaStatus | string; // status cluster bila tersedia dari backend
  finalCategory?: string | null; // kategori mayoritas (opsional)
  noiseSources?: string[] | null; // daftar sumber unik di cluster (opsional)
  firstCreatedAt?: Date | null; // waktu laporan tertua dalam cluster
  lastCreatedAt?: Date | null; // waktu laporan terbaru dalam cluster
  maxExpiresAt?: Date | null; // expire terjauh dalam cluster
  addedByUsernames: string[]; // user-name unik yang berkontribusi
  reportCount: number; // jumlah laporan dalam cluster
  avgConfidence?: number | null; // rata-rata confidence (opsional)
}
