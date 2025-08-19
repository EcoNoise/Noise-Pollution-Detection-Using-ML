// src/services/map.analysis.ts
// Audio analysis integration (delegates to apiService)
import type { PredictionResponse } from "./api";

export const analyzeAudioFile = async (audioFile: File): Promise<PredictionResponse> => {
  const { apiService } = await import("./api");
  const uploadResult = await apiService.uploadAudioFile(audioFile);
  if (uploadResult.status === "error" || !uploadResult.predictions) {
    throw new Error("Analisis audio gagal atau hasil tidak lengkap");
  }
  return uploadResult.predictions;
};