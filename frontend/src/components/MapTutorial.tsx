// src/components/MapTutorial.tsx
import React, { useState, useEffect } from 'react';
import styles from '../styles/MapTutorial.module.css';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon: string;
}

interface MapTutorialProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const MapTutorial: React.FC<MapTutorialProps> = ({ isVisible, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: '🎉 Selamat Datang di Peta Kebisingan!',
      description: 'Mari jelajahi fitur-fitur yang tersedia untuk memantau tingkat kebisingan di sekitar Anda.',
      targetSelector: '.leaflet-container',
      position: 'bottom',
      icon: '🗺️'
    },
    {
      id: 'search',
      title: '🔍 Pencarian Lokasi',
      description: 'Gunakan kotak pencarian untuk menemukan lokasi tertentu dengan cepat dan mudah.',
      targetSelector: '#search-location-input',
      position: 'bottom',
      icon: '📍'
    },
    {
      id: 'add-noise',
      title: '➕ Tambah Area Kebisingan',
      description: 'Klik tombol ini untuk menambahkan area kebisingan baru. Anda bisa upload file audio untuk analisis otomatis!',
      targetSelector: '#add-noise-button',
      position: 'left',
      icon: '🎵'
    },
    {
      id: 'filter',
      title: '🎛️ Filter Data',
      description: 'Gunakan filter untuk menyaring data berdasarkan tingkat kebisingan, sumber, atau dampak kesehatan.',
      targetSelector: '#filter-button',
      position: 'right',
      icon: '⚙️'
    },
    {
      id: 'legend',
      title: '📊 Legenda Peta',
      description: 'Lihat legenda untuk memahami arti warna-warna pada peta dan tingkat kebisingan.',
      targetSelector: '#legend-button',
      position: 'left',
      icon: '🎨'
    },
    {
      id: 'location',
      title: '📍 Lokasi Saya',
      description: 'Klik untuk menemukan lokasi Anda saat ini dan melihat tingkat kebisingan di sekitar.',
      targetSelector: '#locate-user-button',
      position: 'left',
      icon: '🎯'
    }
  ];

  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    const step = tutorialSteps[currentStep];
    if (step && step.targetSelector) {
      // Wait a bit for elements to render
      const timer = setTimeout(() => {
        const element = document.querySelector(step.targetSelector) as HTMLElement;
        if (element) {
          setHighlightedElement(element);
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // If element not found, clear highlight
          setHighlightedElement(null);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentStep, isVisible, tutorialSteps]);

  const nextStep = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (currentStep < tutorialSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        onComplete();
      }
      setIsAnimating(false);
    }, 300);
  };

  const prevStep = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
      setIsAnimating(false);
    }, 300);
  };

  const skipTutorial = () => {
    onSkip();
  };

  if (!isVisible) return null;

  const currentTutorialStep = tutorialSteps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} />
      
      {/* Highlight */}
      {highlightedElement && (() => {
        const rect = highlightedElement.getBoundingClientRect();
        return (
          <div 
            className={styles.highlight}
            style={{
              position: 'fixed',
              top: rect.top - 10,
              left: rect.left - 10,
              width: rect.width + 20,
              height: rect.height + 20,
            }}
          />
        );
      })()}

      {/* Tutorial Popup */}
      <div className={`${styles.tutorialPopup} ${isAnimating ? styles.animating : ''}`}>
        <div className={styles.popupHeader}>
          <div className={styles.stepIcon}>{currentTutorialStep.icon}</div>
          <div className={styles.stepCounter}>
            {currentStep + 1} dari {tutorialSteps.length}
          </div>
          <button className={styles.skipButton} onClick={skipTutorial}>
            ✕
          </button>
        </div>

        <div className={styles.popupContent}>
          <h3 className={styles.stepTitle}>{currentTutorialStep.title}</h3>
          <p className={styles.stepDescription}>{currentTutorialStep.description}</p>
        </div>

        <div className={styles.popupFooter}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
            />
          </div>
          
          <div className={styles.navigationButtons}>
            {currentStep > 0 && (
              <button className={styles.prevButton} onClick={prevStep}>
                ← Sebelumnya
              </button>
            )}
            
            <button className={styles.skipTextButton} onClick={skipTutorial}>
              Lewati Tutorial
            </button>
            
            <button className={styles.nextButton} onClick={nextStep}>
              {currentStep === tutorialSteps.length - 1 ? 'Selesai 🎉' : 'Selanjutnya →'}
            </button>
          </div>
        </div>
      </div>

      {/* Floating hint */}
      {highlightedElement && (() => {
        const rect = highlightedElement.getBoundingClientRect();
        return (
          <div 
            className={styles.floatingHint}
            style={{
              position: 'fixed',
              top: rect.top - 50,
              left: rect.left + rect.width / 2,
            }}
          >
            <div className={styles.hintArrow} />
            <div className={styles.hintText}>Klik di sini!</div>
          </div>
        );
      })()}
    </>
  );
};

export default MapTutorial;