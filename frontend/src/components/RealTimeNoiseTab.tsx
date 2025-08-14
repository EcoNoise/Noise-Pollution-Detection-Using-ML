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
import {
  translateNoiseSource,
  translateHealthImpact,
  getHealthImpactDescription,
  getNoiseSourceIcon,
} from "../utils/translationUtils";

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

  // Classification states
  const [isRecording, setIsRecording] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationResult, setClassificationResult] =
    useState<PredictionResponse | null>(null);
  const [classificationError, setClassificationError] = useState<string | null>(
    null
  );
  const [recordingDuration, setRecordingDuration] = useState(0);
  // const [autoClassify, setAutoClassify] = useState(false); // Future feature

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
  const startRecording = async () => {
    try {
      console.log("🎤 Starting recording...");
      setClassificationError(null);
      setClassificationResult(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      console.log("✅ Got media stream:", stream);
      classificationStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      console.log("✅ Created MediaRecorder:", mediaRecorder.mimeType);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log("📊 Data available:", event.data.size, "bytes");
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log(
          "⏹️ Recording stopped, chunks:",
          audioChunksRef.current.length
        );
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        console.log("🎵 Created audio blob:", audioBlob.size, "bytes");
        classifyAudio(audioBlob);

        // Cleanup
        stream.getTracks().forEach((track) => track.stop());
      };

      setIsRecording(true);
      setRecordingDuration(0);
      mediaRecorder.start();
      console.log("🔴 Recording started");

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          // Auto-stop after 10 seconds for classification
          if (newDuration >= 10) {
            console.log("⏰ Auto-stopping recording at 10 seconds");
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    } catch (error) {
      console.error("❌ Recording error:", error);
      setClassificationError(
        "Gagal mengakses mikrofon. Pastikan izin mikrofon telah diberikan."
      );
    }
  };

  const stopRecording = () => {
    console.log("⏹️ Stopping recording...");
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (classificationStreamRef.current) {
        classificationStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
        classificationStreamRef.current = null;
      }
      console.log("✅ Recording stopped successfully");
    } else {
      console.log("⚠️ No active recording to stop");
    }
  };

  const classifyAudio = async (audioBlob: Blob) => {
    try {
      console.log("🎵 Starting classification...");
      setIsClassifying(true);
      setClassificationError(null);

      // Convert blob to file
      const audioFile = new File([audioBlob], `recording_${Date.now()}.wav`, {
        type: "audio/wav",
      });

      console.log("🎵 Classifying audio:", {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type,
      });

      const result = await apiService.uploadAudioFile(audioFile);
      console.log("✅ Classification result:", result);
      setClassificationResult(result.predictions);
    } catch (error: unknown) {
      console.error("❌ Classification error:", error);

      // Simple error message extraction
      const errorMessage = String(error);

      // Try to extract axios error details safely
      let detailMessage = errorMessage;
      try {
        const axiosError = error as any;
        if (axiosError?.response?.data?.detail) {
          detailMessage = axiosError.response.data.detail;
        } else if (axiosError?.message) {
          detailMessage = axiosError.message;
        }
      } catch {
        // Fallback to string conversion
        detailMessage = errorMessage;
      }

      setClassificationError(`Gagal mengklasifikasi audio: ${detailMessage}`);
    } finally {
      setIsClassifying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (classificationStreamRef.current) {
        classificationStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

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

      {classificationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {classificationError}
        </Alert>
      )}

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

      {/* Audio Classification Section */}
      <Accordion defaultExpanded sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Psychology color="primary" />
            <Typography variant="h6">Klasifikasi Audio Real-time</Typography>
            {isClassifying && <CircularProgress size={20} />}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <Button
                  variant={isRecording ? "outlined" : "contained"}
                  color={isRecording ? "error" : "secondary"}
                  startIcon={isRecording ? <MicOff /> : <AudioFile />}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isClassifying}
                  size="large"
                >
                  {isRecording
                    ? `Stop (${formatTime(recordingDuration)})`
                    : "Rekam & Klasifikasi"}
                </Button>

                {isClassifying && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2">Menganalisis...</Typography>
                  </Box>
                )}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Rekam audio selama maksimal 10 detik untuk klasifikasi sumber
                suara dan analisis dampak kesehatan.
              </Typography>
            </Grid>

            {classificationResult && (
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: "background.paper" }}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <Analytics color="primary" />
                      Hasil Klasifikasi
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <span style={{ fontSize: "1.2rem" }}>
                            {getNoiseSourceIcon(
                              classificationResult.noise_source
                            )}
                          </span>
                          <Typography variant="body1">
                            <strong>Sumber Suara:</strong>{" "}
                            {translateNoiseSource(
                              classificationResult.noise_source
                            )}
                          </Typography>
                        </Box>
                      </Grid>



                      <Grid item xs={12}>
                        <Chip
                          label={`Akurasi: ${(
                            classificationResult.confidence_score *
                            100
                          ).toFixed(1)}%`}
                          color="primary"
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Current Reading Display */}
      {currentReading && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Tingkat Kebisingan
                </Typography>
                <Typography sx={{ fontSize: '3rem', fontWeight: 'bold', color: 'primary.main' }}>
                  {currentReading.db.toFixed(1)} dB
                </Typography>
                <Typography sx={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
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
