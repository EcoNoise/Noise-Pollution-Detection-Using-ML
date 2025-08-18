// src/components/HomePage.tsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
  styled,
  keyframes,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import { VolumeX, Activity, Clock, Mic, Square, BarChart2 } from "lucide-react";
import { apiService, PredictionResponse } from "../services/api";
import { mapService } from "../services/mapService";
import { DailyAudioService } from "../services/dailyAudioService";
import AudioVisualizer from "./AudioVisualizer";
import ModernPopup from "./ModernPopup";
import RealTimeNoiseTab from "./RealTimeNoiseTab";
import {
  translateNoiseSource,
  translateHealthImpact,
  getHealthImpactDescription,
  getNoiseSourceIcon,
} from "../utils/translationUtils";
import SessionManager from "../utils/tokenManager";

type ChipColor =
  | "success"
  | "warning"
  | "error"
  | "default"
  | "primary"
  | "secondary"
  | "info";

const recordingPulse = keyframes`
  0%, 100% {
    transform: scale(1);
    background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
  }
  50% {
    transform: scale(1.1);
    background: linear-gradient(135deg, #fca5a5 0%, #f87171 100%);
  }
`;

const glowAnimation = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.5),
                0 0 40px rgba(59, 130, 246, 0.3),
                0 0 60px rgba(59, 130, 246, 0.2);
  }
  50% {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.7),
                0 0 60px rgba(59, 130, 246, 0.5),
                0 0 90px rgba(59, 130, 246, 0.3);
  }
