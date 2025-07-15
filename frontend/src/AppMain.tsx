import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Box, Tabs, Tab } from '@mui/material';
import { VolumeX, Home, History, Settings } from 'lucide-react';

import HomePage from './components/HomePage';
import HistoryPage from './components/HistoryPage';
import StatusPage from './components/StatusPage';
import LandingPage from './components/LandingPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
});

const NavigationTabs: React.FC = () => {
  const location = useLocation();
  
  const getTabValue = () => {
    switch (location.pathname) {
      case '/home': return 0;
      case '/history': return 1;
      case '/status': return 2;
      default: return -1; // Tidak ada tab yang aktif untuk landing page
    }
  };

  return (
    <Tabs 
      value={getTabValue()} 
      textColor="inherit"
      indicatorColor="secondary"
      sx={{ ml: 2 }}
    >
      <Tab 
        icon={<Home size={16} />} 
        label="Beranda" 
        component={Link} 
        to="/home" 
        sx={{ minHeight: 48 }}
      />
      <Tab 
        icon={<History size={16} />} 
        label="Riwayat" 
        component={Link} 
        to="/history" 
        sx={{ minHeight: 48 }}
      />
      <Tab 
        icon={<Settings size={16} />} 
        label="Status" 
        component={Link} 
        to="/status" 
        sx={{ minHeight: 48 }}
      />
    </Tabs>
  );
};

// Layout komponen untuk halaman dengan navigasi
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <VolumeX size={28} style={{ marginRight: 16 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🎵 Noise Pollution Detection System
          </Typography>
          <NavigationTabs />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Landing page tanpa layout navigasi */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Halaman dengan layout navigasi */}
          <Route path="/home" element={
            <MainLayout>
              <HomePage />
            </MainLayout>
          } />
          <Route path="/history" element={
            <MainLayout>
              <HistoryPage />
            </MainLayout>
          } />
          <Route path="/status" element={
            <MainLayout>
              <StatusPage />
            </MainLayout>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
