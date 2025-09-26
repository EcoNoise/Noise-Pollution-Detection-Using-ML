// src/components/AudioVisualizer.tsx
import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps { 
  stream: MediaStream | null; 
  isRecording: boolean; 
  width?: number; 
  height?: number; 
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  stream, 
  isRecording, 
  width = 350, 
  height = 80 
}) => { 
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const containerRef = useRef<HTMLDivElement>(null);
  const smoothedDataArrayRef = useRef<Float32Array | null>(null);
  const [canvasSize, setCanvasSize] = React.useState({ width, height });

  // Responsive canvas sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const responsiveWidth = Math.min(containerWidth - 32, width); // 32px for padding
        const responsiveHeight = Math.max(60, Math.min(height, responsiveWidth * 0.2)); // Maintain aspect ratio
        setCanvasSize({ width: responsiveWidth, height: responsiveHeight });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [width, height]);

  useEffect(() => { 
    if (!isRecording || !stream) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)(); 
    const analyser = audioContext.createAnalyser(); 
    const source = audioContext.createMediaStreamSource(stream); 
    source.connect(analyser);

    analyser.fftSize = 128; 
    analyser.smoothingTimeConstant = 0.8;

    const bufferLength = analyser.frequencyBinCount; 
    const dataArray = new Uint8Array(bufferLength);

    if (!smoothedDataArrayRef.current || smoothedDataArrayRef.current.length !== bufferLength) { 
      smoothedDataArrayRef.current = new Float32Array(bufferLength).fill(0); 
    } 
    const smoothedDataArray = smoothedDataArrayRef.current;

    const canvas = canvasRef.current; 
    if (!canvas) return; 
    const canvasCtx = canvas.getContext('2d'); 
    if (!canvasCtx) return;

    let animationFrameId: number;

    const draw = () => { 
      animationFrameId = requestAnimationFrame(draw); 
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      const barWidth = canvasSize.width / bufferLength * 0.8; 
      let x = (canvasSize.width - (barWidth * bufferLength)) / 2;
      const centerY = canvasSize.height / 2;

      const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvasSize.height); 
      gradient.addColorStop(0, '#60a5fa'); 
      gradient.addColorStop(0.6, '#a78bfa'); 
      gradient.addColorStop(1, '#e9d5ff');

      canvasCtx.shadowBlur = 8; 
      canvasCtx.shadowColor = 'rgba(167, 139, 250, 0.6)';

      for (let i = 0; i < bufferLength; i++) { 
        const smoothingFactor = 0.15; 
        smoothedDataArray[i] += (dataArray[i] - smoothedDataArray[i]) * smoothingFactor;

        const barHeight = Math.max(2, smoothedDataArray[i] * (canvasSize.height / 256) * 0.7);
        const barY = centerY - barHeight / 2;

        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, barY, barWidth - 1, barHeight);

        x += barWidth; 
      } 
    };

    draw();

    return () => { 
      cancelAnimationFrame(animationFrameId); 
      source.disconnect(); 
      audioContext.close().catch(console.error); 
    }; 
  }, [isRecording, stream, canvasSize.width, canvasSize.height]);

  return (
    <div 
      ref={containerRef}
      style={{
        display: isRecording ? 'flex' : 'none',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: '16px',
        marginTop: '20px',
        marginBottom: '20px'
      }}
    >
      <canvas 
        ref={canvasRef} 
        width={canvasSize.width} 
        height={canvasSize.height} 
        style={{ 
          borderRadius: '12px',
          background: 'rgba(30, 41, 59, 0.3)',
          maxWidth: '100%',
          height: 'auto'
        }} 
      />
    </div>
  ); 
};

export default AudioVisualizer;