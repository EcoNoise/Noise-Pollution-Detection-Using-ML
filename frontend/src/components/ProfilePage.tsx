import React, { useState, useEffect } from "react";
import { Camera, Edit3, Shield, Loader, Volume2, TrendingUp, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { getUserProfile, updateUserProfile } from "../services/profileService";
import { DailyAudioService, DailyAudioSummary } from "../services/dailyAudioService";
import HealthDashboard from "./HealthDashboard";

// Interface ini mendefinisikan struktur data profil dari backend
interface UserProfile {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  photo?: string; // Field 'photo' dari backend Anda
}

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  // Daily Audio Summary State
  const [dailySummary, setDailySummary] = useState<DailyAudioSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // State untuk data yang akan di-edit
  const [editData, setEditData] = useState<Partial<UserProfile>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getUserProfile();
        setProfile(data);
        setEditData(data);
        // --- PERBAIKAN ---
        // Backend sudah memberikan URL lengkap, tidak perlu hardcode
        if (data.photo) {
          setPhotoPreview(data.photo);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchDailySummary = async () => {
      try {
        setSummaryLoading(true);
        const summary = await DailyAudioService.getTodayAudioSummary();
        setDailySummary(summary);
      } catch (err: any) {
        console.error('Error fetching daily summary:', err);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchDailySummary();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    setError("");
    const formData = new FormData();

    // --- PERBAIKAN ---
    // Kirim dengan key snake_case yang diharapkan backend
    if (editData.first_name) {
      formData.append("first_name", editData.first_name);
    }
    if (editData.last_name) {
      formData.append("last_name", editData.last_name);
    }
    if (photoFile) {
      // Key untuk foto harus 'photo', bukan 'profile.photo'
      formData.append("photo", photoFile);
    }

    try {
      const updatedProfile = await updateUserProfile(formData);
      setProfile(updatedProfile);
      setEditData(updatedProfile);
      if (updatedProfile.photo) {
        setPhotoPreview(updatedProfile.photo);
      }
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditData(profile!);
      setPhotoPreview(
        profile?.photo ? `http://localhost:5000${profile.photo}` : null
      );
      setPhotoFile(null);
    }
    setIsEditing(!isEditing);
  };

  if (loading && !profile) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900">
        <Loader className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="text-center text-red-400 p-10 bg-slate-800 m-8 rounded-lg">
        {error}
      </div>
    );
  }

  if (!profile) return null;

  const displayData = isEditing ? editData : profile;
  const currentPhoto =
    photoPreview ||
    `https://ui-avatars.com/api/?name=${displayData.first_name}+${displayData.last_name}&background=3B82F6&color=fff&size=160`;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">Profil Saya</h1>
          <button
            onClick={handleEditToggle}
            className="flex items-center gap-2 py-2 px-4 bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200"
          >
            <Edit3 size={18} />
            {isEditing ? "Batal" : "Edit Profil"}
          </button>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="flex flex-col items-center md:col-span-1">
              <div className="relative w-40 h-40 mb-4">
                <img
                  src={currentPhoto}
                  alt="Foto Profil"
                  className="w-full h-full rounded-full object-cover border-4 border-blue-500 shadow-lg"
                />
                {isEditing && (
                  <label
                    htmlFor="photo-upload"
                    className="absolute bottom-1 right-1 w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-500 transition"
                  >
                    <Camera size={20} />
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white text-center">
                @{displayData.username}
              </h2>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                {isEditing ? (
                  <div className="flex gap-4">
                    <input
                      type="text"
                      name="first_name" // Gunakan snake_case
                      value={editData.first_name || ""}
                      onChange={handleInputChange}
                      className="w-full bg-slate-700 p-3 rounded-lg ..."
                      placeholder="Nama Depan"
                    />
                    <input
                      type="text"
                      name="last_name" // Gunakan snake_case
                      value={editData.last_name || ""}
                      onChange={handleInputChange}
                      className="w-full bg-slate-700 p-3 rounded-lg ..."
                      placeholder="Nama Belakang"
                    />
                  </div>
                ) : (
                  <p className="text-xl p-3 bg-slate-700 rounded-lg">
                    {profile.first_name} {profile.last_name}{" "}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email
                </label>
                <p className="text-xl p-3 bg-slate-600 rounded-lg cursor-not-allowed">
                  {profile.email}
                </p>
              </div>
              {!isEditing && (
                <button className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  <Shield size={16} /> Ubah Password
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-red-400 text-center mt-4">{error}</p>}

          {isEditing && (
            <div className="mt-8 text-right">
              <button
                onClick={handleSaveChanges}
                disabled={loading}
                className="py-2 px-6 bg-green-600 rounded-lg hover:bg-green-700 transition-all font-semibold flex items-center justify-center min-w-[120px]"
              >
                {loading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  "Simpan Perubahan"
                )}
              </button>
            </div>
          )}
        </div>

        {/* Daily Audio Summary Section */}
        <div className="mt-8 bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <Volume2 className="text-blue-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Laporan Hari Ini</h2>
            <Calendar className="text-slate-400" size={20} />
          </div>

          {summaryLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader className="animate-spin text-blue-500" size={32} />
              <span className="ml-3 text-slate-300">Memuat data analisis...</span>
            </div>
          ) : dailySummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Analisis */}
              <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-200">Total Analisis</h3>
                  <TrendingUp className="text-blue-400" size={20} />
                </div>
                <p className="text-3xl font-bold text-white">{dailySummary.totalAnalysis}</p>
                <p className="text-sm text-slate-400 mt-1">kali penggunaan mic</p>
              </div>

              {/* Rata-rata dB */}
              <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-200">Rata-rata Suara</h3>
                  <Volume2 className={`${
                    dailySummary.riskLevel === 'safe' ? 'text-green-400' :
                    dailySummary.riskLevel === 'moderate' ? 'text-yellow-400' : 'text-red-400'
                  }`} size={20} />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-white">{dailySummary.averageNoiseLevel}</p>
                  <span className="text-lg text-slate-300">dB</span>
                </div>
                {dailySummary.noiseReadings.length > 0 && (
                  <p className="text-sm text-slate-400 mt-1">
                    dari {dailySummary.noiseReadings.join(', ')} dB
                  </p>
                )}
              </div>

              {/* Rekomendasi */}
              <div className="bg-slate-700 rounded-xl p-6 border border-slate-600 md:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-200">Status</h3>
                  {dailySummary.riskLevel === 'safe' ? (
                    <CheckCircle className="text-green-400" size={20} />
                  ) : (
                    <AlertTriangle className={`${
                      dailySummary.riskLevel === 'moderate' ? 'text-yellow-400' : 'text-red-400'
                    }`} size={20} />
                  )}
                </div>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                  dailySummary.riskLevel === 'safe' ? 'bg-green-900 text-green-300' :
                  dailySummary.riskLevel === 'moderate' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'
                }`}>
                  {dailySummary.riskLevel === 'safe' ? 'Aman' :
                   dailySummary.riskLevel === 'moderate' ? 'Perhatian' : 'Bahaya'}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {dailySummary.recommendation}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Volume2 className="mx-auto text-slate-500 mb-4" size={48} />
              <p className="text-slate-400 text-lg">Belum ada data analisis hari ini</p>
              <p className="text-slate-500 text-sm mt-2">Mulai analisis suara untuk melihat laporan harian</p>
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

export default ProfilePage;
