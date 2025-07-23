// src/hooks/usePopup.tsx
import { useState, useCallback } from 'react';

export interface PopupConfig {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
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

  const showPopup = useCallback((config: PopupConfig, onConfirm?: () => void, onCancel?: () => void) => {
    setPopupState({
      isVisible: true,
      config,
      onConfirm,
      onCancel,
    });
  }, []);

  const hidePopup = useCallback(() => {
    setPopupState({
      isVisible: false,
      config: null,
    });
  }, []);

  // Shorthand methods for different types of popups
  const showSuccess = useCallback((title: string, message: string, onConfirm?: () => void) => {
    showPopup({ title, message, type: 'success' }, onConfirm);
  }, [showPopup]);

  const showError = useCallback((title: string, message: string, onConfirm?: () => void) => {
    showPopup({ title, message, type: 'error' }, onConfirm);
  }, [showPopup]);

  const showWarning = useCallback((title: string, message: string, onConfirm?: () => void) => {
    showPopup({ title, message, type: 'warning' }, onConfirm);
  }, [showPopup]);

  const showInfo = useCallback((title: string, message: string, onConfirm?: () => void) => {
    showPopup({ title, message, type: 'info' }, onConfirm);
  }, [showPopup]);

  const showConfirm = useCallback((
    title: string, 
    message: string, 
    onConfirm?: () => void, 
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    showPopup({ 
      title, 
      message, 
      type: 'confirm', 
      confirmText, 
      cancelText 
    }, onConfirm, onCancel);
  }, [showPopup]);

  return {
    popupState,
    showPopup,
    hidePopup,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
  };
};