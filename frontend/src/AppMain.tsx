import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Container, Box, Typography, styled } from '@mui/material';
import { VolumeX, Home, History, MapPin, User, LogOut } from 'lucide-react';

import HomePage from './components/HomePage';
import HistoryPage from './components/HistoryPage';
import StatusPage from './components/StatusPage';
import LandingPage from './components/LandingPage';
import MapsPage from './components/MapsPage'; // Import yang benar

// Updated theme to match landing page
const theme = createTheme({
  palette: {
    primary: {
      main: '#4A90E2', // Blue from landing page
      dark: '#2E5B8A',
      light: '#6BA6F0',
    },
    secondary: {
      main: '#6C7DD2', // Purple accent from landing page
      dark: '#4A5AA8',
      light: '#8B9CE8',
    },
    background: {
      default: '#0F1419', // Dark background like landing page
      paper: '#1A2332',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0BEC5',
    },
    divider: '#2D3748',
  },
  typography: {
    h4: {
      fontWeight: 700,
      color: '#FFFFFF',
    },
    h6: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    body1: {
      color: '#B0BEC5',
    },
    body2: {
      color: '#90A4AE',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #0F1419 0%, #1A2332 50%, #2D3748 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
  },
});

// Updated Sidebar with landing page colors
const Sidebar = styled(Box)(({ theme }) => ({
  width: '80px',
  height: '100vh',
  background: 'linear-gradient(180deg, #1A2332 0%, #0F1419 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'fixed',
  left: 0,
  top: 0,
  zIndex: 1000,
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  padding: '20px 0',
  borderRight: '1px solid #2D3748',
  overflow: 'hidden',
}));

const SidebarLogo = styled(Box)({
  marginBottom: '30px',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, #4A90E2 0%, #6C7DD2 100%)',
  color: 'white',
  fontWeight: 'bold',
  boxShadow: '0 4px 15px rgba(74, 144, 226, 0.3)',
});

// Interface untuk NavItem props
interface NavItemProps {
  active?: boolean;
  children: React.ReactNode;
}

const NavItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<NavItemProps>(({ active }) => ({
  width: '64px',
  height: '48px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: active ? '#4A90E2' : '#6C7293',
  transition: 'all 0.3s ease',
  position: 'relative',
  cursor: 'pointer',
  textDecoration: 'none',
  borderRadius: '8px',
  margin: '2px 0',
  '&:hover': {
    color: '#4A90E2',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  ...(active && {
    color: '#4A90E2',
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: '-8px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '3px',
      height: '20px',
      background: 'linear-gradient(135deg, #4A90E2 0%, #6C7DD2 100%)',
      borderRadius: '0 3px 3px 0',
    },
  }),
}));

const ContentWrapper = styled(Box)({
  marginLeft: '80px',
  width: 'calc(100% - 80px)',
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0F1419 0%, #1A2332 50%, #2D3748 100%)',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 30%, rgba(74, 144, 226, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(108, 125, 210, 0.08) 0%, transparent 50%)',
    pointerEvents: 'none',
  },
});

const NavigationSidebar: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Sidebar>
      <SidebarLogo>
        <VolumeX size={24} />
      </SidebarLogo>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', flex: 1, alignItems: 'center' }}>
        {/* Home */}
        <Link to="/home" style={{ textDecoration: 'none' }}>
          <NavItem active={isActive('/home')}>
            <Home size={22} />
          </NavItem>
        </Link>
        
        {/* Riwayat */}
        <Link to="/history" style={{ textDecoration: 'none' }}>
          <NavItem active={isActive('/history')}>
            <History size={22} />
          </NavItem>
        </Link>
        
        {/* Maps */}
        <Link to="/maps" style={{ textDecoration: 'none' }}>
          <NavItem active={isActive('/maps')}>
            <MapPin size={22} />
          </NavItem>
        </Link>
      </Box>
      
      {/* Profile dan Logout di bagian bawah */}
      <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
        {/* Profile */}
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <NavItem active={isActive('/profile')}>
            <User size={22} />
          </NavItem>
        </Link>
        
        {/* Logout */}
        <NavItem>
          <LogOut size={22} />
        </NavItem>
      </Box>
    </Sidebar>
  );
};

// Layout komponen untuk halaman dengan navigasi
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <NavigationSidebar />
      <ContentWrapper>
        <Container 
          maxWidth="lg" 
          sx={{ 
            mt: 4, 
            mb: 4, 
            p: 3,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {children}
        </Container>
      </ContentWrapper>
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
          
          {/* Route untuk Maps - menggunakan komponen MapsPage yang sebenarnya */}
          <Route path="/maps" element={
            <MainLayout>
              <MapsPage />
            </MainLayout>
          } />
          
          {/* Route untuk Profile */}
          <Route path="/profile" element={
            <MainLayout>
              <div>Profile Page - Coming Soon</div>
            </MainLayout>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;