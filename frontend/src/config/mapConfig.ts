// src/config/mapConfig.ts
import { MapConfig } from '../types/mapTypes';

export const mapConfig: MapConfig = {
  center: [-6.2088, 106.8456], // Jakarta coordinates
  zoom: 15,
  maxZoom: 19,
  minZoom: 5,
  attributionControl: true,
  zoomControl: true,
};

export const tileLayerConfig = {
  url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

export const noiseColors = {
  low: '#4CAF50',      // Green for low noise
  medium: '#FF9800',   // Orange for medium noise  
  high: '#F44336',     // Red for high noise
  extreme: '#9C27B0',  // Purple for extreme noise
};

export const noiseThresholds = {
  low: 40,      // dB
  medium: 60,   // dB
  high: 80,     // dB
  extreme: 100, // dB
};

export const animationConfig = {
  duration: 2000,
  repeat: true,
  easing: 'ease-in-out',
};