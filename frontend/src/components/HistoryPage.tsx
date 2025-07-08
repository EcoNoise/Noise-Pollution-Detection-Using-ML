import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { History, TrendingUp, BarChart, Users } from 'lucide-react';
import { BarChart as ReChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { apiService, HistoryItem } from '../services/api';

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPredictionHistory(100);
      setHistory(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'low': return 'success';
      case 'moderate': return 'warning';
      case 'high': return 'error';
      case 'severe': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('id-ID');
  };

  // Statistics
  const stats = {
    total: history.length,
    avgNoiseLevel: history.length > 0 ? (history.reduce((sum, item) => sum + item.noise_level, 0) / history.length).toFixed(1) : '0',
    highRiskCount: history.filter(item => ['high', 'severe'].includes(item.health_impact.toLowerCase())).length,
    avgProcessingTime: history.length > 0 ? (history.reduce((sum, item) => sum + item.processing_time, 0) / history.length).toFixed(2) : '0',
  };

  // Chart data
  const chartData = history.slice(0, 10).reverse().map((item, index) => ({
    name: `#${index + 1}`,
    noise_level: item.noise_level,
    timestamp: formatDate(item.timestamp),
  }));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <History size={32} />
        <Typography variant="h4">
          Riwayat Prediksi
        </Typography>
        <Button variant="outlined" onClick={loadHistory} size="small">
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <BarChart size={24} color="#1976d2" />
                <Typography variant="h6">Total Prediksi</Typography>
              </Box>
              <Typography variant="h3" color="primary.main">
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingUp size={24} color="#ff9800" />
                <Typography variant="h6">Rata-rata dB</Typography>
              </Box>
              <Typography variant="h3" color="warning.main">
                {stats.avgNoiseLevel}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Users size={24} color="#f44336" />
                <Typography variant="h6">Risiko Tinggi</Typography>
              </Box>
              <Typography variant="h3" color="error.main">
                {stats.highRiskCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <History size={24} color="#4caf50" />
                <Typography variant="h6">Avg Process (s)</Typography>
              </Box>
              <Typography variant="h3" color="success.main">
                {stats.avgProcessingTime}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chart */}
      {history.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Tingkat Kebisingan - 10 Prediksi Terakhir
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <ReChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip 
                formatter={(value, name) => [`${value} dB`, 'Noise Level']}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.name === label);
                  return item ? item.timestamp : label;
                }}
              />
              <Bar dataKey="noise_level" fill="#1976d2" />
            </ReChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* History Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell align="center">Tingkat Kebisingan</TableCell>
                <TableCell align="center">Sumber</TableCell>
                <TableCell align="center">Dampak Kesehatan</TableCell>
                <TableCell align="center">Confidence</TableCell>
                <TableCell align="center">File</TableCell>
                <TableCell align="center">Process Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" color="text.secondary" py={4}>
                      Belum ada riwayat prediksi
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(item.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="h6" color="primary.main">
                        {item.noise_level} dB
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={item.noise_source} 
                        variant="outlined" 
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={item.health_impact}
                        color={getHealthColor(item.health_impact) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {(item.confidence_score * 100).toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {item.file_name || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {item.processing_time.toFixed(2)}s
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Back to Home */}
      <Box mt={4} textAlign="center">
        <Button variant="contained" href="/" component="a">
          Kembali ke Beranda
        </Button>
      </Box>
    </Box>
  );
};

export default HistoryPage;