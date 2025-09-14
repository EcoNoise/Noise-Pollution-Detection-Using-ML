// src/components/MapPopup.tsx
import React, { useState } from "react";
import { NoiseLocation } from "../types/mapTypes";
import {
  formatNoiseLevel,
  getNoiseDescription,
  formatCoordinates,
  formatRadius,
  formatExpiry,
  computeNoiseAreaStatus,
} from "../utils/mapUtils";
import {
  translateNoiseSource,
  translateHealthImpact,
  getNoiseSourceIcon,
} from "../utils/translationUtils";
import { deriveFinalCategory } from "../services/map.transformers";
import ModernPopup from "./ModernPopup";
import styles from "../styles/MapComponent.module.css";
// import { appConfig } from "../config/appConfig"; // removed unused import

interface MapPopupProps {
  location: NoiseLocation;
  onDelete?: (id: string) => void;
  onReanalyze?: (location: NoiseLocation) => void;
  currentUserId?: string | null;
}

const MapPopup: React.FC<MapPopupProps> = ({
  location,
  onDelete,
  onReanalyze,
  currentUserId,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(location.id);
    }
    setShowDeleteConfirm(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  // Gunakan canDelete dari server sebagai penanda utama, dan userId sebagai backup
  const isOwner =
    location.canDelete || (currentUserId && location.userId === currentUserId);

  const handleReanalyze = () => {
    if (onReanalyze) {
      onReanalyze(location);
    }
  };

  const [lat, lon] = location.coordinates;
  const dbOrComputedStatus = location.status || computeNoiseAreaStatus(location.timestamp, location.expires_at);

  return (
    <>
      <div className={styles.customPopup}>
        <div className={styles.popupContent}>
          <div className={styles.popupTitle}>Area Berisik</div>

          <div className={styles.popupDescription}>
            <strong>Level Kebisingan:</strong>{" "}
            {formatNoiseLevel(location.noiseLevel)}
            <br />
            <strong>Status:</strong> {dbOrComputedStatus}
            <br />
            <strong>Status area:</strong> {getNoiseDescription(location.noiseLevel)}
            <br />
            {(location.final_category || location.source) && (
              <>
                <strong>Kategori:</strong>{" "}
                {location.final_category ||
                  deriveFinalCategory(location.source)}
                <br />
              </>
            )}
            {location.source && (
              <>
                <strong>Sumber:</strong> {getNoiseSourceIcon(location.source)}{" "}
                {translateNoiseSource(location.source)}
                <br />
              </>
            )}
            {location.healthImpact && (
              <>
                <strong>Dampak Kesehatan:</strong>{" "}
                {translateHealthImpact(location.healthImpact)}
                <br />
              </>
            )}
            <strong>Koordinat:</strong> ({formatCoordinates(lat, lon)})
            <br />
            {typeof location.radius !== "undefined" && (
              <>
                <strong>Radius:</strong> {formatRadius(location.radius)}
                <br />
              </>
            )}
            {location.address && (
              <>
                <strong>Alamat:</strong> {location.address}
                <br />
              </>
            )}
            <strong>Waktu:</strong> {location.timestamp.toLocaleString("id-ID")}
            <br />
            <strong>Kadaluarsa:</strong> {formatExpiry(location.expires_at)}
            <br />
            {location.userName && (
              <>
                <strong>Ditambahkan oleh:</strong> {location.userName}
                <br />
              </>
            )}
            {/* Deskripsi disembunyikan sesuai permintaan pengguna */}
          </div>

          <div className={styles.popupActions}>
            {onReanalyze && isOwner && (
              <button
                className={`${styles.popupButton} ${styles.editButton}`}
                onClick={handleReanalyze}
              >
                Analisis Ulang
              </button>
            )}
            {onDelete && isOwner && (
              <button
                className={`${styles.popupButton} ${styles.deleteButton}`}
                onClick={handleDeleteClick}
              >
                Hapus
              </button>
            )}
          </div>

          {!isOwner && (onDelete || onReanalyze) && (
            <div className={styles.popupNote}>
              <small>Hanya pemilik yang dapat mengubah data ini.</small>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      <ModernPopup
        isVisible={showDeleteConfirm}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus area berisik ini? Tindakan ini tidak dapat dibatalkan."
        type="delete"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        onClose={handleDeleteCancel}
        confirmText="Ya, Hapus"
        cancelText="Batal"
      />
    </>
  );
};

export default MapPopup;
