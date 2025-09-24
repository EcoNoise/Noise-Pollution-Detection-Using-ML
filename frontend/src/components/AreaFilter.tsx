// src/components/AreaFilter.tsx
import React from "react";
import { NoiseLocation } from "../types/mapTypes";
import styles from "../styles/AreaFilter.module.css";
import {
  translateHealthImpact,
} from "../utils/translationUtils";
import { deriveFinalCategory } from "../services/map.transformers";

interface AreaFilterProps {
  onFilterChange: (filters: AreaFilters) => void;
  activeFilters: AreaFilters;
  noiseLocations: NoiseLocation[]; // Tambahkan prop ini
}

export interface AreaFilters {
  noiseLevel?: string[];
  category?: string[]; // ganti dari source -> category
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
  const defaultCategories = [
    "Traffic",
    "Construction",
    "Industry",
    "Event",
    "Nature",
    "Other",
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

  const dataBasedCategories =
    noiseLocations.length > 0
      ? Array.from(
          new Set(
            noiseLocations.map(
              (location) => location.final_category || deriveFinalCategory(location.source)
            )
          )
        )
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
  const uniqueCategories = Array.from(
    new Set([...defaultCategories, ...dataBasedCategories])
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
        <h3>Kategori Kebisingan</h3>
        <div className={styles.filterOptions}>
          {uniqueCategories.map((category) => (
            <label key={category} className={styles.filterOption}>
              <input
                type="checkbox"
                checked={activeFilters.category?.includes(category) || false}
                onChange={() => handleFilterChange("category", category)}
              />
              {category}
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
