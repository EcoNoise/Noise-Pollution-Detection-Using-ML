// src/components/MapControls.tsx
import React from "react";
import styles from "../styles/MapComponent.module.css";

export interface MapControlsProps {
  onAddNoiseArea: () => void;
  onLocateUser: () => void;
  onClearAreas: () => void;
  onToggleLegend: () => void;
  onToggleFilter: () => void;
  onToggleTracking: () => void;
  onShowTutorial: () => void;
  isAddingNoise: boolean;
  showLegend: boolean;
  showFilter: boolean;
  isTrackingUser: boolean;
  hasUserLocation: boolean;
  backendDisabled?: boolean;
}

const MapControls: React.FC<MapControlsProps> = ({
  onAddNoiseArea,
  onLocateUser,
  onClearAreas,
  onToggleLegend,
  onToggleFilter,
  onToggleTracking,
  onShowTutorial,
  isAddingNoise,
  showLegend,
  showFilter,
  isTrackingUser = false,
  hasUserLocation = false,
  // add default to avoid undefined usage when not passed
  backendDisabled = false,
}) => {
  return (
    <div className={styles.mapControls}>
      <button
        className={styles.controlButton + (isAddingNoise ? " " + styles.active : "")}
        onClick={onAddNoiseArea}
        title={backendDisabled ? "Fitur backend nonaktif" : "Tambahkan area kebisingan"}
        disabled={backendDisabled}
      >
        <span className="material-icons">add_location_alt</span>
      </button>

      <button
        className={`${styles.controlButton} tutorial-locate-user`}
        onClick={onLocateUser}
        title="Lokasi Saya"
        id="locate-user-button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
        </svg>
      </button>

      {/* BARU: Toggle Tracking Button - hanya tampil jika ada lokasi user */}
      {hasUserLocation && onToggleTracking && (
        <button
          className={`${styles.controlButton} ${
            isTrackingUser ? styles.active : ""
          }`}
          onClick={onToggleTracking}
          title={
            isTrackingUser ? "Stop Tracking Lokasi" : "Mulai Tracking Lokasi"
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {isTrackingUser ? (
              // Icon untuk stop tracking (pause)
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            ) : (
              // Icon untuk mulai tracking (play/refresh)
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            )}
          </svg>
        </button>
      )}

      <button
        className={styles.controlButton}
        onClick={onClearAreas}
        title={backendDisabled ? "Fitur backend nonaktif" : "Hapus semua area"}
        disabled={backendDisabled}
      >
        <span className="material-icons">layers_clear</span>
      </button>
            <button
        className={`${styles.controlButton} ${showFilter ? styles.active : ""} tutorial-filter`}
        onClick={onToggleFilter}
        title="Tampilkan/Sembunyikan Filter"
        id="filter-button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
        </svg>
      </button>
      <button
        className={`${styles.controlButton} ${showLegend ? styles.active : ""} tutorial-legend`}
        onClick={onToggleLegend}
        title="Tampilkan/Sembunyikan Legend"
        id="legend-button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
        </svg>
      </button>

      {/* BARU: Tutorial Button */}
      {onShowTutorial && (
        <button
          className={styles.controlButton}
          onClick={onShowTutorial}
          title="Tampilkan Tutorial"
          id="tutorial-button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default MapControls;
