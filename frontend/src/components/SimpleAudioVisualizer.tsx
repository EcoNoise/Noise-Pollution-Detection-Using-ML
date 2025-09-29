// src/components/SimpleAudioVisualizer.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';

interface SimpleAudioVisualizerProps {
  isRecording: boolean;
  frequencyData?: Float32Array;
  width?: number;
  height?: number;
}

const SimpleAudioVisualizer: React.FC<SimpleAudioVisualizerProps> = ({
  isRecording,
  frequencyData,
  width = 400,
  height = 80,
}) => {
  const [barHeights, setBarHeights] = useState<number[]>([]);
  const bars = Array.from({ length: 20 }, (_, i) => i);

  useEffect(() => {
    if (!isRecording || !frequencyData) {
      setBarHeights(new Array(20).fill(4));
      return;
    }

    const updateHeights = () => {
      const newHeights = bars.map((_, index) => {
        const baseHeight = 4;
        const maxHeight = height * 0.8;
        
        const dataIndex = Math.floor((index / bars.length) * frequencyData.length);
        const magnitude = frequencyData[dataIndex] || 0;
        
        const normalizedMagnitude = magnitude / 255;
        const amplifiedMagnitude = Math.pow(normalizedMagnitude * 2, 0.7);
        const barHeight = Math.max(baseHeight, amplifiedMagnitude * maxHeight);
        
        return barHeight;
      });
      setBarHeights(newHeights);
    };

    updateHeights();
    const interval = setInterval(updateHeights, 50); 

    return () => clearInterval(interval);
  }, [isRecording, frequencyData, height, bars.length]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'end',
        justifyContent: 'center',
        width: `${width}px`,
        height: `${height}px`,
        gap: '3px',
        p: 2,
      }}
    >
      {bars.map((_, index) => (
        <Box
          key={index}
          sx={{
            width: '4px',
            height: `${barHeights[index] || 4}px`,
            background: isRecording
              ? `linear-gradient(to top, #2196F3, #21CBF3)`
              : 'rgba(255, 255, 255, 0.3)',
            borderRadius: '2px',
            transition: 'height 0.05s ease',
          }}
        />
      ))}
    </Box>
  );
};

export default SimpleAudioVisualizer;