import * as tf from '@tensorflow/tfjs';

// Audio classification service for YAMNet-based noise classification
class AudioClassificationService {
  private classifierModel: tf.LayersModel | null = null;
  private isModelLoaded = false;

  // Load the pre-trained classification model
  async loadModel(): Promise<void> {
    try {
      console.log('Creating simple audio classification model...');
      // Create a simple sequential model for demonstration
      // In production, you would load a pre-trained model
      this.classifierModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [1024], // Expected input features
            units: 512,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 256,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 6, // 6 noise categories
            activation: 'sigmoid'
          })
        ]
      });
      
      // Compile the model
      this.classifierModel.compile({
        optimizer: 'rmsprop',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      
      this.isModelLoaded = true;
      console.log('Audio classification model created successfully');
    } catch (error) {
      console.error('Failed to create audio classification model:', error);
      throw new Error('Failed to create audio classification model');
    }
  }

  // Check if model is loaded
  isReady(): boolean {
    return this.isModelLoaded && this.classifierModel !== null;
  }

  // Extract audio features from audio data
  private extractAudioFeatures(audioData: Float32Array, sampleRate: number): tf.Tensor {
    // Convert audio to tensor
    const audioTensor = tf.tensor1d(audioData);
    
    // Resample to 16kHz if needed (YAMNet expects 16kHz)
    const targetSampleRate = 16000;
    let processedAudio = audioTensor;
    
    if (sampleRate !== targetSampleRate) {
      // Simple resampling by taking every nth sample
      const ratio = sampleRate / targetSampleRate;
      const newLength = Math.floor(audioData.length / ratio);
      const indices = tf.range(0, newLength).mul(ratio).floor().cast('int32');
      processedAudio = tf.gather(audioTensor, indices);
    }

    // Ensure we have at least 1 second of audio (16000 samples)
    const minLength = 16000;
    if (processedAudio.shape[0] < minLength) {
      // Pad with zeros
      const padding = tf.zeros([minLength - processedAudio.shape[0]]);
      processedAudio = tf.concat([processedAudio, padding]) as tf.Tensor1D;
    } else if (processedAudio.shape[0] > minLength * 3) {
      // Truncate to 3 seconds max
      processedAudio = processedAudio.slice([0], [minLength * 3]) as tf.Tensor1D;
    }

    // Extract simple audio features (this is a simplified version)
    // In a real implementation, you would use YAMNet embeddings
    const features = this.extractSimpleFeatures(processedAudio);
    
    audioTensor.dispose();
    if (processedAudio !== audioTensor) {
      processedAudio.dispose();
    }
    
    return features;
  }

  // Extract simple audio features as a substitute for YAMNet embeddings
  private extractSimpleFeatures(audioTensor: tf.Tensor): tf.Tensor {
    // This is a simplified feature extraction
    // In production, you would use actual YAMNet embeddings
    
    const frameSize = 512;
    const hopSize = 256;
    const audioLength = audioTensor.shape[0];
    const numFrames = Math.floor((audioLength - frameSize) / hopSize) + 1;
    
    // Extract features for each frame
    const features: number[] = [];
    
    for (let i = 0; i < Math.min(numFrames, 32); i++) { // Limit to 32 frames
      const start = i * hopSize;
      const frame = audioTensor.slice([start], [frameSize]);
      
      // Calculate basic features
      const rms = tf.sqrt(tf.mean(tf.square(frame)));
      const zcr = this.calculateZeroCrossingRate(frame);
      const spectralCentroid = this.calculateSpectralCentroid(frame);
      
      features.push(
        rms.dataSync()[0],
        zcr,
        spectralCentroid,
        // Add more features to reach 1024 dimensions
        ...Array(29).fill(0).map(() => Math.random() * 0.1) // Placeholder features
      );
      
      frame.dispose();
      rms.dispose();
    }
    
    // Pad or truncate to exactly 1024 features
    while (features.length < 1024) {
      features.push(0);
    }
    features.splice(1024);
    
    return tf.tensor2d([features], [1, 1024]);
  }

  // Calculate zero crossing rate
  private calculateZeroCrossingRate(frame: tf.Tensor): number {
    const frameData = frame.dataSync();
    let crossings = 0;
    
    for (let i = 1; i < frameData.length; i++) {
      if ((frameData[i] >= 0) !== (frameData[i - 1] >= 0)) {
        crossings++;
      }
    }
    
    return crossings / frameData.length;
  }

  // Calculate spectral centroid (simplified)
  private calculateSpectralCentroid(frame: tf.Tensor): number {
    const frameData = frame.dataSync();
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < frameData.length; i++) {
      const magnitude = Math.abs(frameData[i]);
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  // Predict from audio blob
  async predictFromAudio(audioBlob: Blob): Promise<{
    predictions: number[];
    confidence: number;
    noiseSource: string;
    healthImpact: string;
  }> {
    if (!this.isReady()) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      console.log('🔄 Converting audio blob to buffer...');
      
      // Convert blob to audio buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      console.log('📦 Array buffer size:', arrayBuffer.byteLength, 'bytes');
      
      const audioContext = new AudioContext();
      console.log('🎧 Audio context created, sample rate:', audioContext.sampleRate);
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log('🎵 Audio decoded - duration:', audioBuffer.duration, 's, channels:', audioBuffer.numberOfChannels);
      
      // Get audio data
      const audioData = audioBuffer.getChannelData(0); // Use first channel
      const sampleRate = audioBuffer.sampleRate;
      
      console.log('📊 Audio data length:', audioData.length, 'samples at', sampleRate, 'Hz');
      
      // Check if we have actual audio data
      const hasAudio = audioData.some(sample => Math.abs(sample) > 0.001);
      console.log('🔊 Audio contains sound:', hasAudio);
      
      if (!hasAudio) {
        console.warn('⚠️ No significant audio detected in recording');
      }
      
      // Extract features
      console.log('🔍 Extracting audio features...');
      const features = this.extractAudioFeatures(audioData, sampleRate);
      
      // Make prediction
      console.log('🤖 Making prediction with model...');
      const prediction = this.classifierModel!.predict(features) as tf.Tensor;
      const predictionData = await prediction.data();
      
      // Convert to array
      const predictions = Array.from(predictionData);
      console.log('📈 Raw predictions:', predictions);
      
      // Calculate confidence (max probability)
      const confidence = Math.max(...predictions);
      console.log('🎯 Confidence score:', confidence);
      
      // Map predictions to noise sources (based on your model's output)
      const noiseSourceLabels = [
        'Traffic',
        'Construction',
        'Aircraft',
        'Industrial',
        'Human',
        'Nature'
      ];
      
      const maxIndex = predictions.indexOf(confidence);
      const noiseSource = noiseSourceLabels[maxIndex] || 'Unknown';
      console.log('🏷️ Detected noise source:', noiseSource, 'at index', maxIndex);
      
      // Determine health impact based on confidence and source
      let healthImpact = 'Aman';
      if (confidence > 0.8) {
        if (['Traffic', 'Construction', 'Aircraft', 'Industrial'].includes(noiseSource)) {
          healthImpact = 'Berbahaya';
        } else if (noiseSource === 'Human') {
          healthImpact = 'Perhatian';
        }
      } else if (confidence > 0.6) {
        healthImpact = 'Perhatian';
      }
      
      console.log('⚕️ Health impact assessment:', healthImpact);
      
      // Cleanup
      features.dispose();
      prediction.dispose();
      audioContext.close();
      
      const result = {
        predictions,
        confidence,
        noiseSource,
        healthImpact
      };
      
      console.log('✅ Classification completed successfully:', result);
      
      return result;
    } catch (error) {
      console.error('Prediction error:', error);
      throw new Error('Failed to predict audio classification');
    }
  }

  // Record audio from microphone and predict
  async recordAndPredict(duration: number = 2000): Promise<{
    predictions: number[];
    confidence: number;
    noiseSource: string;
    healthImpact: string;
  }> {
    try {
      console.log('🎤 Requesting microphone access...');
      
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      console.log('🎤 Microphone access granted, starting recording...');
      
      // Record audio
      const audioBlob = await this.recordAudioFromStream(stream, duration);
      
      console.log('🎵 Recording completed, blob size:', audioBlob.size, 'bytes');
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
      
      // Check if we have valid audio data
      if (audioBlob.size === 0) {
        throw new Error('No audio data recorded');
      }
      
      console.log('🔍 Processing audio for classification...');
      
      // Predict
      return await this.predictFromAudio(audioBlob);
    } catch (error) {
      console.error('Record and predict error:', error);
      throw new Error('Failed to record and predict audio');
    }
  }

  // Record audio from stream
  private recordAudioFromStream(stream: MediaStream, duration: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      console.log('📹 Setting up MediaRecorder...');
      
      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        console.warn('⚠️ audio/webm;codecs=opus not supported, trying audio/webm');
      }
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('📊 Data available, size:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped, total chunks:', chunks.length);
        const audioBlob = new Blob(chunks, { type: mimeType });
        console.log('🎵 Final audio blob size:', audioBlob.size, 'bytes');
        resolve(audioBlob);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        reject(new Error('MediaRecorder error'));
      };
      
      mediaRecorder.onstart = () => {
        console.log('▶️ Recording started');
      };
      
      console.log('🎬 Starting recording for', duration, 'ms');
      mediaRecorder.start(100); // Request data every 100ms
      
      setTimeout(() => {
        console.log('⏰ Recording timeout reached, stopping...');
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, duration);
    });
  }

  // Dispose of the model
  dispose(): void {
    if (this.classifierModel) {
      this.classifierModel.dispose();
      this.classifierModel = null;
      this.isModelLoaded = false;
    }
  }
}

// Export singleton instance
export const audioClassificationService = new AudioClassificationService();
export default audioClassificationService;