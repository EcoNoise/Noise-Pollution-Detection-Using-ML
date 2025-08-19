// Config untuk status backend dan mode offline
export const appConfig = {
  backendEnabled: false, // Set ke false untuk mode offline/placeholder
  showBackendNotice: true, // Tampilkan banner informasi backend
  offlineMode: true, // Mode offline
  debugMode: false, // Debug logs
  isDevelopment: process.env.NODE_ENV === 'development' || false, // Development mode detection
};

export const backendNotice = {
  title: "Mode Offline",
  message: "Fitur yang bergantung pada backend sementara dinonaktifkan. Aplikasi berjalan dalam mode demonstrasi.",
  type: "info" as const,
};

// Centralized logging utility
export const logger = {
  debug: (...args: any[]) => {
    if (appConfig.debugMode || appConfig.isDevelopment) {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (appConfig.debugMode || appConfig.isDevelopment) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  },
};