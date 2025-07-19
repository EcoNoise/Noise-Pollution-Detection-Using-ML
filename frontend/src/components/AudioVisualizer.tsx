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
  const smoothedDataArrayRef = useRef<Float32Array | null>(null);

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

      canvasCtx.clearRect(0, 0, width, height);

      const barWidth = width / bufferLength * 0.8; 
      let x = (width - (barWidth * bufferLength)) / 2;
      const centerY = height / 2;

      const gradient = canvasCtx.createLinearGradient(0, 0, 0, height); 
      gradient.addColorStop(0, '#60a5fa'); 
      gradient.addColorStop(0.6, '#a78bfa'); 
      gradient.addColorStop(1, '#e9d5ff');

      canvasCtx.shadowBlur = 8; 
      canvasCtx.shadowColor = 'rgba(167, 139, 250, 0.6)';

      for (let i = 0; i < bufferLength; i++) { 
        const smoothingFactor = 0.15; 
        smoothedDataArray[i] += (dataArray[i] - smoothedDataArray[i]) * smoothingFactor;

        const barHeight = Math.max(2, smoothedDataArray[i] * (height / 256) * 0.7);
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
  }, [isRecording, stream, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      style={{ 
        display: isRecording ? 'block' : 'none', 
        marginTop: '20px', 
        marginBottom: '20px',
        borderRadius: '12px',
        background: 'rgba(30, 41, 59, 0.3)'
      }} 
    />
  ); 
};

export default AudioVisualizer;