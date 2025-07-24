// src/components/BottomNavigation.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, styled } from "@mui/material";
import { Home, MapPin, History, User } from "lucide-react";

interface BottomNavigationProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

const BottomNavContainer = styled(Box)(({ theme }) => ({
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: "80px",
  background: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(20px)",
  borderTop: "1px solid rgba(0, 0, 0, 0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-around",
  padding: "0 20px",
  zIndex: 1000,
  boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.1)",
  borderRadius: "20px 20px 0 0",
  
  // Hanya tampil di mobile
  "@media (min-width: 768px)": {
    display: "none",
  },
}));

const NavItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ active }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: "12px",
  cursor: "pointer",
  transition: "all 0.3s ease",
  position: "relative",
  minWidth: "50px",
  
  color: active ? "#4A90E2" : "#6B7280",
  
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
      top: "-2px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "20px",
      height: "3px",
      background: "linear-gradient(135deg, #4A90E2 0%, #6C7DD2 100%)",
      borderRadius: "0 0 3px 3px",
    },
  }),
}));

const NavLabel = styled("span")<{ active?: boolean }>(({ active }) => ({
  fontSize: "10px",
  fontWeight: active ? 600 : 400,
  marginTop: "4px",
  textAlign: "center",
}));

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  isAuthenticated,
  onLogout,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <BottomNavContainer>
      <NavItem 
        active={isActive("/home")} 
        onClick={() => handleNavigation("/home")}
      >
        <Home size={20} />
        <NavLabel active={isActive("/home")}>Home</NavLabel>
      </NavItem>
      
      <NavItem 
        active={isActive("/maps")} 
        onClick={() => handleNavigation("/maps")}
      >
        <MapPin size={20} />
        <NavLabel active={isActive("/maps")}>Maps</NavLabel>
      </NavItem>
      
      {isAuthenticated && (
        <NavItem 
          active={isActive("/history")} 
          onClick={() => handleNavigation("/history")}
        >
          <History size={20} />
          <NavLabel active={isActive("/history")}>History</NavLabel>
        </NavItem>
      )}
      
      <NavItem 
        active={isActive("/profile")} 
        onClick={() => handleNavigation(isAuthenticated ? "/profile" : "/login")}
      >
        <User size={20} />
        <NavLabel active={isActive("/profile")}>
          {isAuthenticated ? "Profile" : "Login"}
        </NavLabel>
      </NavItem>
    </BottomNavContainer>
  );
};

export default BottomNavigation;