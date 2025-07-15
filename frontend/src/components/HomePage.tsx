// src/components/HomePage.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Slider,
  styled,
  keyframes,
  LinearProgress
} from '@mui/material';
import {
  VolumeX,
  Activity,
  Clock,
  FileAudio,
  Mic,
  Square,
  PauseCircle,
  Play,
  Trash2,
  UploadCloud,
  BarChart2
} from 'lucide-react';

import { apiService, PredictionResponse } from '../services/api';
import AudioVisualizer from './AudioVisualizer';

type ChipColor = "success" | "warning" | "error" | "default" | "primary" | "secondary" | "info";

const DropzoneContainer = styled('div')<{isDragActive: boolean}>(({ theme, isDragActive }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  border: `2px dashed ${isDragActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.2)'}`,
  borderRadius: '16px',
  backgroundColor: isDragActive ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255, 255, 255, 0.05)',
  color: 'rgba(255, 255, 255, 0.7)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    borderColor: '#60a5fa',
    backgroundColor: 'rgba(96, 165, 250, 0.08)',
  }
}));

const StyledCard = styled(Card)({
  background: 'rgba(30, 41, 59, 0.5)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  height: '100%',
  textAlign: 'left',
  color: '#fff',
});

const GradientText = styled(Typography)({
  background: 'linear-gradient(135deg, #a78bfa 0%, #e9d5ff 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 800,
});

interface UploadResult extends PredictionResponse {
  error?: string;
}

