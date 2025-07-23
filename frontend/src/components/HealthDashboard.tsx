import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Settings,
  Activity,
  Clock,
  Calendar,
  Shield,
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

  // Histori form state (hanya tanggal)
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split("T")[0],
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
      // Hanya menggunakan tanggal untuk melihat histori
      const selectedDate = logForm.date;
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
            Histori
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
              👆 Gunakan tombol "Pengaturan" dan "Histori" di atas untuk
              memulai
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
              <div className="text-sm text-gray-400">
                {new Date().toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
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
            {(() => {
              const highNoisedays = weeklySummary.filter(s => s.averageNoiseLevel > 70).length;
              const dangerousNoiseDays = weeklySummary.filter(s => s.averageNoiseLevel > 85).length;
              const avgNoise = weeklySummary.length > 0 
                ? weeklySummary
                    .filter(s => s.averageNoiseLevel > 0)
                    .reduce((sum, s) => sum + s.averageNoiseLevel, 0) / 
                  Math.max(weeklySummary.filter(s => s.averageNoiseLevel > 0).length, 1)
                : 0;
              
              // Tentukan level peringatan berdasarkan ambang batas dB
              let shouldShow = false;
              let bgColor = 'bg-gray-900/20';
              let borderColor = 'border-gray-500';
              let textColor = 'text-gray-400';
              let iconColor = 'text-gray-400';
              let title = '';
              let message = '';
              let advice = '';
              
              if (dangerousNoiseDays > 0 || avgNoise > 85) {
                // MERAH - Berbahaya
                shouldShow = true;
                bgColor = 'bg-red-900/20';
                borderColor = 'border-red-500';
                textColor = 'text-red-400';
                iconColor = 'text-red-400';
                title = 'PERINGATAN BAHAYA!';
                message = dangerousNoiseDays > 0 
                  ? `Paparan BERBAHAYA (>85 dB) terdeteksi ${dangerousNoiseDays} hari minggu ini`
                  : `Rata-rata mingguan ${avgNoise.toFixed(1)} dB - SANGAT BERBAHAYA!`;
                advice = 'SEGERA gunakan pelindung telinga - risiko kerusakan pendengaran permanen!';
              } else if (highNoisedays > 0 || avgNoise > 70) {
                // ORANGE - Tinggi
                shouldShow = true;
                bgColor = 'bg-orange-900/20';
                borderColor = 'border-orange-500';
                textColor = 'text-orange-400';
                iconColor = 'text-orange-400';
                title = 'Peringatan Tinggi';
                message = highNoisedays > 0 
                  ? `Paparan tinggi (70-85 dB) terdeteksi ${highNoisedays} hari minggu ini`
                  : `Rata-rata mingguan ${avgNoise.toFixed(1)} dB - perlu perhatian`;
                advice = 'Gunakan headphone peredam bising dan kurangi paparan noise';
              } else if (avgNoise > 50) {
                // KUNING - Normal tapi perlu perhatian
                shouldShow = true;
                bgColor = 'bg-yellow-900/20';
                borderColor = 'border-yellow-500';
                textColor = 'text-yellow-400';
                iconColor = 'text-yellow-400';
                title = 'Perhatian Normal';
                message = `Rata-rata mingguan ${avgNoise.toFixed(1)} dB - dalam batas normal`;
                advice = 'Tetap jaga kesehatan pendengaran dengan istirahat yang cukup';
              }
              
              return shouldShow && (
                <div className={`${bgColor} ${borderColor} border rounded-lg p-4 mb-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={iconColor} size={16} />
                    <h5 className={`font-medium ${textColor}`}>
                      {title}
                    </h5>
                  </div>
                  <p className={`text-sm ${textColor.replace('400', '300')}`}>
                    {message}
                  </p>
                  <p className={`text-xs ${textColor} mt-1`}>
                    {avgNoise > 85 ? '🚨' : avgNoise > 70 ? '⚠️' : '💡'} {advice}
                  </p>
                </div>
              );
            })()}

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

            {/* Recovery Status */}
            {(() => {
              const avgNoise = weeklySummary.length > 0 
                ? weeklySummary
                    .filter(s => s.averageNoiseLevel > 0)
                    .reduce((sum, s) => sum + s.averageNoiseLevel, 0) / 
                  Math.max(weeklySummary.filter(s => s.averageNoiseLevel > 0).length, 1)
                : 0;
              
              const weekendData = weeklySummary.filter(s => {
                const day = new Date(s.date).getDay();
                return day === 0 || day === 6; // Sunday or Saturday
              });
              
              const weekendAvg = weekendData.length > 0 
                ? weekendData.reduce((sum, s) => sum + s.averageNoiseLevel, 0) / weekendData.length
                : 0;
              
              // Tentukan status berdasarkan ambang batas dB
              let bgColor = 'bg-gray-900/20';
              let borderColor = 'border-gray-500';
              let textColor = 'text-gray-400';
              let iconColor = 'text-gray-400';
              let title = 'Status Pemulihan';
              let message = 'Tidak ada data';
              let advice = 'Mulai rekam data untuk analisis';
              let icon = '📊';
              
              if (avgNoise < 50) {
                // HIJAU - Aman
                bgColor = 'bg-green-900/20';
                borderColor = 'border-green-500';
                textColor = 'text-green-400';
                iconColor = 'text-green-400';
                title = 'Status Pemulihan Sangat Baik';
                message = `Rata-rata mingguan ${avgNoise.toFixed(1)} dB dalam batas aman`;
                advice = 'Pertahankan pola hidup sehat ini!';
                icon = '✅';
              } else if (avgNoise < 70) {
                // KUNING - Normal
                bgColor = 'bg-yellow-900/20';
                borderColor = 'border-yellow-500';
                textColor = 'text-yellow-400';
                iconColor = 'text-yellow-400';
                title = 'Status Pemulihan Normal';
                message = `Rata-rata mingguan ${avgNoise.toFixed(1)} dB - masih dalam batas normal`;
                advice = weekendAvg < avgNoise 
                  ? 'Bagus! Weekend lebih tenang - lanjutkan pola ini'
                  : 'Coba cari waktu istirahat lebih banyak di weekend';
                icon = '⚠️';
              } else if (avgNoise < 85) {
                // ORANGE - Tinggi
                bgColor = 'bg-orange-900/20';
                borderColor = 'border-orange-500';
                textColor = 'text-orange-400';
                iconColor = 'text-orange-400';
                title = 'Perlu Perhatian - Pemulihan Kurang';
                message = `Rata-rata mingguan ${avgNoise.toFixed(1)} dB - tinggi, perlu perhatian`;
                advice = 'Perbanyak waktu di tempat tenang dan gunakan pelindung telinga';
                icon = '🔶';
              } else {
                // MERAH - Berbahaya
                bgColor = 'bg-red-900/20';
                borderColor = 'border-red-500';
                textColor = 'text-red-400';
                iconColor = 'text-red-400';
                title = 'BAHAYA - Pemulihan Sangat Buruk';
                message = `Rata-rata mingguan ${avgNoise.toFixed(1)} dB - BERBAHAYA!`;
                advice = 'SEGERA cari lingkungan tenang dan konsultasi medis!';
                icon = '🚨';
              }
              
              return (
                <div className={`${bgColor} ${borderColor} border rounded-lg p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className={iconColor} size={16} />
                    <h5 className={`font-medium ${textColor}`}>
                      {title}
                    </h5>
                  </div>
                  <p className={`text-sm ${textColor.replace('400', '300')}`}>
                    {message}
                  </p>
                  <p className={`text-xs ${textColor} mt-1`}>
                    {icon} {advice}
                  </p>
                </div>
              );
            })()}
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

      {/* Histori Modal */}
      {showAddLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Histori
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
              <div className="text-sm text-slate-400 mt-2">
                {(() => {
                  const date = new Date(logForm.date);
                  const weekNumber = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
                  
                  // Mendapatkan tanggal awal dan akhir minggu
                  const dayOfWeek = date.getDay();
                  const startDate = new Date(date);
                  startDate.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Senin
                  const endDate = new Date(startDate);
                  endDate.setDate(startDate.getDate() + 6); // Minggu
                  
                  // Format tanggal
                  const formatDate = (d: Date) => {
                    return d.getDate() + ' ' + d.toLocaleString('id-ID', { month: 'long' }) + ' ' + d.getFullYear();
                  };
                  
                  return (
                    <div>
                      <p>Grafik untuk Minggu ke-{weekNumber} ({startDate.getDate()}–{endDate.getDate()} {endDate.toLocaleString('id-ID', { month: 'long' })} {endDate.getFullYear()})</p>
                    </div>
                  );
                })()}
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
