import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Box, Tabs, Tab } from '@mui/material';
import { VolumeX, Home, History, Settings } from 'lucide-react';

import HomePage from './components/HomePage';
import HistoryPage from './components/HistoryPage';
import StatusPage from './components/StatusPage';

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
      case '/': return 0;
      case '/history': return 1;
      case '/status': return 2;
      default: return 0;
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
        to="/" 
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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
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
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/status" element={<StatusPage />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
