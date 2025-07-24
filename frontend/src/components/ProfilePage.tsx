import React, { useState, useEffect } from "react";
import {
  Camera,
  Edit3,
  Shield,
  Loader,
  User,
  Clock,
  Mail,
  UserCheck,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { getUserProfile, updateUserProfile } from "../services/profileService";

// Interface ini mendefinisikan struktur data profil dari backend
interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  photo?: string; // Field 'photo' dari backend Anda
  date_joined?: string; // Biasanya ada di model User Django
  last_login?: string; // Field default Django User
  is_active?: boolean; // Field default Django User
}

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

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
      setPhotoPreview(profile?.photo || null);
      setPhotoFile(null);
    }
    setIsEditing(!isEditing);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Tidak tersedia";
    try {
      return new Date(dateString).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Tidak tersedia";
    }
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
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 pb-24 sm:pb-8">
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

        {/* Profile Information Section */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 mb-8">
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
                      name="first_name"
                      value={editData.first_name || ""}
                      onChange={handleInputChange}
                      className="w-full bg-slate-700 p-3 rounded-lg border border-slate-600 text-white focus:border-blue-500 focus:outline-none"
                      placeholder="Nama Depan"
                    />
                    <input
                      type="text"
                      name="last_name"
                      value={editData.last_name || ""}
                      onChange={handleInputChange}
                      className="w-full bg-slate-700 p-3 rounded-lg border border-slate-600 text-white focus:border-blue-500 focus:outline-none"
                      placeholder="Nama Belakang"
                    />
                  </div>
                ) : (
                  <p className="text-xl p-3 bg-slate-700 rounded-lg">
                    {profile.first_name} {profile.last_name}
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

        {/* Account Information Section */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <User className="text-blue-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Informasi Akun</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
              <div className="flex items-center gap-3 mb-3">
                <User className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-200">
                  Nama Depan
                </h3>
              </div>
              <p className="text-2xl font-bold text-white">
                {profile.first_name || "Tidak diisi"}
              </p>
              <p className="text-sm text-slate-400 mt-1">Nama depan Anda</p>
            </div>

            {/* Last Name */}
            <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
              <div className="flex items-center gap-3 mb-3">
                <User className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-200">
                  Nama Belakang
                </h3>
              </div>
              <p className="text-2xl font-bold text-white">
                {profile.last_name || "Tidak diisi"}
              </p>
              <p className="text-sm text-slate-400 mt-1">Nama belakang Anda</p>
            </div>

            {/* Account Status */}
            <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle
                  className={`${
                    profile.is_active ? "text-green-400" : "text-red-400"
                  }`}
                  size={20}
                />
                <h3 className="text-lg font-semibold text-slate-200">
                  Status Akun
                </h3>
              </div>
              <div
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  profile.is_active
                    ? "bg-green-900 text-green-300"
                    : "bg-red-900 text-red-300"
                }`}
              >
                {profile.is_active ? "Aktif" : "Tidak Aktif"}
              </div>
              <p className="text-sm text-slate-400 mt-2">
                {profile.is_active
                  ? "Akun Anda dalam keadaan aktif"
                  : "Akun Anda tidak aktif"}
              </p>
            </div>

            {/* Full Name */}
            <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
              <div className="flex items-center gap-3 mb-3">
                <UserCheck className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-200">
                  Nama Lengkap
                </h3>
              </div>
              <p className="text-2xl font-bold text-white">
                {profile.first_name && profile.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : "Nama belum lengkap"}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Nama depan dan belakang
              </p>
            </div>

            {/* Email */}
            <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-200">Email</h3>
              </div>
              <p className="text-lg font-semibold text-white">
                {profile.email}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Email yang terdaftar
              </p>
            </div>

            {/* Registration Date */}
            <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-200">
                  Bergabung Sejak
                </h3>
              </div>
              <p className="text-lg font-semibold text-white">
                {formatDate(profile.date_joined)}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Tanggal pembuatan akun
              </p>
            </div>

            {/* Last Login */}
            <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-200">
                  Login Terakhir
                </h3>
              </div>
              <p className="text-lg font-semibold text-white">
                {formatDate(profile.last_login)}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Waktu login terakhir
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
