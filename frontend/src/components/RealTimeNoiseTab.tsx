// src/components/RealTimeNoiseTab.tsx
import React, { useState, useEffect, useRef } from "react";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  ExpandMore,
  AudioFile,
  Analytics,
  Psychology,
} from "@mui/icons-material";
import { useRealTimeNoise } from "../hooks/useRealTimeNoise";
import { apiService, PredictionResponse } from "../services/api";
import { audioClassificationService } from "../services/audioClassificationService";

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

  // YAMNet Classification states
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<any>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<
    "idle" | "recording" | "processing" | "completed" | "error"
  >("idle");
  const [classificationError, setClassificationError] = useState<string | null>(
    null
  );

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const classificationStreamRef = useRef<MediaStream | null>(null);

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

  // Audio recording and classification functions
  const handleClassifyAudio = async () => {
    if (!modelsLoaded) {
      setClassificationError("Models are not loaded yet. Please wait...");
      return;
    }

    if (!isRecording) {
      try {
        setIsRecording(true);
        setRecordingStatus("recording");
        setClassificationResult(null);
        setClassificationError(null);
        setIsClassifying(true);

        console.log("Starting YAMNet audio classification...");

        // Use the audioClassificationService to record and predict
        const result = await audioClassificationService.recordAndPredict(3000); // 3 seconds

        console.log("YAMNet classification result:", result);
        setClassificationResult(result);
        setRecordingStatus("completed");
      } catch (err: unknown) {
        console.error("YAMNet classification error:", err);
        const errorMessage =
          err && typeof err === "object" && "message" in err
            ? String((err as any).message)
            : "YAMNet classification failed";
        setClassificationError(errorMessage);
        setRecordingStatus("error");
      } finally {
        setIsRecording(false);
        setIsClassifying(false);
      }
    } else {
      // Stop recording manually
      setIsRecording(false);
      setIsClassifying(false);
      setRecordingStatus("completed");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Initialize TensorFlow.js model
  useEffect(() => {
    // Load YAMNet and classifier models on component mount
    const loadModels = async () => {
      try {
        console.log("Loading YAMNet and classifier models...");
        await audioClassificationService.loadModels();
        setModelsLoaded(true);
        console.log("Models loaded successfully!");
      } catch (err: unknown) {
        console.error("Error loading models:", err);
        const errorMessage =
          err && typeof err === "object" && "message" in err
            ? String((err as any).message)
            : "Failed to load models";
        setModelLoadError(errorMessage);
      }
    };

    loadModels();
  }, []);

  // Model Loading Status UI
  const ModelStatusCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <Psychology />
          Status Model YAMNet
        </Typography>
        {!modelsLoaded && !modelLoadError && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Memuat model AI...</Typography>
          </Box>
        )}
        {modelsLoaded && (
          <Alert severity="success">
            Model YAMNet berhasil dimuat dan siap digunakan!
          </Alert>
        )}
        {modelLoadError && (
          <Alert severity="error">Gagal memuat model: {modelLoadError}</Alert>
        )}
      </CardContent>
    </Card>
  );

  // Audio Classification UI
  const AudioClassificationCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <AudioFile />
          Klasifikasi Audio YAMNet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Rekam audio selama 3 detik untuk mengidentifikasi sumber suara
          menggunakan AI
        </Typography>

        <Button
          variant="contained"
          color={isClassifying ? "error" : "primary"}
          startIcon={isClassifying ? <MicOff /> : <Mic />}
          onClick={handleClassifyAudio}
          disabled={!modelsLoaded}
          sx={{ mb: 2 }}
        >
          {isClassifying
            ? "Menghentikan Rekaman..."
            : "Mulai Klasifikasi Audio"}
        </Button>

        {isClassifying && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <CircularProgress size={24} />
            <Typography>Merekam dan menganalisis audio...</Typography>
          </Box>
        )}

        {classificationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {classificationError}
          </Alert>
        )}

        {classificationResult && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography
                variant="h6"
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Analytics />
                Hasil Klasifikasi
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Prediksi Sumber Suara:</strong>
                  </Typography>
                  {classificationResult.predictions?.map(
                    (pred: any, index: number) => (
                      <Box key={index} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          <strong>{pred.label}:</strong>{" "}
                          {(pred.confidence * 100).toFixed(1)}%
                        </Typography>
                        <Box
                          sx={{
                            width: "100%",
                            bgcolor: "grey.300",
                            borderRadius: 1,
                            height: 8,
                            mt: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: `${pred.confidence * 100}%`,
                              bgcolor:
                                pred.confidence > 0.5
                                  ? "success.main"
                                  : "warning.main",
                              height: "100%",
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      </Box>
                    )
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Analisis Kebisingan:</strong>
                  </Typography>
                  {classificationResult.noiseAnalysis && (
                    <>
                      <Typography variant="body2">
                        <strong>Tingkat dB(A):</strong>{" "}
                        {classificationResult.noiseAnalysis.dbA?.toFixed(1)}{" "}
                        dB(A)
                      </Typography>
                      <Typography variant="body2">
                        <strong>Kategori:</strong>{" "}
                        {classificationResult.noiseAnalysis.category}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Dampak Kesehatan:</strong>{" "}
                        {classificationResult.noiseAnalysis.healthImpact}
                      </Typography>
                    </>
                  )}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );

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
      <ModelStatusCard />

      {/* Audio Classification */}
      <AudioClassificationCard />

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
          <Typography variant="body2" paragraph>
            <strong>Fitur Monitoring Real-time:</strong>
          </Typography>
          <ul>
            <li>A-weighting filter sesuai standar IEC 61672-1</li>
            <li>Kalibrasi otomatis berdasarkan karakteristik perangkat</li>
            <li>Analisis frekuensi real-time untuk akurasi lebih tinggi</li>
            <li>Kompensasi noise latar belakang</li>
            <li>Penilaian dampak kesehatan berdasarkan WHO dan EPA</li>
          </ul>

          <Typography variant="body2" paragraph sx={{ mt: 2 }}>
            <strong>Fitur Klasifikasi Audio:</strong>
          </Typography>
          <ul>
            <li>Klasifikasi multi-label menggunakan YAMNet + Custom Model</li>
            <li>
              Identifikasi 6 kategori sumber suara: Kendaraan, Konstruksi, Mesin
              Rumah Tangga, Manusia, Lingkungan, Hewan
            </li>
            <li>Analisis dampak kesehatan berdasarkan tingkat kebisingan</li>
            <li>Confidence score untuk tingkat kepercayaan prediksi</li>
            <li>Pemrosesan audio real-time dengan teknologi deep learning</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RealTimeNoiseTab;
