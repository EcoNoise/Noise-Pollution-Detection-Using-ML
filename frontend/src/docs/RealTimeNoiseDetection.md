# Real-Time Noise Detection Implementation

## Overview
Implementasi deteksi kebisingan real-time menggunakan Web Audio API tanpa model machine learning. Sistem ini menggunakan `navigator.mediaDevices.getUserMedia` dan `AudioContext` untuk menangkap audio secara langsung dan menghitung level kebisingan dalam decibel (dB).

## Komponen Utama

### 1. useRealTimeNoise Hook (`src/hooks/useRealTimeNoise.ts`)
Custom React hook yang menangani:
- **Audio Capture**: Menggunakan `getUserMedia` untuk akses mikrofon
- **RMS Calculation**: Menghitung Root Mean Square dari audio data
- **dB Conversion**: Konversi RMS ke decibel dengan formula: `20 * log10(rms / reference)`
- **Noise Categorization**: Klasifikasi berdasarkan level dB
- **Health Impact Assessment**: Evaluasi dampak kesehatan
- **Statistics Tracking**: Pelacakan statistik sesi

#### Key Features:
```typescript
interface NoiseData {
  decibels: number;
  category: string;
  color: string;
  healthImpact: string;
  healthDescription: string;
}

interface NoiseStatistics {
  min: number;
  max: number;
  average: number;
  duration: number;
  samples: number;
}
```

### 2. NoiseLevelMeter Component (`src/components/NoiseLevelMeter.tsx`)
Komponen UI untuk menampilkan:
- **Real-time dB Level**: Display angka dB dengan animasi
- **Visual Indicator**: Progress bar dengan color coding
- **Category Display**: Kategori kebisingan (Tenang, Sedang, Bising, dll)
- **Health Impact**: Informasi dampak kesehatan
- **Statistics**: Min, Max, Average dB
- **Controls**: Start/Stop listening, Calibration

### 3. RealTimeNoiseTab Component (`src/components/RealTimeNoiseTab.tsx`)
Tab khusus untuk mode real-time yang mengintegrasikan:
- `useRealTimeNoise` hook
- UI controls dan displays
- Session management
- Data sharing ke map

### 4. HomePageWithRealTime Component (`src/components/HomePageWithRealTime.tsx`)
Integrasi lengkap dengan HomePage existing yang menambahkan:
- **Tab System**: Toggle antara Recording mode dan Real-time mode
- **Mode Switch**: Switch untuk beralih mode
- **Unified UI**: Konsisten dengan design existing

## Technical Implementation

### Audio Processing Pipeline
1. **Microphone Access**:
   ```typescript
   const stream = await navigator.mediaDevices.getUserMedia({
     audio: {
       echoCancellation: false,
       noiseSuppression: false,
       autoGainControl: false,
       sampleRate: 44100
     }
   });
   ```

2. **Audio Context Setup**:
   ```typescript
   const audioContext = new AudioContext();
   const source = audioContext.createMediaStreamSource(stream);
   const analyser = audioContext.createAnalyser();
   analyser.fftSize = 2048;
   ```

3. **RMS Calculation**:
   ```typescript
   const calculateRMS = (dataArray: Uint8Array): number => {
     let sum = 0;
     for (let i = 0; i < dataArray.length; i++) {
       const normalized = (dataArray[i] - 128) / 128;
       sum += normalized * normalized;
     }
     return Math.sqrt(sum / dataArray.length);
   };
   ```

4. **dB Conversion**:
   ```typescript
   const convertToDecibels = (rms: number): number => {
     if (rms === 0) return -Infinity;
     const reference = 0.1; // Adjustable reference level
     return 20 * Math.log10(rms / reference);
   };
   ```

### Noise Level Categories
- **Tenang**: < 40 dB (Hijau)
- **Sedang**: 40-60 dB (Kuning)
- **Bising**: 60-80 dB (Orange)
- **Sangat Bising**: 80-100 dB (Merah)
- **Berbahaya**: > 100 dB (Merah Gelap)

### Health Impact Assessment
- **Minimal**: < 55 dB - Tidak ada dampak signifikan
- **Ringan**: 55-70 dB - Sedikit gangguan
- **Sedang**: 70-85 dB - Gangguan tidur dan konsentrasi
- **Tinggi**: 85-100 dB - Risiko kerusakan pendengaran
- **Berbahaya**: > 100 dB - Kerusakan pendengaran permanen

## Usage Examples

### Basic Usage
```typescript
import { useRealTimeNoise } from '../hooks/useRealTimeNoise';

const MyComponent = () => {
  const {
    isListening,
    noiseData,
    statistics,
    startListening,
    stopListening,
    calibrate
  } = useRealTimeNoise();

  return (
    <div>
      <button onClick={isListening ? stopListening : startListening}>
        {isListening ? 'Stop' : 'Start'}
      </button>
      {noiseData && (
        <div>
          <h3>{noiseData.decibels.toFixed(1)} dB</h3>
          <p>Category: {noiseData.category}</p>
          <p>Health Impact: {noiseData.healthImpact}</p>
        </div>
      )}
    </div>
  );
};
```

### Integration with Existing HomePage
```typescript
// Toggle between modes
const [useRealTimeMode, setUseRealTimeMode] = useState(false);

// Tab system
<Tabs value={tabValue} onChange={handleTabChange}>
  <Tab label="📁 Upload & Record" />
  <Tab label="🎤 Real-Time Detection" />
</Tabs>

{tabValue === 1 && (
  <RealTimeNoiseTab
    isAuthenticated={isAuthenticated}
    onShowLoginAlert={() => setShowLoginAlert(true)}
  />
)}
```

## Advantages over ML Model

### 1. **Real-time Performance**
- Tidak ada latency untuk model inference
- Update langsung setiap frame (60fps)
- Responsive UI tanpa delay

### 2. **Resource Efficiency**
- Tidak memerlukan model loading
- CPU usage minimal
- Memory footprint kecil

### 3. **Accuracy for dB Measurement**
- Direct calculation dari audio signal
- Tidak ada approximation error dari model
- Konsisten dengan standar akustik

### 4. **Simplicity**
- Tidak perlu training data
- Tidak ada model versioning
- Maintenance lebih mudah

### 5. **Browser Compatibility**
- Web Audio API support luas
- Tidak perlu WebGL untuk model inference
- Works offline

## Browser Support
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support (dengan user gesture)
- **Edge**: Full support

## Security Considerations
- Microphone permission required
- HTTPS required untuk production
- No audio data stored atau transmitted
- Privacy-first approach

## Performance Optimization
- Efficient FFT size (2048)
- Throttled updates (60fps max)
- Memory-efficient circular buffers
- Automatic cleanup on unmount

## Future Enhancements
1. **Frequency Analysis**: Spektrum frekuensi untuk noise source detection
2. **Background Noise Filtering**: Advanced filtering algorithms
3. **Calibration System**: User-specific calibration
4. **Export Data**: CSV/JSON export untuk analysis
5. **Alerts System**: Threshold-based notifications