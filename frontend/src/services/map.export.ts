// src/services/map.export.ts
import { repository } from "./map.repository";

export const exportUserNoiseData = (userId: string): string | null => {
  const userAreas = repository.loadUserNoiseAreas(userId);
  try {
    return JSON.stringify(userAreas, null, 2);
  } catch (e) {
    console.error("Error exporting noise data:", e);
    return null;
  }
};