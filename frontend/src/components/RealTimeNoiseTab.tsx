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
  Switch,
  styled,
  CircularProgress,
  Paper,
  LinearProgress,
  Divider,
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
} from "@mui/icons-material";
import { Activity } from "lucide-react";
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

const StyledCard = styled(Card)(({ theme }) => ({
  background: "rgba(30, 41, 59, 0.5)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "16px",
  height: "100%",
  textAlign: "left",
  color: "#fff",
}));

const GlassCard = styled(Card)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 16,
  color: "white",
  marginBottom: theme.spacing(3),
  transition: "all 0.3s ease",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.08)",
    transform: "translateY(-2px)",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
  },
}));

const MetricCard = styled(Paper)(({ theme }) => ({
  background:
    "linear-gradient(135deg, rgba(66, 165, 245, 0.1) 0%, rgba(33, 150, 243, 0.2) 100%)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(33, 150, 243, 0.3)",
  borderRadius: 20,
  padding: theme.spacing(3),
  textAlign: "center",
  color: "white",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "scale(1.02)",
    boxShadow: "0 8px 32px rgba(33, 150, 243, 0.3)",
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 50,
  padding: "12px 24px",
  fontSize: "1rem",
  fontWeight: 600,
  textTransform: "none",
  marginRight: theme.spacing(2),
  marginBottom: theme.spacing(1),
  transition: "all 0.3s ease",
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

const GradientText = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  background: "linear-gradient(45deg, #ffffff 30%, #e3f2fd 90%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  marginBottom: theme.spacing(2),
}));

