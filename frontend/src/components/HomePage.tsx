// src/components/HomePage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Tabs,
  Tab,
} from "@mui/material";
import RealTimeNoiseTab from "./RealTimeNoiseTab";
import ModernPopup from "./ModernPopup";
import { useAuth } from "../contexts/AuthContext";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isAuthenticated: isAuthCtx } = useAuth();

  useEffect(() => {
    setIsAuthenticated(isAuthCtx);
  }, [isAuthCtx]);

  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleLoginRedirect = () => {
    navigate("/login");
  };

  const handleCloseAlert = () => {
    setShowLoginAlert(false);
  };

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        p: { xs: 1, sm: 2, md: 3 },
        color: "#fff",
        textAlign: "center",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {!isAuthenticated && (
        <Box
          sx={{
            position: "fixed",
            top: { xs: 10, sm: 20 },
            right: { xs: 10, sm: 20 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1, sm: 2 },
            zIndex: 1000,
            width: { xs: "calc(100% - 20px)", sm: "auto" },
            maxWidth: { xs: "250px", sm: "none" },
          }}
        >
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            sx={{
              color: "#ffffff",
              borderColor: "rgba(255, 255, 255, 0.6)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(10px)",
              borderRadius: "50px",
              px: { xs: 2, sm: 3 },
              py: { xs: 0.8, sm: 1 },
              fontWeight: 600,
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              textTransform: "none",
              transition: "all 0.3s ease",
              width: { xs: "100%", sm: "auto" },
              minHeight: { xs: "44px", sm: "auto" },
              "&:hover": {
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                color: "#3b82f6",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 25px rgba(59, 130, 246, 0.2)",
              },
            }}
          >
            Login
          </Button>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
              color: "#ffffff",
              borderRadius: "50px",
              px: { xs: 2, sm: 3 },
              py: { xs: 0.8, sm: 1 },
              fontWeight: 600,
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              textTransform: "none",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
              transition: "all 0.3s ease",
              width: { xs: "100%", sm: "auto" },
              minHeight: { xs: "44px", sm: "auto" },
              "&:hover": {
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 25px rgba(59, 130, 246, 0.4)",
              },
            }}
          >
            Sign Up
          </Button>
        </Box>
      )}

      {/* Tab Navigation */}
      <Box
        sx={{ 
          borderBottom: 1, 
          borderColor: "rgba(255,255,255,0.2)", 
          mb: { xs: 2, sm: 3, md: 4 },
          mt: { xs: 8, sm: 4, md: 2 },
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          centered
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": {
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600,
              textTransform: "none",
              fontSize: { xs: "0.9rem", sm: "1rem" },
              minHeight: { xs: "48px", sm: "auto" },
              "&.Mui-selected": {
                color: "#3b82f6",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#3b82f6",
              height: 3,
              borderRadius: "2px",
            },
            "& .MuiTabs-scrollButtons": {
              color: "rgba(255,255,255,0.7)",
            },
          }}
        >
          <Tab label="Monitor Real-time" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight={{ xs: "calc(100vh - 150px)", sm: "calc(100vh - 180px)", md: "calc(100vh - 200px)" }}
          flex={1}
          px={{ xs: 1, sm: 2 }}
        >
          <RealTimeNoiseTab />
        </Box>
      )}

      <style>
        {`
        body { 
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #16213e 100%);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }
        @keyframes gradientShift { 
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        } 
      `}
      </style>

      <ModernPopup
        isVisible={showLoginAlert}
        title="Login Diperlukan"
        message="Untuk dapat membagikan hasil analisis ke peta komunitas, Anda perlu login terlebih dahulu. Bergabunglah dengan kami untuk berbagi data polusi suara!"
        type="login"
        onConfirm={handleLoginRedirect}
        onCancel={handleCloseAlert}
        onClose={handleCloseAlert}
        confirmText="Login Sekarang"
        cancelText="Nanti Saja"
      />
    </Box>
  );
};

// Removed the orphaned code block that was incorrectly placed outside the component

export default HomePage;
