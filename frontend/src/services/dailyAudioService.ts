/**
 * Daily Audio Analysis Service
 * Service untuk mengelola data analisis audio harian
 */

import { apiService } from "./api";
import { logger } from "../config/appConfig";

export interface DailyAudioSummary {
  date: string;
  totalAnalysis: number;
  averageNoiseLevel: number;
  noiseReadings: number[];
  recommendation: string;
  riskLevel: "safe" | "moderate" | "high";
}

export class DailyAudioService {
  // Key untuk menyimpan minggu terakhir di localStorage
  private static readonly LAST_WEEK_KEY = "lastWeekStart";
  // Key untuk menyimpan hari terakhir di localStorage
  private static readonly LAST_DAY_KEY = "lastDayDate";
  // Key untuk cache data harian
  private static readonly DAILY_CACHE_KEY = "dailyAudioSummaryCache";

  /**
   * Mendapatkan tanggal hari ini dalam format string
   */
  private static getCurrentDay(): string {
    return new Date().toDateString();
  }

  /**
   * Memeriksa apakah sudah terjadi pergantian hari
   */
  private static hasDayChanged(): boolean {
    const currentDay = this.getCurrentDay();
    const lastDay = localStorage.getItem(this.LAST_DAY_KEY);

    if (!lastDay || lastDay !== currentDay) {
      localStorage.setItem(this.LAST_DAY_KEY, currentDay);
      return true;
    }

    return false;
  }

  /**
   * Reset data daily summary (menghapus cache harian)
   */
  private static resetDailyData(): void {
    // Hapus cache daily summary
    localStorage.removeItem(this.DAILY_CACHE_KEY);
    logger.info("📅 Hari baru dimulai! Data laporan harian telah direset.");
  }

  /**
   * Mendapatkan tanggal Senin minggu ini dalam format string
   */
  private static getCurrentWeekStart(): string {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    return monday.toDateString();
  }

  /**
   * Memeriksa apakah sudah terjadi pergantian minggu
   */
  private static hasWeekChanged(): boolean {
    const currentWeekStart = this.getCurrentWeekStart();
    const lastWeekStart = localStorage.getItem(this.LAST_WEEK_KEY);

    if (!lastWeekStart || lastWeekStart !== currentWeekStart) {
      localStorage.setItem(this.LAST_WEEK_KEY, currentWeekStart);
      return true;
    }

    return false;
  }

  /**
   * Reset data weekly summary (menghapus cache jika ada)
   */
  private static resetWeeklyData(): void {
    // Hapus cache weekly summary jika ada
    localStorage.removeItem("weeklyAudioSummaryCache");
    logger.info("Weekly summary data has been reset for new week");
  }
  /**
   * Mendapatkan ringkasan analisis audio untuk hari ini
   */
  static async getTodayAudioSummary(): Promise<DailyAudioSummary> {
    try {
      // Periksa apakah sudah terjadi pergantian hari
      if (this.hasDayChanged()) {
        this.resetDailyData();
      }

      // Cek cache terlebih dahulu
      const cachedData = localStorage.getItem(this.DAILY_CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        // Pastikan cache masih untuk hari ini
        if (parsed.date === new Date().toDateString()) {
          return parsed;
        } else {
          // Hapus cache yang sudah tidak valid
          localStorage.removeItem(this.DAILY_CACHE_KEY);
        }
      }

      // Ambil history prediksi
      const history = await apiService.getPredictionHistory(100);

      // Filter data hari ini
      const today = new Date().toDateString();
      const todayHistory = history.filter((item) => {
        const itemDate = new Date(item.timestamp).toDateString();
        return itemDate === today;
      });

      // Ekstrak noise level readings
      const noiseReadings = todayHistory.map((item) => item.noise_level);

      // Hitung rata-rata
      const averageNoiseLevel =
        noiseReadings.length > 0
          ? Math.round(
              noiseReadings.reduce((sum, level) => sum + level, 0) /
                noiseReadings.length
            )
          : 0;

      // Tentukan rekomendasi berdasarkan rata-rata dB
      const { recommendation, riskLevel } =
        this.getRecommendation(averageNoiseLevel);

      const summary: DailyAudioSummary = {
        date: today,
        totalAnalysis: todayHistory.length,
        averageNoiseLevel,
        noiseReadings,
        recommendation,
        riskLevel,
      };

      // Simpan ke cache
      localStorage.setItem(this.DAILY_CACHE_KEY, JSON.stringify(summary));

      return summary;
    } catch (error) {
      logger.error("Error getting today audio summary:", error);
      return {
        date: new Date().toDateString(),
        totalAnalysis: 0,
        averageNoiseLevel: 0,
        noiseReadings: [],
        recommendation: "Belum ada data analisis hari ini",
        riskLevel: "safe",
      };
    }
  }

