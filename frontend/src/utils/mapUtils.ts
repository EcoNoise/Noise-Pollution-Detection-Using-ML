// src/utils/mapUtils.ts
import { NoiseLocation, NoiseArea } from "../types/mapTypes";
import { noiseColors, noiseThresholds } from "../config/mapConfig";

export const getNoiseColor = (noiseLevel: number): string => {
  if (noiseLevel <= noiseThresholds.low) return noiseColors.low;
  if (noiseLevel <= noiseThresholds.medium) return noiseColors.medium;
  if (noiseLevel <= noiseThresholds.high) return noiseColors.high;
  return noiseColors.extreme;
};

export const getNoiseRadius = (noiseLevel: number): number => {
  // Calculate radius based on noise level (in meters) - DIPERKECIL
  const baseRadius = 25; // Dikurangi dari 50 ke 25 meter
  const multiplier = Math.max(1, noiseLevel / 80); // Dikurangi dari 40 ke 80 untuk multiplier lebih kecil
  return Math.min(baseRadius * multiplier, 60); // Maksimal 60 meter
};

export const getNoiseOpacity = (noiseLevel: number): number => {
  // Higher noise level = higher opacity
  return Math.min(0.8, Math.max(0.2, noiseLevel / 120));
};

export const formatNoiseLevel = (level: number): string => {
  return `${level.toFixed(1)} dB`;
};

export const getNoiseDescription = (level: number): string => {
  if (level <= noiseThresholds.low) return "Tenang";
  if (level <= noiseThresholds.medium) return "Sedang";
  if (level <= noiseThresholds.high) return "Berisik";
  return "Sangat Berisik";
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const isValidCoordinate = (lat: number, lon: number): boolean => {
  return (
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !isNaN(lat) &&
    !isNaN(lon)
  );
};

export const generateNoiseArea = (location: NoiseLocation): NoiseArea => {
  return {
    id: location.id,
    center: location.coordinates,
    radius: location.radius || getNoiseRadius(location.noiseLevel),
    noiseLevel: location.noiseLevel,
    color: getNoiseColor(location.noiseLevel),
    opacity: getNoiseOpacity(location.noiseLevel),
  };
};

export const getTimeUntilExpiry = (expiresAt: Date): string => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return "Sudah expired";
  }
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours} jam ${diffMinutes} menit lagi`;
  } else {
    return `${diffMinutes} menit lagi`;
  }
};
