// src/components/HistoryPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  styled,
} from '@mui/material';
import { History, TrendingUp, BarChart as BarChartIcon, Users, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { apiService, HistoryItem } from '../services/api';

// --- MODERN STYLED TYPES & COMPONENTS ---
type ChipColor = "success" | "warning" | "error" | "default" | "primary" | "secondary" | "info";

const GradientText = styled(Typography)({
  background: 'linear-gradient(135deg, #a78bfa 0%, #e9d5ff 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 800,
});

const StyledCard = styled(Card)({
  background: 'rgba(30, 41, 59, 0.5)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  height: '100%',
  color: '#fff',
});

const StyledTableContainer = styled(TableContainer)({
  background: 'rgba(30, 41, 59, 0.5)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  color: '#fff',
});

const StyledTableCell = styled(TableCell)({
  color: 'rgba(255, 255, 255, 0.9)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  fontWeight: 500,
});

const StyledTableHeadCell = styled(StyledTableCell)({
  fontWeight: 700,
  color: 'rgba(255, 255, 255, 1)',
  background: 'rgba(255, 255, 255, 0.05)'
});


const HistoryPage: React.FC = () => {
  // --- ALL YOUR STATE AND FUNCTION LOGIC REMAINS THE SAME ---
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true); setError(null);
      const data = await apiService.getPredictionHistory(100); setHistory(data);
    } catch (err: any) { setError(err.response?.data?.error || err.message || 'Failed to load history');
    } finally { setLoading(false); }
  };

  const getHealthColor = (impact: string): ChipColor => {
    switch (impact.toLowerCase()) {
        case 'low': return 'success';
        case 'moderate': return 'warning';
        case 'high': return 'error';
        case 'severe': return 'error';
        default: return 'default';
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDateShort = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  };

  const stats = {
    total: history.length,
    avgNoiseLevel: history.length > 0 ? (history.reduce((sum, item) => sum + item.noise_level, 0) / history.length).toFixed(1) : '0',
    highRiskCount: history.filter(item => ['high', 'severe'].includes(item.health_impact.toLowerCase())).length,
    avgProcessingTime: history.length > 0 ? (history.reduce((sum, item) => sum + item.processing_time, 0) / history.length).toFixed(2) : '0',
  };

  const chartData = history.slice(0, 15).reverse().map((item) => ({
    name: formatDateShort(item.timestamp), 
    noise_level: item.noise_level,
    full_timestamp: formatDate(item.timestamp),
  }));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="calc(100vh - 160px)">
        <CircularProgress size={60} sx={{ color: '#fff' }}/>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, sm: 4 }, color: '#fff' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center" gap={2}>
          <History size={32} color="#a78bfa"/>
          <GradientText variant="h4">Riwayat & Analitik</GradientText>
        </Box>
        <Button variant="outlined" onClick={loadHistory} startIcon={<RefreshCw size={16} />} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', borderRadius: '50px', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ my: 2, bgcolor: 'rgba(244, 67, 54, 0.2)', color: '#fff' }}>{error}</Alert>}

      {/* Main Statistics Cards */}
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5} mb={1}><BarChartIcon size={24} color="#60a5fa" /><Typography color="rgba(255,255,255,0.8)">Total Prediksi</Typography></Box>
              <Typography variant="h3" sx={{fontWeight: 'bold'}}>{stats.total}</Typography>
            </CardContent>
          </StyledCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5} mb={1}><TrendingUp size={24} color="#a78bfa" /><Typography color="rgba(255,255,255,0.8)">Rata-rata (dB)</Typography></Box>
              <Typography variant="h3" sx={{fontWeight: 'bold'}}>{stats.avgNoiseLevel}</Typography>
            </CardContent>
          </StyledCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5} mb={1}><AlertTriangle size={24} color="#f44336" /><Typography color="rgba(255,255,255,0.8)">Risiko Tinggi</Typography></Box>
              <Typography variant="h3" sx={{fontWeight: 'bold', color: '#f87171'}}>{stats.highRiskCount}</Typography>
            </CardContent>
          </StyledCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5} mb={1}><Clock size={24} color="#4caf50" /><Typography color="rgba(255,255,255,0.8)">Rata-rata Proses (s)</Typography></Box>
              <Typography variant="h3" sx={{fontWeight: 'bold', color: '#81c784'}}>{stats.avgProcessingTime}</Typography>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>

      {/* Chart & Table */}
      <Grid container spacing={4}>
        {history.length > 0 && (
          <Grid item xs={12}>
            <StyledCard sx={{ p: {xs: 1, sm: 2} }}>
              <Typography variant="h6" align="left" sx={{ ml: 2, mb: 2}}>Tren Kebisingan (15 Terbaru)</Typography>
              <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <defs><linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8}/><stop offset="95%" stopColor="#a78bfa" stopOpacity={0.3}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis dataKey="name" tick={{ fill: 'rgba(255, 255, 255, 0.7)' }} />
                      <YAxis tick={{ fill: 'rgba(255, 255, 255, 0.7)' }} unit="dB"/>
                      <Tooltip 
                        cursor={{fill: 'rgba(255, 255, 255, 0.1)'}}
                        // --- FIX HERE: Added itemStyle to change text color ---
                        contentStyle={{ 
                            backgroundColor: 'rgba(30, 30, 30, 0.9)', 
                            borderColor: 'rgba(255, 255, 255, 0.2)', 
                            borderRadius: '12px',
                        }}
                        itemStyle={{ color: '#fff' }} // This makes the tooltip text white
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }} // This makes the label (date) white
                        labelFormatter={(label) => chartData.find(d => d.name === label)?.full_timestamp || label} 
                        formatter={(value: number) => [`${value} dB`, 'Tingkat Suara']}
                      />
                      <Bar dataKey="noise_level" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill="url(#colorUv)" />)}
                      </Bar>
                  </BarChart>
              </ResponsiveContainer>
            </StyledCard>
          </Grid>
        )}
        <Grid item xs={12}>
          <StyledTableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead><TableRow><StyledTableHeadCell>Timestamp</StyledTableHeadCell><StyledTableHeadCell align="center">Noise Level</StyledTableHeadCell><StyledTableHeadCell align="center">Sumber Suara</StyledTableHeadCell><StyledTableHeadCell align="center">Dampak Kesehatan</StyledTableHeadCell><StyledTableHeadCell align="center">Keyakinan</StyledTableHeadCell><StyledTableHeadCell>Nama File</StyledTableHeadCell><StyledTableHeadCell align="center">Waktu Proses</StyledTableHeadCell></TableRow></TableHead>
              <TableBody>
                {history.length === 0 ? ( <TableRow><StyledTableCell colSpan={7} align="center"><Typography py={4}>Belum ada riwayat prediksi untuk ditampilkan.</Typography></StyledTableCell></TableRow> ) : (
                  history.map((item) => (
                    <TableRow key={item.id} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' }}}>
                      <StyledTableCell>{formatDate(item.timestamp)}</StyledTableCell>
                      <StyledTableCell align="center"><Typography color="#60a5fa" fontWeight="bold">{item.noise_level} dB</Typography></StyledTableCell>
                      <StyledTableCell align="center">
                        <Chip 
                          label={item.noise_source.replace(/_/g, ' ')} 
                          variant="filled"
                          size="small"
                          sx={{ textTransform: 'capitalize', color: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.1)' }}
                        />
                      </StyledTableCell>
                      <StyledTableCell align="center">
                          <Chip 
                            label={item.health_impact} 
                            color={getHealthColor(item.health_impact)} 
                            size="small" 
                            variant="filled" 
                          />
                      </StyledTableCell>
                      <StyledTableCell align="center">{(item.confidence_score * 100).toFixed(1)}%</StyledTableCell>
                      <StyledTableCell sx={{maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{item.file_name || '-'}</StyledTableCell>
                      <StyledTableCell align="center">{item.processing_time.toFixed(2)}s</StyledTableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </StyledTableContainer>
        </Grid>
      </Grid>
      
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
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default HistoryPage;