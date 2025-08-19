import React, { useState, useEffect, useCallback } from "react";
import { logger } from "../config/appConfig";
import {
  AlertTriangle,
  Activity,
  Calendar,
} from "lucide-react";
import {
  getHealthDashboard,
  HealthDashboard as HealthDashboardType,
} from "../services/healthService";
import {
  DailyAudioService,
  DailyAudioSummary,
} from "../services/dailyAudioService";

const HealthDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<HealthDashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weeklySummary, setWeeklySummary] = useState<DailyAudioSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, weeklyData] = await Promise.all([
        getHealthDashboard(),
        DailyAudioService.getWeeklyAudioSummary(selectedDate),
      ]);
      setDashboard(dashboardData);
      setWeeklySummary(weeklyData);
    } catch (err: any) {
      logger.error("Error fetching dashboard data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getDayNameFromIndex = (index: number) => {
    const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    return days[index];
  };

  const getNoiseColor = (noise: number) => {
    if (noise < 50) return "text-green-400";
    if (noise < 70) return "text-yellow-400";
    return "text-red-400";
  };

  const getExposureBarWidth = (hours: number) => {
    return Math.min((hours / 12) * 100, 100);
  };

  // Selalu render container dengan tombol
  return (
    <div className="bg-slate-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">
          Dashboard Kesehatan Personal
        </h3>
      </div>

      {/* Konten dashboard */}
      {loading ? (
        <div className="text-slate-400 text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Memuat data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">Error: {error}</p>
        </div>
      ) : !dashboard && weeklySummary.length === 0 ? (
        <div className="text-slate-400 text-center py-8">
          <p>Belum ada data kesehatan tersedia.</p>
          <p className="text-sm mt-2">
            Silakan atur profil kesehatan dan tambahkan log paparan.
          </p>
          <div className="mt-4 text-sm text-blue-400">
            <p>
              👆 Gunakan tombol "Pengaturan" dan "Histori" di atas untuk memulai
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Weekly Summary */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">
                  Ringkasan Mingguan
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-400">
                  {(() => {
                    const today = new Date();
                    const isCurrentWeek = selectedDate
                      ? selectedDate >=
                          new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            today.getDate() - today.getDay()
                          ) &&
                        selectedDate <=
                          new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            today.getDate() + (6 - today.getDay())
                          )
                      : true;
                    return (
                      !isCurrentWeek && (
                        <button
                          onClick={() => setSelectedDate(new Date())}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors text-white"
                        >
                          Minggu Ini
                        </button>
                      )
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Daily Exposure Chart */}
            <div className="mb-6">
              <h5 className="text-sm font-medium text-slate-300 mb-3">
                Paparan Harian (Jam)
              </h5>
              <div className="space-y-2">
                {weeklySummary.map((summary, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-8 text-xs text-slate-400 font-medium">
                      {getDayNameFromIndex(index)}
                    </div>
                    <div className="flex-1 bg-slate-600 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        style={{ width: `${getExposureBarWidth(summary.totalAnalysis)}%` }}
                      >
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white">
                          {summary.totalAnalysis.toFixed(1)} jam
                        </span>
                      </div>
                    </div>
                    <div className={`w-16 text-right text-xs font-medium ${getNoiseColor(summary.averageNoiseLevel)}`}>
                      {summary.averageNoiseLevel.toFixed(1)} dB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Peringatan</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                  <p className="text-sm text-slate-300">
                    Tingkat kebisingan di atas 70 dB selama lebih dari 2 jam hari ini.
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                  <p className="text-sm text-slate-300">
                    Rata-rata kebisingan pekan ini lebih tinggi dari pekan lalu.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Rekomendasi</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                  <p className="text-sm text-slate-300">
                    Pertimbangkan menggunakan headphone noise-cancelling saat bekerja.
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                  <p className="text-sm text-slate-300">
                    Batasi paparan di area bising pada jam sibuk.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthDashboard;
