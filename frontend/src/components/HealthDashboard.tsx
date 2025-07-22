import React, { useState, useEffect } from "react";
import {
  Home,
  Building2,
  TrendingUp,
  AlertTriangle,
  Settings,
  Activity,
  Clock,
} from "lucide-react";
import {
  getHealthDashboard,
  getHealthProfile,
  updateHealthProfile,
  createExposureLog,
  HealthDashboard as HealthDashboardType,
  HealthProfile,
} from "../services/healthService";

const HealthDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<HealthDashboardType | null>(null);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    home_zone_address: "",
    home_zone_lat: 0,
    home_zone_lng: 0,
    work_zone_address: "",
    work_zone_lat: 0,
    work_zone_lng: 0,
  });

  // Add log form state
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split("T")[0],
    home_hours: 8,
    work_hours: 8,
    commute_hours: 1,
    home_avg_noise: 45,
    work_avg_noise: 60,
    commute_avg_noise: 70,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardData, profileData] = await Promise.all([
        getHealthDashboard(),
        getHealthProfile(),
      ]);
      
      setDashboard(dashboardData);
      setHealthProfile(profileData);
      if (profileData) {
        setSettingsForm({
          home_zone_address: profileData.home_address || "",
          home_zone_lat: profileData.home_latitude || 0,
          home_zone_lng: profileData.home_longitude || 0,
          work_zone_address: profileData.work_address || "",
          work_zone_lat: profileData.work_latitude || 0,
          work_zone_lng: profileData.work_longitude || 0,
        });
      }
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Map frontend form fields to backend model fields
      const backendData = {
        home_address: settingsForm.home_zone_address,
        home_latitude: settingsForm.home_zone_lat,
        home_longitude: settingsForm.home_zone_lng,
        work_address: settingsForm.work_zone_address,
        work_latitude: settingsForm.work_zone_lat,
        work_longitude: settingsForm.work_zone_lng,
      };
      await updateHealthProfile(backendData);
      setShowSettings(false);
      fetchDashboardData();
    } catch (err: any) {
      setError(err.message);
    }
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
      ) : !dashboard || !dashboard.summary ? (
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
          {/* Zone Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Home className="text-green-400" size={20} />
                <h4 className="font-semibold text-white">Zona Rumah</h4>
              </div>
              <p className="text-slate-300 text-sm mb-1">
                {healthProfile?.home_address || "Belum diatur"}
              </p>
              <p
                className={`text-lg font-bold ${getNoiseColor(
                  dashboard.profile?.home_avg_noise || 0
                )}`}
              >
                {(dashboard.profile?.home_avg_noise || 0).toFixed(1)} dB
                rata-rata
              </p>
            </div>

            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="text-blue-400" size={20} />
                <h4 className="font-semibold text-white">Zona Kerja</h4>
              </div>
              <p className="text-slate-300 text-sm mb-1">
                {healthProfile?.work_address || "Belum diatur"}
              </p>
              <p
                className={`text-lg font-bold ${getNoiseColor(
                  dashboard.profile?.work_avg_noise || 0
                )}`}
              >
                {(dashboard.profile?.work_avg_noise || 0).toFixed(1)} dB
                rata-rata
              </p>
            </div>
          </div>

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
                {(dashboard.recent_logs || []).map((log, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-8 text-xs text-slate-400 font-medium">
                      {getDayName(log.date)}
                    </div>
                    <div className="flex-1 bg-slate-600 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${getExposureBarWidth(
                            log.total_exposure_hours || 0
                          )}%`,
                        }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {(log.total_exposure_hours || 0).toFixed(1)}h
                      </div>
                    </div>
                    <div
                      className={`text-xs font-medium ${getNoiseColor(
                        log.weighted_avg_noise || 0
                      )}`}
                    >
                      {(log.weighted_avg_noise || 0).toFixed(1)} dB
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Alerts */}
            {(dashboard.summary?.total_alerts || 0) > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="text-yellow-400" size={16} />
                      <h5 className="font-medium text-yellow-400">
                        Peringatan Kesehatan
                      </h5>
                    </div>
                    <p className="text-sm text-yellow-300">
                      Paparan tinggi terdeteksi{" "}
                      {dashboard.summary?.total_alerts || 0} hari dalam
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
                      dashboard.summary?.avg_noise_7days || 0
                    )}`}
                  >
                    {(dashboard.summary?.avg_noise_7days || 0).toFixed(1)} dB
                  </p>
                  <p className="text-slate-400 text-sm">7 hari terakhir</p>
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
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Alamat Rumah
                </label>
                <input
                  type="text"
                  value={settingsForm.home_zone_address}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      home_zone_address: e.target.value,
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Contoh: Kemang, Jakarta Selatan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Alamat Kantor
                </label>
                <input
                  type="text"
                  value={settingsForm.work_zone_address}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      work_zone_address: e.target.value,
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Contoh: Sudirman, Jakarta Pusat"
                />
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
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Jam Rumah
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.1"
                    value={logForm.home_hours}
                    onChange={(e) =>
                      setLogForm({
                        ...logForm,
                        home_hours: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Jam Kerja
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.1"
                    value={logForm.work_hours}
                    onChange={(e) =>
                      setLogForm({
                        ...logForm,
                        work_hours: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Jam Perjalanan
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
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Noise Rumah (dB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={logForm.home_avg_noise}
                    onChange={(e) =>
                      setLogForm({
                        ...logForm,
                        home_avg_noise: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Noise Kerja (dB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={logForm.work_avg_noise}
                    onChange={(e) =>
                      setLogForm({
                        ...logForm,
                        work_avg_noise: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Noise Perjalanan (dB)
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
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm"
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
