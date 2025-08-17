// src/hooks/usePopup.tsx
import { useState, useCallback } from "react";
import React from "react";
import { createRoot } from "react-dom/client";
import ModernPopup from "../components/ModernPopup";

export interface PopupConfig {
  title: string;
  message: string;
  type:
    | "success"
    | "error"
    | "warning"
    | "info"
    | "confirm"
    | "login"
    | "delete";
  confirmText?: string;
  cancelText?: string;
}

export interface PopupState {
  isVisible: boolean;
  config: PopupConfig | null;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const usePopup = () => {
  const [popupState, setPopupState] = useState<PopupState>({
    isVisible: false,
    config: null,
  });

  const showPopup = useCallback(
    (config: PopupConfig, onConfirm?: () => void, onCancel?: () => void) => {
      setPopupState({
        isVisible: true,
        config,
        onConfirm,
        onCancel,
      });
    },
    []
  );

  const hidePopup = useCallback(() => {
    setPopupState({
      isVisible: false,
      config: null,
    });
  }, []);

  // Shorthand methods for different types of popups
  const showSuccess = useCallback(
    (title: string, message: string, onConfirm?: () => void) => {
      showPopup({ title, message, type: "success" }, onConfirm);
    },
    [showPopup]
  );

  const showError = useCallback(
    (title: string, message: string, onConfirm?: () => void) => {
      showPopup({ title, message, type: "error" }, onConfirm);
    },
    [showPopup]
  );

  const showWarning = useCallback(
    (title: string, message: string, onConfirm?: () => void) => {
      showPopup({ title, message, type: "warning" }, onConfirm);
    },
    [showPopup]
  );

  const showInfo = useCallback(
    (title: string, message: string, onConfirm?: () => void) => {
      showPopup({ title, message, type: "info" }, onConfirm);
    },
    [showPopup]
  );

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm?: () => void,
      onCancel?: () => void,
      confirmText?: string,
      cancelText?: string
    ) => {
      showPopup(
        {
          title,
          message,
          type: "confirm",
          confirmText,
          cancelText,
        },
        onConfirm,
        onCancel
      );
    },
    [showPopup]
  );

  const showLogin = useCallback(
    (title: string, message: string, onConfirm?: () => void) => {
      showPopup(
        {
          title,
          message,
          type: "login",
          confirmText: "Login Sekarang",
          cancelText: "Nanti Saja",
        },
        onConfirm
      );
    },
    [showPopup]
  );

  // Render popup component
  const PopupComponent = () => {
    if (!popupState.isVisible || !popupState.config) return null;

    const handleConfirm = () => {
      if (popupState.onConfirm) {
        popupState.onConfirm();
      }
      hidePopup();
    };

    const handleCancel = () => {
      if (popupState.onCancel) {
        popupState.onCancel();
      }
      hidePopup();
    };

    const getPopupType = () => {
      if (popupState.config?.type === "confirm") {
        return "info"; // Default confirm type
      }
      return popupState.config?.type || "info";
    };

    const shouldShowButtons = () => {
      return (
        popupState.config?.type === "warning" ||
        popupState.config?.type === "confirm" ||
        popupState.config?.type === "login"
      );
    };

    return (
      <ModernPopup
        isVisible={popupState.isVisible}
        title={popupState.config.title}
        message={popupState.config.message}
        type={getPopupType() as any}
        onConfirm={shouldShowButtons() ? handleConfirm : undefined}
        onCancel={shouldShowButtons() ? handleCancel : undefined}
        onClose={hidePopup}
        confirmText={popupState.config.confirmText}
        cancelText={popupState.config.cancelText}
      />
    );
  };

  return {
    popupState,
    showPopup,
    hidePopup,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showLogin,
    PopupComponent,
  };
};
