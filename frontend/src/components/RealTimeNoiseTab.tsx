// src/components/RealTimeNoiseTab.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  styled,
  CircularProgress,
  Paper,
  LinearProgress,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Mic,
  MicOff,
  Settings,
  TrendingUp,
  VolumeUp,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Psychology,
  GraphicEq,
  Speed,
  Timeline,
  FolderOpen,
  PlayArrow,
} from "@mui/icons-material";
import { Activity, Clock } from "lucide-react";
import { useRealTimeNoise } from "../hooks/useRealTimeNoise";
import { audioClassificationService } from "../services/audioClassificationService";
import { mapService } from "../services/mapService";
import { logger, appConfig } from "../config/appConfig";
import { useNavigate } from "react-router-dom";
// import SessionManager from "../utils/tokenManager"; // removed legacy
import ModernPopup from "./ModernPopup";
import {
  createHealthSession,
  endHealthSession,
  createExposureLog,
} from "../services/healthService";
import { DailyAudioService } from "../services/dailyAudioService";
import { useAuth } from "../contexts/AuthContext";
import SimpleAudioVisualizer from "./SimpleAudioVisualizer";

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 50,
  padding: "12px 24px",
  fontSize: "1rem",
  fontWeight: 600,
  textTransform: "none",
  marginRight: theme.spacing(2),
  marginBottom: theme.spacing(1),
  transition: "all 0.3s ease",
  [theme.breakpoints.down('sm')]: {
    padding: "10px 20px",
    fontSize: "0.9rem",
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(0.8),
  },
  [theme.breakpoints.down('xs')]: {
    padding: "8px 16px",
    fontSize: "0.8rem",
    marginRight: theme.spacing(0.8),
    marginBottom: theme.spacing(0.6),
  },
  "&.MuiButton-contained": {
    background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
    "&:hover": {
      background: "linear-gradient(45deg, #1976D2 30%, #0288D1 90%)",
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px rgba(33, 150, 243, 0.4)",
    },
  },
  "&.MuiButton-outlined": {
    borderColor: "rgba(255, 255, 255, 0.3)",
    color: "white",
    "&:hover": {
      borderColor: "rgba(255, 255, 255, 0.6)",
      background: "rgba(255, 255, 255, 0.1)",
    },
  },
}));

const FloatingCard = styled(Card)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(15px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 24,
  color: "white",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  [theme.breakpoints.down('sm')]: {
    borderRadius: 16,
  },
  [theme.breakpoints.down('xs')]: {
    borderRadius: 12,
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "2px",
    background: "linear-gradient(90deg, #2196F3, #21CBF3, #03DAC6)",
    opacity: 0,
    transition: "opacity 0.3s ease",
  },
  "&:hover": {
    transform: { 
      xs: "translateY(-4px) scale(1.01)", 
      sm: "translateY(-8px) scale(1.02)" 
    },
    boxShadow: "0 20px 60px rgba(33, 150, 243, 0.15)",
    "&::before": {
      opacity: 1,
    },
  },
}));

interface RealTimeNoiseTabProps {
  className?: string;
}

// Cache untuk menyimpan data setelah monitor dihentikan
interface CachedReading {
  reading: any;
  statistics: any;
  timestamp: number;
  location?: [number, number];
}

