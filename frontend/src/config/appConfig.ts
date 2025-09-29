// src/config/appConfig.ts

// Config untuk status backend dan mode offline
export const appConfig = {
  backendEnabled: true, 
  showBackendNotice: true, 
  offlineMode: false, 
  debugMode: false, 
  isDevelopment: process.env.NODE_ENV === 'development' || false, 
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