import React, { useState, useEffect } from "react";
import {
  Volume2,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Loader,
} from "lucide-react";
import {
  DailyAudioService,
  DailyAudioSummary,
} from "../services/dailyAudioService";
import { appConfig } from "../config/appConfig";
import HealthDashboard from "./HealthDashboard";
import { logger } from "../config/appConfig";
import { getTodayDashboard } from "../services/healthService";

const HistoryPage: React.FC = () => {
  const [dailySummary, setDailySummary] = useState<DailyAudioSummary | null>(
    null
  );
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    fetchDailySummary();

    // Auto-refresh setiap 2 menit untuk memastikan data terbaru
    const interval = setInterval(() => {
      fetchDailySummary();
    }, 120000); // 2 menit

    // Event listener untuk refresh ketika window kembali fokus
    const handleFocus = () => {
      fetchDailySummary();
    };

    // Event listener untuk refresh saat data kesehatan diperbarui (misal setelah Stop Monitor)
    const handleHealthDataUpdated = () => {
      fetchDailySummary();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener(
      "health:data-updated",
      handleHealthDataUpdated as EventListener
    );

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(
        "health:data-updated",
        handleHealthDataUpdated as EventListener
      );
    };
  }, []);

  const fetchDailySummary = async () => {
    try {
      setSummaryLoading(true);

      // Helper sederhana untuk menyelaraskan rekomendasi & risk level dengan DailyAudioService
      const getRecommendation = (
        averageDb: number
      ): {
        recommendation: string;
        riskLevel: "safe" | "moderate" | "high";
      } => {
        if (!averageDb || averageDb === 0) {
          return {
            recommendation: "Belum ada data analisis hari ini",
            riskLevel: "safe",
          };
        }
        if (averageDb <= 50) {
          return {
            recommendation:
              "Masih aman! Tingkat kebisingan dalam batas normal.",
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
      };

      if (appConfig.backendEnabled) {
        try {
          const today = await getTodayDashboard();
          if (today) {
            const avg = Math.round(today.average_noise || 0);
            const { recommendation, riskLevel } = getRecommendation(avg);

            const mapped: DailyAudioSummary = {
              date: new Date().toDateString(),
              totalAnalysis: today.total_analysis || 0,
              averageNoiseLevel: avg,
              noiseReadings: [],
              recommendation,
              riskLevel,
            };
            setDailySummary(mapped);
            return; // selesai menggunakan backend
          }
        } catch (err) {
          // Jika backend gagal, fallback ke cache lokal
          logger.warn(
            "Gagal memuat dashboard harian dari backend, fallback ke cache lokal",
            err
          );
        }
      }

      // Mode offline atau fallback
      const summary = await DailyAudioService.getTodayAudioSummary();
      setDailySummary(summary);
    } catch (err: any) {
      logger.error("Error fetching daily summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Backend Disabled Warning */}
        {!appConfig.backendEnabled && (
          <div className="bg-orange-900 border border-orange-600 text-orange-200 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
            <AlertTriangle size={20} />
            <span>
              Beberapa data histori dan dashboard kesehatan mungkin tidak
              lengkap karena backend dinonaktifkan. Data ditampilkan dari cache
              lokal.
            </span>
          </div>
        )}

        {/* Daily Audio Summary Section */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Volume2 className="text-blue-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Laporan Hari Ini</h2>
            <Calendar className="text-slate-400" size={20} />
          </div>

          {summaryLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader className="animate-spin text-blue-500" size={32} />
              <span className="ml-3 text-slate-300">
                Memuat data analisis...
              </span>
            </div>
          ) : dailySummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Analisis */}
              <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-200">
                    Total Analisis
                  </h3>
                  <TrendingUp className="text-blue-400" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">
                  {dailySummary.totalAnalysis}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  kali penggunaan mic
                </p>
              </div>

              {/* Rata-rata dB */}
              <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-200">
                    Rata-rata Suara
                  </h3>
                  <Volume2
                    className={`${
                      dailySummary.riskLevel === "safe"
                        ? "text-green-400"
                        : dailySummary.riskLevel === "moderate"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                    size={20}
                  />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-white">
                    {dailySummary.averageNoiseLevel}
                  </p>
                  <span className="text-lg text-slate-300">dB</span>
                </div>
                {dailySummary.noiseReadings.length > 0 && (
                  <p className="text-sm text-slate-400 mt-1">
                    dari {dailySummary.noiseReadings.join(", ")} dB
                  </p>
                )}
              </div>

              {/* Rekomendasi */}
              <div className="bg-slate-700 rounded-xl p-6 border border-slate-600 md:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-200">
                    Status
                  </h3>
                  {dailySummary.riskLevel === "safe" ? (
                    <CheckCircle className="text-green-400" size={20} />
                  ) : (
                    <AlertTriangle
                      className={`${
                        dailySummary.riskLevel === "moderate"
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                      size={20}
                    />
                  )}
                </div>
                <div
                  className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                    dailySummary.riskLevel === "safe"
                      ? "bg-green-900 text-green-300"
                      : dailySummary.riskLevel === "moderate"
                      ? "bg-yellow-900 text-yellow-300"
                      : "bg-red-900 text-red-300"
                  }`}
                >
                  {dailySummary.riskLevel === "safe"
                    ? "Aman"
                    : dailySummary.riskLevel === "moderate"
                    ? "Perhatian"
                    : "Bahaya"}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {dailySummary.recommendation}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Volume2 className="mx-auto text-slate-500 mb-4" size={48} />
              <p className="text-slate-400 text-lg">
                Belum ada data analisis hari ini
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Mulai analisis suara untuk melihat laporan harian
              </p>
            </div>
          )}
        </div>

        {/* Health Dashboard Section */}
        <div className="mt-8">
          <HealthDashboard />
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
