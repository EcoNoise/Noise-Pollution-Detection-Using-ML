// src/components/ModernPopup.tsx
import React from "react";
import {
  X,
  AlertTriangle,
  Trash2,
  LogIn,
  CheckCircle,
  Info,
  AlertCircle,
} from "lucide-react";
import styles from "../styles/ModernPopup.module.css";

interface ModernPopupProps {
  isVisible: boolean;
  title: string;
  message: string;
  type: "delete" | "login" | "success" | "error" | "warning" | "info";
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ModernPopup: React.FC<ModernPopupProps> = ({
  isVisible,
  title,
  message,
  type,
  onConfirm,
  onCancel,
  onClose,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
}) => {
  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "delete":
        return <Trash2 size={32} />;
      case "login":
        return <LogIn size={32} />;
      case "success":
        return <CheckCircle size={32} />;
      case "error":
        return <AlertCircle size={32} />;
      case "warning":
        return <AlertTriangle size={32} />;
      case "info":
        return <Info size={32} />;
      default:
        return <Info size={32} />;
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case "delete":
        return styles.delete;
      case "login":
        return styles.login;
      case "success":
        return styles.success;
      case "error":
        return styles.error;
      case "warning":
        return styles.warning;
      case "info":
        return styles.info;
      default:
        return styles.info;
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.popup} ${getTypeClass()}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated background elements */}
        <div className={styles.backgroundElements}>
          <div className={styles.circle1}></div>
          <div className={styles.circle2}></div>
          <div className={styles.circle3}></div>
        </div>

        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose}>
          <X size={20} />
        </button>

        {/* Icon container */}
        <div className={styles.iconContainer}>
          <div className={styles.iconWrapper}>{getIcon()}</div>
          <div className={styles.iconGlow}></div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.message}>{message}</p>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {onCancel && (
            <button
              className={`${styles.button} ${styles.cancelButton}`}
              onClick={onCancel}
            >
              <span>{cancelText}</span>
            </button>
          )}
          {onConfirm && (
            <button
              className={`${styles.button} ${styles.confirmButton}`}
              onClick={onConfirm}
            >
              <span>{confirmText}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernPopup;
