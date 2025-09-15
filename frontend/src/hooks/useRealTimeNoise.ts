// src/hooks/useRealTimeNoise.ts
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { logger } from "../config/appConfig";
import { audioClassificationService } from "../services/audioClassificationService";

export interface NoiseReading {
  db: number;
  dbA: number; // A-weighted decibels
  rms: number;
  timestamp: Date;
  category:
    | "Tenang"
    | "Sedang"
    | "Bising"
    | "Sangat Bising"
    | "Sedang dalam perbaikan";
  color: "success" | "warning" | "error" | "default";
  healthImpact:
    | "Aman"
    | "Perhatian"
    | "Berbahaya"
    | "Sangat Berbahaya"
    | "Sedang dalam perbaikan";
  frequencyData?: Float32Array;
  classification?: {
    predictions: Array<{
      label: string;
      confidence: number;
    }>;
    topPrediction: string;
    confidence: number;
  };
}

export interface NoiseStatistics {
  average: number;
  maximum: number;
  minimum: number;
  readings: NoiseReading[];
}

interface UseRealTimeNoiseOptions {
  sampleRate?: number;
  fftSize?: number;
  smoothingTimeConstant?: number;
  updateInterval?: number;
  historyLength?: number;
  enableEchoCancellation?: boolean;
  enableNoiseSuppression?: boolean;
  enableAutoGainControl?: boolean;
  enableAWeighting?: boolean;
  enableFrequencyAnalysis?: boolean;
  calibrationMode?: "auto" | "manual" | "device";
  enableRealTimeClassification?: boolean;
  classificationInterval?: number;
}

interface UseRealTimeNoiseReturn {
  isListening: boolean;
  currentReading: NoiseReading | null;
  statistics: NoiseStatistics;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  calibrate: () => void;
  isSupported: boolean;
}

const defaultOptions: Required<UseRealTimeNoiseOptions> = {
  sampleRate: 44100,
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  updateInterval: 100,
  historyLength: 100,
  enableEchoCancellation: true,
  enableNoiseSuppression: false,
  enableAutoGainControl: false,
  enableAWeighting: true,
  enableFrequencyAnalysis: true,
  calibrationMode: "auto",
  enableRealTimeClassification: false,
  classificationInterval: 3000,
};

