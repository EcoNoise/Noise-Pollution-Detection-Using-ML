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
  FormControlLabel,
} from "@mui/material";
import {
  Mic,
  MicOff,
  Settings,
  TrendingUp,
  VolumeUp,
  Warning,
  CheckCircle,
  Error,
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
import { useNavigate } from 'react-router-dom';
import SessionManager from "../utils/tokenManager";
import ModernPopup from "./ModernPopup";
import { createHealthSession, endHealthSession, createExposureLog } from "../services/healthService";
import { DailyAudioService } from "../services/dailyAudioService";

const StyledCard = styled(Card)(({ theme }) => ({
  background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
  color: "white",
  marginBottom: theme.spacing(3),
  borderRadius: 16,
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
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
  background: "linear-gradient(135deg, rgba(66, 165, 245, 0.1) 0%, rgba(33, 150, 243, 0.2) 100%)",
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

const StatusCard = styled(Paper)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.08)",
  backdropFilter: "blur(15px)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: 20,
  padding: theme.spacing(3),
  color: "white",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  transition: "all 0.3s ease",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.25)",
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

const StyledSwitch = styled(Switch)(({ theme }) => ({
  "& .MuiSwitch-switchBase.Mui-checked": {
    color: "#2196F3",
    "&:hover": {
      backgroundColor: "rgba(33, 150, 243, 0.08)",
    },
  },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
    backgroundColor: "#2196F3",
  },
  "& .MuiSwitch-track": {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
}));

const GradientChip = styled(Chip)(({ theme, severity }: { theme?: any, severity: string }) => ({
  background: severity === "Aman" 
    ? "linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)"
    : severity === "Perhatian"
    ? "linear-gradient(45deg, #FF9800 30%, #FFC107 90%)"
    : "linear-gradient(45deg, #f44336 30%, #E53935 90%)",
  color: "white",
  fontWeight: "bold",
  fontSize: "1rem",
  padding: "8px 16px",
  borderRadius: 20,
  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
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

const RealTimeNoiseTab: React.FC<RealTimeNoiseTabProps> = ({ className }) => {
  const navigate = useNavigate();
  const [enableAWeighting, setEnableAWeighting] = useState(true);
  const [enableFrequencyAnalysis, setEnableFrequencyAnalysis] = useState(true);
  const [calibrationMode] = useState<"auto" | "manual">("auto");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sm = SessionManager.getInstance();
        const auth = await sm.isAuthenticated();
        setIsAuthenticated(auth);
      } catch (e) {
        logger.warn("Auth check failed:", e);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const {
    isListening,
    currentReading,
    statistics,
    error,
    startListening,
    stopListening,
    calibrate,
    isSupported,
  } = useRealTimeNoise({
    enableAWeighting,
    enableFrequencyAnalysis,
    calibrationMode,
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

  // Accumulate readings while listening to compute session averages
  useEffect(() => {
    if (isListening && currentReading) {
      sumDbRef.current += currentReading.db;
      sumDbARef.current += currentReading.dbA;
      countRef.current += 1;
    }
  }, [isListening, currentReading]);

  const handleStartListening = useCallback(async () => {
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
    stopListening();
    const start = sessionStartRef.current;
    const count = countRef.current || 0;
    const avg_db = count > 0 ? sumDbRef.current / count : undefined;
    const avg_dba = count > 0 ? sumDbARef.current / count : undefined;
    const duration_seconds = start ? Math.max(1, Math.round((Date.now() - start) / 1000)) : 0;

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
  }, [stopListening]);

  const getHealthIcon = (healthImpact: string) => {
    switch (healthImpact) {
      case "Aman":
        return <CheckCircle sx={{ color: "#4CAF50", fontSize: 28 }} />;
      case "Perhatian":
        return <Warning sx={{ color: "#FF9800", fontSize: 28 }} />;
      case "Berbahaya":
      case "Sangat Berbahaya":
        return <Error sx={{ color: "#f44336", fontSize: 28 }} />;
      default:
        return <Settings sx={{ color: "#9E9E9E", fontSize: 28 }} />;
    }
  };

  const getColorForCategory = (category: string) => {
    switch (category) {
      case "Tenang":
        return "#4CAF50";
      case "Sedang":
        return "#FF9800";
      case "Bising":
        return "#f44336";
      case "Sangat Bising":
        return "#d32f2f";
      default:
        return "#9E9E9E";
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

  const shareToMap = () => {
    if (!isAuthenticated) {
      setShowLoginAlert(true);
      return;
    }

    if (!currentReading) return;
    
    // Create prediction data similar to HomePage format
    const predictions = {
      noiseLevel: currentReading.dbA,
      noiseSource: currentReading.classification?.topPrediction || "Unknown",
      healthImpact: currentReading.healthImpact,
      timestamp: currentReading.timestamp.toISOString(),
      confidence: currentReading.classification?.confidence || 0,
    };

    mapService.shareNoiseData({
      analysis: predictions as any, // Type assertion for compatibility
    });
    navigate("/maps");
  };

  const handleLoginRedirect = () => {
    setShowLoginAlert(false);
    navigate("/login");
  };

  const handleCloseAlert = () => {
    setShowLoginAlert(false);
  };

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
                  background: "linear-gradient(45deg, #ffffff 30%, #e3f2fd 90%)",
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
                A-weighting untuk akurasi yang lebih tinggi
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
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <ActionButton
            variant="outlined"
            onClick={isListening ? handleStopListening : handleStartListening}
            sx={{
              borderColor: isListening ? "#f44336" : "#4caf50",
              color: isListening ? "#f44336" : "#4caf50",
              "&:hover": {
                borderColor: isListening ? "#d32f2f" : "#388e3c",
                backgroundColor: isListening
                  ? "rgba(244, 67, 54, 0.1)"
                  : "rgba(76, 175, 80, 0.1)",
              },
            }}
            startIcon={
              isListening ? (
                <MicOff sx={{ color: "inherit" }} />
              ) : (
                <Mic />
              )
            }
          >
            {isListening ? "Stop Monitor" : "Mulai Monitor"}
          </ActionButton>

          <Button
            variant="contained"
            onClick={shareToMap}
            sx={{
              bgcolor: "#3b82f6",
              color: "#fff",
              borderRadius: "50px",
              "&:hover": { bgcolor: "#2563eb" },
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Activity size={18} />
              Bagikan ke Peta
            </Box>
          </Button>

          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={calibrate}
            disabled={!currentReading}
          >
            Kalibrasi Manual
          </Button>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <FormControlLabel
              control={
                <StyledSwitch
                  checked={enableAWeighting}
                  onChange={(e) => setEnableAWeighting(e.target.checked)}
                  disabled={isListening}
                />
              }
              label="A-Weighting"
            />
            <FormControlLabel
              control={
                <StyledSwitch
                  checked={enableFrequencyAnalysis}
                  onChange={(e) => setEnableFrequencyAnalysis(e.target.checked)}
                  disabled={isListening}
                />
              }
              label="Analisis Frekuensi"
            />
          </Box>
        </Box>
      </Box>
      {/* Current Reading Display */}
      {currentReading && (
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <MetricCard>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2 }}>
                  <GraphicEq sx={{ fontSize: 28, color: "#2196F3" }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#e3f2fd" }}>
                    Tingkat Kebisingan
                  </Typography>
                </Box>
                
                <Typography
                  sx={{
                    fontSize: "3.5rem",
                    fontWeight: "bold",
                    background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    lineHeight: 1,
                    mb: 1,
                  }}
                >
                  {currentReading.dbA.toFixed(1)} dBA
                </Typography>
                
                
                
                
              </MetricCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <StatusCard>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                  {getHealthIcon(currentReading.healthImpact)}
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#e3f2fd" }}>
                    Status Kesehatan
                  </Typography>
                </Box>

                <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
                  <GradientChip
                    label={currentReading.category}
                    severity={currentReading.healthImpact}
                  />
                </Box>

                <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Typography variant="body1" sx={{ mb: 2, color: "#e3f2fd" }}>
                    <strong>Dampak Kesehatan:</strong>{" "}
                    {currentReading.healthImpact}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.8 }}>
                    <strong>RMS:</strong> {currentReading.rms.toFixed(6)}
                  </Typography>

                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    <strong>Waktu:</strong>{" "}
                    {currentReading.timestamp.toLocaleTimeString()}
                  </Typography>
                </Box>
              </StatusCard>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Audio Classification Results */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <StatusCard sx={{ textAlign: "center", minHeight: 320 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, mb: 3 }}>
                <Psychology sx={{ fontSize: 28, color: "#2196F3" }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#e3f2fd" }}>
                  Klasifikasi Audio
                </Typography>
              </Box>
              
              <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                {currentReading?.classification ? (
                  <>
                    <Typography
                      sx={{
                        fontSize: "2.2rem",
                        fontWeight: "bold",
                        background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        mb: 2,
                        lineHeight: 1.2,
                      }}
                    >
                      {currentReading.classification.topPrediction}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        background: "linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        mb: 2,
                      }}
                    >
                      {(currentReading.classification.confidence * 100).toFixed(1)}% Confidence
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, color: "#e3f2fd" }}>
                      Klasifikasi real-time setiap 3 detik
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
                    <Typography variant="h6" sx={{ mb: 2, color: "#e3f2fd" }}>
                      Menunggu Klasifikasi...
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
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
            </StatusCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <StatusCard sx={{ minHeight: 320 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <TrendingUp sx={{ fontSize: 28, color: "#2196F3" }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#e3f2fd" }}>
                  Detail Prediksi
                </Typography>
              </Box>

              <Box sx={{ flexGrow: 1 }}>
                {currentReading?.classification ? (
                  <>
                    <Typography
                      variant="body2"
                      sx={{ mb: 3, opacity: 0.8, color: "#e3f2fd" }}
                    >
                      Top 3 Prediksi Audio:
                    </Typography>
                    {currentReading.classification.predictions
                      .slice(0, 3)
                      .map((prediction, index) => (
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
                                color: index === 0 ? "#2196F3" : "#e3f2fd"
                              }}
                            >
                              {prediction.label}
                            </Typography>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: 600,
                                color: index === 0 ? "#4CAF50" : "#e3f2fd"
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
                                background: index === 0
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
                      <Typography
                        variant="body2"
                        sx={{ opacity: 0.8 }}
                      >
                        <strong>Waktu Klasifikasi:</strong>{" "}
                        {currentReading.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <Typography variant="body1" sx={{ opacity: 0.7, textAlign: "center" }}>
                      Hasil klasifikasi akan muncul di sini setelah monitoring
                      dimulai.
                    </Typography>
                  </Box>
                )}
              </Box>
            </StatusCard>
          </Grid>
        </Grid>
      </Box>

      {/* Statistics */}
      {statistics.readings.length > 0 && (
        <GlassCard sx={{ mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
              <Timeline sx={{ fontSize: 28, color: "#2196F3" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#e3f2fd" }}>
                Statistik (A-weighted)
              </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <MetricCard sx={{ background: "linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.2) 100%)" }}>
                  <Speed sx={{ fontSize: 32, color: "#2196F3", mb: 2 }} />
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: "bold",
                      background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 1,
                    }}
                  >
                    {statistics.average.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#e3f2fd" }}>
                    Rata-rata dB(A)
                  </Typography>
                </MetricCard>
              </Grid>

              <Grid item xs={12} sm={4}>
                <MetricCard sx={{ background: "linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.2) 100%)" }}>
                  <TrendingUp sx={{ fontSize: 32, color: "#f44336", mb: 2 }} />
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: "bold",
                      background: "linear-gradient(45deg, #f44336 30%, #E53935 90%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 1,
                    }}
                  >
                    {statistics.maximum.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#e3f2fd" }}>
                    Maksimum dB(A)
                  </Typography>
                </MetricCard>
              </Grid>

              <Grid item xs={12} sm={4}>
                <MetricCard sx={{ background: "linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.2) 100%)" }}>
                  <CheckCircle sx={{ fontSize: 32, color: "#4CAF50", mb: 2 }} />
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: "bold",
                      background: "linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 1,
                    }}
                  >
                    {statistics.minimum.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#e3f2fd" }}>
                    Minimum dB(A)
                  </Typography>
                </MetricCard>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3, borderColor: "rgba(255, 255, 255, 0.2)" }} />

            <Typography variant="body2" sx={{ opacity: 0.8, textAlign: "center" }}>
              <strong>Jumlah Sampel:</strong> {statistics.readings.length} |{" "}
              <strong>Mode Kalibrasi:</strong>{" "}
              {calibrationMode === "auto" ? "Otomatis" : "Manual"} |{" "}
              <strong>A-Weighting:</strong>{" "}
              {enableAWeighting ? "Aktif" : "Nonaktif"}
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
