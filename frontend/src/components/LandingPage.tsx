import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

interface LandingPageProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "spline-viewer": {
        className?: string;
        url?: string;
        [key: string]: any;
      };
    }
  }
}

const ModernLandingPage: React.FC<LandingPageProps> = ({
  isAuthenticated,
  onLogout,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const splineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Generate particles for background animation
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 2,
  }));

  // Generate sound wave bars dynamically
  useEffect(() => {
    const generateSoundWave = () => {
      const soundWaveContainer = document.querySelector(".sound-wave");
      if (soundWaveContainer) {
        soundWaveContainer.innerHTML = "";
        for (let i = 0; i < 40; i++) {
          const bar = document.createElement("div");
          bar.className = "wave-bar";
          bar.style.animationDelay = i * 0.1 + "s";
          bar.style.animationDuration = Math.random() * 1 + 1.5 + "s";
          soundWaveContainer.appendChild(bar);
        }
      }
    };

    // Generate sound wave after component mounts
    const timer = setTimeout(generateSoundWave, 1000);

    // Regenerate sound wave periodically for dynamic effect
    const interval = setInterval(generateSoundWave, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Load Spline viewer script
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://unpkg.com/@splinetool/viewer@1.10.27/build/spline-viewer.js";
    script.async = true;
    document.head.appendChild(script);

    // Function to remove Spline watermark
    const removeSplineWatermark = () => {
      // Wait for Spline viewer to load
      setTimeout(() => {
        const splineViewer = document.querySelector("spline-viewer");
        if (splineViewer && splineViewer.shadowRoot) {
          // Try to find and remove watermark in shadow DOM
          const shadowRoot = splineViewer.shadowRoot;
          const watermarkElements = shadowRoot.querySelectorAll(
            'a[href*="spline.design"], div[style*="position: absolute"][style*="bottom"], div[style*="position: fixed"][style*="bottom"]'
          );
          watermarkElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            if (
              el.textContent?.includes("Built with Spline") ||
              el.getAttribute("href")?.includes("spline.design")
            ) {
              htmlEl.style.display = "none";
              htmlEl.style.visibility = "hidden";
              htmlEl.style.opacity = "0";
              el.remove();
            }
          });
        }

        // Also check for watermark in regular DOM
        const regularWatermarks = document.querySelectorAll(
          'a[href*="spline.design"], div[style*="position: absolute"][style*="bottom"]'
        );
        regularWatermarks.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (
            el.textContent?.includes("Built with Spline") ||
            el.getAttribute("href")?.includes("spline.design")
          ) {
            htmlEl.style.display = "none";
            htmlEl.style.visibility = "hidden";
            htmlEl.style.opacity = "0";
            el.remove();
          }
        });
      }, 2000);
    };

    // Remove watermark when script loads
    script.onload = removeSplineWatermark;

    // Also try to remove watermark periodically
    const interval = setInterval(removeSplineWatermark, 3000);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      clearInterval(interval);
    };
  }, []);

  // Alternative approach using ref for creating spline-viewer
  const SplineViewer = ({
    url,
    className,
  }: {
    url: string;
    className?: string;
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // Check if spline-viewer is loaded
      const checkAndCreateSpline = () => {
        if (customElements.get("spline-viewer")) {
          const splineViewer = document.createElement("spline-viewer") as any;
          splineViewer.setAttribute("url", url);
          if (className) splineViewer.className = className;
          container.innerHTML = "";
          container.appendChild(splineViewer);
        } else {
          // Retry after a short delay
          setTimeout(checkAndCreateSpline, 100);
        }
      };

      checkAndCreateSpline();
    }, [url, className]);

    return <div ref={containerRef} className="w-full h-full" />;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0;
          padding: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow-x: hidden;
        }
        
        /* Background & Animations */
        .main-container {
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #16213e 100%);
          background-size: 400% 400%;
          animation: gradientShift 8s ease infinite;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          margin: 0;
          padding: 0;
          padding-bottom: 0; /* Default untuk desktop */
        }
        
        /* Responsive padding untuk bottom navigation */
        @media (max-width: 767px) {
          .main-container {
            padding-bottom: 100px; /* Ruang untuk bottom navigation di mobile */
          }
        }
        
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .particles-container {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 1;
        }
        
        .particle {
          position: absolute;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.8) 0%, rgba(59, 130, 246, 0.4) 50%, transparent 100%);
          border-radius: 50%;
          animation: float 4s ease-in-out infinite, twinkle 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          25% { opacity: 0.8; transform: scale(1.2); }
          75% { opacity: 0.5; transform: scale(0.8); }
        }
        
        /* Glow orbs */
        .glow-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: pulse 6s ease-in-out infinite;
          z-index: 1;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        
        .orb-1 {
          top: 10%;
          left: 10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 40%, transparent 70%);
          filter: blur(60px);
        }
        
        .orb-2 {
          bottom: 20%;
          right: 10%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(147, 51, 234, 0.12) 0%, rgba(147, 51, 234, 0.04) 40%, transparent 70%);
          filter: blur(50px);
          animation-delay: 2s;
        }
        
        .orb-3 {
          top: 60%;
          left: 70%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.03) 40%, transparent 70%);
          filter: blur(40px);
          animation-delay: 4s;
        }
        
        /* Header */
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 1000;
          padding: 1rem 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin: 0;
        }

        .navbar.scrolled {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 0.1rem;
          color: #60a5fa;
          font-size: 1.5rem;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.3s ease;
          transform: translateX(-25px);
        }
        
        // .logo:hover {
        //   color: #3b82f6;
        //   transform: scale(1.05);
        // }
        
        .logo-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0; 
        }

        .logo-svg {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          filter: drop-shadow(0 4px 15px rgba(59, 130, 246, 0.3));
          transition: all 0.3s ease;
        }
        
        // .logo:hover .logo-svg {
        //   transform: rotate(5deg) scale(1.1);
        //   filter: drop-shadow(0 6px 20px rgba(59, 130, 246, 0.4));
        // }
        .logo-text {
        line-height: 1; /* Pastikan line-height konsisten */
        vertical-align: middle; /* Untuk alignment yang lebih baik */
      }
        .nav-menu {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        
        .nav-links {
          display: flex;
          gap: 2rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .nav-link {
          color: #e5e7eb;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          transition: width 0.3s ease;
        }
        
        .nav-link:hover {
          color: #60a5fa;
        }
        
        .nav-link:hover::after {
          width: 100%;
        }
        
        .signin-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          color: white;
          text-decoration: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }
        
        .signin-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
          color: white;
        }
        
        /* Mobile menu */
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: #e5e7eb;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .mobile-menu-btn:hover {
          color: #60a5fa;
        }

        /* Mobile Menu Dropdown */
        .mobile-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
        }

        .mobile-menu {
          position: fixed;
          top: 100%;
          left: 0;
          width: 100%;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          transform: translateY(-100%);
          transition: all 0.3s ease;
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
        }

        .mobile-menu.active {
          transform: translateY(0);
          opacity: 1;
          visibility: visible;
        }

        .mobile-menu-content {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .mobile-menu-item {
          display: block;
          padding: 1rem 0;
          color: #e5e7eb;
          text-decoration: none;
          font-weight: 500;
          font-size: 1.1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
          text-align: center;
        }

        .mobile-menu-item:hover {
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.1);
          border-radius: 8px;
        }

        .mobile-logout-btn {
          background: none;
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: center;
        }

        /* Desktop auth buttons - hidden on mobile */
        .desktop-auth {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        
        /* Hero Section */
        .hero-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 10;
          padding: 5rem 2rem 2rem;
          margin: 0;
        }
        
        .hero-wrapper {
          max-width: 1200px;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: center;
          margin: 0 auto;
        }
        
        .hero-content {
          text-align: left;
          z-index: 20;
        }
        
        .hero-visual {
          position: relative;
          display: flex;
          transform: translateX(8rem);
          align-items: center;
          justify-content: center;
          min-height: 500px;
          z-index: 15;
        }
        
        .spline-container {
          width: 100%;
          height: 500px;
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          /* Remove box-shadow and background to make it transparent */
          background: transparent;
          /* Remove the glassmorphism effect */
          /* box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); */
          /* background: rgba(255, 255, 255, 0.05); */
          /* backdrop-filter: blur(10px); */
          /* border: 1px solid rgba(255, 255, 255, 0.1); */
        }
        
        .spline-viewer {
          width: 100%;
          height: 100%;
          border-radius: 20px;
          /* Force transparent background */
          background: transparent !important;
        }
        
        /* Additional CSS to ensure Spline viewer has transparent background */
        .spline-viewer canvas {
          background: transparent !important;
        }

        /* Hide Spline watermark */
        .spline-viewer spline-watermark,
        .spline-viewer [data-spline-watermark],
        .spline-viewer div[style*="position: absolute"][style*="bottom"],
        .spline-viewer div[style*="position: fixed"][style*="bottom"],
        .spline-viewer a[href*="spline.design"],
        .spline-viewer div:has(a[href*="spline.design"]) {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        /* Alternative approach - hide any bottom-right positioned elements in spline viewer */
        .spline-viewer > div:last-child {
          display: none !important;
        }

        /* Hide any element containing "Built with Spline" text */
        .spline-viewer *:has-text("Built with Spline"),
        .spline-viewer *[title*="Built with Spline"],
        .spline-viewer *[alt*="Built with Spline"] {
          display: none !important;
        }
        
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #60a5fa;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        
        .hero-badge:hover {
          background: rgba(59, 130, 246, 0.15);
          transform: translateY(-2px);
        }
        
        .hero-title {
          font-size: clamp(2.5rem, 6vw, 3.5rem);
          font-weight: 900;
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.1;
          margin: 0 0 1.5rem 0;
          animation: titleGlow 3s ease-in-out infinite alternate;
        }
        
        @keyframes titleGlow {
          0% { filter: brightness(1); }
          100% { filter: brightness(1.2); }
        }
        
        .hero-subtitle {
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: #d1d5db;
          line-height: 1.6;
          margin: 0 0 3rem 0;
          opacity: 0.9;
        }
        
        .cta-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin: 0;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          color: white;
          text-decoration: none;
          padding: 1rem 2rem;
          border-radius: 16px;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
          border: none;
          cursor: pointer;
          display: inline-block;
          margin: 0;
        }
        
        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(59, 130, 246, 0.4);
          color: white;
        }
        
        .btn-secondary {
          background: transparent;
          color: #e5e7eb;
          text-decoration: none;
          padding: 1rem 2rem;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          display: inline-block;
          margin: 0;
        }
        
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-3px);
          color: #e5e7eb;
          box-shadow: 0 8px 25px rgba(255, 255, 255, 0.1);
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-top: 3rem;
        }
        
        .stat-item {
          text-align: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: #60a5fa;
          margin-bottom: 0.5rem;
        }
        
        .stat-label {
          font-size: 0.85rem;
          color: #d1d5db;
          opacity: 0.8;
        }
        
        .fallback-3d {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%);
          border-radius: 20px;
          position: relative;
          overflow: hidden;
        }
        
        .fallback-3d::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.1) 0%, transparent 70%);
          animation: rotate 10s linear infinite;
        }
        
        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .fallback-text {
          color: #60a5fa;
          font-size: 1.2rem;
          font-weight: 600;
          z-index: 10;
          position: relative;
        }
        
        /* Responsive Design */
        @media (max-width: 968px) {
          .hero-wrapper {
            grid-template-columns: 1fr;
            gap: 2rem;
            text-align: center;
          }
          
          .hero-content {
            text-align: center;
          }
          
          .hero-visual {
            order: -1;
            transform: translateX(0); /* Reset transform di tablet */
          }
          
          .spline-container {
            height: 400px;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 768px) {
          .logo {
            font-size: 1.4rem; /* Sedikit lebih kecil di mobile */
            gap: 0.5rem;
          }
          
          .logo-icon {
            width: 50px; /* Sesuaikan ukuran untuk mobile */
            height: 50px;
          }

          /* Hide desktop auth buttons on mobile */
          .desktop-auth {
            display: none;
          }

          /* Show mobile menu button */
          .mobile-menu-btn {
            display: block;
          }
          
          .hero-visual {
            transform: translateX(0); /* Reset transform di mobile */
          }
          
          .nav-links {
            position: fixed;
            top: 100%;
            left: 0;
            width: 100%;
            background: rgba(10, 10, 15, 0.95);
            backdrop-filter: blur(20px);
            flex-direction: column;
            gap: 0;
            padding: 2rem;
            margin: 0;
            transform: translateY(-100%);
            transition: all 0.3s ease;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .nav-links.active {
            transform: translateY(0);
          }
          
          .nav-link {
            padding: 1rem 0;
            margin: 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .nav-menu {
            gap: 1rem;
          }
          
          .hero-section {
            padding: 6rem 1rem 2rem;
            min-height: 90vh; /* Kurangi tinggi di mobile */
          }
          
          .hero-title {
            font-size: clamp(2rem, 8vw, 2.5rem); /* Lebih responsif */
          }
          
          .hero-subtitle {
            font-size: clamp(0.9rem, 4vw, 1.1rem); /* Lebih responsif */
          }
          
          .cta-buttons {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }
          
          .btn-primary,
          .btn-secondary {
            width: 100%;
            max-width: 280px;
            padding: 0.875rem 1.5rem; /* Sedikit lebih kecil di mobile */
          }
          
          .spline-container {
            height: 350px;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
            margin-top: 2rem;
          }
          
          .stat-item {
            padding: 0.75rem;
          }
          
          .stat-number {
            font-size: 1.25rem;
          }
          
          .stat-label {
            font-size: 0.8rem;
          }
        }
        
        @media (max-width: 480px) {
          .nav-container {
            padding: 0 1rem;
          }
          
          .hero-section {
            padding: 5rem 1rem 2rem;
            min-height: 85vh;
          }
          
          .hero-title {
            font-size: clamp(1.75rem, 10vw, 2rem);
            margin-bottom: 1rem;
          }
          
          .hero-subtitle {
            font-size: clamp(0.85rem, 5vw, 1rem);
            margin-bottom: 2rem;
          }
          
          .spline-container {
            height: 300px;
          }
          
          .btn-primary,
          .btn-secondary {
            max-width: 250px;
            padding: 0.75rem 1.25rem;
            font-size: 0.9rem;
          }
          
          .stats-grid {
            gap: 0.75rem;
          }
        }

        /* Floating Features Section */
        /* Unique Minimal Tech Section */
        .minimal-tech-section {
          position: relative;
          padding: 6rem 2rem;
          background: linear-gradient(180deg, rgba(8, 8, 12, 0.95) 0%, rgba(15, 15, 25, 0.9) 100%);
          overflow: hidden;
        }

        .tech-grid-container {
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .section-header-minimal {
          text-align: center;
          margin-bottom: 5rem;
          position: relative;
        }

        .tech-title {
          font-size: clamp(2.5rem, 6vw, 4rem);
          font-weight: 300;
          color: #f8fafc;
          margin-bottom: 2rem;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .title-accent-line {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, #60a5fa 50%, transparent 100%);
          margin: 0 auto;
          position: relative;
        }

        .title-accent-line::before {
          content: '';
          position: absolute;
          top: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: #60a5fa;
          border-radius: 50%;
          box-shadow: 0 0 10px #60a5fa;
        }

        .tech-showcase {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 4rem;
          margin-top: 4rem;
        }

        .tech-item {
          display: flex;
          align-items: center;
          gap: 3rem;
          padding: 2rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .tech-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(96, 165, 250, 0.03) 50%, transparent 100%);
          transition: left 0.6s ease;
        }

        .tech-item:hover::before {
          left: 100%;
        }

        .tech-item:hover {
          border-color: rgba(96, 165, 250, 0.2);
          transform: translateX(10px);
        }

        .tech-visual {
          flex-shrink: 0;
          width: 120px;
          height: 120px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Neural Network Visual */
        .neural-dots {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .neural-dots .dot {
          position: absolute;
          width: 12px;
          height: 12px;
          background: rgba(148, 163, 184, 0.3);
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .neural-dots .dot.active {
          background: #60a5fa;
          box-shadow: 0 0 15px rgba(96, 165, 250, 0.5);
          animation: neuralPulse 2s ease-in-out infinite;
        }

        .neural-dots .dot:nth-child(1) { top: 20%; left: 20%; }
        .neural-dots .dot:nth-child(2) { top: 20%; right: 20%; }
        .neural-dots .dot:nth-child(3) { top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .neural-dots .dot:nth-child(4) { bottom: 20%; left: 20%; }
        .neural-dots .dot:nth-child(5) { bottom: 20%; right: 20%; }

        .neural-connections {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .neural-connections .connection {
          position: absolute;
          background: linear-gradient(45deg, transparent 0%, rgba(96, 165, 250, 0.3) 50%, transparent 100%);
          height: 1px;
          animation: connectionFlow 3s ease-in-out infinite;
        }

        .connection.c1 {
          top: 30%;
          left: 25%;
          width: 50%;
          transform: rotate(15deg);
          animation-delay: 0s;
        }

        .connection.c2 {
          top: 50%;
          left: 20%;
          width: 60%;
          transform: rotate(-20deg);
          animation-delay: 1s;
        }

        .connection.c3 {
          bottom: 30%;
          left: 25%;
          width: 50%;
          transform: rotate(10deg);
          animation-delay: 2s;
        }

        @keyframes neuralPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }

        @keyframes connectionFlow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }

        /* Wave Spectrum Visual */
        .wave-spectrum {
          display: flex;
          align-items: end;
          justify-content: center;
          gap: 4px;
          height: 80px;
          width: 100%;
        }

        .spectrum-bar {
          width: 8px;
          background: linear-gradient(to top, #1e293b 0%, #60a5fa  100%);
          border-radius: 4px 4px 0 0;
          animation: spectrumWave 1.5s ease-in-out infinite;
          min-height: 10px;
        }

        .spectrum-bar:nth-child(1) { animation-delay: 0s; }
        .spectrum-bar:nth-child(2) { animation-delay: 0.1s; }
        .spectrum-bar:nth-child(3) { animation-delay: 0.2s; }
        .spectrum-bar:nth-child(4) { animation-delay: 0.3s; }
        .spectrum-bar:nth-child(5) { animation-delay: 0.4s; }
        .spectrum-bar:nth-child(6) { animation-delay: 0.5s; }
        .spectrum-bar:nth-child(7) { animation-delay: 0.6s; }

        .processing-indicator {
          position: absolute;
          top: -10px;
          right: -10px;
          width: 20px;
          height: 20px;
          background: #10b981;
          border-radius: 50%;
          animation: processingBlink 1s ease-in-out infinite;
        }

        @keyframes spectrumWave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }

        @keyframes processingBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Trend Chart Visual */
        .trend-chart {
          position: relative;
          width: 100%;
          height: 80px;
        }

        .chart-grid {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .chart-grid .grid-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 1px;
          background: rgba(148, 163, 184, 0.1);
        }

        .chart-grid .grid-line:nth-child(1) { top: 25%; }
        .chart-grid .grid-line:nth-child(2) { top: 50%; }
        .chart-grid .grid-line:nth-child(3) { top: 75%; }

        .chart-line {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .chart-point {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #f59e0b;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
          animation: chartGrow 2s ease-in-out infinite;
        }

        .chart-point.p1 { bottom: 20%; left: 10%; animation-delay: 0s; }
        .chart-point.p2 { bottom: 40%; left: 35%; animation-delay: 0.5s; }
        .chart-point.p3 { bottom: 30%; left: 60%; animation-delay: 1s; }
        .chart-point.p4 { bottom: 60%; left: 85%; animation-delay: 1.5s; }

        .chart-point::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 100%;
          width: 25px;
          height: 1px;
          background: linear-gradient(90deg, #f59e0b 0%, transparent 100%);
          transform: translateY(-50%);
        }

        .chart-point.p4::before {
          display: none;
        }

        .prediction-arrow {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 12px solid #f59e0b;
          animation: arrowFloat 2s ease-in-out infinite;
        }

        @keyframes chartGrow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }

        @keyframes arrowFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }

        .tech-content {
          flex: 1;
        }

        .tech-content h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 1rem;
          letter-spacing: -0.01em;
        }

        .tech-content p {
          color: #94a3b8;
          line-height: 1.6;
          font-size: 0.95rem;
          font-weight: 400;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .tech-showcase {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .tech-item {
            flex-direction: column;
            text-align: center;
            gap: 2rem;
          }

          .tech-visual {
            width: 100px;
            height: 100px;
          }

          .minimal-tech-section {
            padding: 4rem 1rem;
          }
        }

        /* Parallax Data Visualization Section */
        .parallax-data-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          overflow: hidden;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
        }

        .parallax-bg {
          position: absolute;
          top: -20%;
          left: 0;
          width: 100%;
          height: 140%;
          pointer-events: none;
        }

        .data-particles {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .data-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #3b82f6;
          border-radius: 50%;
          animation: dataFloat 8s ease-in-out infinite;
        }

        .particle-0 {
          top: 20%;
          left: 10%;
          animation-delay: 0s;
          background: #3b82f6;
        }

        .particle-1 {
          top: 40%;
          left: 30%;
          animation-delay: 2s;
          background: #8b5cf6;
        }

        .particle-2 {
          top: 60%;
          left: 70%;
          animation-delay: 4s;
          background: #10b981;
        }

        .particle-3 {
          top: 80%;
          left: 50%;
          animation-delay: 6s;
          background: #f59e0b;
        }

        @keyframes dataFloat {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(20px, -30px) scale(1.2); opacity: 0.8; }
          50% { transform: translate(-10px, -60px) scale(0.8); opacity: 1; }
          75% { transform: translate(30px, -40px) scale(1.1); opacity: 0.6; }
        }

        .data-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 2rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          position: relative;
          z-index: 10;
        }

        .sound-wave-container {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 20px;
          padding: 2rem;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sound-wave {
          display: flex;
          align-items: end;
          justify-content: center;
          height: 200px;
          gap: 3px;
        }

        .wave-bar {
          width: 4px;
          background: linear-gradient(to top, #3b82f6, #8b5cf6);
          border-radius: 2px;
          animation: waveAnimation 2s ease-in-out infinite;
        }

        @keyframes waveAnimation {
          0%, 100% { height: 20px; }
          50% { height: 80px; }
        }

        .data-metrics {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-top: 2rem;
        }

        .metric-item {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }

        .metric-label {
          color: #9ca3af;
          font-size: 0.9rem;
        }

        .metric-trend {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .metric-trend.up {
          color: #10b981;
        }

        .metric-trend.down {
          color: #ef4444;
        }

        .data-text h2 {
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .data-text p {
          color: #9ca3af;
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .data-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .stat {
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 2rem;
          font-weight: 800;
          color: #3b82f6;
          margin-bottom: 0.5rem;
        }

        .stat-text {
          color: #9ca3af;
          font-size: 0.9rem;
        }

        /* Impact Section */
        .impact-section {
          padding: 8rem 2rem;
          background: linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%);
          position: relative;
        }

        .impact-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .impact-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .impact-header h2 {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          color: white;
          margin-bottom: 1rem;
        }

        .impact-header p {
          font-size: 1.2rem;
          color: #9ca3af;
          max-width: 600px;
          margin: 0 auto;
        }

        .impact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .impact-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 3rem 2rem;
          text-align: center;
          position: relative;
          overflow: hidden;
          transition: all 0.4s ease;
        }

        .impact-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .impact-icon {
          width: 100px;
          height: 100px;
          margin: 0 auto 2rem;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pulse-ring {
          position: absolute;
          border: 2px solid #ef4444;
          border-radius: 50%;
          width: 100%;
          height: 100%;
          animation: pulseRing 2s ease-out infinite;
        }

        .delay-1 {
          animation-delay: 0.5s;
        }

        .delay-2 {
          animation-delay: 1s;
        }

        @keyframes pulseRing {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .icon-heart {
          font-size: 3rem;
          color: #ef4444;
          z-index: 10;
          position: relative;
        }

        .rotating-earth {
          width: 80px;
          height: 80px;
          background: linear-gradient(45deg, #10b981, #3b82f6);
          border-radius: 50%;
          position: relative;
          animation: rotate 10s linear infinite;
        }

        .rotating-earth::before {
          content: '🌍';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 2.5rem;
        }

        .policy-chart {
          display: flex;
          align-items: end;
          justify-content: center;
          height: 60px;
          gap: 8px;
        }

        .chart-bar {
          width: 12px;
          background: linear-gradient(to top, #3b82f6, #8b5cf6);
          border-radius: 6px;
          animation: chartGrow 2s ease-in-out infinite;
        }

        .bar-1 {
          height: 30px;
          animation-delay: 0s;
        }

        .bar-2 {
          height: 50px;
          animation-delay: 0.2s;
        }

        .bar-3 {
          height: 40px;
          animation-delay: 0.4s;
        }

        .bar-4 {
          height: 60px;
          animation-delay: 0.6s;
        }

        @keyframes chartGrow {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.3); }
        }

        .impact-card h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 1rem;
        }

        .impact-card p {
          color: #9ca3af;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .impact-number {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }

        .health .impact-number {
          color: #ef4444;
        }

        .environment .impact-number {
          color: #10b981;
        }

        .policy .impact-number {
          color: #3b82f6;
        }

        .impact-label {
          color: #9ca3af;
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* Testimonial Section */
        .testimonial-section {
          padding: 8rem 2rem;
          background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
          position: relative;
          overflow: hidden;
        }

        .testimonial-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .testimonial-orb {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.1) 0%, transparent 70%);
          animation: floatUpDown 8s ease-in-out infinite;
        }

        .testimonial-orb.orb-1 {
          width: 400px;
          height: 400px;
          top: -10%;
          right: -10%;
          animation-delay: 0s;
        }

        .testimonial-orb.orb-2 {
          width: 300px;
          height: 300px;
          bottom: -10%;
          left: -10%;
          animation-delay: 4s;
        }

        .testimonial-container {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .testimonial-title {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          color: white;
          text-align: center;
          margin-bottom: 4rem;
        }

        .testimonial-carousel {
          position: relative;
        }

        .testimonial-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 3rem;
          backdrop-filter: blur(20px);
          margin-bottom: 2rem;
          transition: all 0.4s ease;
        }

        .testimonial-card.active {
          transform: scale(1.02);
          border-color: rgba(96, 165, 250, 0.3);
          box-shadow: 0 20px 40px rgba(96, 165, 250, 0.1);
        }

        .quote-mark {
          font-size: 4rem;
          color: #3b82f6;
          line-height: 1;
          margin-bottom: 1rem;
        }

        .testimonial-content p {
          font-size: 1.2rem;
          color: #e5e7eb;
          line-height: 1.6;
          margin-bottom: 2rem;
          font-style: italic;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .author-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          font-size: 1.2rem;
        }

        .avatar-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          border-radius: 50%;
        }

        .author-avatar span {
          position: relative;
          z-index: 10;
        }

        .author-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin-bottom: 0.25rem;
        }

        .author-title {
          color: #9ca3af;
          font-size: 0.9rem;
        }

        /* Footer */
        .footer {
          background: linear-gradient(180deg, #0a0a0f 0%, #000000 100%);
          position: relative;
          overflow: hidden;
        }

        .footer-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .footer-wave {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100px;
          background: linear-gradient(90deg, transparent 0%, rgba(96, 165, 250, 0.1) 50%, transparent 100%);
          animation: waveMove 8s ease-in-out infinite;
        }

        @keyframes waveMove {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 2rem 2rem;
          position: relative;
          z-index: 10;
        }

        .footer-content {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 4rem;
          margin-bottom: 3rem;
        }

        .footer-brand {
          max-width: 400px;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .footer-logo-img {
          width: 40px;
          height: 40px;
        }

        .footer-logo-text {
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
        }

        .footer-description {
          color: #9ca3af;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .footer-social {
          display: flex;
          gap: 1rem;
        }

        .social-link {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .social-link:hover {
          background: rgba(96, 165, 250, 0.2);
          transform: translateY(-2px);
        }

        .social-icon {
          width: 20px;
          height: 20px;
          border-radius: 2px;
        }

        .social-icon.twitter {
          background: linear-gradient(45deg, #1da1f2, #0d8bd9);
        }

        .social-icon.linkedin {
          background: linear-gradient(45deg, #0077b5, #005885);
        }

        .social-icon.github {
          background: linear-gradient(45deg, #333, #000);
        }

        .footer-links {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }

        .footer-column h4 {
          color: white;
          font-weight: 600;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .footer-column a {
          display: block;
          color: #9ca3af;
          text-decoration: none;
          margin-bottom: 0.75rem;
          transition: color 0.3s ease;
        }

        .footer-column a:hover {
          color: #3b82f6;
        }

        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .footer-copyright p,
        .footer-credits p {
          color: #6b7280;
          font-size: 0.9rem;
          margin: 0;
        }

        /* Responsive Design for New Sections */
        @media (max-width: 968px) {
          .minimal-tech-section {
            padding: 4rem 1.5rem;
          }
          
          .tech-showcase {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          
          .tech-item {
            flex-direction: column;
            text-align: center;
            gap: 2rem;
          }
          
          .tech-visual {
            width: 100px;
            height: 100px;
          }
          
          .data-content {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          
          .impact-grid {
            grid-template-columns: 1fr;
          }
          
          .footer-content {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          
          .footer-links {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .footer-bottom {
            flex-direction: column;
            text-align: center;
          }
        }

        @media (max-width: 768px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
          
          .minimal-tech-section {
            padding: 4rem 1rem;
          }
          
          .tech-content h3 {
            font-size: 1.25rem;
          }
          
          .tech-content p {
            font-size: 0.9rem;
          }
          
          .parallax-data-section .data-content {
            padding: 3rem 1rem;
          }
          
          .data-text h2 {
            font-size: 2rem;
          }
          
          .data-text p {
            font-size: 1rem;
          }
          
          .data-stats {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .impact-section {
            padding: 6rem 1rem;
          }
          
          .impact-header h2 {
            font-size: 2rem;
          }
          
          .impact-header p {
            font-size: 1rem;
          }
          
          .impact-card {
            padding: 2rem 1.5rem;
          }
          
          .footer-links {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .floating-features-section,
          .impact-section,
          .testimonial-section {
            padding: 4rem 1rem;
          }
          
          .minimal-tech-section {
            padding: 3rem 1rem;
          }
          
          .tech-content h3 {
            font-size: 1.1rem;
          }
          
          .tech-content p {
            font-size: 0.85rem;
          }
          
          .parallax-data-section .data-content {
            padding: 2rem 1rem;
          }
          
          .data-text h2 {
            font-size: 1.75rem;
          }
          
          .data-text p {
            font-size: 0.9rem;
          }
          
          .impact-header h2 {
            font-size: 1.75rem;
          }
          
          .impact-header p {
            font-size: 0.9rem;
          }
          
          .impact-card {
            padding: 1.5rem 1rem;
          }
          
          .footer-links {
            grid-template-columns: 1fr;
          }
          
          .footer-column h4 {
            font-size: 1rem;
          }
          
          .footer-column a {
            font-size: 0.9rem;
          }
        }
      `}</style>

      <div className="main-container">
        {/* Particles */}
        <div className="particles-container">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="particle"
              style={{
                left: particle.left + "%",
                top: particle.top + "%",
                width: particle.size + "px",
                height: particle.size + "px",
                animationDelay: particle.delay + "s",
                animationDuration: particle.duration + "s",
              }}
            />
          ))}
        </div>

        {/* Glow orbs */}
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
        <div className="glow-orb orb-3"></div>

        {/* Header */}
        <nav className={`navbar ${scrollY > 50 ? "scrolled" : ""}`}>
          <div className="nav-container">
            <a href="/" className="logo">
              <div className="logo-icon">
                <img src="/logo.svg" alt="EcoNoise Logo" className="logo-svg" />
              </div>
              EcoNoise
            </a>
            <div className="nav-menu">
              {/* Desktop Auth Buttons */}
              <div className="desktop-auth">
                {isAuthenticated ? (
                  <>
                    <Link to="/home" className="signin-btn">
                      Dashboard
                    </Link>
                    <button
                      onClick={onLogout}
                      className="signup-btn"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="signin-btn">
                      Sign In
                    </Link>
                    <Link to="/register" className="signup-btn">
                      Sign Up
                    </Link>
                  </>
                )}
              </div>

              <button
                className="mobile-menu-btn"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                ☰
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div
              className="mobile-menu-overlay"
              onClick={() => setIsMenuOpen(false)}
            />
          )}
          <div className={`mobile-menu ${isMenuOpen ? "active" : ""}`}>
            <div className="mobile-menu-content">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/home"
                    className="mobile-menu-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      onLogout();
                      setIsMenuOpen(false);
                    }}
                    className="mobile-menu-item mobile-logout-btn"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="mobile-menu-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="mobile-menu-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-wrapper">
            <div className="hero-content">
              <h1 className="hero-title">Sistem Deteksi Polusi Suara Cerdas</h1>

              <p className="hero-subtitle">
                Pantau dan analisis tingkat kebisingan lingkungan dengan
                teknologi AI terdepan. Dapatkan insight real-time dan lindungi
                komunitas Anda dari polusi suara berbahaya.
              </p>

              <div className="cta-buttons">
                <a href="/home" className="btn-primary">
                  Mulai Monitoring
                </a>
                <a href="/demo" className="btn-secondary">
                  Lihat Demo
                </a>
              </div>

              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">80%</div>
                  <div className="stat-label">Akurasi Deteksi</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">24/7</div>
                  <div className="stat-label">Monitoring Real-time</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">500+</div>
                  <div className="stat-label">Lokasi Terpantau</div>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="spline-container">
                {/* Method 1: Using declared JSX element */}
                <spline-viewer
                  className="spline-viewer"
                  url="https://prod.spline.design/RC9dCHF5tPWXvzup/scene.splinecode"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Unique Minimal Tech Section */}
        <section className="minimal-tech-section">
          <div className="tech-grid-container">
            <div className="section-header-minimal">
              <h2 className="tech-title">Teknologi Revolusioner</h2>
              <div className="title-accent-line"></div>
            </div>

            <div className="tech-showcase">
              <div className="tech-item neural">
                <div className="tech-visual">
                  <div className="neural-dots">
                    <div className="dot active"></div>
                    <div className="dot"></div>
                    <div className="dot active"></div>
                    <div className="dot"></div>
                    <div className="dot active"></div>
                  </div>
                  <div className="neural-connections">
                    <div className="connection c1"></div>
                    <div className="connection c2"></div>
                    <div className="connection c3"></div>
                  </div>
                </div>
                <div className="tech-content">
                  <h3>Terintegrasi AI</h3>
                  <p>
                    Algoritma machine learning yang dapat mengidentifikasi pola
                    suara kompleks dengan akurasi tinggi
                  </p>
                </div>
              </div>

              <div className="tech-item processing">
                <div className="tech-visual">
                  <div className="wave-spectrum">
                    <div
                      className="spectrum-bar"
                      style={{ height: "20%" }}
                    ></div>
                    <div
                      className="spectrum-bar"
                      style={{ height: "60%" }}
                    ></div>
                    <div
                      className="spectrum-bar"
                      style={{ height: "40%" }}
                    ></div>
                    <div
                      className="spectrum-bar"
                      style={{ height: "80%" }}
                    ></div>
                    <div
                      className="spectrum-bar"
                      style={{ height: "30%" }}
                    ></div>
                    <div
                      className="spectrum-bar"
                      style={{ height: "70%" }}
                    ></div>
                    <div
                      className="spectrum-bar"
                      style={{ height: "50%" }}
                    ></div>
                  </div>
                  <div className="processing-indicator"></div>
                </div>
                <div className="tech-content">
                  <h3>Pemmrosesann Real-Time</h3>
                  <p>
                    Pemrosesan data audio secara real-time dengan latency
                    ultra-rendah untuk respons instan
                  </p>
                </div>
              </div>

              <div className="tech-item analytics">
                <div className="tech-visual">
                  <div className="trend-chart">
                    <div className="chart-line">
                      <div className="chart-point p1"></div>
                      <div className="chart-point p2"></div>
                      <div className="chart-point p3"></div>
                      <div className="chart-point p4"></div>
                    </div>
                    <div className="chart-grid">
                      <div className="grid-line"></div>
                      <div className="grid-line"></div>
                      <div className="grid-line"></div>
                    </div>
                  </div>
                  <div className="prediction-arrow"></div>
                </div>
                <div className="tech-content">
                  <h3>Analisis Prediksi Suara</h3>
                  <p>
                    Prediksi tren polusi suara masa depan berdasarkan data
                    historis dan pola lingkungan
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Parallax Data Visualization Section */}
        <section className="parallax-data-section">
          <div
            className="parallax-bg"
            style={{ transform: `translateY(${scrollY * 0.5}px)` }}
          >
            <div className="data-particles">
              {Array.from({ length: 20 }, (_, i) => (
                <div
                  key={i}
                  className={`data-particle particle-${i % 4}`}
                ></div>
              ))}
            </div>
          </div>

          <div className="data-content">
            <div className="data-visualization">
              <div className="sound-wave-container">
                <div className="sound-wave">
                  {Array.from({ length: 50 }, (_, i) => (
                    <div
                      key={i}
                      className="wave-bar"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    ></div>
                  ))}
                </div>
              </div>

              <div className="data-metrics">
                <div className="metric-item">
                  <div className="metric-value">85.2 dB</div>
                  <div className="metric-label">Rata-rata Harian</div>
                  <div className="metric-trend up">↗ +2.3%</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">45</div>
                  <div className="metric-label">Deteksi Hari Ini</div>
                  <div className="metric-trend down">↘ -5.1%</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">70%</div>
                  <div className="metric-label">Akurasi Model</div>
                  <div className="metric-trend down">↘ +6.2%</div>
                </div>
              </div>
            </div>

            <div className="data-text">
              <h2>Data yang Berbicara</h2>
              <p>
                Setiap detik, sistem kami memproses ribuan sampel audio untuk
                memberikan insight yang akurat tentang kondisi akustik
                lingkungan Anda.
              </p>
              <div className="data-stats">
                <div className="stat">
                  <span className="stat-number">50+</span>
                  <span className="stat-text">Sampel Audio/Hari</span>
                </div>
                <div className="stat">
                  <span className="stat-number">15ms</span>
                  <span className="stat-text">Waktu Respons</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-bg">
            <div className="footer-wave"></div>
          </div>

          <div className="footer-container">
            <div className="footer-content">
              <div className="footer-brand">
                <div className="footer-logo">
                  <img
                    src="/logo.svg"
                    alt="EcoNoise"
                    className="footer-logo-img"
                  />
                  <span className="footer-logo-text">EcoNoise</span>
                </div>
                <p className="footer-description">
                  Membangun masa depan yang lebih tenang dengan teknologi
                  monitoring polusi suara terdepan.
                </p>
                <div className="footer-social">
                  <a href="#" className="social-link">
                    <div className="social-icon twitter"></div>
                  </a>
                  <a href="#" className="social-link">
                    <div className="social-icon linkedin"></div>
                  </a>
                  <a href="#" className="social-link">
                    <div className="social-icon github"></div>
                  </a>
                </div>
              </div>

              <div className="footer-links">
                <div className="footer-column">
                  <h4>Produk</h4>
                  <a href="/monitoring">Real-time Monitoring</a>
                  <a href="/analytics">Analytics Dashboard</a>
                  <a href="/api">API Integration</a>
                  <a href="/mobile">Mobile App</a>
                </div>

                <div className="footer-column">
                  <h4>Perusahaan</h4>
                  <a href="/about">Tentang Kami</a>
                  <a href="/careers">Karir</a>
                  <a href="/news">Berita</a>
                  <a href="/contact">Kontak</a>
                </div>

                <div className="footer-column">
                  <h4>Dukungan</h4>
                  <a href="/help">Pusat Bantuan</a>
                  <a href="/docs">Dokumentasi</a>
                  <a href="/community">Komunitas</a>
                  <a href="/status">Status Sistem</a>
                </div>

                <div className="footer-column">
                  <h4>Legal</h4>
                  <a href="/privacy">Kebijakan Privasi</a>
                  <a href="/terms">Syarat Layanan</a>
                  <a href="/security">Keamanan</a>
                  <a href="/compliance">Compliance</a>
                </div>
              </div>
            </div>

            <div className="footer-bottom">
              <div className="footer-copyright">
                <p>&copy; 2024 EcoNoise. Semua hak dilindungi.</p>
              </div>
              <div className="footer-credits">
                <p>Dibuat dengan ❤️ untuk lingkungan yang lebih baik</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ModernLandingPage;
