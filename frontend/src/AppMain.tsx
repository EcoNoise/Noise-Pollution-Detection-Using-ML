import React, { useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";


import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Container, Box, Typography, styled } from "@mui/material";
import { VolumeX, Home, History, MapPin, User, LogOut } from "lucide-react";

import HomePage from "./components/HomePage";
import HistoryPage from "./components/HistoryPage";
import StatusPage from "./components/StatusPage";
import LandingPage from "./components/LandingPage";
import MapsPage from "./components/MapsPage"; // Import yang benar
import RegisterPage from "./components/RegisterPage";
import LoginPage from "./components/LoginPage";
import ProfilePage from "./components/ProfilePage";

// Updated theme to match landing page
const theme = createTheme({
  palette: {
    primary: {
      main: "#4A90E2", // Blue from landing page
      dark: "#2E5B8A",
      light: "#6BA6F0",
    },
    secondary: {
      main: "#6C7DD2", // Purple accent from landing page
      dark: "#4A5AA8",
      light: "#8B9CE8",
    },
    background: {
      default: "#0F1419", // Dark background like landing page
      paper: "#1A2332",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#B0BEC5",
    },
    divider: "#2D3748",
  },
  typography: {
    h4: {
      fontWeight: 700,
      color: "#FFFFFF",
    },
    h6: {
      fontWeight: 600,
      color: "#FFFFFF",
    },
    body1: {
      color: "#B0BEC5",
    },
    body2: {
      color: "#90A4AE",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            "linear-gradient(135deg, #0F1419 0%, #1A2332 50%, #2D3748 100%)",
          minHeight: "100vh",
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
        },
      },
    },
  },
});

// Updated Sidebar with landing page colors
const Sidebar = styled(Box)(({ theme }) => ({
  width: "80px",
  height: "100vh",
  background: "linear-gradient(180deg, #1A2332 0%, #0F1419 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "fixed",
  left: 0,
  top: 0,
  zIndex: 1000,
  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  padding: "20px 0",
  borderRight: "1px solid #2D3748",
  overflow: "hidden",
}));

const SidebarLogo = styled(Box)({
  marginBottom: "30px",
  width: "40px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #4A90E2 0%, #6C7DD2 100%)",
  color: "white",
  fontWeight: "bold",
  boxShadow: "0 4px 15px rgba(74, 144, 226, 0.3)",
});

// Interface untuk NavItem props
interface NavItemProps {
  active?: boolean;
  children: React.ReactNode;
}

const NavItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== "active",
})<NavItemProps>(({ active }) => ({
  width: "64px",
  height: "48px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: active ? "#4A90E2" : "#6C7293",
  transition: "all 0.3s ease",
  position: "relative",
  cursor: "pointer",
  textDecoration: "none",
  borderRadius: "8px",
  margin: "2px 0",
  "&:hover": {
    color: "#4A90E2",
    backgroundColor: "rgba(74, 144, 226, 0.1)",
  },
  ...(active && {
    color: "#4A90E2",
    backgroundColor: "rgba(74, 144, 226, 0.15)",
    "&::before": {
      content: '""',
      position: "absolute",
      left: "-8px",
      top: "50%",
      transform: "translateY(-50%)",
      width: "3px",
      height: "20px",
      background: "linear-gradient(135deg, #4A90E2 0%, #6C7DD2 100%)",
      borderRadius: "0 3px 3px 0",
    },
  }),
}));

const ContentWrapper = styled(Box)({
  marginLeft: "80px",
  width: "calc(100% - 80px)",
  minHeight: "100vh",
  background: "linear-gradient(135deg, #0F1419 0%, #1A2332 50%, #2D3748 100%)",
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "radial-gradient(circle at 20% 30%, rgba(74, 144, 226, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(108, 125, 210, 0.08) 0%, transparent 50%)",
    pointerEvents: "none",
  },
});

