import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': {
        className?: string;
        url?: string;
        [key: string]: any;
      };
    }
  }
}

const ModernLandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const splineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  // Load Spline viewer script
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.10.27/build/spline-viewer.js';
    script.async = true;
    document.head.appendChild(script);
    
    // Function to remove Spline watermark
    const removeSplineWatermark = () => {
      // Wait for Spline viewer to load
      setTimeout(() => {
        const splineViewer = document.querySelector('spline-viewer');
        if (splineViewer && splineViewer.shadowRoot) {
          // Try to find and remove watermark in shadow DOM
          const shadowRoot = splineViewer.shadowRoot;
          const watermarkElements = shadowRoot.querySelectorAll('a[href*="spline.design"], div[style*="position: absolute"][style*="bottom"], div[style*="position: fixed"][style*="bottom"]');
          watermarkElements.forEach(el => {
            const htmlEl = el as HTMLElement;
            if (el.textContent?.includes('Built with Spline') || el.getAttribute('href')?.includes('spline.design')) {
              htmlEl.style.display = 'none';
              htmlEl.style.visibility = 'hidden';
              htmlEl.style.opacity = '0';
              el.remove();
            }
          });
        }
        
        // Also check for watermark in regular DOM
        const regularWatermarks = document.querySelectorAll('a[href*="spline.design"], div[style*="position: absolute"][style*="bottom"]');
        regularWatermarks.forEach(el => {
          const htmlEl = el as HTMLElement;
          if (el.textContent?.includes('Built with Spline') || el.getAttribute('href')?.includes('spline.design')) {
            htmlEl.style.display = 'none';
            htmlEl.style.visibility = 'hidden';
            htmlEl.style.opacity = '0';
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
  const SplineViewer = ({ url, className }: { url: string; className?: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // Check if spline-viewer is loaded
      const checkAndCreateSpline = () => {
        if (customElements.get('spline-viewer')) {
          const splineViewer = document.createElement('spline-viewer') as any;
          splineViewer.setAttribute('url', url);
          if (className) splineViewer.className = className;
          container.innerHTML = '';
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
          gap: 0.75rem;
          color: #60a5fa;
          font-size: 1.5rem;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        
        .logo:hover {
          color: #3b82f6;
          transform: scale(1.05);
        }
        
        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.2rem;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
          transition: all 0.3s ease;
        }
        
        .logo:hover .logo-icon {
          transform: rotate(5deg);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
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
          }
          
          .spline-container {
            height: 400px;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 768px) {
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
          
          .mobile-menu-btn {
            display: block;
          }
          
          .nav-menu {
            gap: 1rem;
          }
          
          .hero-section {
            padding: 6rem 1rem 2rem;
          }
          
          .cta-buttons {
            flex-direction: column;
            align-items: center;
          }
          
          .btn-primary,
          .btn-secondary {
            width: 100%;
            max-width: 280px;
          }
          
          .spline-container {
            height: 350px;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 480px) {
          .nav-container {
            padding: 0 1rem;
          }
          
          .hero-section {
            padding: 5rem 1rem 2rem;
          }
          
          .spline-container {
            height: 300px;
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
                left: particle.left + '%',
                top: particle.top + '%',
                width: particle.size + 'px',
                height: particle.size + 'px',
                animationDelay: particle.delay + 's',
                animationDuration: particle.duration + 's',
              }}
            />
          ))}
        </div>
        
        {/* Glow orbs */}
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
        <div className="glow-orb orb-3"></div>
        
        {/* Header */}
        <nav className={`navbar ${scrollY > 50 ? 'scrolled' : ''}`}>
          <div className="nav-container">
            <a href="/" className="logo">
              <div className="logo-icon">N</div>
              EcoNoise
            </a>
            
            <div className="nav-menu">
              <Link to="/login" className="signin-btn">Sign In</Link>
              <Link to="/register" className="signup-btn">Sign Up</Link>
              
              <button 
                className="mobile-menu-btn"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                ☰
              </button>
            </div>
          </div>
        </nav>
        
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-wrapper">
            <div className="hero-content">
              <h1 className="hero-title">
                Sistem Deteksi Polusi Suara Cerdas
              </h1>
              
              <p className="hero-subtitle">
                Pantau dan analisis tingkat kebisingan lingkungan dengan teknologi AI terdepan. 
                Dapatkan insight real-time dan lindungi komunitas Anda dari polusi suara berbahaya.
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
                  <div className="stat-number">99.5%</div>
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
      </div>
    </>
  );
};

export default ModernLandingPage;