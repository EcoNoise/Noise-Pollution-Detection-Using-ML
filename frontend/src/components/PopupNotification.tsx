// src/components/PopupNotification.tsx
import React from 'react';
import styles from '../styles/PopupNotification.module.css';

export interface PopupProps {
  isVisible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
}

const PopupNotification: React.FC<PopupProps> = ({
  isVisible,
  title,
  message,
  type,
  onConfirm,
  onCancel,
  onClose,
  confirmText = 'OK',
  cancelText = 'Batal'
}) => {
  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'confirm':
        return '❓';
      default:
        return '📢';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  // Prevent click on modal content from closing the modal
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.popup} ${styles[type]}`} onClick={handleContentClick}>
        <div className={styles.header}>
          <div className={styles.icon}>{getIcon()}</div>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          <p className={styles.message}>{message}</p>
        </div>
        
        <div className={styles.actions}>
          {type === 'confirm' ? (
            <>
              <button 
                className={`${styles.button} ${styles.cancelButton}`}
                onClick={handleCancel}
              >
                {cancelText}
              </button>
              <button 
                className={`${styles.button} ${styles.confirmButton}`}
                onClick={handleConfirm}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button 
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PopupNotification;