// src/components/MapPopup.tsx
import React from 'react';
import { NoiseLocation } from '../types/mapTypes';
import { formatNoiseLevel, getNoiseDescription } from '../utils/mapUtils';
import styles from '../styles/MapComponent.module.css';

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
    if (onDelete && window.confirm('Apakah Anda yakin ingin menghapus area berisik ini?')) {
      onDelete(location.id);
    }
  };

  return (
    <div className={styles.customPopup}>
      <div className={styles.popupContent}>
        <div className={styles.popupTitle}>
          Area Berisik
        </div>
        
        <div className={styles.popupDescription}>
          <strong>Level Kebisingan:</strong> {formatNoiseLevel(location.noiseLevel)}
          <br />
          <strong>Status:</strong> {getNoiseDescription(location.noiseLevel)}
          <br />
          <strong>Waktu:</strong> {location.timestamp.toLocaleString('id-ID')}
          {location.description && (
            <>
              <br />
              <strong>Deskripsi:</strong> {location.description}
            </>
          )}
        </div>
        
        {(onEdit || onDelete) && (
          <div className={styles.popupActions}>
            {onEdit && (
              <button
                className={`${styles.popupButton} ${styles.editButton}`}
                onClick={handleEdit}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                className={`${styles.popupButton} ${styles.deleteButton}`}
                onClick={handleDelete}
              >
                Hapus
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPopup;