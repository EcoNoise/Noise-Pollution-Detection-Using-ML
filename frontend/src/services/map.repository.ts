// src/services/map.repository.ts
// LocalStorage-based repository for noise areas
import type { NoiseLocation } from "../types/mapTypes";

const noiseAreasKey = (userId: string) => `noise_areas_${userId}`;
const globalNoiseAreasKey = "all_noise_areas";

export const getCurrentUserId = (): string | null =>
  localStorage.getItem("userId");

const loadUserNoiseAreas = (userId: string): any[] => {
  const raw = localStorage.getItem(noiseAreasKey(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const saveUserNoiseAreas = (userId: string, areas: any[]) => {
  localStorage.setItem(noiseAreasKey(userId), JSON.stringify(areas));
};

const loadAllNoiseAreas = (): any[] => {
  const raw = localStorage.getItem(globalNoiseAreasKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const saveAllNoiseAreas = (areas: any[]) => {
  localStorage.setItem(globalNoiseAreasKey, JSON.stringify(areas));
};

export const repository = {
  getCurrentUserId,
  loadUserNoiseAreas,
  saveUserNoiseAreas,
  loadAllNoiseAreas,
  saveAllNoiseAreas,
};