export const useRealTimeNoise = (
  options: Partial<UseRealTimeNoiseOptions> = {}
): UseRealTimeNoiseReturn => {
  // Use individual values as dependencies instead of the whole options object
  const opts = useMemo(
    () => ({ ...defaultOptions, ...options }),
    [
      options.sampleRate,
      options.fftSize,
      options.smoothingTimeConstant,
      options.updateInterval,
      options.historyLength,
      options.enableEchoCancellation,
      options.enableNoiseSuppression,
      options.enableAutoGainControl,
      options.enableAWeighting,
      options.enableFrequencyAnalysis,
      options.calibrationMode,
      options.enableRealTimeClassification,
      options.classificationInterval,
    ]
  );

  const [isListening, setIsListening] = useState(false);
  const [currentReading, setCurrentReading] = useState<NoiseReading | null>(
    null
  );
  const [statistics, setStatistics] = useState<NoiseStatistics>({
    average: 0,
    maximum: 0,
    minimum: 100,
    readings: [],
  });
  const [error, setError] = useState<string | null>(null);

  // Audio processing refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calibration offset (can be adjusted based on microphone sensitivity)
  const calibrationOffsetRef = useRef<number>(0);
  const aWeightingFilterRef = useRef<BiquadFilterNode[]>([]);
  const deviceCalibrationRef = useRef<number>(0);
  const backgroundNoiseRef = useRef<number>(0);
  const isCalibrationCompleteRef = useRef<boolean>(false);

  // Classification refs
  const classificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioBufferRef = useRef<Float32Array | null>(null);
  const lastClassificationTime = useRef<number>(0);

  // Check if Web Audio API is supported
  const isSupported =
    !!(window.AudioContext || (window as any).webkitAudioContext) &&
    !!navigator.mediaDevices?.getUserMedia;

  // Advanced A-weighting filter coefficients (IIR filter design)
  const createAWeightingFilter = useCallback(
    (audioContext: AudioContext): BiquadFilterNode[] => {
      // Remove unused sampleRate variable
      const filters: BiquadFilterNode[] = [];

      // A-weighting filter implementation using cascaded biquad filters
      // Based on IEC 61672-1 standard

      // High-pass filter 1 (20.6 Hz)
      const hpf1 = audioContext.createBiquadFilter();
      hpf1.type = "highpass";
      hpf1.frequency.value = 20.6;
      hpf1.Q.value = 0.5;
      filters.push(hpf1);

      // High-pass filter 2 (20.6 Hz) - second order
      const hpf2 = audioContext.createBiquadFilter();
      hpf2.type = "highpass";
      hpf2.frequency.value = 20.6;
      hpf2.Q.value = 0.5;
      filters.push(hpf2);

      // Low-pass filter 1 (12194 Hz)
      const lpf1 = audioContext.createBiquadFilter();
      lpf1.type = "lowpass";
      lpf1.frequency.value = 12194;
      lpf1.Q.value = 0.5;
      filters.push(lpf1);

      // Low-pass filter 2 (12194 Hz) - second order
      const lpf2 = audioContext.createBiquadFilter();
      lpf2.type = "lowpass";
      lpf2.frequency.value = 12194;
      lpf2.Q.value = 0.5;
      filters.push(lpf2);

      return filters;
    },
    []
  );

  // A-weighting factor calculation
  const getAWeightingFactor = useCallback((frequency: number): number => {
    if (frequency <= 0) return 0;

    const f = frequency;
    const f2 = f * f;
    const f4 = f2 * f2;

    // A-weighting formula
    const numerator = 12194 * 12194 * f4;
    const denominator =
      (f2 + 20.6 * 20.6) *
      Math.sqrt((f2 + 107.7 * 107.7) * (f2 + 737.9 * 737.9)) *
      (f2 + 12194 * 12194);

    const aWeight = numerator / denominator;
    return Math.pow(10, aWeight / 20); // Convert from dB to linear
  }, []);

  // Calculate A-weighting correction from frequency data
  const calculateAWeightingCorrection = useCallback(
    (frequencyData: Float32Array): number => {
      const bufferLength = frequencyData.length;

      let weightedSum = 0;
      let totalSum = 0;

      for (let i = 0; i < bufferLength; i++) {
        const frequency = (i * (audioContextRef.current?.sampleRate || 44100)) / (2 * bufferLength);
        const magnitude = frequencyData[i];

        // A-weighting function approximation
        const aWeight = getAWeightingFactor(frequency);

        weightedSum += magnitude * aWeight;
        totalSum += magnitude;
      }

      // Return correction factor in dB
      return totalSum > 0 ? 20 * Math.log10(weightedSum / totalSum) : 0;
    },
    [getAWeightingFactor]
  );

  // Advanced RMS to dB conversion with proper calibration
  const calculateDecibels = useCallback(
    (
      rms: number,
      frequencyData?: Float32Array
    ): { db: number; dbA: number } => {
      if (rms === 0) return { db: 0, dbA: 0 };

      // Improved reference calculation based on device characteristics
      let reference = 0.00002; // Standard 20 µPa reference

      // Auto-calibration based on device type and background noise
      if (opts.calibrationMode === "auto") {
        // Adjust reference based on detected device characteristics
        const deviceFactor = deviceCalibrationRef.current || 1.0;
        reference = reference * deviceFactor;

        // Background noise compensation
        if (backgroundNoiseRef.current > 0) {
          reference = reference * (1 + backgroundNoiseRef.current * 0.1);
        }
      }

      // Calculate basic dB
      let db = 20 * Math.log10(rms / reference) + calibrationOffsetRef.current;

      // Apply frequency-based corrections if frequency data is available
      let dbA = db;
      if (frequencyData && opts.enableAWeighting) {
        // Apply A-weighting correction based on frequency analysis
        const frequencyCorrection =
          calculateAWeightingCorrection(frequencyData);
        dbA = db + frequencyCorrection;
      }

      // Apply smoothing and range limiting
      db = Math.max(0, Math.min(120, db));
      dbA = Math.max(0, Math.min(120, dbA));

      return { db, dbA };
    },
    [opts.calibrationMode, opts.enableAWeighting, calculateAWeightingCorrection]
  );

  // Categorize noise level using A-weighted dB for more accurate assessment
  const categorizeNoise = useCallback(
    (dbA: number): NoiseReading["category"] => {
      if (dbA === 0) return "Sedang dalam perbaikan";
      if (dbA < 40) return "Tenang"; // Very quiet (library, bedroom at night)
      if (dbA < 60) return "Sedang"; // Moderate (normal conversation, office)
      if (dbA < 80) return "Bising"; // Loud (traffic, busy restaurant)
      return "Sangat Bising"; // Very loud (construction, loud music)
    },
    []
  );

  // Get color based on A-weighted noise level
  const getNoiseColor = useCallback((dbA: number): NoiseReading["color"] => {
    if (dbA === 0) return "default";
    if (dbA < 40) return "success"; // Green for quiet
    if (dbA < 60) return "warning"; // Yellow for moderate
    if (dbA < 80) return "error"; // Red for loud
    return "error"; // Red for very loud
  }, []);

  // Get health impact assessment based on WHO and EPA guidelines
  const getHealthImpact = useCallback(
    (dbA: number): NoiseReading["healthImpact"] => {
      if (dbA === 0) return "Sedang dalam perbaikan";
      if (dbA < 35) return "Aman"; // WHO guideline for sleep
      if (dbA < 55) return "Aman"; // WHO guideline for day
      if (dbA < 70) return "Perhatian"; // Potential hearing damage with prolonged exposure
      if (dbA < 85) return "Berbahaya"; // OSHA 8-hour exposure limit
      return "Sangat Berbahaya"; // Immediate hearing damage risk
    },
    []
  );

  // Perform audio classification
  const performClassification = useCallback(async (audioData: Float32Array) => {
    try {
      const result = await audioClassificationService.predictFromAudio(audioData);
      return {
        predictions: result.predictions,
        topPrediction: result.predictions[0]?.label || "Unknown",
        confidence: result.predictions[0]?.confidence || 0,
      };
    } catch (error) {
      logger.error("Classification error:", error);
      return null;
    }
  }, []);

  // Check if classification should be performed
  const shouldPerformClassification = useCallback(() => {
    if (!opts.enableRealTimeClassification) return false;
    const now = Date.now();
    return now - lastClassificationTime.current >= opts.classificationInterval;
  }, [opts.enableRealTimeClassification, opts.classificationInterval]);

  // Auto-calibration function moved before use in dependencies to avoid hoisting issues
  function performAutoCalibration(rms: number, db: number) {
    // Collect background noise samples for the first 3 seconds
    const calibrationTime = 3000; // 3 seconds
    const startTime = Date.now();

    if (!backgroundNoiseRef.current) {
      backgroundNoiseRef.current = db;
    } else {
      // Running average of background noise
      backgroundNoiseRef.current = backgroundNoiseRef.current * 0.9 + db * 0.1;
    }

    // Complete calibration after sufficient time
    if (startTime > calibrationTime) {
      // Estimate device calibration factor
      const expectedQuietRoom = 35; // Expected dB for a quiet room
      if (backgroundNoiseRef.current > 0 && backgroundNoiseRef.current < 60) {
        deviceCalibrationRef.current =
          expectedQuietRoom / backgroundNoiseRef.current;
      }

      isCalibrationCompleteRef.current = true;
      logger.info(
        `Auto-calibration complete. Background noise: ${backgroundNoiseRef.current.toFixed(
          1
        )} dB(A), Device factor: ${deviceCalibrationRef.current.toFixed(2)}`
      );
    }
  }

  // Advanced audio processing with A-weighting and frequency analysis
  const processAudioData = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const timeDataArray = new Float32Array(bufferLength);
    const frequencyDataArray = new Float32Array(analyser.frequencyBinCount);

    try {
      // Get time domain data for RMS calculation
      analyser.getFloatTimeDomainData(timeDataArray);

      // Get frequency domain data for A-weighting
      if (opts.enableFrequencyAnalysis) {
        analyser.getFloatFrequencyData(frequencyDataArray);
      }

      // Calculate RMS (Root Mean Square)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += timeDataArray[i] * timeDataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Calculate decibels with advanced algorithm
      const { db, dbA } = calculateDecibels(
        rms,
        opts.enableFrequencyAnalysis ? frequencyDataArray : undefined
      );

      // Auto-calibration during first few seconds
      if (
        !isCalibrationCompleteRef.current &&
        opts.calibrationMode === "auto"
      ) {
        performAutoCalibration(rms, db);
      }

      // Store audio data for classification - buffer minimal 1 detik @16kHz
      if (opts.enableRealTimeClassification) {
        if (!audioBufferRef.current) {
          audioBufferRef.current = timeDataArray.slice();
        } else {
          const combined = new Float32Array(audioBufferRef.current.length + timeDataArray.length);
          combined.set(audioBufferRef.current, 0);
          combined.set(timeDataArray, audioBufferRef.current.length);
          audioBufferRef.current = combined;

          // simpan hanya 16000 sample terakhir (1 detik @ 16kHz)
          if (audioBufferRef.current.length > 16000) {
            audioBufferRef.current = audioBufferRef.current.slice(-16000);
          }
        }
      }

      // Create reading object with enhanced data
      const reading: NoiseReading = {
        db,
        dbA,
        rms,
        timestamp: new Date(),
        category: categorizeNoise(dbA), // Use A-weighted for categorization
        color: getNoiseColor(dbA),
        healthImpact: getHealthImpact(dbA),
        frequencyData: opts.enableFrequencyAnalysis
          ? frequencyDataArray.slice()
          : undefined,
      };

      // Perform classification if enabled and interval has passed
      if (shouldPerformClassification() && audioBufferRef.current && audioBufferRef.current.length >= 16000) {
        performClassification(audioBufferRef.current).then((classification) => {
          if (classification) {
            lastClassificationTime.current = Date.now();
            // Update the current reading with new classification data
            setCurrentReading(prev => prev ? { ...prev, classification } : prev);
          }
        });
      }

      // Update reading while preserving existing classification
      setCurrentReading(prev => ({
        ...reading,
        classification: prev?.classification // pertahankan hasil klasifikasi sebelumnya
      }));

      // Update statistics using A-weighted values
      setStatistics((prev) => {
        const newReadings = [...prev.readings, reading];

        // Keep only recent readings
        if (newReadings.length > opts.historyLength) {
          newReadings.splice(0, newReadings.length - opts.historyLength);
        }

        // Calculate statistics using A-weighted dB
        const dbAValues = newReadings.map((r) => r.dbA);
        const average = dbAValues.reduce((a, b) => a + b, 0) / dbAValues.length;
        const maximum = Math.max(...dbAValues);
        const minimum = Math.min(...dbAValues);

        return {
          average,
          maximum,
          minimum,
          readings: newReadings,
        };
      });
    } catch (error) {
      logger.error("Error processing audio data:", error);

      // Fallback reading in case of error
      const fallbackReading: NoiseReading = {
        db: 0,
        dbA: 0,
        rms: 0,
        timestamp: new Date(),
        category: "Sedang dalam perbaikan",
        color: "default",
        healthImpact: "Sedang dalam perbaikan",
      };

      setCurrentReading(fallbackReading);
    }
  }, [
    calculateDecibels,
    categorizeNoise,
    getNoiseColor,
    getHealthImpact,
    opts.historyLength,
    opts.enableFrequencyAnalysis,
    opts.calibrationMode,
    opts.enableRealTimeClassification,
    shouldPerformClassification,
    performClassification
  ]);

  // Start listening to microphone
  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Web Audio API tidak didukung di browser ini");
      return;
    }

    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: opts.enableEchoCancellation,
          noiseSuppression: opts.enableNoiseSuppression,
          autoGainControl: opts.enableAutoGainControl,
          sampleRate: opts.sampleRate,
        },
      });

      streamRef.current = stream;

      // Create audio context
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      // Resume audio context if suspended (required by some browsers)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = opts.fftSize;
      analyser.smoothingTimeConstant = opts.smoothingTimeConstant;
      analyserRef.current = analyser;

      // Create microphone source
      const microphone = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = microphone;

      // Setup A-weighting filter chain if enabled
      if (opts.enableAWeighting) {
        const aWeightingFilters = createAWeightingFilter(audioContext);
        aWeightingFilterRef.current = aWeightingFilters;

        // Connect microphone through A-weighting filters to analyser
        let currentNode: AudioNode = microphone;
        for (const filter of aWeightingFilters) {
          currentNode.connect(filter);
          currentNode = filter;
        }
        currentNode.connect(analyser);
      } else {
        // Direct connection without A-weighting
        microphone.connect(analyser);
      }

      // Reset calibration state
      isCalibrationCompleteRef.current = false;
      backgroundNoiseRef.current = 0;
      deviceCalibrationRef.current = 1.0;

      setIsListening(true);

      // Start processing at regular intervals
      intervalRef.current = setInterval(processAudioData, opts.updateInterval);
    } catch (err: any) {
      logger.error("Error accessing microphone:", err);
      let errorMessage = "Tidak dapat mengakses mikrofon";

      if (err.name === "NotAllowedError") {
        errorMessage =
          "Izin mikrofon ditolak. Silakan berikan izin dan coba lagi.";
      } else if (err.name === "NotFoundError") {
        errorMessage = "Mikrofon tidak ditemukan. Pastikan mikrofon terhubung.";
      } else if (err.name === "NotReadableError") {
        errorMessage = "Mikrofon sedang digunakan aplikasi lain.";
      }

      setError(errorMessage);
    }
  }, [isSupported, opts, processAudioData, createAWeightingFilter]);

  // Stop listening
  const stopListening = useCallback(() => {
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Clear classification interval
    if (classificationIntervalRef.current) {
      clearInterval(classificationIntervalRef.current);
      classificationIntervalRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    // Reset refs
    analyserRef.current = null;
    microphoneRef.current = null;
    aWeightingFilterRef.current = [];

    // Reset calibration state
    isCalibrationCompleteRef.current = false;
    backgroundNoiseRef.current = 0;
    deviceCalibrationRef.current = 1.0;
    calibrationOffsetRef.current = 0;

    setIsListening(false);
    setCurrentReading(null);
  }, []);

  // Manual calibration function (enhanced)
  const calibrate = useCallback(() => {
    if (currentReading) {
      // Assume current reading should be around 35 dB(A) (typical quiet room)
      const targetDbA = 35;
      const currentDbA = currentReading.dbA;

      // Calculate calibration offset
      calibrationOffsetRef.current = targetDbA - currentDbA;

      // Update device calibration factor
      if (currentDbA > 0) {
        deviceCalibrationRef.current = targetDbA / currentDbA;
      }

      // Mark manual calibration as complete
      isCalibrationCompleteRef.current = true;

      logger.info(
        `Manual calibration complete. Target: ${targetDbA} dB(A), Current: ${currentDbA.toFixed(
          1
        )} dB(A), Offset: ${calibrationOffsetRef.current.toFixed(
          1
        )} dB, Device factor: ${deviceCalibrationRef.current.toFixed(2)}`
      );
    }
  }, [currentReading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    currentReading,
    statistics,
    error,
    startListening,
    stopListening,
    calibrate,
    isSupported,
  };
};
