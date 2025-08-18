// Config untuk status backend dan mode offline
export const appConfig = {
  backendEnabled: false, // Set ke false untuk mode offline/placeholder
  showBackendNotice: true, // Tampilkan banner informasi backend
  offlineMode: true, // Mode offline
  debugMode: false, // Debug logs
};

export const backendNotice = {
  title: "Mode Offline",
  message: "Fitur yang bergantung pada backend sementara dinonaktifkan. Aplikasi berjalan dalam mode demonstrasi.",
  type: "info" as const,
};