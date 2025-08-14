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
        label={loaded ? 'Dimuat' : 'Tidak Ditemukan'} 
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
          Status Sistem
        </Typography>
        <Button variant="outlined" onClick={checkStatus} size="small">
          Perbarui Status
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
                label={error ? 'Tidak Diketahui' : 'Terhubung'} 
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
                <Typography variant="h6">Model ML</Typography>
              </Box>
              <Chip 
                label={modelStatus ? (modelStatus.model_loaded ? 'Loaded' : 'Not Loaded') : 'Tidak Diketahui'} 
                color={modelStatus && modelStatus.model_loaded ? 'success' : 'warning'} 
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
                <Typography variant="h6">Jaringan</Typography>
              </Box>
              <Chip 
                label={error ? 'Error' : 'Terhubung'} 
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
            🤖 Status Model Machine Learning
          </Typography>
          
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Model Version</Typography>
              <Typography variant="h4" color="primary.main">
                {modelStatus.model_version}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Model Status</Typography>
              <Typography variant="h4" color="success.main">
                {modelStatus.model_loaded ? 'Loaded' : 'Not Loaded'}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Last Updated</Typography>
              <Typography variant="h4" color="info.main">
                {new Date(modelStatus.last_updated).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Typography variant="h4" color={modelStatus.model_loaded ? "success.main" : "error.main"}>
                {modelStatus.model_loaded ? "Siap" : "Error"}
              </Typography>
            </Grid>
          </Grid>

          <List>
            <ModelStatusItem
              name="Noise Detection Model"
              loaded={modelStatus.model_loaded}
              description={`Model version: ${modelStatus.model_version}`}
            />
            <ModelStatusItem
              name="Model Status"
              loaded={modelStatus.model_loaded}
              description={`Last updated: ${modelStatus.last_updated}`}
            />
          </List>
        </Paper>
      )}

      {/* Last Check Info */}
      {lastChecked && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            ⏰ Terakhir diperiksa: {lastChecked.toLocaleString('id-ID')}
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
