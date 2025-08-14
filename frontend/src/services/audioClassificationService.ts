import * as tf from '@tensorflow/tfjs';

const YAMNET_URL = '/yamnet/model.json';

interface ClassificationResult {
  predictions: number[];
  confidence: number;
  noiseSource: string;
  healthImpact: string;
}

class AudioClassificationService {
  private yamnetModel: tf.GraphModel | null = null;
  private labels: string[] = [];
  private isLoading = false;
  private isLoaded = false;

  async loadModels(): Promise<void> {
    if (this.isLoaded || this.isLoading) {
      return;
    }

    this.isLoading = true;
    try {
      console.log('🔄 Loading YAMNet model...');
      this.yamnetModel = await tf.loadGraphModel(YAMNET_URL);
      console.log('✅ YAMNet model loaded successfully');

      console.log('🔄 Loading YAMNet label map...');
      const resp = await fetch('/yamnet/yamnet_class_map.csv');
      const csvText = await resp.text();
      this.labels = csvText
        .split('\n')
        .slice(1)
        .map(line => line.split(',')[2]?.replace(/"/g, '').trim());
      console.log(`✅ Label map loaded, total ${this.labels.length} labels`);

      this.isLoaded = true;
      console.log('🎉 Model and labels loaded and ready!');
    } catch (err) {
      console.error('❌ Error loading YAMNet model:', err);
      throw new Error('Failed to load YAMNet model');
    } finally {
      this.isLoading = false;
    }
  }

  async predictFromAudio(audioBlob: Blob): Promise<ClassificationResult> {
    if (!this.yamnetModel) {
      throw new Error('YAMNet model not loaded');
    }

    try {
      console.log('🔄 Converting audio blob to buffer...');
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      let audioData = audioBuffer.getChannelData(0);

      if (audioBuffer.sampleRate !== 16000) {
        console.log(`🔄 Resampling from ${audioBuffer.sampleRate}Hz to 16000Hz`);
        audioData = this.resampleAudio(audioData, audioBuffer.sampleRate, 16000);
      }

      const hasAudio = audioData.some(sample => Math.abs(sample) > 0.001);
      console.log('🔊 Audio contains sound:', hasAudio);

      console.log('🤖 Running YAMNet prediction...');
      const waveform = tf.tensor1d(audioData, 'float32');
      const yamnetOutput = this.yamnetModel.predict(waveform) as tf.Tensor[];
      const scores = yamnetOutput[0]; // shape [frames, 521]
      const meanScores = scores.mean(0); // shape [521]
      const scoresArray = await meanScores.array() as number[];

      const confidence = Math.max(...scoresArray);
      const maxIndex = scoresArray.indexOf(confidence);
      const noiseSource = this.labels[maxIndex] || 'Tidak Diketahui';

      // Health impact sederhana
      let healthImpact = 'Aman';
      if (confidence > 0.8) {
        if (noiseSource.toLowerCase().includes('vehicle') || noiseSource.toLowerCase().includes('construction')) {
          healthImpact = 'Berbahaya';
        } else {
          healthImpact = 'Perhatian';
        }
      } else if (confidence > 0.6) {
        healthImpact = 'Perhatian';
      }

      waveform.dispose();
      meanScores.dispose();
      scores.dispose();
      audioContext.close();

      const result = {
        predictions: scoresArray,
        confidence,
        noiseSource,
        healthImpact
      };

      console.log('✅ Prediction completed:', result);
      return result;
    } catch (err) {
      console.error('❌ Prediction error:', err);
      throw new Error('Failed to predict with YAMNet');
    }
  }

  private resampleAudio(audioData: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
    if (fromSampleRate === toSampleRate) {
      return audioData;
    }
    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
      const fraction = srcIndex - srcIndexFloor;
      result[i] = audioData[srcIndexFloor] * (1 - fraction) + audioData[srcIndexCeil] * fraction;
    }
    return result;
  }

  async recordAndPredict(duration: number = 3000): Promise<ClassificationResult> {
    console.log('🎤 Requesting microphone access...');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
    });

    console.log('✅ Microphone access granted');
    const audioBlob = await this.recordAudioFromStream(stream, duration);
    stream.getTracks().forEach(track => track.stop());

    if (audioBlob.size === 0) {
      throw new Error('No audio data recorded');
    }

    return await this.predictFromAudio(audioBlob);
  }

  private recordAudioFromStream(stream: MediaStream, duration: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mimeType = 'audio/webm;codecs=opus';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        resolve(audioBlob);
      };

      mediaRecorder.onerror = (event) => reject(new Error('MediaRecorder error'));
      mediaRecorder.start();
      setTimeout(() => { if (mediaRecorder.state === 'recording') mediaRecorder.stop(); }, duration);
    });
  }
}

export const audioClassificationService = new AudioClassificationService();
export default audioClassificationService;
