// src/components/AudioVisualizer.tsx

import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
  width?: number;
  height?: number;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isRecording, width = 400, height = 120 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Menyimpan nilai yang sudah di-smoothing untuk animasi yang lebih cair
  const smoothedDataArrayRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!isRecording || !stream) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85; // Menambahkan smoothing bawaan dari analyser

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Inisialisasi array untuk smoothing jika belum ada
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

      const barWidth = (width / bufferLength) * 1.8;
      let x = 0;
      const centerY = height / 2;

      const gradient = canvasCtx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#60a5fa');
      gradient.addColorStop(0.5, '#a78bfa');
      gradient.addColorStop(1, '#3b82f6');

      canvasCtx.fillStyle = gradient;
      // Menambahkan efek glow
      canvasCtx.shadowBlur = 5;
      canvasCtx.shadowColor = 'rgba(96, 165, 250, 0.5)';
      
      for (let i = 0; i < bufferLength; i++) {
        // Faktor smoothing untuk membuat animasi lebih halus
        const smoothingFactor = 0.1;
        smoothedDataArray[i] += (dataArray[i] - smoothedDataArray[i]) * smoothingFactor;

        const barHeight = smoothedDataArray[i] * (height / 256) * 0.8;
        
        const barY = centerY - barHeight / 2;
        
        // Menggunakan lineTo untuk membuat batang dengan ujung bulat
        canvasCtx.beginPath();
        canvasCtx.moveTo(x, centerY);
        canvasCtx.lineTo(x, barY);
        canvasCtx.moveTo(x, centerY);
        canvasCtx.lineTo(x, centerY + barHeight / 2);

        canvasCtx.strokeStyle = gradient;
        canvasCtx.lineWidth = barWidth;
        canvasCtx.lineCap = 'round';
        canvasCtx.stroke();
        
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

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: isRecording ? 'block' : 'none', marginTop: '16px', marginBottom: '16px' }} />;
};

export default AudioVisualizer;