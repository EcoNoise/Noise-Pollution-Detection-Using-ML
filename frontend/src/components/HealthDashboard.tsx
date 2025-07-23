import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Settings,
  Activity,
  Clock,
} from "lucide-react";
import {
  getHealthDashboard,
  getHealthProfile,
  createExposureLog,
  HealthDashboard as HealthDashboardType,
  HealthProfile,
} from "../services/healthService";
import { DailyAudioService, DailyAudioSummary } from "../services/dailyAudioService";

const HealthDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<HealthDashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<DailyAudioSummary[]>([]);

  // Add log form state (simplified)
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split("T")[0],
    commute_hours: 8,
    commute_avg_noise: 60,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardData, weeklyData] = await Promise.all([
        getHealthDashboard(),
        DailyAudioService.getWeeklyAudioSummary()
      ]);
      setDashboard(dashboardData);
      setWeeklySummary(weeklyData);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // No settings to save currently
    setShowSettings(false);
  };

  const handleAddLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createExposureLog(logForm);
      setShowAddLog(false);
      fetchDashboardData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getDayName = (dateStr: string) => {
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };

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
      {/* Header dengan tombol yang SELALU terlihat */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">
          Dashboard Kesehatan Personal
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddLog(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors text-white"
          >
            + Tambah Log
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white"
          >
            <Settings size={16} />
            Pengaturan
          </button>
        </div>
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
              👆 Gunakan tombol "Pengaturan" dan "Tambah Log" di atas untuk
              memulai
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Weekly Summary */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-purple-400" size={20} />
              <h4 className="font-semibold text-white">Ringkasan Mingguan</h4>
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
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${summary.totalAnalysis > 0 ? getExposureBarWidth(summary.totalAnalysis / 3) : 0}%`,
                        }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {summary.totalAnalysis > 0 ? `${(summary.totalAnalysis / 3).toFixed(1)}h` : '-'}
                      </div>
                    </div>
                    <div
                      className={`text-xs font-medium ${summary.averageNoiseLevel > 0 ? getNoiseColor(summary.averageNoiseLevel) : 'text-slate-500'}`}
                    >
                      {summary.averageNoiseLevel > 0 ? `${summary.averageNoiseLevel.toFixed(1)} dB` : '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Alerts */}
            {(dashboard?.summary?.total_alerts || 0) > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="text-yellow-400" size={16} />
                      <h5 className="font-medium text-yellow-400">
                        Peringatan Kesehatan
                      </h5>
                    </div>
                    <p className="text-sm text-yellow-300">
                      Paparan tinggi terdeteksi{" "}
                      {dashboard?.summary?.total_alerts || 0} hari dalam
                      seminggu terakhir
                    </p>
                    <p className="text-xs text-yellow-400 mt-1">
                      💡 Coba gunakan headphone peredam bising saat bepergian
                    </p>
                  </div>
                )}

                {/* Weekly Average Summary */}
                <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="text-green-400" size={20} />
                    <h4 className="font-semibold text-white">Rata-rata Mingguan</h4>
                  </div>
                  <p
                    className={`text-2xl font-bold ${getNoiseColor(
                      weeklySummary.length > 0 
                        ? weeklySummary
                            .filter(s => s.averageNoiseLevel > 0)
                            .reduce((sum, s) => sum + s.averageNoiseLevel, 0) / 
                          Math.max(weeklySummary.filter(s => s.averageNoiseLevel > 0).length, 1)
                        : 0
                    )}`}
                  >
                    {weeklySummary.length > 0 
                      ? (weeklySummary
                          .filter(s => s.averageNoiseLevel > 0)
                          .reduce((sum, s) => sum + s.averageNoiseLevel, 0) / 
                        Math.max(weeklySummary.filter(s => s.averageNoiseLevel > 0).length, 1)
                        ).toFixed(1)
                      : '0.0'
                    } dB
                  </p>
                  <p className="text-slate-400 text-sm">Senin - Minggu</p>
                </div>

            {/* Weekend Recovery */}
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-green-400" size={16} />
                <h5 className="font-medium text-green-400">
                  Pemulihan Akhir Pekan
                </h5>
              </div>
              <p className="text-sm text-green-300">
                Waktu pemulihan yang baik - lebih banyak waktu di rumah
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Pengaturan Zona
            </h3>
            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div className="text-center text-slate-400">
                <p>Pengaturan zona akan ditambahkan di versi mendatang</p>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Log Modal */}
      {showAddLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Tambah Log Paparan
            </h3>
            <form onSubmit={handleAddLogSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={logForm.date}
                  onChange={(e) =>
                    setLogForm({ ...logForm, date: e.target.value })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Jam Paparan Total
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.1"
                    value={logForm.commute_hours}
                    onChange={(e) =>
                      setLogForm({
                        ...logForm,
                        commute_hours: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Rata-rata Noise (dB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={logForm.commute_avg_noise}
                    onChange={(e) =>
                      setLogForm({
                        ...logForm,
                        commute_avg_noise: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddLog(false)}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthDashboard;
