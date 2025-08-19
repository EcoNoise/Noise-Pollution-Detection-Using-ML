// src/components/RealTimeNoiseTab.tsx
import React, { useState, useEffect } from "react";
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
  FormControlLabel,
  Divider,
  styled,
  CircularProgress,
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
} from "@mui/icons-material";
import { useRealTimeNoise } from "../hooks/useRealTimeNoise";
import { audioClassificationService } from "../services/audioClassificationService";
import { logger } from "../config/appConfig";

const StyledCard = styled(Card)(({ theme }) => ({
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  marginBottom: theme.spacing(2),
}));

interface RealTimeNoiseTabProps {
  className?: string;
}

const RealTimeNoiseTab: React.FC<RealTimeNoiseTabProps> = ({ className }) => {
  const [enableAWeighting, setEnableAWeighting] = useState(true);
  const [enableFrequencyAnalysis, setEnableFrequencyAnalysis] = useState(true);
  const [calibrationMode] = useState<"auto" | "manual">("auto");

  // Model loading state for YAMNet
  // Removed unused states: modelsLoaded, modelLoadError

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

  const getHealthIcon = (healthImpact: string) => {
    switch (healthImpact) {
      case "Aman":
        return <CheckCircle sx={{ color: "#4CAF50" }} />;
      case "Perhatian":
        return <Warning sx={{ color: "#FF9800" }} />;
      case "Berbahaya":
      case "Sangat Berbahaya":
        return <Error sx={{ color: "#f44336" }} />;
      default:
        return <Settings sx={{ color: "#9E9E9E" }} />;
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
    // Load YAMNet dan classifier models on component mount
    const loadModels = async () => {
       try {
         logger.info("Loading YAMNet and classifier models...");
         await audioClassificationService.loadModels();
         // No local state tracking necessary here
         logger.info("Models loaded successfully!");
       } catch (err: unknown) {
         logger.error("Error loading models:", err);
       }
     };

     loadModels();
   }, []);

  // Model Loading Status UI

  if (!isSupported) {
    return (
      <Alert severity="error">
        Browser Anda tidak mendukung Web Audio API. Silakan gunakan browser yang
        lebih modern.
      </Alert>
    );
  }

  return (
    <Box className={className} sx={{ p: 2 }}>
      <StyledCard>
        <CardContent>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <VolumeUp />
            Real-Time Noise Monitor
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Monitor tingkat kebisingan secara real-time dengan teknologi
            A-weighting untuk akurasi yang lebih tinggi
          </Typography>
        </CardContent>
      </StyledCard>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Model Status */}

      {/* Control Panel */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Kontrol & Pengaturan
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant={isListening ? "outlined" : "contained"}
                color={isListening ? "error" : "primary"}
                fullWidth
                startIcon={isListening ? <MicOff /> : <Mic />}
                onClick={isListening ? stopListening : startListening}
                size="large"
              >
                {isListening ? "Stop Monitor" : "Mulai Monitor"}
              </Button>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Settings />}
                onClick={calibrate}
                disabled={!currentReading}
                size="large"
              >
                Kalibrasi Manual
              </Button>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableAWeighting}
                      onChange={(e) => setEnableAWeighting(e.target.checked)}
                      disabled={isListening}
                    />
                  }
                  label="A-Weighting"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableFrequencyAnalysis}
                      onChange={(e) =>
                        setEnableFrequencyAnalysis(e.target.checked)
                      }
                      disabled={isListening}
                    />
                  }
                  label="Analisis Frekuensi"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Current Reading Display */}
      {currentReading && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h6" gutterBottom>
                  Tingkat Kebisingan
                </Typography>
                <Typography
                  sx={{
                    fontSize: "3rem",
                    fontWeight: "bold",
                    color: "primary.main",
                  }}
                >
                  {currentReading.db.toFixed(1)} dB
                </Typography>
                <Typography
                  sx={{
                    fontSize: "2.5rem",
                    fontWeight: "bold",
                    color: "#4CAF50",
                  }}
                >
                  {currentReading.dbA.toFixed(1)} dB(A)
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                  A-weighted untuk akurasi lebih tinggi
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  {getHealthIcon(currentReading.healthImpact)}
                  Status Kesehatan
                </Typography>

                <Chip
                  label={currentReading.category}
                  sx={{
                    backgroundColor: getColorForCategory(
                      currentReading.category
                    ),
                    color: "white",
                    fontWeight: "bold",
                    mb: 2,
                  }}
                />

                <Typography variant="body1" gutterBottom>
                  <strong>Dampak Kesehatan:</strong>{" "}
                  {currentReading.healthImpact}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  <strong>RMS:</strong> {currentReading.rms.toFixed(6)}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  <strong>Waktu:</strong>{" "}
                  {currentReading.timestamp.toLocaleTimeString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Audio Classification Results */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  justifyContent: "center",
                }}
              >
                <Psychology />
                Klasifikasi Audio
              </Typography>
              {currentReading?.classification ? (
                <>
                  <Typography
                    sx={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      color: "primary.main",
                      mb: 1,
                    }}
                  >
                    {currentReading.classification.topPrediction}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                      color: "#4CAF50",
                    }}
                  >
                    {(currentReading.classification.confidence * 100).toFixed(
                      1
                    )}
                    % Confidence
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                    Klasifikasi real-time setiap 3 detik
                  </Typography>
                </>
              ) : isListening ? (
                <>
                  <CircularProgress size={40} sx={{ mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Menunggu Klasifikasi...
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                    Memproses audio untuk klasifikasi
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body1" color="text.secondary">
                    Tidak Ada Data
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                    Mulai monitoring untuk melihat klasifikasi
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <TrendingUp />
                Detail Prediksi
              </Typography>

              {currentReading?.classification ? (
                <>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Top 3 Prediksi Audio:
                  </Typography>
                  {currentReading.classification.predictions
                    .slice(0, 3)
                    .map((prediction, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: index === 0 ? "bold" : "normal" }}
                          >
                            {prediction.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {(prediction.confidence * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: "100%",
                            bgcolor: "grey.300",
                            borderRadius: 1,
                            height: 6,
                          }}
                        >
                          <Box
                            sx={{
                              width: `${prediction.confidence * 100}%`,
                              bgcolor:
                                index === 0
                                  ? "primary.main"
                                  : prediction.confidence > 0.3
                                  ? "success.main"
                                  : "warning.main",
                              height: "100%",
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      </Box>
                    ))}

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                  >
                    <strong>Waktu Klasifikasi:</strong>{" "}
                    {currentReading.timestamp.toLocaleTimeString()}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Hasil klasifikasi akan muncul di sini setelah monitoring
                  dimulai.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Statistics */}
      {statistics.readings.length > 0 && (
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <TrendingUp />
              Statistik (A-weighted)
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {statistics.average.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rata-rata dB(A)
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error">
                    {statistics.maximum.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Maksimum dB(A)
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {statistics.minimum.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Minimum dB(A)
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary">
              <strong>Jumlah Sampel:</strong> {statistics.readings.length} |
              <strong> Mode Kalibrasi:</strong>{" "}
              {calibrationMode === "auto" ? "Otomatis" : "Manual"} |
              <strong> A-Weighting:</strong>{" "}
              {enableAWeighting ? "Aktif" : "Nonaktif"}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Information Panel */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tentang Pengukuran dB(A)
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>dB(A) (A-weighted decibels)</strong> adalah standar
            internasional untuk mengukur kebisingan yang memperhitungkan
            sensitivitas telinga manusia terhadap frekuensi yang berbeda.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RealTimeNoiseTab;