const HomePage: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- PERBAIKAN UTAMA: SINKRONISASI DENGAN EVENT ASLI AUDIO ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(isFinite(audio.duration) ? audio.duration : 0);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]); // Penting: Hook ini me-refresh listener setiap kali ada audio baru

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  // ... (sisa logika state dan fungsi Anda tidak berubah)
  const [recordingFormat, setRecordingFormat] = useState<{mimeType: string, extension: string}>({ mimeType: 'audio/wav', extension: '.wav' });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { return () => { if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); }; }, []);
  const getBestRecordingFormat = () => {
    const formats = [ { mimeType: 'audio/wav', extension: '.wav' }, { mimeType: 'audio/webm;codecs=opus', extension: '.webm' }, { mimeType: 'audio/mp4', extension: '.mp4' }, { mimeType: 'audio/ogg;codecs=opus', extension: '.ogg' }, { mimeType: 'audio/webm', extension: '.webm' }, ];
    for (const format of formats) if (MediaRecorder.isTypeSupported(format.mimeType)) return format;
    return { mimeType: 'audio/webm', extension: '.webm' };
  };
  const convertToWav = async (audioBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        try { const arrayBuffer = e.target?.result as ArrayBuffer; const audioBuffer = await audioContext.decodeAudioData(arrayBuffer); const wavBlob = audioBufferToWav(audioBuffer); resolve(wavBlob); } catch (error) { reject(error); }
      };
      fileReader.onerror = () => reject(new Error('Failed to read audio file'));
      fileReader.readAsArrayBuffer(audioBlob);
    });
  };
  const audioBufferToWav = (audioBuffer: AudioBuffer): Blob => {
    const numberOfChannels = audioBuffer.numberOfChannels; const length = audioBuffer.length * numberOfChannels * 2; const buffer = new ArrayBuffer(44 + length); const view = new DataView(buffer);
    const writeString = (offset: number, string: string) => { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); };
    writeString(0, 'RIFF'); view.setUint32(4, 36 + length, true); writeString(8, 'WAVE'); writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numberOfChannels, true); view.setUint32(24, audioBuffer.sampleRate, true); view.setUint32(28, audioBuffer.sampleRate * numberOfChannels * 2, true); view.setUint16(32, numberOfChannels * 2, true); view.setUint16(34, 16, true); writeString(36, 'data'); view.setUint32(40, length, true);
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) { for (let channel = 0; channel < numberOfChannels; channel++) { const sample = audioBuffer.getChannelData(channel)[i]; const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF; view.setInt16(offset, intSample, true); offset += 2; } }
    return new Blob([buffer], { type: 'audio/wav' });
  };
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } });
      streamRef.current = stream; const format = getBestRecordingFormat(); setRecordingFormat(format); const mediaRecorder = new MediaRecorder(stream, { mimeType: format.mimeType }); mediaRecorderRef.current = mediaRecorder; audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = () => { const audioBlob = new Blob(audioChunksRef.current, { type: format.mimeType }); setAudioBlob(audioBlob); setAudioUrl(URL.createObjectURL(audioBlob)); stream.getTracks().forEach(track => track.stop()); streamRef.current = null; };
      mediaRecorder.start(1000); setIsRecording(true); setRecordingTime(0); recordingTimerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000);
    } catch (error) { console.error('Error starting recording:', error); setError('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon telah diberikan.'); }
  };
  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); } };
  const processFile = async (file: File) => {
    setIsUploading(true); setError(null); setResult(null);
    try { const response = await apiService.uploadAudioFile(file); setResult(response); } catch (err: any) { const errorMessage = err.response?.data?.error || err.message || 'Upload failed'; setError(errorMessage); } finally { setIsUploading(false); }
  };
  const processRecording = async () => {
    if (!audioBlob) return;
    try {
      let fileToUpload: File; const needsConversion = !['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac'].includes(recordingFormat.extension);
      if (needsConversion || recordingFormat.extension === '.webm') { try { const wavBlob = await convertToWav(audioBlob); fileToUpload = new File([wavBlob], 'recording.wav', { type: 'audio/wav', lastModified: Date.now() }); } catch (conversionError) { fileToUpload = new File([audioBlob], `recording${recordingFormat.extension}`, { type: audioBlob.type, lastModified: Date.now() }); } } else { fileToUpload = new File([audioBlob], `recording${recordingFormat.extension}`, { type: audioBlob.type, lastModified: Date.now() }); }
      await processFile(fileToUpload);
    } catch (err: any) { setError(err.response?.data?.error || err.message || 'Upload failed'); }
  };
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return; const file = acceptedFiles[0]; setAudioBlob(file); setAudioUrl(URL.createObjectURL(file)); await processFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const resetAll = () => { if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioBlob(null); setAudioUrl(null); setCurrentTime(0); setDuration(0); setIsPlaying(false); setResult(null); setError(null); };
  
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getHealthColor = (impact: string): ChipColor => { switch (impact.toLowerCase()) { case 'low': return 'success'; case 'moderate': return 'warning'; case 'high': return 'error'; case 'severe': return 'error'; default: return 'default'; } };
  const getNoiseLevel = (level: number): { label: string; color: ChipColor } => { if (level < 55) return { label: 'Tenang', color: 'success' }; if (level < 70) return { label: 'Sedang', color: 'warning' }; if (level < 85) return { label: 'Bising', color: 'error' }; return { label: 'Sangat Bising', color: 'error' }; };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true, accept: { 'audio/*': ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac'] }, maxFiles: 1 });

  return (
    <Box {...getRootProps()} sx={{ maxWidth: 1200, mx: 'auto', p: 3, color: '#fff', textAlign: 'center' }}>
      <input {...getInputProps()} />

      {/* Elemen audio yang tersembunyi */}
      <audio ref={audioRef} src={audioUrl ?? ''} style={{ display: 'none' }} />

      {!result && (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="calc(100vh - 160px)">
          
          {!isRecording && !audioBlob && !isUploading && (
            <Box width="100%" maxWidth={600}>
              <GradientText variant="h3" gutterBottom>Deteksi Polusi Suara</GradientText>
              <Typography variant="h6" color="rgba(255,255,255,0.7)" mb={4}>
                Analisis kebisingan dari file audio atau rekaman mikrofon secara langsung.
              </Typography>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={5}>
                  <DropzoneContainer isDragActive={isDragActive} onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}>
                    <UploadCloud size={40} />
                    <Typography mt={1}>
                      {isDragActive ? "Lepaskan file di sini" : "Tarik & lepas file atau klik untuk unggah"}
                    </Typography>
                  </DropzoneContainer>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Typography color="rgba(255,255,255,0.5)">ATAU</Typography>
                </Grid>
                <Grid item xs={12} md={5}>
                   <Button
                      variant="contained"
                      onClick={startRecording}
                      startIcon={<Mic size={24} />}
                      sx={{
                        width: '100%', py: 2, borderRadius: '12px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                        boxShadow: '0 8px 30px rgba(59, 130, 246, 0.4)',
                      }}
                   >
                     Mulai Merekam
                   </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {isRecording && (
            <>
              <Typography variant="h5" color="rgba(255,255,255,0.8)">Merekam Suara...</Typography>
              <GradientText variant="h2" my={1}>{formatTime(recordingTime)}</GradientText>
              <AudioVisualizer stream={streamRef.current} isRecording={isRecording} />
              <Button 
                variant="contained" 
                onClick={stopRecording} 
                sx={{ 
                  mt: 3, borderRadius: '50px', px: 4, py: 1.5,
                  fontWeight: 'bold', color: '#fff',
                  background: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
                  boxShadow: '0 4px 20px rgba(248, 113, 113, 0.3)',
                  display: 'inline-flex', alignItems: 'center', gap: 1,
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(248, 113, 113, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                  <Square fill="white" size={16} /> Hentikan
              </Button>
            </>
          )}
          
          {audioBlob && !result && !isUploading && (
             <Paper sx={{ width: '100%', maxWidth: 600, p: 3, background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                <GradientText variant="h4" gutterBottom>Pratinjau & Analisis</GradientText>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
                    <IconButton onClick={togglePlayback} sx={{ color: '#a78bfa' }}>{isPlaying ? <PauseCircle size={32} /> : <Play size={32} />}</IconButton>
                    <Slider 
                      value={currentTime} 
                      max={duration} 
                      onChange={(_, v) => {
                        const newTime = v as number;
                        if (audioRef.current && isFinite(newTime)) {
                          audioRef.current.currentTime = newTime;
                          setCurrentTime(newTime); 
                        }
                      }} 
                      sx={{ 
                        color: '#a78bfa',
                        '& .MuiSlider-thumb': { backgroundColor: '#e9d5ff' },
                        '& .MuiSlider-rail': { opacity: 0.4 }
                      }} 
                    />
                    <Typography sx={{ minWidth: '40px' }}>{formatTime(currentTime)}</Typography>
                    <IconButton onClick={resetAll} sx={{ color: '#f87171' }}><Trash2 /></IconButton>
                </Box>
                <Button 
                  variant="contained" 
                  size="large" 
                  onClick={processRecording} 
                  disabled={isUploading} 
                  sx={{ 
                    width: '100%', borderRadius: '12px', px: 4, py: 1.5, fontWeight: 'bold',
                    color: '#fff',
                    backgroundColor: '#3b82f6', 
                    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: '#2563eb',
                      boxShadow: '0 8px 30px rgba(59, 130, 246, 0.4)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                    Jalankan Analisis
                </Button>
             </Paper>
          )}
          
          {isUploading && (
            <Box sx={{
              width: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', textAlign: 'center'
            }}>
                <Typography variant="h6" color="rgba(255,255,255,0.8)">Menganalisis audio, mohon tunggu...</Typography>
                <LinearProgress sx={{ mt: 2, width: '50%', borderRadius: '5px' }} />
            </Box>
          )}

        </Box>
      )}

      {result && result.status === 'success' && (
        <Box mt={2} width="100%">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <GradientText variant="h4">Hasil Analisis Audio</GradientText>
            <Button variant="outlined" onClick={resetAll} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', borderRadius: '50px' }}>
              Analisis Lagi
            </Button>
          </Box>
          <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                  <StyledCard>
                      <CardContent>
                          <Box display="flex" alignItems="center" gap={1.5} mb={1}><BarChart2 size={24} color="#60a5fa" /><Typography color="rgba(255,255,255,0.8)">Tingkat Kebisingan (dB)</Typography></Box>
                          <Typography variant="h2" sx={{fontWeight: 'bold'}}>{result.predictions.noise_level}</Typography>
                          <Chip label={getNoiseLevel(result.predictions.noise_level).label} color={getNoiseLevel(result.predictions.noise_level).color} variant="filled" sx={{mt: 1, fontWeight: 'bold'}}/>
                      </CardContent>
                  </StyledCard>
              </Grid>
              <Grid item xs={12} md={6}>
                  <StyledCard>
                      <CardContent>
                          <Box display="flex" alignItems="center" gap={1.5} mb={1}><Activity size={24} color="#a78bfa" /><Typography color="rgba(255,255,255,0.8)">Potensi Dampak Kesehatan</Typography></Box>
                          <Typography variant="h3" sx={{fontWeight: 'bold'}}>{result.predictions.health_impact}</Typography>
                          <Chip label={`Keyakinan: ${(result.predictions.confidence_score * 100).toFixed(1)}%`} color={getHealthColor(result.predictions.health_impact)} variant="filled" sx={{mt: 1, fontWeight: 'bold'}}/>
                      </CardContent>
                  </StyledCard>
              </Grid>
              <Grid item xs={12} md={6}>
                  <StyledCard>
                      <CardContent>
                          <Box display="flex" alignItems="center" gap={1.5} mb={1}><VolumeX size={24} color="#60a5fa" /><Typography color="rgba(255,255,255,0.8)">Prediksi Sumber Suara</Typography></Box>
                          <Typography variant="h4" sx={{fontWeight: 'bold'}}>{result.predictions.noise_source}</Typography>
                      </CardContent>
                  </StyledCard>
              </Grid>
              <Grid item xs={12} md={6}>
                  <StyledCard>
                      <CardContent>
                          <Box display="flex" alignItems="center" gap={1.5} mb={1}><Clock size={24} color="#a78bfa" /><Typography color="rgba(255,255,255,0.8)">Informasi Pemrosesan</Typography></Box>
                          <Typography variant="body1" component="div">
                            <Box display="flex" justifyContent="space-between"><span>Nama File:</span> <strong>{result.file_info.name}</strong></Box>
                            <Box display="flex" justifyContent="space-between"><span>Ukuran File:</span> <strong>{(result.file_info.size / 1024).toFixed(2)} KB</strong></Box>
                            <Box display="flex" justifyContent="space-between"><span>Waktu Proses:</span> <strong>{result.processing_time.toFixed(3)} detik</strong></Box>
                          </Typography>
                      </CardContent>
                  </StyledCard>
              </Grid>
          </Grid>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ my: 2, bgcolor: 'rgba(244, 67, 54, 0.2)', color: '#fff' }}>{error}</Alert>}
      
      <style>{`
        body { 
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #16213e 100%);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }
        @keyframes gradientShift { 
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </Box>
  );
};

export default HomePage;