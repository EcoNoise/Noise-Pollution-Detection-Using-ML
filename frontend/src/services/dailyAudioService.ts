/**
 * Daily Audio Analysis Service
 * Service untuk mengelola data analisis audio harian
 */

import { apiService, HistoryItem } from './api';

export interface DailyAudioSummary {
  date: string;
  totalAnalysis: number;
  averageNoiseLevel: number;
  noiseReadings: number[];
  recommendation: string;
  riskLevel: 'safe' | 'moderate' | 'high';
}

export class DailyAudioService {
  /**
   * Mendapatkan ringkasan analisis audio untuk hari ini
   */
  static async getTodayAudioSummary(): Promise<DailyAudioSummary> {
    try {
      // Ambil history prediksi
      const history = await apiService.getPredictionHistory(100);
      
      // Filter data hari ini
      const today = new Date().toDateString();
      const todayHistory = history.filter(item => {
        const itemDate = new Date(item.timestamp).toDateString();
        return itemDate === today;
      });

      // Ekstrak noise level readings
      const noiseReadings = todayHistory.map(item => item.noise_level);
      
      // Hitung rata-rata
      const averageNoiseLevel = noiseReadings.length > 0 
        ? Math.round(noiseReadings.reduce((sum, level) => sum + level, 0) / noiseReadings.length)
        : 0;

      // Tentukan rekomendasi berdasarkan rata-rata dB
      const { recommendation, riskLevel } = this.getRecommendation(averageNoiseLevel);

      return {
        date: today,
        totalAnalysis: todayHistory.length,
        averageNoiseLevel,
        noiseReadings,
        recommendation,
        riskLevel
      };
    } catch (error) {
      console.error('Error getting today audio summary:', error);
      return {
        date: new Date().toDateString(),
        totalAnalysis: 0,
        averageNoiseLevel: 0,
        noiseReadings: [],
        recommendation: 'Belum ada data analisis hari ini',
        riskLevel: 'safe'
      };
    }
  }

  /**
   * Mendapatkan ringkasan analisis audio untuk tanggal tertentu
   */
  static async getAudioSummaryByDate(date: Date): Promise<DailyAudioSummary> {
    try {
      const history = await apiService.getPredictionHistory(100);
      
      const targetDate = date.toDateString();
      const dateHistory = history.filter(item => {
        const itemDate = new Date(item.timestamp).toDateString();
        return itemDate === targetDate;
      });

      const noiseReadings = dateHistory.map(item => item.noise_level);
      const averageNoiseLevel = noiseReadings.length > 0 
        ? Math.round(noiseReadings.reduce((sum, level) => sum + level, 0) / noiseReadings.length)
        : 0;

      const { recommendation, riskLevel } = this.getRecommendation(averageNoiseLevel);

      return {
        date: targetDate,
        totalAnalysis: dateHistory.length,
        averageNoiseLevel,
        noiseReadings,
        recommendation,
        riskLevel
      };
    } catch (error) {
      console.error('Error getting audio summary by date:', error);
      return {
        date: date.toDateString(),
        totalAnalysis: 0,
        averageNoiseLevel: 0,
        noiseReadings: [],
        recommendation: 'Tidak ada data untuk tanggal ini',
        riskLevel: 'safe'
      };
    }
  }

  /**
   * Mendapatkan rekomendasi berdasarkan level kebisingan
   */
  private static getRecommendation(averageDb: number): { recommendation: string; riskLevel: 'safe' | 'moderate' | 'high' } {
    if (averageDb === 0) {
      return {
        recommendation: 'Belum ada data analisis hari ini',
        riskLevel: 'safe'
      };
    }

    if (averageDb <= 50) {
      return {
        recommendation: 'Masih aman! Tingkat kebisingan dalam batas normal.',
        riskLevel: 'safe'
      };
    } else if (averageDb <= 70) {
      return {
        recommendation: 'Perhatian! Tingkat kebisingan sedang. Batasi paparan lebih lanjut.',
        riskLevel: 'moderate'
      };
    } else {
      return {
        recommendation: 'Bahaya! Tingkat kebisingan tinggi. Segera hindari area bising dan gunakan pelindung telinga.',
        riskLevel: 'high'
      };
    }
  }

  /**
   * Mendapatkan ringkasan mingguan
   */
  static async getWeeklyAudioSummary(): Promise<DailyAudioSummary[]> {
    const summaries: DailyAudioSummary[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const summary = await this.getAudioSummaryByDate(date);
      summaries.push(summary);
    }
    
    return summaries;
  }
}