  /**
   * Memaksa refresh data harian (menghapus cache dan mengambil data terbaru)
   */
  static async refreshTodayAudioSummary(): Promise<DailyAudioSummary> {
    // Hapus cache untuk memaksa refresh
    localStorage.removeItem(this.DAILY_CACHE_KEY);
    logger.info("🔄 Data laporan harian telah di-refresh");

    // Ambil data terbaru
    return this.getTodayAudioSummary();
  }

  /**
   * Mendapatkan ringkasan analisis audio untuk tanggal tertentu
   */
  static async getAudioSummaryByDate(date: Date): Promise<DailyAudioSummary> {
    try {
      const history = await apiService.getPredictionHistory(100);

      const targetDate = date.toDateString();
      const dateHistory = history.filter((item) => {
        const itemDate = new Date(item.timestamp).toDateString();
        return itemDate === targetDate;
      });

      const noiseReadings = dateHistory.map((item) => item.noise_level);
      const averageNoiseLevel =
        noiseReadings.length > 0
          ? Math.round(
              noiseReadings.reduce((sum, level) => sum + level, 0) /
                noiseReadings.length
            )
          : 0;

      const { recommendation, riskLevel } =
        this.getRecommendation(averageNoiseLevel);

      return {
        date: targetDate,
        totalAnalysis: dateHistory.length,
        averageNoiseLevel,
        noiseReadings,
        recommendation,
        riskLevel,
      };
    } catch (error) {
      logger.error("Error getting audio summary by date:", error);
      return {
        date: date.toDateString(),
        totalAnalysis: 0,
        averageNoiseLevel: 0,
        noiseReadings: [],
        recommendation: "Tidak ada data untuk tanggal ini",
        riskLevel: "safe",
      };
    }
  }

  /**
   * Mendapatkan rekomendasi berdasarkan level kebisingan
   */
  private static getRecommendation(averageDb: number): {
    recommendation: string;
    riskLevel: "safe" | "moderate" | "high";
  } {
    if (averageDb === 0) {
      return {
        recommendation: "Belum ada data analisis hari ini",
        riskLevel: "safe",
      };
    }

    if (averageDb <= 50) {
      return {
        recommendation: "Masih aman! Tingkat kebisingan dalam batas normal.",
        riskLevel: "safe",
      };
    } else if (averageDb <= 70) {
      return {
        recommendation:
          "Perhatian! Tingkat kebisingan sedang. Batasi paparan lebih lanjut.",
        riskLevel: "moderate",
      };
    } else {
      return {
        recommendation:
          "Bahaya! Tingkat kebisingan tinggi. Segera hindari area bising dan gunakan pelindung telinga.",
        riskLevel: "high",
      };
    }
  }

  /**
   * Mendapatkan ringkasan mingguan dari Senin sampai Minggu
   * Hari sebelum hari akses akan dikosongkan
   * Otomatis reset ketika terjadi pergantian minggu
   */
  static async getWeeklyAudioSummary(
    targetDate?: Date
  ): Promise<DailyAudioSummary[]> {
    const baseDate = targetDate || new Date();

    // Periksa apakah sudah terjadi pergantian minggu (hanya jika tidak ada targetDate)
    if (!targetDate && this.hasWeekChanged()) {
      this.resetWeeklyData();
      logger.info("🔄 Minggu baru dimulai! Data weekly summary telah direset.");
    }

    const summaries: DailyAudioSummary[] = [];
    const currentDayOfWeek = baseDate.getDay(); // 0 = Minggu, 1 = Senin, dst.

    // Hitung tanggal Senin minggu dari baseDate
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + mondayOffset);

    // Buat array untuk 7 hari (Senin sampai Minggu)
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      // Jika targetDate diberikan, tampilkan semua data
      // Jika tidak ada targetDate, hanya tampilkan data sampai hari ini
      if (!targetDate && date > new Date()) {
        const dayNames = [
          "Minggu",
          "Senin",
          "Selasa",
          "Rabu",
          "Kamis",
          "Jumat",
          "Sabtu",
        ];
        summaries.push({
          date: date.toDateString(),
          totalAnalysis: 0,
          averageNoiseLevel: 0,
          noiseReadings: [],
          recommendation: `Data untuk ${
            dayNames[date.getDay()]
          } belum tersedia`,
          riskLevel: "safe",
        });
      } else {
        const summary = await this.getAudioSummaryByDate(date);
        summaries.push(summary);
      }
    }

    return summaries;
  }
}
