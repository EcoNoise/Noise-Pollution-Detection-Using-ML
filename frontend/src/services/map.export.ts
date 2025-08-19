// src/services/map.export.ts
import { repository } from "./map.repository";
import { logger } from "../config/appConfig";

export const exportUserNoiseData = (userId: string): string | null => {
  const userAreas = repository.loadUserNoiseAreas(userId);
  try {
    return JSON.stringify(userAreas, null, 2);
  } catch (e) {
    logger.error("Error exporting noise data:", e);
    return null;
  }
};