`;
const MicButton = styled(Button)<{ recording?: boolean }>(({ recording }) => ({
  width: "100px",
  height: "100px",
  borderRadius: "50%",
  minWidth: "100px",
  background: recording
    ? "linear-gradient(135deg, #f87171 0%, #dc2626 100%)"
    : "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  transition: "all 0.3s ease",
  animation: recording ? `${recordingPulse} 1.5s ease-in-out infinite` : "none",

  "&:hover": {
    transform: "scale(1.05)",
    animation: recording
      ? `${recordingPulse} 1.5s ease-in-out infinite`
      : `${glowAnimation} 2s ease-in-out infinite`,
  },

  "&:active": {
    transform: "scale(0.95)",
  },
}));

const StyledCard = styled(Card)({
  background: "rgba(30, 41, 59, 0.5)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "16px",
  height: "100%",
  textAlign: "left",
  color: "#fff",
});

const GradientText = styled(Typography)({
  background: "linear-gradient(135deg, #a78bfa 0%, #e9d5ff 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  fontWeight: 800,
});

interface UploadResult {
  status: string;
  predictions: PredictionResponse;
  file_info: {
    name: string;
    size: number;
  };
  processing_time: number;
  error?: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sm = SessionManager.getInstance();
        const auth = await sm.isAuthenticated();
        setIsAuthenticated(auth);
      } catch (e) {
        console.warn("Auth check failed:", e);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mapRequestContext, setMapRequestContext] = useState<{
    position: [number, number];
    address: string;
  } | null>(null);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [recordingFormat, setRecordingFormat] = useState({
    mimeType: "audio/wav",
    extension: ".wav",
  });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () =>
      setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  useEffect(() => {
    const request = mapService.getAndClearAnalysisRequest();
    if (request) {
      setMapRequestContext(request);
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current)
        streamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const getBestRecordingFormat = () => {
    const formats = [
      { mimeType: "audio/wav", extension: ".wav" },
      { mimeType: "audio/webm;codecs=opus", extension: ".webm" },
      { mimeType: "audio/mp4", extension: ".mp4" },
      { mimeType: "audio/ogg;codecs=opus", extension: ".ogg" },
      { mimeType: "audio/webm", extension: ".webm" },
    ];
    for (const format of formats)
      if (MediaRecorder.isTypeSupported(format.mimeType)) return format;
    return { mimeType: "audio/webm", extension: ".webm" };
  };

  const convertToWav = async (audioBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const wavBlob = audioBufferToWav(audioBuffer);
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        }
      };
      fileReader.onerror = () => reject(new Error("Failed to read audio file"));
      fileReader.readAsArrayBuffer(audioBlob);
    });
  };

  const audioBufferToWav = (audioBuffer: AudioBuffer): Blob => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++)
        view.setUint8(offset + i, string.charCodeAt(i));
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length, true);

    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: "audio/wav" });
  };

  const startRecording = async () => {
    try {
      setError(null);
      setResult(null);
      setAudioBlob(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;
      const format = getBestRecordingFormat();
      setRecordingFormat(format);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: format.mimeType,
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: format.mimeType,
        });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        // Auto-process recording after it stops
        processRecording(audioBlob, format);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setError(
        "Tidak dapat mengakses mikrofon. Pastikan izin mikrofon telah diberikan."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const processRecording = async (
    blob?: Blob,
    format?: { mimeType: string; extension: string }
  ) => {
    const audioToProcess = blob || audioBlob;
    const formatToUse = format || recordingFormat;

    if (!audioToProcess) return;

    setIsProcessing(true);
    try {
      let fileToUpload: File;
      const needsConversion = ![
        ".wav",
        ".mp3",
        ".m4a",
        ".flac",
        ".ogg",
        ".aac",
      ].includes(formatToUse.extension);
      if (needsConversion || formatToUse.extension === ".webm") {
        try {
          const wavBlob = await convertToWav(audioToProcess);
          fileToUpload = new File([wavBlob], "recording.wav", {
            type: "audio/wav",
            lastModified: Date.now(),
          });
        } catch (conversionError) {
          fileToUpload = new File(
            [audioToProcess],
            `recording${formatToUse.extension}`,
            { type: audioToProcess.type, lastModified: Date.now() }
          );
        }
      } else {
        fileToUpload = new File(
          [audioToProcess],
          `recording${formatToUse.extension}`,
          { type: audioToProcess.type, lastModified: Date.now() }
        );
      }

      const response = await apiService.uploadAudioFile(fileToUpload);

      // Refresh cache laporan harian setelah analisis berhasil
      try {
        await DailyAudioService.refreshTodayAudioSummary();
        console.log(
          "✅ Cache laporan harian berhasil di-refresh setelah analisis"
        );
      } catch (refreshError) {
        console.warn("⚠️ Gagal refresh cache laporan harian:", refreshError);
      }

      if (mapRequestContext) {
        mapService.shareNoiseData({
          analysis: response.predictions,
          position: mapRequestContext.position,
          address: mapRequestContext.address,
        });
        navigate("/maps");
      } else {
        setResult(response);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Upload failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setResult(null);
    setError(null);
    setIsProcessing(false);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getHealthColor = (impact: string): ChipColor => {
    switch (impact.toLowerCase()) {
      case "ringan":
      case "low":
        return "success";
      case "sedang":
      case "moderate":
        return "warning";
      case "tinggi":
      case "high":
        return "error";
      case "berbahaya":
      case "severe":
        return "error";
      default:
        return "default";
    }
  };

  const getNoiseLevel = (
    level: number
  ): { label: string; color: ChipColor } => {
    if (level === 0)
      return { label: "Sedang dalam perbaikan", color: "default" };
    if (level < 55) return { label: "Tenang", color: "success" };
    if (level < 70) return { label: "Sedang", color: "warning" };
    if (level < 85) return { label: "Bising", color: "error" };
    return { label: "Sangat Bising", color: "error" };
  };

  const shareToMap = () => {
    if (!isAuthenticated) {
      setShowLoginAlert(true); // Ubah dari alert() ke state
      return;
    }

    if (!result) return;
    mapService.shareNoiseData({
      analysis: result.predictions,
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

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        p: 3,
        color: "#fff",
        textAlign: "center",
      }}
    >
      {!isAuthenticated && (
        <Box
          sx={{
            position: "fixed",
            top: 20,
            right: 20,
            display: "flex",
            gap: 2,
            zIndex: 1000,
            "@media (max-width: 600px)": {
              flexDirection: "column",
              gap: 1,
              top: 16,
              right: 16,
            },
          }}
        >
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            sx={{
              color: "#ffffff",
              borderColor: "rgba(255, 255, 255, 0.6)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(10px)",
              borderRadius: "50px",
              px: 3,
              py: 1,
              fontWeight: 600,
              fontSize: "0.9rem",
              textTransform: "none",
              transition: "all 0.3s ease",
              "&:hover": {
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                color: "#3b82f6",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 25px rgba(59, 130, 246, 0.2)",
              },
              "@media (max-width: 600px)": {
                fontSize: "0.8rem",
                px: 2.5,
                py: 0.8,
              },
            }}
          >
            Login
          </Button>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
              color: "#ffffff",
              borderRadius: "50px",
              px: 3,
              py: 1,
              fontWeight: 600,
              fontSize: "0.9rem",
              textTransform: "none",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
              transition: "all 0.3s ease",
              "&:hover": {
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 25px rgba(59, 130, 246, 0.4)",
              },
              "@media (max-width: 600px)": {
                fontSize: "0.8rem",
                px: 2.5,
                py: 0.8,
              },
            }}
          >
            Sign Up
          </Button>
        </Box>
      )}

      <audio ref={audioRef} src={audioUrl ?? ""} style={{ display: "none" }} />

      {/* Tab Navigation */}
      <Box
        sx={{ borderBottom: 1, borderColor: "rgba(255,255,255,0.2)", mb: 4 }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          centered
          sx={{
            "& .MuiTab-root": {
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600,
              textTransform: "none",
              fontSize: "1rem",
              "&.Mui-selected": {
                color: "#3b82f6",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#3b82f6",
              height: 3,
              borderRadius: "2px",
            },
          }}
        >
          <Tab label="Rekam & Analisis" />
          <Tab label="Monitor Real-time" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && !result && !isProcessing && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="calc(100vh - 160px)"
        >
          {!isRecording && !audioBlob && (
            <Box width="100%" maxWidth={600}>
              <GradientText variant="h3" gutterBottom>
                Deteksi Polusi Suara
              </GradientText>
              <Typography variant="h6" color="rgba(255,255,255,0.7)" mb={6}>
                Analisis kebisingan dari rekaman mikrofon secara langsung.
              </Typography>

              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                gap={4}
              >
                <MicButton
                  recording={false}
                  onClick={startRecording}
                  disableRipple
                >
                  <Mic size={32} />
                </MicButton>

                <Typography variant="body2" color="rgba(255,255,255,0.6)">
                  Klik tombol mikrofon untuk memulai perekaman
                </Typography>
              </Box>
            </Box>
          )}

          {isRecording && (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={4}
            >
              <Typography variant="h5" color="rgba(255,255,255,0.8)">
                Merekam Suara...
              </Typography>
              <GradientText variant="h2" my={1}>
                {formatTime(recordingTime)}
              </GradientText>
              <AudioVisualizer
                stream={streamRef.current}
                isRecording={isRecording}
              />

              <MicButton recording={true} onClick={stopRecording} disableRipple>
                <Square fill="white" size={24} />
              </MicButton>
            </Box>
          )}
        </Box>
      )}

      {/* Real-time Monitoring Tab */}
      {activeTab === 1 && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="calc(100vh - 200px)"
        >
          <RealTimeNoiseTab />
        </Box>
      )}

      {activeTab === 0 && isProcessing && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="calc(100vh - 160px)"
        >
          <CircularProgress
            size={80}
            sx={{
              color: "#a78bfa",
              mb: 4,
            }}
          />
          <GradientText variant="h4" gutterBottom>
            Memproses Audio...
          </GradientText>
          <Typography variant="h6" color="rgba(255,255,255,0.7)">
            Sedang menganalisis rekaman suara Anda
          </Typography>
        </Box>
      )}

      {activeTab === 0 && result && result.status === "success" && (
        <Box mt={!isAuthenticated ? 10 : 2} width="100%">
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={4}
          >
            <GradientText variant="h4">Hasil Analisis Audio</GradientText>
            <Box display="flex" gap={2}>
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
                onClick={resetAll}
                sx={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.3)",
                  borderRadius: "50px",
                  "&:hover": { borderColor: "#fff" },
                }}
              >
                Analisis Lagi
              </Button>
            </Box>
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
                    <BarChart2 size={24} color="#60a5fa" />
                    <Typography color="rgba(255,255,255,0.8)">
                      Tingkat Kebisingan (dB)
                    </Typography>
                  </Box>
                  <Typography variant="h2" sx={{ fontWeight: "bold" }}>
                    {result.predictions.noise_level}
                  </Typography>
                  <Chip
                    label={getNoiseLevel(result.predictions.noise_level).label}
                    color={getNoiseLevel(result.predictions.noise_level).color}
                    variant="filled"
                    sx={{ mt: 1, fontWeight: "bold" }}
                  />
                </CardContent>
              </StyledCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <StyledCard>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    <Activity size={24} color="#a78bfa" />
                    <Typography color="rgba(255,255,255,0.8)">
                      Potensi Dampak Kesehatan
                    </Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: "bold" }}>
                    {translateHealthImpact(result.predictions.health_impact)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="rgba(255,255,255,0.7)"
                    sx={{ mt: 1, mb: 2 }}
                  >
                    {getHealthImpactDescription(
                      result.predictions.health_impact
                    )}
                  </Typography>
                  <Chip
                    label={`Keyakinan: ${(
                      result.predictions.confidence_score * 100
                    ).toFixed(1)}%`}
                    color={getHealthColor(result.predictions.health_impact)}
                    variant="filled"
                    sx={{ mt: 1, fontWeight: "bold" }}
                  />
                </CardContent>
              </StyledCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <StyledCard>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    <VolumeX size={24} color="#60a5fa" />
                    <Typography color="rgba(255,255,255,0.8)">
                      Prediksi Sumber Suara
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>
                      {getNoiseSourceIcon(result.predictions.noise_source)}
                    </span>
                    {translateNoiseSource(result.predictions.noise_source)}
                  </Typography>
                </CardContent>
              </StyledCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <StyledCard>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    <Clock size={24} color="#a78bfa" />
                    <Typography color="rgba(255,255,255,0.8)">
                      Informasi Pemrosesan
                    </Typography>
                  </Box>
                  <Typography variant="body1" component="div">
                    <Box display="flex" justifyContent="space-between">
                      <span>Nama File:</span>{" "}
                      <strong>{result.file_info.name}</strong>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <span>Ukuran File:</span>{" "}
                      <strong>
                        {(result.file_info.size / 1024).toFixed(2)} KB
                      </strong>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <span>Waktu Proses:</span>{" "}
                      <strong>{result.processing_time.toFixed(3)} detik</strong>
                    </Box>
                  </Typography>
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 0 && error && (
        <Alert
          severity="error"
          sx={{ my: 2, bgcolor: "rgba(244, 67, 54, 0.2)", color: "#fff" }}
        >
          {error}
        </Alert>
      )}

      <style>
        {`
        body { 
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #16213e 100%);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }
        @keyframes gradientShift { 
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        } 
      `}
      </style>

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

export default HomePage;
