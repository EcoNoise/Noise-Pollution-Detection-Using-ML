// src/components/MapPopup.tsx
import React, { useState } from "react";
import { NoiseLocation } from "../types/mapTypes";
import { formatNoiseLevel, getNoiseDescription } from "../utils/mapUtils";
import PopupNotification from "./PopupNotification";
import styles from "../styles/MapComponent.module.css";

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

  return (
    <>
      <div className={styles.customPopup}>
        <div className={styles.popupContent}>
          <div className={styles.popupTitle}>Area Berisik</div>

          <div className={styles.popupDescription}>
            <strong>Level Kebisingan:</strong>{" "}
            {formatNoiseLevel(location.noiseLevel)}
            <br />
            <strong>Status:</strong> {getNoiseDescription(location.noiseLevel)}
            <br />
            {location.source && (
              <>
                <strong>Sumber:</strong> {location.source}
                <br />
              </>
            )}
            {location.healthImpact && (
              <>
                <strong>Dampak Kesehatan:</strong> {location.healthImpact}
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
            {location.userName && (
              <>
                <strong>Ditambahkan oleh:</strong> {location.userName}
                <br />
              </>
            )}
            {location.description && (
              <>
                <strong>Deskripsi:</strong> {location.description}
                <br />
              </>
            )}
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
      <PopupNotification
        isVisible={showDeleteConfirm}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus area berisik ini? Tindakan ini tidak dapat dibatalkan."
        type="confirm"
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
