// src/components/MapPopup.tsx
import React from "react";
import { NoiseLocation } from "../types/mapTypes";
import { formatNoiseLevel, getNoiseDescription } from "../utils/mapUtils";
import styles from "../styles/MapComponent.module.css";

interface MapPopupProps {
  location: NoiseLocation;
  onEdit?: (location: NoiseLocation) => void;
  onDelete?: (id: string) => void;
}

const MapPopup: React.FC<MapPopupProps> = ({ location, onEdit, onDelete }) => {
  const handleEdit = () => {
    if (onEdit) {
      onEdit(location);
    }
  };

  const handleDelete = () => {
    if (
      onDelete &&
      window.confirm("Apakah Anda yakin ingin menghapus area berisik ini?")
    ) {
      onDelete(location.id);
    }
  };

  return (
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

        {(onEdit || (onDelete && location.canDelete)) && (
          <div className={styles.popupActions}>
            {onEdit && location.canDelete && (
              <button
                className={`${styles.popupButton} ${styles.editButton}`}
                onClick={handleEdit}
              >
                Edit
              </button>
            )}
            {onDelete && location.canDelete && (
              <button
                className={`${styles.popupButton} ${styles.deleteButton}`}
                onClick={handleDelete}
              >
                Hapus
              </button>
            )}
          </div>
        )}

        {!location.canDelete && onDelete && (
          <div className={styles.popupNote}>
            <small>Hanya pemilik yang dapat menghapus area ini</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPopup;