const NavigationSidebar: React.FC<{
  onLogout: () => void;
  isAuthenticated: boolean;
}> = ({ onLogout, isAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  return (
    <Sidebar>
      <SidebarLogo>
        <VolumeX size={24} />
      </SidebarLogo>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          width: "100%",
          flex: 1,
          alignItems: "center",
        }}
      >
        {/* Menu ini selalu ada untuk semua orang */}
        <Link to="/home" style={{ textDecoration: "none" }}>
          <NavItem active={isActive("/home")}>
            <Home size={22} />
          </NavItem>
        </Link>
        <Link to="/maps" style={{ textDecoration: "none" }}>
          <NavItem active={isActive("/maps")}>
            <MapPin size={22} />
          </NavItem>
        </Link>

        {/* Menu ini HANYA MUNCUL jika sudah login */}
        {isAuthenticated && (
          <Link to="/history" style={{ textDecoration: "none" }}>
            <NavItem active={isActive("/history")}>
              <History size={22} />
            </NavItem>
          </Link>
        )}
      </Box>

      {/* Tombol Profile & Logout HANYA MUNCUL jika sudah login */}
      <Box
        sx={{
          mt: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          alignItems: "center",
        }}
      >
        {isAuthenticated && (
          <>
            <Link to="/profile" style={{ textDecoration: "none" }}>
              <NavItem active={isActive("/profile")}>
                <User size={22} />
              </NavItem>
            </Link>
            <NavItem onClick={handleLogout}>
              <LogOut size={22} />
            </NavItem>
          </>
        )}
      </Box>
    </Sidebar>
  );
};

// 2. Layout Utama: Membungkus semua halaman yang butuh sidebar
const MainLayout: React.FC<{
  children: React.ReactNode;
  onLogout: () => void;
  isAuthenticated: boolean;
}> = ({ children, onLogout, isAuthenticated }) => (
  <Box sx={{ display: "flex" }}>
    <NavigationSidebar onLogout={onLogout} isAuthenticated={isAuthenticated} />
    <ContentWrapper>{children}</ContentWrapper>
  </Box>
);

// 3. Rute Terlindungi: Komponen untuk halaman yang wajib login
const ProtectedRoute: React.FC<{
  isAuthenticated: boolean;
  children: JSX.Element;
}> = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// 4. Komponen App Utama: Mengatur semua routing
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("accessToken")
  );

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsAuthenticated(false);
  };

  // Listen untuk auth logout events dari API interceptor
  useEffect(() => {
    const handleAuthLogout = () => {
      setIsAuthenticated(false);
    };

    window.addEventListener("auth:logout", handleAuthLogout);

    return () => {
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, []);

  // Check authentication status saat app load
  useEffect(() => {
    const checkAuth = () => {
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      if (!accessToken || !refreshToken) {
        setIsAuthenticated(false);
        return;
      }

      // Basic token expiry check
      try {
        const payload = JSON.parse(atob(accessToken.split(".")[1]));
        const currentTime = Date.now() / 1000;

        if (payload.exp < currentTime) {
          // Access token expired, check refresh token
          const refreshPayload = JSON.parse(atob(refreshToken.split(".")[1]));
          if (refreshPayload.exp < currentTime) {
            // Both tokens expired
            handleLogout();
          } else {
            // Refresh token still valid, keep authenticated
            setIsAuthenticated(true);
          }
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Invalid token format
        handleLogout();
      }
    };

    checkAuth();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Rute tanpa sidebar */}
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={<LoginPage onLoginSuccess={handleLogin} />}
          />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rute publik dengan sidebar (Home & Maps) */}
          <Route
            path="/home"
            element={
              <MainLayout
                onLogout={handleLogout}
                isAuthenticated={isAuthenticated}
              >
                <HomePage />
              </MainLayout>
            }
          />
          <Route
            path="/maps"
            element={
              <MainLayout
                onLogout={handleLogout}
                isAuthenticated={isAuthenticated}
              >
                <MapsPage />
              </MainLayout>
            }
          />

          {/* Rute yang wajib login */}
          <Route
            path="/history"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MainLayout
                  onLogout={handleLogout}
                  isAuthenticated={isAuthenticated}
                >
                  <HistoryPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MainLayout
                  onLogout={handleLogout}
                  isAuthenticated={isAuthenticated}
                >
                  <ProfilePage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/status"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MainLayout
                  onLogout={handleLogout}
                  isAuthenticated={isAuthenticated}
                >
                  <StatusPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Rute default */}
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/home" : "/"} />}
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;