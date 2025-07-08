import React, { useState, useCallback } from 'react';
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
  LinearProgress,
} from '@mui/material';
import {
  Upload,
  VolumeX,
  Activity,
  Clock,
  FileAudio,
} from 'lucide-react';

import { apiService, PredictionResponse } from '../services/api';

interface UploadResult extends PredictionResponse {
  error?: string;
}

const HomePage: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.uploadAudioFile(file);
      setResult(response);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Upload failed';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.wav', '.mp3', '.m4a', '.flac'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const getHealthColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'low': return 'success';
      case 'moderate': return 'warning';
      case 'high': return 'error';
      case 'severe': return 'error';
      default: return 'default';
    }
  };

  const getNoiseLevel = (level: number) => {
    if (level < 55) return { label: 'Quiet', color: 'success' };
    if (level < 70) return { label: 'Moderate', color: 'warning' };
    if (level < 85) return { label: 'Loud', color: 'error' };
    return { label: 'Very Loud', color: 'error' };
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h4" gutterBottom>
          🎵 Noise Pollution Detection
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload audio file untuk analisis tingkat kebisingan dan dampak kesehatan
        </Typography>
      </Box>

      {/* Upload Area */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.3s ease',
          mb: 3,
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <Box>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">Processing audio...</Typography>
            <LinearProgress sx={{ mt: 2, maxWidth: 300, mx: 'auto' }} />
          </Box>
        ) : (
          <Box>
            <Upload size={60} style={{ marginBottom: 16, color: '#1976d2' }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop the audio file here' : 'Upload Audio File'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Drag & drop atau klik untuk memilih file audio
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Format: WAV, MP3, M4A, FLAC (Max: 10MB)
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {/* Results */}
      {result && result.status === 'success' && (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Activity size={24} />
            Hasil Analisis
          </Typography>

          <Grid container spacing={3}>
            {/* Noise Level */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <VolumeX size={20} />
                    <Typography variant="h6">Tingkat Kebisingan</Typography>
                  </Box>
                  <Typography variant="h3" color="primary.main" gutterBottom>
                    {result.predictions.noise_level} dB
                  </Typography>
                  <Chip
                    label={getNoiseLevel(result.predictions.noise_level).label}
                    color={getNoiseLevel(result.predictions.noise_level).color as any}
                    variant="outlined"
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Health Impact */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Activity size={20} />
                    <Typography variant="h6">Dampak Kesehatan</Typography>
                  </Box>
                  <Typography variant="h4" gutterBottom>
                    {result.predictions.health_impact}
                  </Typography>
                  <Chip
                    label={`Confidence: ${(result.predictions.confidence_score * 100).toFixed(1)}%`}
                    color={getHealthColor(result.predictions.health_impact) as any}
                    variant="outlined"
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Noise Source */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <FileAudio size={20} />
                    <Typography variant="h6">Sumber Kebisingan</Typography>
                  </Box>
                  <Typography variant="h5" gutterBottom>
                    {result.predictions.noise_source}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Klasifikasi sumber suara berdasarkan analisis ML
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Processing Info */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Clock size={20} />
                    <Typography variant="h6">Info Pemrosesan</Typography>
                  </Box>
                  <Typography variant="body1" gutterBottom>
                    <strong>File:</strong> {result.file_info.name}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Size:</strong> {(result.file_info.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                  <Typography variant="body1">
                    <strong>Processing Time:</strong> {result.processing_time}s
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box mt={3} textAlign="center">
            <Button
              variant="outlined"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              sx={{ mr: 2 }}
            >
              Upload File Lain
            </Button>
            <Button
              variant="contained"
              href="/history"
              component="a"
            >
              Lihat Riwayat
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default HomePage;