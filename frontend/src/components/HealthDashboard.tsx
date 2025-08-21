import React, { useState, useEffect, useCallback } from "react";
import { logger } from "../config/appConfig";
import { appConfig } from "../config/appConfig";
import { AlertTriangle, Activity, Calendar } from "lucide-react";
import {
  getHealthDashboard,
  getTodayDashboard,
  getWeeklyAudioSummary as getWeeklyAudioSummaryRPC,
  getWeeklyAlertsRecommendations,
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
  const [weeklyAlerts, setWeeklyAlerts] = useState<string[]>([]);
  const [weeklyRecommendations, setWeeklyRecommendations] = useState<string[]>(
    []
  );

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      // Determine date string for RPCs (YYYY-MM-DD)
      const dateStr = selectedDate.toISOString().split("T")[0];

      if (appConfig.backendEnabled) {
        // Fetch via Supabase RPCs
        const [todayData, weeklyRpc, alertsRecs] = await Promise.all([
          getTodayDashboard(dateStr),
          getWeeklyAudioSummaryRPC(dateStr),
          getWeeklyAlertsRecommendations(dateStr),
        ]);

        // Map weekly RPC result to DailyAudioSummary shape for UI reuse
        const weeklyData: DailyAudioSummary[] = (weeklyRpc || [])
          .sort(
            (a, b) =>
              new Date(a.day_date).getTime() - new Date(b.day_date).getTime()
          )
          .map((item) => ({
            date: new Date(item.day_date).toDateString(),
            totalAnalysis: item.total_analysis_hours || 0,
            averageNoiseLevel: Math.round(item.average_noise_level || 0),
            noiseReadings: [],
            recommendation: "",
            riskLevel: "safe",
          }));

        setWeeklySummary(weeklyData);
        setWeeklyAlerts(alertsRecs?.alerts || []);
        setWeeklyRecommendations(alertsRecs?.recommendations || []);

        // Optionally set a lightweight dashboard summary from todayData
        if (todayData) {
          setDashboard({
            profile: { tracking_enabled: true },
            recent_logs: [],
            summary: {
              avg_noise_7days: todayData.average_noise || 0,
              total_alerts: alertsRecs?.alerts?.length || 0,
              tracking_enabled: true,
            },
          } as unknown as HealthDashboardType);
        } else {
          setDashboard(null);
        }
      } else {
        // Fallback to local services
        const [dashboardData, weeklyData] = await Promise.all([
          getHealthDashboard(),
          DailyAudioService.getWeeklyAudioSummary(selectedDate),
        ]);
        setDashboard(dashboardData);
        setWeeklySummary(weeklyData);
        setWeeklyAlerts([]);
        setWeeklyRecommendations([]);
      }
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

  // Refresh dashboard when health-related data updates (e.g., session stopped)
  useEffect(() => {
    const handler = () => fetchDashboardData();
    window.addEventListener("health:data-updated", handler as EventListener);
    return () => {
      window.removeEventListener(
        "health:data-updated",
        handler as EventListener
      );
    };
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
                        style={{
                          width: `${getExposureBarWidth(
                            summary.totalAnalysis
                          )}%`,
                        }}
                      >
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white">
                          {summary.totalAnalysis.toFixed(1)} jam
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-16 text-right text-xs font-medium ${getNoiseColor(
                        summary.averageNoiseLevel
                      )}`}
                    >
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
                {weeklyAlerts.length > 0 ? (
                  weeklyAlerts.map((msg, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800 rounded-lg p-3 border border-slate-600"
                    >
                      <p className="text-sm text-slate-300">{msg}</p>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                    <p className="text-sm text-slate-300">
                      Tidak ada peringatan untuk minggu ini.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">
                  Rekomendasi
                </h3>
              </div>
              <div className="space-y-3">
                {weeklyRecommendations.length > 0 ? (
                  weeklyRecommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800 rounded-lg p-3 border border-slate-600"
                    >
                      <p className="text-sm text-slate-300">{rec}</p>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                    <p className="text-sm text-slate-300">
                      Belum ada rekomendasi spesifik. Tetap jaga paparan
                      kebisingan Anda.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthDashboard;
