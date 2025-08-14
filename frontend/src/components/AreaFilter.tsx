// src/components/AreaFilter.tsx
import React from "react";
import { NoiseLocation } from "../types/mapTypes";
import styles from "../styles/AreaFilter.module.css";
import {
  translateNoiseSource,
  translateHealthImpact,
} from "../utils/translationUtils";

interface AreaFilterProps {
  onFilterChange: (filters: AreaFilters) => void;
  activeFilters: AreaFilters;
  noiseLocations: NoiseLocation[]; // Tambahkan prop ini
}

export interface AreaFilters {
  noiseLevel?: string[];
  source?: string[];
  healthImpact?: string[];
}

const AreaFilter: React.FC<AreaFilterProps> = ({
  onFilterChange,
  activeFilters,
  noiseLocations,
}) => {
  // Fungsi untuk mengkonversi noise level number ke string
  const getNoiseLevelCategory = (level: number): string => {
    if (level === 0) return "Sedang dalam perbaikan";
    if (level <= 40) return "Tenang";
    if (level <= 60) return "Sedang";
    if (level <= 80) return "Berisik";
    return "Sangat Berisik";
  };

  // Default values untuk setiap kategori filter - SELALU DITAMPILKAN
  const defaultNoiseLevels = [
    "Sedang dalam perbaikan",
    "Tenang",
    "Sedang",
    "Berisik",
    "Sangat Berisik",
  ];
  const defaultSources = [
    "petasan_kembang_api",
    "alat_berat_konstruksi",
    "klakson_kendaraan",
    "mesin_kendaraan",
    "ac_outdoor",
    "sirine_ambulans",
    "tidak_diketahui",
  ];
  const defaultHealthImpacts = ["Ringan", "Sedang", "Tinggi", "Berbahaya"];

  // Gabungkan default values dengan unique values dari data (jika ada)
  // Tetapi pastikan default values selalu ada
  const dataBasedNoiseLevels =
    noiseLocations.length > 0
      ? Array.from(
          new Set(
            noiseLocations.map((location) =>
              getNoiseLevelCategory(location.noiseLevel)
            )
          )
        )
      : [];

  const dataBasedSources =
    noiseLocations.length > 0
      ? Array.from(new Set(noiseLocations.map((location) => location.source)))
      : [];

  const dataBasedHealthImpacts =
    noiseLocations.length > 0
      ? Array.from(
          new Set(noiseLocations.map((location) => location.healthImpact))
        )
      : [];

  // Gabungkan dan hilangkan duplikasi, prioritaskan urutan default
  const uniqueNoiseLevels = Array.from(
    new Set([...defaultNoiseLevels, ...dataBasedNoiseLevels])
  );
  const uniqueSources = Array.from(
    new Set([...defaultSources, ...dataBasedSources])
  );
  const uniqueHealthImpacts = Array.from(
    new Set([...defaultHealthImpacts, ...dataBasedHealthImpacts])
  );

  const handleFilterChange = (category: keyof AreaFilters, value: string) => {
    const currentFilters = { ...activeFilters };
    if (!currentFilters[category]) {
      currentFilters[category] = [];
    }

    const index = currentFilters[category]?.indexOf(value) ?? -1;
    if (index === -1) {
      currentFilters[category]?.push(value);
    } else {
      currentFilters[category]?.splice(index, 1);
    }

    onFilterChange(currentFilters);
  };

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterSection}>
        <h3>Level Kebisingan</h3>
        <div className={styles.filterOptions}>
          {uniqueNoiseLevels.map((level) => (
            <label key={level} className={styles.filterOption}>
              <input
                type="checkbox"
                checked={activeFilters.noiseLevel?.includes(level) || false}
                onChange={() => handleFilterChange("noiseLevel", level)}
              />
              {level}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.filterSection}>
        <h3>Sumber Kebisingan</h3>
        <div className={styles.filterOptions}>
          {uniqueSources.map((source) => (
            <label key={source} className={styles.filterOption}>
              <input
                type="checkbox"
                checked={activeFilters.source?.includes(source) || false}
                onChange={() => handleFilterChange("source", source)}
              />
              {translateNoiseSource(source)}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.filterSection}>
        <h3>Dampak Kesehatan</h3>
        <div className={styles.filterOptions}>
          {uniqueHealthImpacts.map((impact) => (
            <label key={impact} className={styles.filterOption}>
              <input
                type="checkbox"
                checked={activeFilters.healthImpact?.includes(impact) || false}
                onChange={() => handleFilterChange("healthImpact", impact)}
              />
              {translateHealthImpact(impact)}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AreaFilter;
