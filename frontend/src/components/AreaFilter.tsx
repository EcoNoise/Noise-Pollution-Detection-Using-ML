// src/components/AreaFilter.tsx
import React from 'react';
import { NoiseLocation } from '../types/mapTypes';
import styles from '../styles/AreaFilter.module.css';

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
  noiseLocations 
}) => {
  // Fungsi untuk mengkonversi noise level number ke string
  const getNoiseLevelCategory = (level: number): string => {
    if (level <= 40) return 'Tenang';
    if (level <= 60) return 'Sedang';
    if (level <= 80) return 'Berisik';
    return 'Sangat Berisik';
  };

  // Dapatkan unique values dari data aktual
  const uniqueNoiseLevels = Array.from(
    new Set(noiseLocations.map(location => getNoiseLevelCategory(location.noiseLevel)))
  );
  
  const uniqueSources = Array.from(
    new Set(noiseLocations.map(location => location.source))
  );
  
  const uniqueHealthImpacts = Array.from(
    new Set(noiseLocations.map(location => location.healthImpact))
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

  const translateSource = (source: string): string => {
    const translations: { [key: string]: string } = {
      street_music: 'Musik Jalanan',
      construction: 'Konstruksi',
      traffic: 'Lalu Lintas',
      human_activities: 'Aktivitas Manusia',
      other: 'Lainnya'
    };
    return translations[source] || source;
  };

  const translateHealthImpact = (impact: string): string => {
    const translations: { [key: string]: string } = {
      Mild: 'Ringan',
      Moderate: 'Sedang',
      Severe: 'Berat'
    };
    return translations[impact] || impact;
  };

  return (
    <div className={styles.filterContainer}>
      {uniqueNoiseLevels.length > 0 && (
        <div className={styles.filterSection}>
          <h3>Level Kebisingan</h3>
          <div className={styles.filterOptions}>
            {uniqueNoiseLevels.map((level) => (
              <label key={level} className={styles.filterOption}>
                <input
                  type="checkbox"
                  checked={activeFilters.noiseLevel?.includes(level) || false}
                  onChange={() => handleFilterChange('noiseLevel', level)}
                />
                {level}
              </label>
            ))}
          </div>
        </div>
      )}

      {uniqueSources.length > 0 && (
        <div className={styles.filterSection}>
          <h3>Sumber Kebisingan</h3>
          <div className={styles.filterOptions}>
            {uniqueSources.map((source) => (
              <label key={source} className={styles.filterOption}>
                <input
                  type="checkbox"
                  checked={activeFilters.source?.includes(source) || false}
                  onChange={() => handleFilterChange('source', source)}
                />
                {translateSource(source)}
              </label>
            ))}
          </div>
        </div>
      )}

      {uniqueHealthImpacts.length > 0 && (
        <div className={styles.filterSection}>
          <h3>Dampak Kesehatan</h3>
          <div className={styles.filterOptions}>
            {uniqueHealthImpacts.map((impact) => (
              <label key={impact} className={styles.filterOption}>
                <input
                  type="checkbox"
                  checked={activeFilters.healthImpact?.includes(impact) || false}
                  onChange={() => handleFilterChange('healthImpact', impact)}
                />
                {translateHealthImpact(impact)}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaFilter;