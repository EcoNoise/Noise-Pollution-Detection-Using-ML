// src/components/MapControls.tsx
import React from 'react';
import styles from '../styles/MapComponent.module.css';

interface MapControlsProps {
  onAddNoiseArea: () => void;
  onLocateUser: () => void;
  onClearAreas: () => void;
  onToggleLegend: () => void;
  isAddingNoise: boolean;
  showLegend: boolean;
}

const MapControls: React.FC<MapControlsProps> = ({
  onAddNoiseArea,
  onLocateUser,
  onClearAreas,
  onToggleLegend,
  isAddingNoise,
  showLegend,
}) => {
  return (
    <div className={styles.mapControls}>
      <button
        className={`${styles.controlButton} ${isAddingNoise ? styles.active : ''}`}
        onClick={onAddNoiseArea}
        title="Tambah Area Berisik"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
        </svg>
      </button>
      
      <button
        className={styles.controlButton}
        onClick={onLocateUser}
        title="Lokasi Saya"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
        </svg>
      </button>
      
      <button
        className={styles.controlButton}
        onClick={onClearAreas}
        title="Hapus Semua Area"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
      
      <button
        className={`${styles.controlButton} ${showLegend ? styles.active : ''}`}
        onClick={onToggleLegend}
        title="Tampilkan/Sembunyikan Legend"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
        </svg>
      </button>
    </div>
  );
};

export default MapControls;