const RealTimeNoiseTab: React.FC<RealTimeNoiseTabProps> = ({ className }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);

  // Cache untuk data setelah monitoring dihentikan
  const [cachedReading, setCachedReading] = useState<CachedReading | null>(
    null
  );
  const [cacheExpiry, setCacheExpiry] = useState<number | null>(null);
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check authentication status (via AuthContext)
  const { isAuthenticated: isAuthCtx } = useAuth();
  useEffect(() => {
    setIsAuthenticated(isAuthCtx);
  }, [isAuthCtx]);

  const {
    isListening,
    currentReading,
    statistics,
    error,
    startListening,
    stopListening,
    isSupported,
  } = useRealTimeNoise({
    enableAWeighting: true,
    enableFrequencyAnalysis: true,
    calibrationMode: "auto",
    updateInterval: 100,
    historyLength: 50,
    enableRealTimeClassification: true,
    classificationInterval: 3000,
  });

  // Session tracking refs for Supabase integration
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const sumDbRef = useRef<number>(0);
  const sumDbARef = useRef<number>(0);
  const countRef = useRef<number>(0);

  // Cache cleanup ketika komponen unmount
  useEffect(() => {
    return () => {
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, []);

  // Update cache expiry timer
  useEffect(() => {
    if (cacheExpiry) {
      const now = Date.now();
      const timeLeft = cacheExpiry - now;

      if (timeLeft <= 0) {
        setCachedReading(null);
        setCacheExpiry(null);
        return;
      }

      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }

      cacheTimeoutRef.current = setTimeout(() => {
        setCachedReading(null);
        setCacheExpiry(null);
      }, timeLeft);
    }
  }, [cacheExpiry]);

  // Accumulate readings while listening to compute session averages
  useEffect(() => {
    if (isListening && currentReading) {
      sumDbRef.current += currentReading.db;
      sumDbARef.current += currentReading.dbA;
      countRef.current += 1;
    }
  }, [isListening, currentReading]);

  const handleStartListening = useCallback(async () => {
    // Clear cache saat mulai monitoring baru
    if (cacheTimeoutRef.current) {
      clearTimeout(cacheTimeoutRef.current);
    }
    setCachedReading(null);
    setCacheExpiry(null);

    await startListening();
    // Only create a backend session when backend enabled
    if (appConfig.backendEnabled) {
      sessionStartRef.current = Date.now();
      sumDbRef.current = 0;
      sumDbARef.current = 0;
      countRef.current = 0;
      try {
        const session = await createHealthSession({});
        sessionIdRef.current = session.id || null;
        logger.info("Health session created", sessionIdRef.current);
      } catch (e) {
        logger.error("Failed to create health session", e);
      }
    } else {
      // offline path: mark start time for duration calculation
      sessionStartRef.current = Date.now();
      sumDbRef.current = 0;
      sumDbARef.current = 0;
      countRef.current = 0;
    }
  }, [startListening]);

  const handleStopListening = useCallback(async () => {
    // Simpan data ke cache sebelum menghentikan monitoring
    if (currentReading && statistics) {
      try {
        const position = await mapService.getCurrentLocation();
        const cache: CachedReading = {
          reading: currentReading,
          statistics: statistics,
          timestamp: Date.now(),
          location: position || undefined,
        };
        setCachedReading(cache);
        // Tidak ada expiry time - cache bertahan sampai monitoring baru atau pindah tab
        setCacheExpiry(null);
        logger.info("Data cached until next monitoring session or tab change");
      } catch (error) {
        logger.warn("Could not get location for cache:", error);
        // Tetap cache tanpa lokasi
        const cache: CachedReading = {
          reading: currentReading,
          statistics: statistics,
          timestamp: Date.now(),
        };
        setCachedReading(cache);
        setCacheExpiry(null);
      }
    }

    stopListening();
    const start = sessionStartRef.current;
    const count = countRef.current || 0;
    const avg_db = count > 0 ? sumDbRef.current / count : undefined;
    const avg_dba = count > 0 ? sumDbARef.current / count : undefined;
    const duration_seconds = start
      ? Math.max(1, Math.round((Date.now() - start) / 1000))
      : 0;

    // Map to health impact categories based on avg_dba thresholds
    const health_impact =
      avg_dba === undefined
        ? undefined
        : avg_dba < 55
        ? "Aman"
        : avg_dba < 70
        ? "Perhatian"
        : avg_dba < 85
        ? "Berbahaya"
        : "Sangat Berbahaya";

    try {
      if (appConfig.backendEnabled && sessionIdRef.current) {
        await endHealthSession(sessionIdRef.current, {
          duration_seconds,
          avg_db,
          avg_dba,
          health_impact,
        });
        logger.info("Health session ended", sessionIdRef.current);
      } else {
        // Fallback to local exposure log so dashboard reflects activity offline
        const hours = duration_seconds / 3600;
        // Ensure a local user id exists in offline mode
        if (!localStorage.getItem("userId")) {
          localStorage.setItem("userId", "guest");
        }
        await createExposureLog({
          commute_hours: hours,
          home_hours: 0,
          work_hours: 0,
          commute_avg_noise: avg_dba || 0,
          home_avg_noise: 0,
          work_avg_noise: 0,
          health_alerts: [],
        });
        logger.info("Offline exposure log created");
      }
    } catch (e) {
      logger.error("Failed to end session or create offline log", e);
    } finally {
      try {
        // Ensure DailyAudioService cache is refreshed so other views show latest data
        await DailyAudioService.refreshTodayAudioSummary();
      } catch (err) {
        logger.error("Failed to refresh daily summary", err);
      }
      // Notify listeners (e.g., HealthDashboard) that data has changed
      window.dispatchEvent(new CustomEvent("health:data-updated"));

      sessionIdRef.current = null;
      sessionStartRef.current = null;
      sumDbRef.current = 0;
      sumDbARef.current = 0;
      countRef.current = 0;
    }
  }, [stopListening, currentReading, statistics]);

  const getHealthIcon = (healthImpact: string) => {
    switch (healthImpact) {
      case "Aman":
        return <CheckCircle sx={{ color: "#4CAF50", fontSize: 28 }} />;
      case "Perhatian":
        return <Warning sx={{ color: "#FF9800", fontSize: 28 }} />;
      case "Berbahaya":
      case "Sangat Berbahaya":
        return <ErrorIcon sx={{ color: "#f44336", fontSize: 28 }} />;
      case "Tidak Terdeteksi":
        return <MicOff sx={{ color: "#9E9E9E", fontSize: 28 }} />;
      default:
        return <Settings sx={{ color: "#9E9E9E", fontSize: 28 }} />;
    }
  };

  // Initialize TensorFlow.js model
  useEffect(() => {
    const loadModels = async () => {
      try {
        logger.info("Loading YAMNet and classifier models...");
        await audioClassificationService.loadModels();
        logger.info("Models loaded successfully!");
      } catch (err: unknown) {
        logger.error("Error loading models:", err);
      }
    };

    loadModels();
  }, []);

  if (!isSupported) {
    return (
      <Alert
        severity="error"
        sx={{
          backgroundColor: "rgba(244, 67, 54, 0.1)",
          color: "white",
          border: "1px solid rgba(244, 67, 54, 0.3)",
          borderRadius: 2,
          margin: 2,
        }}
      >
        Browser Anda tidak mendukung Web Audio API. Silakan gunakan browser yang
        lebih modern.
      </Alert>
    );
  }

  const shareToMap = async () => {
    if (!isAuthenticated) {
      setShowLoginAlert(true);
      return;
    }

    // Tentukan data mana yang akan digunakan: current reading atau cached reading
    let dataToShare = currentReading;
    let position: [number, number] | null = null;

    if (
      !isListening &&
      cachedReading
    ) {
      // Gunakan data dari cache
      dataToShare = cachedReading.reading;
      position = cachedReading.location || null;
      logger.info("Using cached data for sharing to map");
    } else if (
      !isListening &&
      !cachedReading
    ) {
      // Tidak ada cache dan tidak sedang monitoring
      alert(
        "Tidak ada data untuk dibagikan. Silakan mulai monitoring terlebih dahulu."
      );
      return;
    }

    if (!dataToShare) {
      alert(
        "Tidak ada data untuk dibagikan. Silakan mulai monitoring terlebih dahulu."
      );
      return;
    }

    try {
      // Jika tidak ada posisi dari cache, coba dapatkan posisi saat ini
      if (!position) {
        position = await mapService.getCurrentLocation();
        if (!position) {
          throw new Error("Tidak dapat memperoleh lokasi saat ini");
        }
      }

      const source = dataToShare.classification?.topPrediction || "Unknown";
      const confidence = dataToShare.classification?.confidence;
      const description = `Realtime: ${dataToShare.dbA.toFixed(
        1
      )} dBA, sumber: ${source}${
        confidence !== undefined
          ? ` (kepercayaan ${(confidence * 100).toFixed(0)}%)`
          : ""
      } pada ${dataToShare.timestamp.toLocaleString()}`;

      const saved = await mapService.addNoiseLocation({
        coordinates: position,
        noiseLevel: dataToShare.dbA,
        source,
        healthImpact: dataToShare.healthImpact,
        description,
        address: "Lokasi saat ini",
        radius: 100,
      });

      if (saved) {
        // Clear cache setelah berhasil share
        if (cachedReading) {
          setCachedReading(null);
          setCacheExpiry(null);
          if (cacheTimeoutRef.current) {
            clearTimeout(cacheTimeoutRef.current);
          }
        }
        navigate("/maps");
      }
    } catch (err) {
      logger.error("Gagal membagikan ke peta:", err);
      alert("Gagal membagikan ke peta. Silakan coba lagi.");
    }
  };

  const handleLoginRedirect = () => {
    setShowLoginAlert(false);
    navigate("/login");
  };

  const handleCloseAlert = () => {
    setShowLoginAlert(false);
  };

  // Tentukan apakah tombol share harus disabled (tanpa menggunakan displayData)
  const isShareButtonDisabled =
    !isAuthenticated ||
    (!currentReading && !cachedReading);

  // Helper function untuk mendapatkan data yang akan ditampilkan
  const getDisplayData = () => {
    // Jika sedang listening, gunakan currentReading
    if (isListening && currentReading) {
      return {
        reading: currentReading,
        statistics: statistics,
        isFromCache: false
      };
    }
    
    // Jika tidak listening tapi ada cache yang valid (tanpa expiry check)
    if (!isListening && cachedReading) {
      return {
        reading: cachedReading.reading,
        statistics: cachedReading.statistics,
        isFromCache: true
      };
    }
    
    // Jika tidak ada data
    return {
      reading: null,
      statistics: null,
      isFromCache: false
    };
  };

  const displayData = getDisplayData();

  // Tentukan apakah tombol share harus ditampilkan dan statusnya
  const shouldShowShareButton = 
    displayData.reading && 
    !isListening && 
    displayData.reading.category !== "Tidak Ada Sinyal";
    
  const isShareButtonActuallyDisabled = 
    isShareButtonDisabled || 
    (displayData.reading?.category === "Tidak Ada Sinyal");

  return (
    <Box className={className} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {/* Error/Warning/Info Alert */}
      {error ? (
        <Alert
          severity="error"
          sx={{
            mb: 4,
            backgroundColor: "rgba(244, 67, 54, 0.1)",
            color: "white",
            border: "1px solid rgba(244, 67, 54, 0.3)",
            borderRadius: 2,
          }}
        >
          Mikrofon atau sistem audio bermasalah. Tidak dapat menyimpan ke peta.
        </Alert>
      ) : (isListening && displayData.reading?.category === "Tidak Ada Sinyal") || 
          (!isListening && cachedReading && cachedReading.reading?.category === "Tidak Ada Sinyal") ? (
        <Alert
          severity="warning"
          sx={{
            mb: 4,
            backgroundColor: "rgba(255, 152, 0, 0.1)",
            color: "white",
            border: "1px solid rgba(255, 152, 0, 0.3)",
            borderRadius: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <MicOff />
            <Typography>
              Mikrofon tidak terdeteksi atau tidak memiliki izin akses. Periksa pengaturan mikrofon Anda.
            </Typography>
          </Box>
        </Alert>
      ) : isListening && (!displayData.reading || displayData.reading?.category === "Tidak Ada Sinyal") ? (
        <Alert
          severity="warning"
          sx={{
            mb: 4,
            backgroundColor: "rgba(255, 193, 7, 0.1)",
            color: "white",
            border: "1px solid rgba(255, 193, 7, 0.3)",
            borderRadius: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <PlayArrow />
            <Typography>
              Memulai deteksi, mohon tunggu...
            </Typography>
          </Box>
        </Alert>
      ) : isListening && displayData.reading && displayData.reading?.category !== "Tidak Ada Sinyal" ? (
        <Alert
          severity="info"
          sx={{
            mb: 4,
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            color: "white",
            border: "1px solid rgba(33, 150, 243, 0.3)",
            borderRadius: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircle />
            <Typography>
              Monitoring aktif - Data real-time sedang dianalisis
            </Typography>
          </Box>
        </Alert>
      ) : !isListening && cachedReading && cachedReading.reading?.category !== "Tidak Ada Sinyal" ? (
        <Alert
          severity="info"
          sx={{
            mb: 4,
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            color: "white",
            border: "1px solid rgba(33, 150, 243, 0.3)",
            borderRadius: 2,
          }}
        >
          Data hasil monitoring terakhir tersimpan. Anda masih bisa membagikan ke peta.
        </Alert>
      ) : !isListening ? (
        <Alert
          severity="info"
          sx={{
            mb: 4,
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            color: "white",
            border: "1px solid rgba(33, 150, 243, 0.3)",
            borderRadius: 2,
          }}
        >
          Tekan tombol "Mulai Monitor" di bawah untuk memulai analisis suara real-time.
        </Alert>
      ) : null}

      {/* Control Panel */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActionButton
            variant={isListening ? "outlined" : "contained"}
            onClick={isListening ? handleStopListening : handleStartListening}
            size="large"
            sx={{
              borderColor: isListening ? "#f44336" : "#3b82f6",
              color: isListening ? "#f44336" : "white",
              backgroundColor: isListening ? "transparent" : "#3b82f6",
              borderRadius: "50px",
              px: 4,
              py: 1.5,
              fontSize: "1.1rem",
              fontWeight: 700,
              minWidth: 180,
              height: 56,
              textTransform: "none",
              boxShadow: isListening 
                ? "0 4px 20px rgba(244, 67, 54, 0.3)" 
                : "0 6px 25px rgba(59, 130, 246, 0.4)",
              border: isListening ? "2px solid #f44336" : "none",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: "-100%",
                width: "100%",
                height: "100%",
                background: isListening 
                  ? "linear-gradient(90deg, transparent, rgba(244, 67, 54, 0.2), transparent)"
                  : "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
                transition: "left 0.6s",
              },
              "&:hover": {
                borderColor: isListening ? "#d32f2f" : "#2563eb",
                backgroundColor: isListening ? "rgba(244, 67, 54, 0.1)" : "#2563eb",
                transform: "translateY(-3px) scale(1.02)",
                boxShadow: isListening 
                  ? "0 8px 30px rgba(244, 67, 54, 0.5)" 
                  : "0 10px 35px rgba(59, 130, 246, 0.6)",
                "&::before": {
                  left: "100%",
                },
              },
              "&:active": {
                transform: "translateY(-1px) scale(1.01)",
              },
            }}
            startIcon={
              isListening ? (
                <MicOff sx={{ 
                  color: "inherit", 
                  fontSize: "1.3rem",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                }} />
              ) : (
                <Mic sx={{ 
                  fontSize: "1.3rem",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                }} />
              )
            }
          >
            {isListening ? "Stop Monitor" : "Mulai Monitor"}
          </ActionButton>
        </Box>
      </Box>

      {/* Current Reading Display */}
      {displayData.reading && (
        <Box sx={{ mb: 4 }}>
          {/* Header dengan tombol seperti di Rekam & Analisis */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            flexDirection={{ xs: "column", sm: "row" }}
            flexWrap="wrap"
            mb={3}
            gap={{ xs: 2, sm: 0 }}
          >
            <Typography 
              variant="h4"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(45deg, #ffffff 30%, #e3f2fd 90%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginBottom: { xs: 0, sm: 2 },
                fontSize: { xs: "1.5rem", sm: "2rem", md: "2.25rem" },
              }}
            >
              {displayData.isFromCache ? "Hasil Monitoring Terakhir" : "Monitor Real-time Aktif"}
            </Typography>
            
            {/* Tombol Bagikan ke Peta - hanya muncul setelah deteksi selesai dan ada data valid */}
            {shouldShowShareButton && (
              <Button
                variant="contained"
                onClick={shareToMap}
                disabled={isShareButtonActuallyDisabled}
                sx={{
                  bgcolor: isShareButtonActuallyDisabled ? "rgba(255, 255, 255, 0.1)" : "#3b82f6",
                  color: isShareButtonActuallyDisabled ? "rgba(255, 255, 255, 0.4)" : "#fff",
                  borderRadius: "50px",
                  px: { xs: 2, sm: 3 },
                  py: { xs: 0.8, sm: 1 },
                  fontSize: { xs: "0.8rem", sm: "0.9rem" },
                  opacity: isShareButtonActuallyDisabled ? 0.6 : 1,
                  "&:hover": {
                    bgcolor: isShareButtonActuallyDisabled ? "rgba(255, 255, 255, 0.1)" : "#2563eb",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                    color: "rgba(255, 255, 255, 0.4)",
                    opacity: 0.6,
                  },
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Activity size={18} />
                  <Typography variant="button" sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
                    Bagikan ke Peta
                  </Typography>
                </Box>
              </Button>
            )}
          </Box>

          {/* Audio Wave Visualization - only show when actively monitoring */}
          {!displayData.isFromCache && isListening && (
            <Box
              sx={{
                mb: { xs: 3, sm: 4 },
                p: { xs: 2, sm: 3, md: 4 },
                borderRadius: 3,
                background: "rgba(33, 150, 243, 0.05)",
                border: "1px solid rgba(33, 150, 243, 0.2)",
              }}
            >
              <Typography 
                variant="h6"
                sx={{ 
                  color: "#e3f2fd", 
                  mb: { xs: 2, sm: 3 }, 
                  textAlign: "center",
                  fontSize: { xs: "1rem", sm: "1.25rem" }
                }}
              >
                <GraphicEq sx={{ 
                  fontSize: { xs: 18, sm: 20 }, 
                  mr: 1, 
                  verticalAlign: "middle" 
                }} />
                Monitoring Audio Live
              </Typography>
              
              <Box sx={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                overflow: "hidden" 
              }}>
                <SimpleAudioVisualizer 
                  isRecording={isListening}
                  frequencyData={displayData.reading?.frequencyData}
                  width={isMobile ? 280 : isTablet ? 350 : 400}
                  height={isMobile ? 60 : isTablet ? 70 : 80}
                />
              </Box>
              
              <Typography variant="body2" sx={{ 
                color: "rgba(255,255,255,0.7)", 
                textAlign: "center",
                mt: { xs: 1, sm: 2 },
                fontSize: { xs: "0.8rem", sm: "0.875rem" }
              }}>
                Mendeteksi dan menganalisis sinyal audio secara real-time
              </Typography>
            </Box>
          )}
          
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} lg={6}>
              <FloatingCard>
                <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={{ xs: 2, sm: 3 }}>
                    <Box
                      sx={{
                        p: { xs: 1, sm: 1.5 },
                        borderRadius: 2,
                        background: "linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.1) 100%)",
                      }}
                    >
                      <GraphicEq sx={{ fontSize: { xs: 24, sm: 28 }, color: "#60a5fa" }} />
                    </Box>
                    <Typography 
                      variant="h6"
                      color="rgba(255,255,255,0.8)"
                      sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
                    >
                      Tingkat Kebisingan
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h1" 
                    sx={{ 
                      fontWeight: "800",
                      background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 2,
                      fontSize: { xs: "2.5rem", md: "3.5rem" }
                    }}
                  >
                    {displayData.reading.category === "Tidak Ada Sinyal" 
                      ? "--" 
                      : displayData.reading.dbA.toFixed(1)
                    }
                  </Typography>
                  <Typography variant="h6" sx={{ color: "#60a5fa", mb: 2 }}>
                    dB(A)
                  </Typography>
                  <Typography
                    variant="body1"
                    color="rgba(255,255,255,0.7)"
                    sx={{ mt: 2 }}
                  >
                    {displayData.reading.category === "Tidak Ada Sinyal" 
                      ? <>
                          <MicOff sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                          Tidak ada sinyal audio yang terdeteksi
                        </>
                      : <>
                          <strong>RMS Signal:</strong> {displayData.reading.rms.toFixed(6)}
                        </>
                    }
                  </Typography>
                </CardContent>
              </FloatingCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <FloatingCard>
                <CardContent sx={{ p: 4 }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        background: "linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)",
                      }}
                    >
                      {getHealthIcon(displayData.reading.healthImpact)}
                    </Box>
                    <Typography variant="h6" color="rgba(255,255,255,0.8)">
                      Dampak Kesehatan
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h2" 
                    sx={{ 
                      fontWeight: "700",
                      mb: 2,
                      color: "#fff"
                    }}
                  >
                    {displayData.reading.healthImpact}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="rgba(255,255,255,0.7)"
                    sx={{ mb: 3 }}
                  >
                    Kategori: <strong>{displayData.reading.category}</strong>
                    {displayData.reading.category === "Tidak Ada Sinyal" && 
                      " - Periksa mikrofon Anda"
                    }
                  </Typography>
                  <Typography
                    variant="body2"
                    color="rgba(255,255,255,0.6)"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Clock size={16} />
                    {displayData.reading.timestamp.toLocaleTimeString()}
                  </Typography>
                </CardContent>
              </FloatingCard>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Audio Classification Results */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <FloatingCard sx={{ height: "400px" }}>
              <CardContent sx={{ p: 4, height: "100%", display: "flex", flexDirection: "column" }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      background: "linear-gradient(135deg, rgba(167, 139, 250, 0.2) 0%, rgba(167, 139, 250, 0.1) 100%)",
                    }}
                  >
                    <Psychology sx={{ fontSize: 28, color: "#a78bfa" }} />
                  </Box>
                  <Typography variant="h6" color="rgba(255,255,255,0.8)">
                    Klasifikasi Audio AI
                  </Typography>
                </Box>

                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  {displayData.reading?.classification ? (
                    <>
                      <Typography 
                        variant="h3" 
                        sx={{ 
                          fontWeight: "700", 
                          mb: 2,
                          background: "linear-gradient(45deg, #a78bfa 30%, #c084fc 90%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        {displayData.reading.classification.topPrediction}
                      </Typography>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          background: "linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)",
                          mb: 3,
                        }}
                      >
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: "bold",
                            color: "#4CAF50",
                          }}
                        >
                          {(displayData.reading.classification.confidence * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#4CAF50", opacity: 0.8 }}>
                          Confidence
                        </Typography>
                      </Box>
                      <Typography
                        variant="body1"
                        color="rgba(255,255,255,0.7)"
                        sx={{ mb: 2 }}
                      >
                        {displayData.isFromCache 
                          ? <>
                              <Timeline sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                              Hasil klasifikasi terakhir
                            </> 
                          : "Klasifikasi real-time setiap 3 detik"}
                      </Typography>
                    </>
                  ) : isListening ? (
                    <>
                      <CircularProgress
                        size={80}
                        sx={{
                          mb: 3,
                          color: "#a78bfa",
                          "& .MuiCircularProgress-circle": {
                            strokeLinecap: "round",
                          },
                        }}
                      />
                      <Typography variant="h6" sx={{ mb: 2, color: "#a78bfa" }}>
                        <Psychology sx={{ fontSize: 20, mr: 1, verticalAlign: "middle" }} />
                        Analyzing Audio...
                      </Typography>
                      <Typography variant="body1" color="rgba(255,255,255,0.7)">
                        Memproses sinyal audio dengan AI
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Box sx={{ mb: 4, opacity: 0.4 }}>
                        <Psychology sx={{ fontSize: 80, color: "#666" }} />
                      </Box>
                      <Typography variant="h6" sx={{ mb: 2, opacity: 0.7 }}>
                        <MicOff sx={{ fontSize: 20, mr: 1, verticalAlign: "middle", opacity: 0.5 }} />
                        Menunggu Audio
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.6 }}>
                        Mulai monitoring untuk klasifikasi AI
                      </Typography>
                    </>
                  )}
                </Box>
              </CardContent>
            </FloatingCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <FloatingCard sx={{ height: "400px" }}>
              <CardContent sx={{ p: 4, height: "100%", display: "flex", flexDirection: "column" }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      background: "linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.1) 100%)",
                    }}
                  >
                    <TrendingUp sx={{ fontSize: 28, color: "#60a5fa" }} />
                  </Box>
                  <Typography variant="h6" color="rgba(255,255,255,0.8)">
                    Detail Prediksi
                  </Typography>
                </Box>

                <Box sx={{ flexGrow: 1 }}>
                  {displayData.reading?.classification ? (
                    <>
                      <Typography
                        variant="body1"
                        sx={{ mb: 3, opacity: 0.8, color: "#e3f2fd", fontWeight: 600 }}
                      >
                        <TrendingUp sx={{ fontSize: 18, mr: 1, verticalAlign: "middle" }} />
                        Top 3 Prediksi Audio:
                      </Typography>
                      {displayData.reading.classification.predictions
                        .slice(0, 3)
                        .map((prediction: { label: string; confidence: number }, index: number) => (
                          <Box key={index} sx={{ mb: 3 }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1.5,
                              }}
                            >
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: index === 0 ? "bold" : "500",
                                  color: index === 0 ? "#2196F3" : "#e3f2fd",
                                  fontSize: index === 0 ? "1.1rem" : "1rem",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                {index === 0 && <CheckCircle sx={{ fontSize: 16, mr: 0.5, color: "#4CAF50" }} />}
                                {prediction.label}
                              </Typography>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 700,
                                  color: index === 0 ? "#4CAF50" : "#e3f2fd",
                                  fontSize: index === 0 ? "1.1rem" : "1rem",
                                }}
                              >
                                {(prediction.confidence * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={prediction.confidence * 100}
                              sx={{
                                height: index === 0 ? 12 : 8,
                                borderRadius: 6,
                                backgroundColor: "rgba(255, 255, 255, 0.1)",
                                "& .MuiLinearProgress-bar": {
                                  borderRadius: 6,
                                  background:
                                    index === 0
                                      ? "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)"
                                      : prediction.confidence > 0.3
                                      ? "linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)"
                                      : "linear-gradient(45deg, #FF9800 30%, #FFC107 90%)",
                                  boxShadow: index === 0 ? "0 4px 8px rgba(33, 150, 243, 0.3)" : "none",
                                },
                              }}
                            />
                          </Box>
                        ))}

                      <Box sx={{ mt: "auto", pt: 3 }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            background: "rgba(33, 150, 243, 0.1)",
                            border: "1px solid rgba(33, 150, 243, 0.2)",
                          }}
                        >
                          <Typography variant="body2" sx={{ opacity: 0.9, display: "flex", alignItems: "center", gap: 1 }}>
                            <Clock size={16} />
                            <strong>Analyzed at:</strong>{" "}
                            {displayData.reading.timestamp.toLocaleTimeString()}
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        textAlign: "center",
                      }}
                    >
                      <Box>
                        <Box sx={{ mb: 3, opacity: 0.3 }}>
                          <TrendingUp sx={{ fontSize: 60, color: "#666" }} />
                        </Box>
                        <Typography
                          variant="body1"
                          sx={{ opacity: 0.7, mb: 1 }}
                        >
                          <TrendingUp sx={{ fontSize: 18, mr: 1, verticalAlign: "middle" }} />
                          Detail klasifikasi akan muncul di sini
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ opacity: 0.5 }}
                        >
                          Setelah monitoring dimulai
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </FloatingCard>
          </Grid>
        </Grid>
      </Box>

      {/* Statistics */}
      {displayData.statistics && displayData.statistics.readings.length > 0 && (
        <FloatingCard sx={{ mb: 4 }}>
          <CardContent sx={{ p: 5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 5 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.1) 100%)",
                }}
              >
                <Timeline sx={{ fontSize: 32, color: "#2196F3" }} />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "#e3f2fd", mb: 1 }}
                >
                  <Timeline sx={{ fontSize: 24, mr: 1, verticalAlign: "middle" }} />
                  Statistik A-weighted
                </Typography>
                <Typography variant="body1" color="rgba(255,255,255,0.7)">
                  Analisis komprehensif dari {displayData.statistics.readings.length} sampel audio
                </Typography>
              </Box>
              {displayData.isFromCache && (
                <Chip
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <FolderOpen sx={{ fontSize: 16 }} />
                      Hasil Tersimpan
                    </Box>
                  }
                  size="medium"
                  sx={{
                    backgroundColor: "rgba(33, 150, 243, 0.2)",
                    color: "white",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    px: 2,
                  }}
                />
              )}
            </Box>

            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    background: "linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(33, 150, 243, 0.05) 100%)",
                    border: "1px solid rgba(33, 150, 243, 0.2)",
                    textAlign: "center",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 32px rgba(33, 150, 243, 0.2)",
                    },
                  }}
                >
                  <Speed sx={{ fontSize: 48, color: "#2196F3", mb: 2 }} />
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: "800",
                      background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 1,
                      fontSize: { xs: "2.5rem", md: "3rem" }
                    }}
                  >
                    {displayData.statistics.average.toFixed(1)}
                  </Typography>
                  <Typography variant="h6" sx={{ color: "#60a5fa", mb: 1 }}>
                    dB(A)
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#e3f2fd", fontWeight: 600 }}>
                    <Speed sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                    Rata-rata
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    background: "linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(244, 67, 54, 0.05) 100%)",
                    border: "1px solid rgba(244, 67, 54, 0.2)",
                    textAlign: "center",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 32px rgba(244, 67, 54, 0.2)",
                    },
                  }}
                >
                  <TrendingUp sx={{ fontSize: 48, color: "#f44336", mb: 2 }} />
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: "800",
                      background: "linear-gradient(45deg, #f44336 30%, #E53935 90%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 1,
                      fontSize: { xs: "2.5rem", md: "3rem" }
                    }}
                  >
                    {displayData.statistics.maximum.toFixed(1)}
                  </Typography>
                  <Typography variant="h6" sx={{ color: "#f44336", mb: 1 }}>
                    dB(A)
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#e3f2fd", fontWeight: 600 }}>
                    <TrendingUp sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                    Maksimum
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    background: "linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.05) 100%)",
                    border: "1px solid rgba(76, 175, 80, 0.2)",
                    textAlign: "center",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 32px rgba(76, 175, 80, 0.2)",
                    },
                  }}
                >
                  <CheckCircle sx={{ fontSize: 48, color: "#4CAF50", mb: 2 }} />
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: "800",
                      background: "linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 1,
                      fontSize: { xs: "2.5rem", md: "3rem" }
                    }}
                  >
                    {displayData.statistics.minimum.toFixed(1)}
                  </Typography>
                  <Typography variant="h6" sx={{ color: "#4CAF50", mb: 1 }}>
                    dB(A)
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#e3f2fd", fontWeight: 600 }}>
                    <CheckCircle sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                    Minimum
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4, borderColor: "rgba(255, 255, 255, 0.15)" }} />

            <Box
              sx={{
                textAlign: "center",
                p: 3,
                borderRadius: 2,
                background: "rgba(255, 255, 255, 0.03)",
              }}
            >
              <Typography
                variant="body1"
                sx={{ opacity: 0.9, lineHeight: 1.8, fontWeight: 500 }}
              >
                <Timeline sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                <strong>Sampel:</strong> {displayData.statistics.readings.length} • 
                <Settings sx={{ fontSize: 16, mx: 0.5, verticalAlign: "middle" }} />
                <strong>Kalibrasi:</strong> Otomatis • 
                <VolumeUp sx={{ fontSize: 16, mx: 0.5, verticalAlign: "middle" }} />
                <strong>A-Weighting:</strong> Aktif • 
                <TrendingUp sx={{ fontSize: 16, mx: 0.5, verticalAlign: "middle" }} />
                <strong>Frekuensi:</strong> Dianalisis
              </Typography>
            </Box>
          </CardContent>
        </FloatingCard>
      )}

      {/* Information Panel */}
      <FloatingCard>
        <CardContent sx={{ p: 5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: "linear-gradient(135deg, rgba(96, 165, 250, 0.2) 0%, rgba(96, 165, 250, 0.1) 100%)",
              }}
            >
              <VolumeUp sx={{ fontSize: 32, color: "#60a5fa" }} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#e3f2fd",
                background: "linear-gradient(45deg, #60a5fa 30%, #93c5fd 90%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              <VolumeUp sx={{ fontSize: 28, mr: 1, verticalAlign: "middle", color: "#60a5fa" }} />
              Tentang Pengukuran dB(A)
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Typography 
                variant="h6" 
                sx={{ 
                  opacity: 0.95, 
                  lineHeight: 1.8,
                  fontWeight: 500,
                  mb: 3,
                }}
              >
                <strong>dB(A) (A-weighted decibels)</strong> adalah standar internasional untuk 
                mengukur kebisingan yang memperhitungkan sensitivitas telinga manusia terhadap 
                frekuensi yang berbeda.
              </Typography>
              
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  background: "rgba(96, 165, 250, 0.1)",
                  border: "1px solid rgba(96, 165, 250, 0.2)",
                }}
              >
                <Typography variant="body1" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
                  <Psychology sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                  <strong>Kenapa A-weighting?</strong> Filter ini meniru respons telinga manusia, 
                  memberikan bobot lebih pada frekuensi mid-range (1-4 kHz) yang paling sensitif 
                  bagi pendengaran kita.
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, rgba(139, 195, 74, 0.15) 0%, rgba(139, 195, 74, 0.05) 100%)",
                  border: "1px solid rgba(139, 195, 74, 0.2)",
                  textAlign: "center",
                }}
              >
                <Typography variant="h6" sx={{ color: "#8bc34a", mb: 2, fontWeight: 600 }}>
                  <Speed sx={{ fontSize: 20, mr: 1, verticalAlign: "middle" }} />
                  Standar WHO
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
                  Organisasi Kesehatan Dunia merekomendasikan:
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Malam: &lt; 40 dB(A)<br/>
                    Rumah: &lt; 55 dB(A)<br/>
                    Kantor: &lt; 65 dB(A)
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </FloatingCard>

      <ModernPopup
        isVisible={showLoginAlert}
        title="Login Diperlukan"
        message="Untuk dapat membagikan hasil analisis ke peta komunitas, Anda perlu login terlebih dahulu. Bergabunglah dengan kami untuk berbagi data polusi suara!"
        type="login"
        onConfirm={handleLoginRedirect}
        onCancel={handleCloseAlert}
        onClose={handleCloseAlert}
        confirmText="Login Sekarang"
        cancelText="Nanti Saja"
      />
    </Box>
  );
};

export default RealTimeNoiseTab;
