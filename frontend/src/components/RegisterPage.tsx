import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { logger } from "../config/appConfig";
import { useAuth, isSupabaseConfigured } from "../contexts/AuthContext";
import {
  uploadProfilePhoto,
  updateUserProfile,
} from "../services/profileService";

interface RegisterPageProps {
  onRegisterSuccess?: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Individual state for each field
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Rehydrate error from localStorage in case of remount/reset
  useEffect(() => {
    try {
      const storedErr = localStorage.getItem('registrationError');
      if (storedErr) {
        setError(storedErr);
        localStorage.removeItem('registrationError');
      }
    } catch {}
  }, []);

  // Log when error changes to verify UI path
  useEffect(() => {
    if (error) {
      try { logger.info("Display error value:", error); } catch {}
    }
  }, [error]);

  // Ensure error block scrolls into view when it appears (no logic changes)
  useEffect(() => {
    if (!error) return;
    let cancelled = false;
    const tryScroll = (attemptsLeft = 6) => {
      if (cancelled) return;
      const el = document.querySelector('[data-error-message]') as HTMLElement | null;
      if (el && el.offsetParent !== null) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
      } else if (attemptsLeft > 0) {
        setTimeout(() => tryScroll(attemptsLeft - 1), 150);
      }
    };
    tryScroll();
    return () => { cancelled = true; };
  }, [error]);


  // No more redirect effect - we render LoginPage directly

  // Email validation function
  const validateEmail = (emailValue: string) => {
    if (!emailValue) {
      setEmailError("Email wajib diisi");
      return false;
    }
    
    // More comprehensive email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(emailValue)) {
      setEmailError("Format email tidak valid (contoh: nama@domain.com)");
      return false;
    }
    
    // Additional checks
    const parts = emailValue.split('@');
    if (parts.length !== 2) {
      setEmailError("Email harus mengandung satu simbol @");
      return false;
    }
    
    const [localPart, domain] = parts;
    if (localPart.length === 0 || domain.length === 0) {
      setEmailError("Email tidak boleh kosong sebelum atau sesudah @");
      return false;
    }
    
    if (!domain.includes('.')) {
      setEmailError("Domain email harus mengandung titik (contoh: gmail.com)");
      return false;
    }
    
    setEmailError("");
    return true;
  };

  // Auto-generate full name when first name or last name changes
  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFirstName(value);
    setFullName(`${value} ${lastName}`.trim());
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLastName(value);
    setFullName(`${firstName} ${value}`.trim());
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear previous errors immediately
    setEmailError("");
    setError(""); // Clear main error message too
    
    // Real-time validation with debounce effect
    if (value.length > 0) {
      setTimeout(() => {
        validateEmail(value);
      }, 500);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setPhoto(file);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const nextStep = () => {
    // Validation for step 1
    if (step === 1) {
      if (!firstName || !lastName || !username || !email) {
        setError("Mohon lengkapi semua field yang wajib diisi");
        return;
      }
      
      // Validate email
      if (!validateEmail(email)) {
        setError("Mohon perbaiki kesalahan pada email");
        return;
      }
    }

    // Validation for step 2
    if (step === 2) {
      if (!password || !confirmPassword) {
        setError("Mohon isi password dan konfirmasi password");
        return;
      }
      if (password.length < 8) {
        setError("Password minimal 8 karakter");
        return;
      }
      if (password !== confirmPassword) {
        setError("Password dan konfirmasi password tidak cocok");
        return;
      }
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /[0-9]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecial) {
        setError(
          "Password harus mengandung huruf besar, huruf kecil, angka, dan karakter spesial"
        );
        return;
      }
    }

    setError("");
    setEmailError("");
    setStep(step + 1);
  };

  const prevStep = () => {
    setError("");
    setEmailError("");
    setStep(step - 1);
  };

  const { signUpWithEmail, signInWithGoogle, signOut, loading: authLoading } = useAuth();

  // Handle Google registration
  const handleGoogleRegister = async () => {
    try {
      setError("");
      await signInWithGoogle();
      // Navigation will be handled by AuthCallback component
    } catch (err: any) {
      setError("Gagal mendaftar dengan Google. Silakan coba lagi.");
      logger.error("Google register error:", err);
    }
  };

  // Handle email registration - hanya dipanggil di step 3
  const handleRegister = async () => {
    setError("");
    setLoading(true);



    try {
      // Prepare user metadata
      const metadata = {
        firstName,
        lastName,
        fullName,
        username,
      };

      const result = await signUpWithEmail(email, password, metadata);

      if (result.success) {
        localStorage.setItem('registrationSuccess', `Selamat datang ${firstName}! Registrasi berhasil.`);
        
        if (photo) {
          setTimeout(() => {
            uploadProfilePhoto(photo as File).then(async (photoUrl) => {
              await updateUserProfile({ photo_url: photoUrl });
            }).catch(() => {});
          }, 100);
        }
        
        // Logout user setelah registration agar harus login manual
        await signOut();
        
        onRegisterSuccess?.();
        navigate('/login?success=true');
        return;
        
        // PREVENT LOADING STATE UPDATE - langsung redirect
        // Jangan update setLoading(false) agar tidak re-render component
        console.log("� IMMEDIATE redirect - no component update");
        
        // Call callback if provided
        onRegisterSuccess?.();
        
        // EXIT - NO MORE REDIRECT
        return;
      } else {

        
        // Handle specific error cases
        let errorMessage = "Registrasi gagal. Coba lagi.";
        if (result.error) {
          if (result.error.includes("User already registered") || result.error.includes("already registered")) {
            errorMessage = "Email sudah terdaftar. Silakan login atau gunakan email lain.";
          } else if (result.error.includes("Invalid email")) {
            errorMessage = "Format email tidak valid. Silakan periksa email Anda.";
          } else if (result.error.includes("Password")) {
            errorMessage = "Password tidak memenuhi syarat. Minimal 8 karakter.";
          } else {
            errorMessage = result.error;
          }
        }
        
        // Set error for UI with smooth scroll
  console.error("Sign-up error:", result.error);
  try { localStorage.setItem('registrationError', errorMessage); } catch {}
  setError(errorMessage);
  setLoading(false);
        
        // Scroll to error message after a short delay
        setTimeout(() => {
          const errorElement = document.querySelector('[data-error-message]') as HTMLElement | null;
          if (errorElement && errorElement.offsetParent !== null) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 120);
      }
    } catch (err: any) {
      
      // Handle specific exception cases
      let errorMessage = "Terjadi kesalahan saat registrasi. Silakan coba lagi.";
        if (err?.message) {
        if (err.message.includes("User already registered") || err.message.includes("already registered")) {
          errorMessage = "Email sudah terdaftar. Silakan login atau gunakan email lain.";
        } else if (err.message.includes("Invalid email")) {
          errorMessage = "Format email tidak valid. Silakan periksa email Anda.";
        } else if (err.message.includes("Password")) {
          errorMessage = "Password tidak memenuhi syarat. Minimal 6 karakter.";
        } else if (err.message.includes("Network") || err.message.includes("fetch")) {
          errorMessage = "Masalah koneksi internet. Silakan coba lagi.";
        } else {
          errorMessage = err.message;
        }
      }
      
      // Set error for UI with smooth scroll
  console.error("Sign-up error (exception):", err);
  try { localStorage.setItem('registrationError', errorMessage); } catch {}
  setError(errorMessage);
  setLoading(false); // Only set loading false on error
      
      // Scroll to error message after a short delay
      setTimeout(() => {
        const errorElement = document.querySelector('[data-error-message]') as HTMLElement | null;
        if (errorElement && errorElement.offsetParent !== null) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);
    }
    // NO FINALLY BLOCK - success case returns immediately
  };

  // Handle success modal close and navigation
  const handleSuccessClose = () => {

    setShowSuccessModal(false);
    window.location.replace("/login");
  };

  // Direct login navigation
  const handleLoginClick = () => {

    window.location.replace("/login");
  };

  // Prevent form submission pada step 1 dan 2
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const StepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((stepNumber) => (
          <React.Fragment key={stepNumber}>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                stepNumber <= step
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-slate-700 text-slate-400 border border-slate-600"
              }`}
            >
              {stepNumber}
            </div>
            {stepNumber < 3 && (
              <div
                className={`w-8 h-1 rounded transition-all ${
                  stepNumber < step ? "bg-blue-600" : "bg-slate-700"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  // Success Modal Component
  const SuccessModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all duration-300 scale-100 opacity-100 border border-slate-700">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Success Message */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white mb-2">
            Registrasi Berhasil!
          </h3>
          <p className="text-slate-300">
            Selamat! Akun Anda telah berhasil dibuat. Silakan login untuk
            melanjutkan.
          </p>
        </div>

        {/* User Info Preview */}
        <div className="bg-slate-700 rounded-xl p-4 mb-6 border border-slate-600">
          <div className="flex items-center space-x-3">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-400 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-semibold text-lg">
                  {firstName.charAt(0)}
                  {lastName.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold text-white">
                {firstName} {lastName}
              </p>
              <p className="text-sm text-blue-300">@{username}</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSuccessClose}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
        >
          Lanjut ke Login
        </button>
      </div>
    </div>
  );



  return (
    <>
      {/* Dark background with solid color */}
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-8">
        {/* Back Button */}
        <Link
          to="/"
          className="absolute top-6 left-6 inline-flex items-center px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Kembali
        </Link>

        <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-blue-400 mb-2">Buat Akun</h2>
            <p className="text-slate-300 text-sm">
              {step === 1
                ? "Daftar untuk memulai perjalanan Anda"
                : `Step ${step} dari 3`}
            </p>
          </div>

          <StepIndicator />

          {/* Sticky Error (high visibility, single source) */}
          {error && (
            <div
              data-error-message
              aria-live="assertive"
              className="sticky top-0 z-20 mb-4 p-4 rounded-md bg-red-600 text-white font-semibold shadow-lg border border-red-400"
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">⚠️</div>
                <div className="flex-1">{error}</div>
                <button
                  type="button"
                  aria-label="Tutup notifikasi"
                  onClick={() => setError("")}
                  className="ml-2 -mt-1 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-red-700/40 focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Nama Depan *
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={handleFirstNameChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-white placeholder-slate-400"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Nama Belakang *
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={handleLastNameChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-white placeholder-slate-400"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-600 border border-slate-600 rounded-lg text-slate-300 transition-all duration-200 outline-none cursor-not-allowed"
                    placeholder="Otomatis terisi dari nama depan dan belakang"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-white placeholder-slate-400"
                    placeholder="johndoe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    className={`w-full px-4 py-3 bg-slate-700 border rounded-lg focus:ring-2 transition-all duration-200 outline-none text-white placeholder-slate-400 ${
                      emailError 
                        ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                        : email && !emailError 
                        ? "border-green-500 focus:ring-green-500 focus:border-green-500"
                        : "border-slate-600 focus:ring-blue-500 focus:border-blue-500"
                    }`}
                    placeholder="john@example.com"
                    required
                  />
                  {emailError && (
                    <p className="mt-2 text-sm text-red-400 flex items-center">
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {emailError}
                    </p>
                  )}
                  {email && !emailError && (
                    <p className="mt-2 text-sm text-green-400 flex items-center">
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Email valid
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Password */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-white placeholder-slate-400"
                    placeholder="Minimal 8 karakter"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Konfirmasi Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-white placeholder-slate-400"
                    placeholder="Ulangi password"
                    required
                  />
                </div>

                {/* Password strength indicator */}
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="font-medium">Password harus mengandung:</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span
                      className={
                        password.length >= 8
                          ? "text-green-400"
                          : "text-slate-500"
                      }
                    >
                      ✓ Min. 8 karakter
                    </span>
                    <span
                      className={
                        /[A-Z]/.test(password)
                          ? "text-green-400"
                          : "text-slate-500"
                      }
                    >
                      ✓ Huruf besar
                    </span>
                    <span
                      className={
                        /[a-z]/.test(password)
                          ? "text-green-400"
                          : "text-slate-500"
                      }
                    >
                      ✓ Huruf kecil
                    </span>
                    <span
                      className={
                        /[0-9]/.test(password)
                          ? "text-green-400"
                          : "text-slate-500"
                      }
                    >
                      ✓ Angka
                    </span>
                    <span
                      className={
                        /[^A-Za-z0-9]/.test(password)
                          ? "text-green-400"
                          : "text-slate-500"
                      }
                    >
                      ✓ Karakter spesial (!@#$%...)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Photo & Review */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Foto Profil (Opsional)
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-16 h-16 rounded-full object-cover border-4 border-blue-400 shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-slate-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all duration-200"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        PNG, JPG hingga 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Review */}
                <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                  <h4 className="font-medium text-white mb-3">
                    Review Data Anda:
                  </h4>
                  <div className="text-sm text-slate-300 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Nama:</span>
                      <span>
                        {firstName} {lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Username:</span>
                      <span className="text-blue-300">@{username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Email:</span>
                      <span>{email}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}


            
            {/* Removed duplicate error near buttons to avoid repetition */}

            {/* Navigation Buttons */}
            <div className="flex space-x-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 py-3 px-4 border border-slate-600 rounded-lg font-medium text-slate-300 hover:bg-slate-700 hover:border-slate-500 transition-all duration-200"
                >
                  Sebelumnya
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  Lanjutkan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={loading || authLoading}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                    loading || authLoading
                      ? "bg-slate-600 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 transform hover:scale-105 shadow-lg"
                  }`}
                >
                  {loading || authLoading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Mendaftar...
                    </div>
                  ) : (
                    "Daftar dengan Email"
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Removed lower fixed error banner to avoid duplicate messages */}

          {/* Google Register Button - Only show on step 1 */}
          {step === 1 && isSupabaseConfigured() && (
            <div className="mt-6">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-slate-400">
                    atau
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={loading || authLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-slate-600 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {loading || authLoading
                  ? "Memproses..."
                  : "Daftar dengan Google"}
              </button>
            </div>
          )}

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Sudah punya akun?{" "}
              <button
                onClick={handleLoginClick}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-200"
              >
                Login di sini
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && <SuccessModal />}
    </>
  );
};

export default RegisterPage;