const PulsingIcon = styled(Box)(({ theme }) => ({
  animation: "pulse 2s infinite",
  "@keyframes pulse": {
    "0%": {
      transform: "scale(1)",
      opacity: 1,
    },
    "50%": {
      transform: "scale(1.1)",
      opacity: 0.8,
    },
    "100%": {
      transform: "scale(1)",
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

  // Tentukan apakah tombol share harus disabled
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

  return (
    <Box className={className} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {/* Header Card */}
      <StyledCard>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <PulsingIcon>
              <VolumeUp sx={{ fontSize: 40 }} />
            </PulsingIcon>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background:
                    "linear-gradient(45deg, #ffffff 30%, #e3f2fd 90%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  mb: 1,
                }}
              >
                Real-Time Noise Monitor
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Monitor tingkat kebisingan secara real-time dengan teknologi
                A-weighting dan analisis frekuensi untuk akurasi maksimal
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </StyledCard>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            backgroundColor: "rgba(244, 67, 54, 0.1)",
            color: "white",
            border: "1px solid rgba(244, 67, 54, 0.3)",
            borderRadius: 2,
          }}
        >
          {error}
        </Alert>
      )}

      {/* Microphone Muted/No Signal Alert */}
      {isListening && displayData.reading?.category === "Tidak Ada Sinyal" && (
        <Alert
          severity="warning"
          sx={{
            mb: 3,
            backgroundColor: "rgba(255, 152, 0, 0.1)",
            color: "white",
            border: "1px solid rgba(255, 152, 0, 0.3)",
            borderRadius: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <MicOff />
            <Typography>
              Mikrofon tidak mendeteksi sinyal audio. Pastikan mikrofon tidak dimatikan dan memiliki izin akses.
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Cache Info Alert */}
      {!isListening && cachedReading && (
          <Alert
            severity="info"
            sx={{
              mb: 3,
              backgroundColor: "rgba(33, 150, 243, 0.1)",
              color: "white",
              border: "1px solid rgba(33, 150, 243, 0.3)",
              borderRadius: 2,
            }}
          >
            Data hasil monitoring terakhir tersimpan. Anda masih bisa membagikan ke peta.
          </Alert>
        )}

      {/* Control Panel */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            color: "#fff",
            display: "flex",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Settings sx={{ mr: 1 }} />
          Kontrol & Pengaturan
        </Typography>
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
            variant="outlined"
            onClick={isListening ? handleStopListening : handleStartListening}
            sx={{
              borderColor: isListening ? "#f44336" : "#4caf50",
              color: isListening ? "#f44336" : "#4caf50",
              borderRadius: "50px",
              px: 3,
              py: 1,
              "&:hover": {
                borderColor: isListening ? "#d32f2f" : "#388e3c",
                backgroundColor: isListening
                  ? "rgba(244, 67, 54, 0.1)"
                  : "rgba(76, 175, 80, 0.1)",
              },
            }}
            startIcon={
              isListening ? <MicOff sx={{ color: "inherit" }} /> : <Mic />
            }
          >
            {isListening ? "Stop Monitor" : "Mulai Monitor"}
          </ActionButton>

          {!displayData.reading && (
            <Button
              variant="contained"
              onClick={shareToMap}
              disabled={isShareButtonDisabled}
              sx={{
                bgcolor: isShareButtonDisabled ? "#666" : "#3b82f6",
                color: "#fff",
                borderRadius: "50px",
                px: 3,
                py: 1,
                "&:hover": {
                  bgcolor: isShareButtonDisabled ? "#666" : "#2563eb",
                },
                "&.Mui-disabled": {
                  bgcolor: "#666",
                  color: "#999",
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <Activity size={18} />
                Bagikan ke Peta
              </Box>
            </Button>
          )}
        </Box>
      </Box>

      {/* Current Reading Display */}
      {displayData.reading && (
        <Box sx={{ mb: 4 }}>
          {/* Header dengan tombol seperti di Rekam & Analisis */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            mb={4}
          >
            <GradientText variant="h4">
              {displayData.isFromCache ? "Hasil Monitoring Terakhir" : "Monitor Real-time Aktif"}
            </GradientText>
            
            {displayData.isFromCache && (
              <Button
                variant="outlined"
                onClick={shareToMap}
                disabled={isShareButtonDisabled}
                sx={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.3)",
                  borderRadius: "50px",
                  px: 3,
                  py: 1,
                  "&:hover": { 
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    color: "#3b82f6",
                  },
                  "&.Mui-disabled": {
                    borderColor: "rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.5)",
                  },
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Activity size={18} />
                  Bagikan ke Peta
                </Box>
              </Button>
            )}
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <StyledCard
                sx={{
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                  },
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    <GraphicEq sx={{ fontSize: 24, color: "#60a5fa" }} />
                    <Typography color="rgba(255,255,255,0.8)">
                      Tingkat Kebisingan (dB)
                    </Typography>
                  </Box>
                  <Typography variant="h2" sx={{ fontWeight: "bold" }}>
                    {displayData.reading.category === "Tidak Ada Sinyal" 
                      ? "-- dBA" 
                      : `${displayData.reading.dbA.toFixed(1)} dBA`
                    }
                  </Typography>
                  <Typography
                    variant="body2"
                    color="rgba(255,255,255,0.7)"
                    sx={{ mt: 1 }}
                  >
                    {displayData.reading.category === "Tidak Ada Sinyal" 
                      ? "Tidak ada sinyal audio yang terdeteksi"
                      : <>
                          <strong>RMS:</strong> {displayData.reading.rms.toFixed(6)}
                        </>
                    }
                  </Typography>
                </CardContent>
              </StyledCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <StyledCard>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    {getHealthIcon(displayData.reading.healthImpact)}
                    <Typography color="rgba(255,255,255,0.8)">
                      Potensi Dampak Kesehatan
                    </Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: "bold" }}>
                    {displayData.reading.healthImpact}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="rgba(255,255,255,0.7)"
                    sx={{ mt: 1, mb: 2 }}
                  >
                    Kategori: {displayData.reading.category}
                    {displayData.reading.category === "Tidak Ada Sinyal" && 
                      " - Periksa mikrofon Anda"
                    }
                  </Typography>
                  <Typography
                    variant="body2"
                    color="rgba(255,255,255,0.7)"
                  >
                    <strong>Waktu:</strong>{" "}
                    {displayData.reading.timestamp.toLocaleTimeString()}
                  </Typography>
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Audio Classification Results */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <StyledCard sx={{ textAlign: "center", minHeight: 320 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                  <Psychology sx={{ fontSize: 24, color: "#a78bfa" }} />
                  <Typography color="rgba(255,255,255,0.8)">
                    Klasifikasi Audio
                  </Typography>
                </Box>

                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    mt: 2,
                  }}
                >
                  {displayData.reading?.classification ? (
                    <>
                      <Typography variant="h3" sx={{ fontWeight: "bold", mb: 1 }}>
                        {displayData.reading.classification.topPrediction}
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: "bold",
                          color: "#4CAF50",
                          mb: 2,
                        }}
                      >
                        {(displayData.reading.classification.confidence * 100).toFixed(1)}% Confidence
                      </Typography>
                      <Typography
                        variant="body2"
                        color="rgba(255,255,255,0.7)"
                      >
                        {displayData.isFromCache 
                          ? "Hasil klasifikasi terakhir" 
                          : "Klasifikasi real-time setiap 3 detik"}
                      </Typography>
                    </>
                  ) : isListening ? (
                    <>
                      <CircularProgress
                        size={60}
                        sx={{
                          mb: 3,
                          color: "#2196F3",
                          "& .MuiCircularProgress-circle": {
                            strokeLinecap: "round",
                          },
                        }}
                      />
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Menunggu Klasifikasi...
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.7)">
                        Memproses audio untuk klasifikasi
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Box sx={{ mb: 3, opacity: 0.5 }}>
                        <Psychology sx={{ fontSize: 60, color: "#666" }} />
                      </Box>
                      <Typography variant="h6" sx={{ mb: 2, opacity: 0.7 }}>
                        Tidak Ada Data
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.6 }}>
                        Mulai monitoring untuk melihat klasifikasi
                      </Typography>
                    </>
                  )}
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <StyledCard sx={{ minHeight: 320 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                  <TrendingUp sx={{ fontSize: 24, color: "#60a5fa" }} />
                  <Typography color="rgba(255,255,255,0.8)">
                    Detail Prediksi
                  </Typography>
                </Box>

              <Box sx={{ flexGrow: 1 }}>
                {displayData.reading?.classification ? (
                  <>
                    <Typography
                      variant="body2"
                      sx={{ mb: 3, opacity: 0.8, color: "#e3f2fd" }}
                    >
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
                              mb: 1,
                            }}
                          >
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: index === 0 ? "bold" : "normal",
                                color: index === 0 ? "#2196F3" : "#e3f2fd",
                              }}
                            >
                              {prediction.label}
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 600,
                                color: index === 0 ? "#4CAF50" : "#e3f2fd",
                              }}
                            >
                              {(prediction.confidence * 100).toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={prediction.confidence * 100}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: "rgba(255, 255, 255, 0.1)",
                              "& .MuiLinearProgress-bar": {
                                borderRadius: 4,
                                background:
                                  index === 0
                                    ? "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)"
                                    : prediction.confidence > 0.3
                                    ? "linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)"
                                    : "linear-gradient(45deg, #FF9800 30%, #FFC107 90%)",
                              },
                            }}
                          />
                        </Box>
                      ))}

                    <Box sx={{ mt: "auto", pt: 2 }}>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        <strong>Waktu Klasifikasi:</strong>{" "}
                        {displayData.reading.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{ opacity: 0.7, textAlign: "center" }}
                    >
                      Hasil klasifikasi akan muncul di sini setelah monitoring
                      dimulai.
                    </Typography>
                  </Box>
                )}
              </Box>
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
      </Box>

      {/* Statistics */}
      {displayData.statistics && displayData.statistics.readings.length > 0 && (
        <GlassCard sx={{ mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
              <Timeline sx={{ fontSize: 28, color: "#2196F3" }} />
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "#e3f2fd" }}
              >
                Statistik (A-weighted)
                {displayData.isFromCache && (
                  <Chip
                    label="Hasil Terakhir"
                    size="small"
                    sx={{
                      ml: 2,
                      backgroundColor: "rgba(33, 150, 243, 0.2)",
                      color: "white",
                      fontSize: "0.75rem",
                    }}
                  />
                )}
              </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <MetricCard
                  sx={{
                    background:
                      "linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.2) 100%)",
                  }}
                >
                  <Speed sx={{ fontSize: 32, color: "#2196F3", mb: 2 }} />
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: "bold",
                      background:
                        "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 1,
                    }}
                  >
                    {displayData.statistics.average.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#e3f2fd" }}>
                    Rata-rata dB(A)
                  </Typography>
                </MetricCard>
              </Grid>

              <Grid item xs={12} sm={4}>
                <MetricCard
                  sx={{
                    background:
                      "linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.2) 100%)",
                  }}
                >
                  <TrendingUp sx={{ fontSize: 32, color: "#f44336", mb: 2 }} />
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: "bold",
                      background:
                        "linear-gradient(45deg, #f44336 30%, #E53935 90%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 1,
                    }}
                  >
                    {displayData.statistics.maximum.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#e3f2fd" }}>
                    Maksimum dB(A)
                  </Typography>
                </MetricCard>
              </Grid>

              <Grid item xs={12} sm={4}>
                <MetricCard
                  sx={{
                    background:
                      "linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.2) 100%)",
                  }}
                >
                  <CheckCircle sx={{ fontSize: 32, color: "#4CAF50", mb: 2 }} />
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: "bold",
                      background:
                        "linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 1,
                    }}
                  >
                    {displayData.statistics.minimum.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#e3f2fd" }}>
                    Minimum dB(A)
                  </Typography>
                </MetricCard>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3, borderColor: "rgba(255, 255, 255, 0.2)" }} />

            <Typography
              variant="body2"
              sx={{ opacity: 0.8, textAlign: "center" }}
            >
              <strong>Jumlah Sampel:</strong> {displayData.statistics.readings.length} |{" "}
              <strong>Mode Kalibrasi:</strong> Otomatis |{" "}
              <strong>A-Weighting:</strong> Aktif |{" "}
              <strong>Analisis Frekuensi:</strong> Aktif
            </Typography>
          </CardContent>
        </GlassCard>
      )}

      {/* Information Panel */}
      <GlassCard>
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: "#e3f2fd",
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 3,
            }}
          >
            <VolumeUp sx={{ fontSize: 24 }} />
            Tentang Pengukuran dB(A)
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
            <strong>dB(A) (A-weighted decibels)</strong> adalah standar
            internasional untuk mengukur kebisingan yang memperhitungkan
            sensitivitas telinga manusia terhadap frekuensi yang berbeda.
          </Typography>
        </CardContent>
      </GlassCard>

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
