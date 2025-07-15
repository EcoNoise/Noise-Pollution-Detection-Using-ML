import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { 
  CheckCircle, 
  XCircle, 
  Settings, 
  Database, 
  Brain, 
  Server,
  Activity,
  Wifi,
} from 'lucide-react';

import { apiService, ModelStatus } from '../services/api';

const StatusPage: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check models
      const modelData = await apiService.getModelStatus();
      setModelStatus(modelData);
      
      // Check health
      await apiService.healthCheck();
      
      setLastChecked(new Date());
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to check status');
    } finally {
      setLoading(false);
    }
  };

  const ModelStatusItem: React.FC<{ name: string; loaded: boolean; description: string }> = ({ 
    name, 
    loaded, 
    description 
  }) => (
    <ListItem>
      <ListItemIcon>
        {loaded ? (
          <CheckCircle size={24} style={{ color: '#4caf50' }} />
        ) : (
          <XCircle size={24} style={{ color: '#f44336' }} />
        )}
      </ListItemIcon>
      <ListItemText
        primary={name}
        secondary={description}
      />
      <Chip 
        label={loaded ? 'Loaded' : 'Not Found'} 
        color={loaded ? 'success' : 'error'} 
        size="small"
        variant="outlined"
      />
    </ListItem>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <Settings size={32} />
        <Typography variant="h4">
          System Status
        </Typography>
        <Button variant="outlined" onClick={checkStatus} size="small">
          Refresh Status
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* System Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Server size={24} color="#1976d2" />
                <Typography variant="h6">API Server</Typography>
              </Box>
              <Chip 
                label={error ? 'Offline' : 'Online'} 
                color={error ? 'error' : 'success'} 
                icon={error ? <XCircle size={16} /> : <CheckCircle size={16} />}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Database size={24} color="#ff9800" />
                <Typography variant="h6">Database</Typography>
              </Box>
              <Chip 
                label={error ? 'Unknown' : 'Connected'} 
                color={error ? 'default' : 'success'} 
                icon={error ? <Activity size={16} /> : <CheckCircle size={16} />}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Brain size={24} color="#4caf50" />
                <Typography variant="h6">ML Models</Typography>
              </Box>
              <Chip 
                label={modelStatus ? `${modelStatus.loaded_models}/${modelStatus.total_models}` : 'Unknown'} 
                color={modelStatus && modelStatus.loaded_models > 0 ? 'success' : 'warning'} 
                icon={<Brain size={16} />}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Wifi size={24} color="#9c27b0" />
                <Typography variant="h6">Network</Typography>
              </Box>
              <Chip 
                label={error ? 'Error' : 'Connected'} 
                color={error ? 'error' : 'success'} 
                icon={error ? <XCircle size={16} /> : <Wifi size={16} />}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Model Details */}
      {modelStatus && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            🤖 Machine Learning Models Status
          </Typography>
          
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Total Models</Typography>
              <Typography variant="h4" color="primary.main">
                {modelStatus.total_models}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Loaded Models</Typography>
              <Typography variant="h4" color="success.main">
                {modelStatus.loaded_models}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Load Rate</Typography>
              <Typography variant="h4" color="info.main">
                {((modelStatus.loaded_models / modelStatus.total_models) * 100).toFixed(0)}%
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Typography variant="h4" color={modelStatus.loaded_models > 0 ? "success.main" : "error.main"}>
                {modelStatus.loaded_models > 0 ? "Ready" : "Error"}
              </Typography>
            </Grid>
          </Grid>

          <List>
            <ModelStatusItem
              name="Noise Level (Original)"
              loaded={modelStatus.models.noise_level_original || false}
              description="Model prediksi tingkat kebisingan versi original"
            />
            <ModelStatusItem
              name="Noise Level (Optimized)"
              loaded={modelStatus.models.noise_level_optimized || false}
              description="Model prediksi tingkat kebisingan versi optimized"
            />
            <ModelStatusItem
              name="Noise Source"
              loaded={modelStatus.models.noise_source || false}
              description="Model klasifikasi sumber kebisingan"
            />
            <ModelStatusItem
              name="Health Impact"
              loaded={modelStatus.models.health_impact || false}
              description="Model prediksi dampak kesehatan"
            />
            <ModelStatusItem
              name="Feature Scaler"
              loaded={modelStatus.models.scaler || false}
              description="Preprocessor untuk normalisasi fitur"
            />
            <ModelStatusItem
              name="Selected Features"
              loaded={modelStatus.models.selected_features || false}
              description="Indeks fitur yang dipilih untuk training"
            />
          </List>
        </Paper>
      )}

      {/* Last Check Info */}
      {lastChecked && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            ⏰ Last checked: {lastChecked.toLocaleString('id-ID')}
          </Typography>
        </Paper>
      )}

      {/* Back to Home */}
      <Box mt={4} textAlign="center">
        <Button variant="contained" href="/" component="a">
          Kembali ke Beranda
        </Button>
      </Box>
    </Box>
  );
};

export default StatusPage;
