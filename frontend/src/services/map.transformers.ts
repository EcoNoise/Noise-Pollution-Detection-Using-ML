// src/services/map.transformers.ts
// Data transformers and validators for Map service
import type { NoiseLocation } from "../types/mapTypes";

/**
 * Derive primary category from noise source label for consistency with DB enum (noise_category_enum)
 * Maps various source keywords to one of: 'Traffic' | 'Construction' | 'Industry' | 'Event' | 'Nature' | 'Other'
 */
export const deriveFinalCategory = (source?: string):
  | "Traffic"
  | "Construction"
  | "Industry"
  | "Event"
  | "Nature"
  | "Other" => {
  if (!source) return "Other";
  const s = source.toLowerCase();
  // Traffic
  if (/(vehicle|traffic|car|motor|bike|horn|engine|bus|truck)/.test(s)) return "Traffic";
  // Construction
  if (/(construction|jackhammer|drill|building|site|hammer|saw)/.test(s)) return "Construction";
  // Industry
  if (/(industry|industrial|factory|machine|compressor|generator)/.test(s)) return "Industry";
  // Event / crowd / music
  if (/(event|concert|music|festival|speaker|amplifier|crowd|cheer|party)/.test(s)) return "Event";
  // Nature / environment
  if (/(nature|rain|wind|water|river|ocean|bird|animal|cricket|insect)/.test(s)) return "Nature";
  return "Other";
};

export const toNoiseLocation = (area: any, currentUserId?: string): NoiseLocation => ({
  id: area.id.toString(),
  coordinates: [area.latitude, area.longitude] as [number, number],
  noiseLevel: area.noise_level,
  source: area.noise_source,
  healthImpact: area.health_impact,
  description: area.description,
  address: area.address,
  radius: area.radius,
  timestamp: new Date(area.created_at),
  userId: area.user_id,
  userName:
    area.userName ||
    (currentUserId && area.user_id === currentUserId
      ? localStorage.getItem("username") || "You"
      : `User${String(area.user_id).slice(-4)}`),
  canDelete: currentUserId ? area.user_id === currentUserId : false,
  expires_at: area.expires_at ? new Date(area.expires_at) : undefined,
  // Persisted status from DB if present; UI will fallback to computed when absent
  status: area.status ?? undefined,
  // Fallback: if DB doesn't yet store final_category, derive from noise_source for UI consistency
  final_category: area.final_category || deriveFinalCategory(area.noise_source),
});

export const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);