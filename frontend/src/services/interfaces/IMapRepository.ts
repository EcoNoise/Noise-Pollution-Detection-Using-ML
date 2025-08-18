// Backend-agnostic Map Repository Interface
import type { NoiseArea } from "../../types/mapTypes";

export interface SearchResult {
  id: string;
  name: string;
  coordinates: [number, number];
  address?: string;
  type: string;
}

export interface IMapRepository {
  getNoiseAreas(): Promise<NoiseArea[]>;
  createNoiseArea(area: Omit<NoiseArea, "id">): Promise<NoiseArea>;
  deleteNoiseArea(id: string): Promise<void>;
  clearNoiseAreas(): Promise<void>;
  searchPlaces(query: string): Promise<SearchResult[]>;
}