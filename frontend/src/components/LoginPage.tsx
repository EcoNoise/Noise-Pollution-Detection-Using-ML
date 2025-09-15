import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, User, Lock, Mail, ArrowLeft } from "lucide-react";
import { logger } from "../config/appConfig";
import { useAuth, isSupabaseConfigured } from "../contexts/AuthContext";
import { supabase } from "../config/supabaseConfig";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [loginField, setLoginField] = useState(""); // Bisa username atau email
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  
  // Use state that persists and is not affected by auth re-renders
  const [displayError, setDisplayError] = useState("");
  const [errorTimestamp, setErrorTimestamp] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Helper to set error that persists across re-renders
  const setErrorMessage = (message: string) => {
    setDisplayError(message);
    setErrorTimestamp(Date.now()); 
    // Backup to localStorage to survive any re-renders
    localStorage.setItem('loginError', message);
    localStorage.setItem('loginErrorTime', Date.now().toString());
    console.log("🔥 Error set with timestamp and localStorage backup:", message, Date.now());
  };
  
  // Helper to clear error
  const clearErrorMessage = () => {
    setDisplayError("");
    setErrorTimestamp(0);
    localStorage.removeItem('loginError');
    localStorage.removeItem('loginErrorTime');
    console.log("🧹 Error cleared from state and localStorage");
  };
  
  // Restore error from localStorage if it exists and is recent (within last 10 seconds)
  React.useEffect(() => {
    const storedError = localStorage.getItem('loginError');
    const storedTime = localStorage.getItem('loginErrorTime');
    
    if (storedError && storedTime) {
      const timeDiff = Date.now() - parseInt(storedTime);
      if (timeDiff < 10000) { // Less than 10 seconds old
        setDisplayError(storedError);
        setErrorTimestamp(parseInt(storedTime));
        console.log("🔄 Error restored from localStorage:", storedError);
      } else {
        // Clean old error
        localStorage.removeItem('loginError');
        localStorage.removeItem('loginErrorTime');
      }
    }
    
    // Check for registration success message
    const registrationSuccess = localStorage.getItem('registrationSuccess');
    if (registrationSuccess) {
      setSuccessMessage(registrationSuccess);
      localStorage.removeItem('registrationSuccess'); // Clear after showing
      console.log("✅ Registration success message loaded:", registrationSuccess);
      
      // Auto hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    }
  }, []); // Only run on mount

  // Debug error state changes
  React.useEffect(() => {
    console.log("🔍 Display error value:", displayError);
  }, [displayError, errorTimestamp]);
  
  // Monitor and restore error if it gets reset
  React.useEffect(() => {
    const interval = setInterval(() => {
      const storedError = localStorage.getItem('loginError');
      const storedTime = localStorage.getItem('loginErrorTime');
      
      if (storedError && storedTime && !displayError) {
        const timeDiff = Date.now() - parseInt(storedTime);
        if (timeDiff < 10000) { // Less than 10 seconds old
          console.log("🚨 ERROR WAS RESET! Restoring from localStorage:", storedError);
          setDisplayError(storedError);
          setErrorTimestamp(parseInt(storedTime));
        }
      }
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, [displayError]);

  // Email validation function
  const validateEmail = (emailValue: string) => {
    if (!emailValue) {
      setEmailError("Email wajib diisi");
      return false;
    }
    
    // Comprehensive email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(emailValue)) {
      setEmailError("Format email tidak valid (contoh: nama@domain.com)");
      return false;
    }
    
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

  // Password validation function
  const validatePassword = (passwordValue: string) => {
    if (!passwordValue) {
      setPasswordError("Password wajib diisi");
      return false;
    }
    
    if (passwordValue.length < 8) {
      setPasswordError("Password minimal 8 karakter");
      return false;
    }
    
    setPasswordError("");
    return true;
  };

  // Fungsi untuk mendeteksi apakah input adalah email
  const isEmailFormat = (input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  const { signInWithEmail, signInWithGoogle, loading: authLoading } = useAuth();

  // Email change handler with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoginField(value);
    setEmailError("");
    
    // Clear login error when user starts typing
    clearErrorMessage();
    
    // Only validate email format if it looks like an email; allow username input
    if (value.length > 0 && isEmailFormat(value)) {
      setTimeout(() => {
        validateEmail(value);
      }, 500);
    } else {
      setEmailError("");
    }
  };

  // Password change handler with validation
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError("");
    
    // Clear login error when user starts typing
    clearErrorMessage();
    
    if (value.length > 0) {
      setTimeout(() => {
        validatePassword(value);
      }, 500);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
  const identifier = loginField.trim();
  console.log("🔍 Login attempt started", { identifier, password: password ? "***" : "empty" });
    
    // Clear all previous errors
    clearErrorMessage();
  setEmailError("");
  setPasswordError("");
    
    // Validate identifier and password before submitting
  const inputIsEmail = isEmailFormat(identifier);
  const identifierTypeLabel = inputIsEmail ? "Email" : "Username";
  const isEmailValid = inputIsEmail ? validateEmail(identifier) : true; // skip email validation for username
    const isPasswordValid = validatePassword(password);
    
    console.log("🔍 Validation results", { isEmailValid, isPasswordValid });
    
    if (!isEmailValid) {
      console.log("❌ Email validation failed");
      setErrorMessage("❌ Format email tidak valid!");
      return;
    }
    
    if (!isPasswordValid) {
      console.log("❌ Password validation failed");
      setErrorMessage("❌ Password minimal 8 karakter!");
      return;
    }

    console.log("✅ Validation passed, making API call");
    setLoading(true);

    try {
      // If input is username, resolve to email first
      let emailForAuth = identifier;
      if (!inputIsEmail) {
        const { data, error } = await supabase
          .from("profiles")
          .select("email, status_aktif")
          // Case-insensitive exact match for username
          .ilike("username", identifier)
          .single();

        if (error || !data) {
          setEmailError("Username tidak ditemukan!");
          setErrorMessage("❌ Username tidak ditemukan!");
          // Focus identifier field for quick correction
          setTimeout(() => identifierRef.current?.focus(), 0);
          setLoading(false);
          return;
        }
        if (data.status_aktif === false) {
          setErrorMessage("❌ Akun tidak aktif.");
          setLoading(false);
          return;
        }
        emailForAuth = data.email;
      }

      const result = await signInWithEmail(emailForAuth, password);
      
      console.log("🔍 API Response:", result);

      if (result.success) {
        console.log("✅ Login successful");
        logger.info("Login berhasil dengan identifier:", identifier);
        onLoginSuccess();
        navigate("/home");
      } else {
        console.log("❌ Login failed, processing error");
        
        // Log the exact error for debugging
        console.log("Login Error Details:", {
          error: result.error,
          errorType: typeof result.error,
          errorString: String(result.error)
        });
        
        // FORCE set error - ensure something is always shown
  let errorMessage = "❌ Login gagal!";
        
        // Handle specific error cases with more detailed messages
        const errorMsg = String(result.error || "").toLowerCase();
        
        // Common Supabase authentication errors
    if (errorMsg.includes("invalid login credentials") || 
            errorMsg.includes("invalid_credentials") ||
            errorMsg.includes("wrong password") ||
            errorMsg.includes("incorrect password") ||
            errorMsg.includes("authentication failed") ||
            errorMsg.includes("invalid email or password") ||
            errorMsg.includes("invalid credentials") ||
            errorMsg.includes("bad email") ||
            errorMsg.includes("bad password")) {
          // Try to disambiguate: check whether identifier exists
          if (inputIsEmail) {
            try {
              const { data } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", identifier)
                .single();
              if (data) {
                errorMessage = "❌ Password salah!";
                setPasswordError("Password salah!");
                setTimeout(() => passwordRef.current?.focus(), 0);
              } else {
                errorMessage = "❌ Email tidak terdaftar!";
                setEmailError("Email tidak terdaftar!");
                setTimeout(() => identifierRef.current?.focus(), 0);
              }
            } catch {
              // If cannot determine due to RLS or other issues, default to email not registered
              errorMessage = "❌ Email tidak terdaftar!";
              setEmailError("Email tidak terdaftar!");
              setTimeout(() => identifierRef.current?.focus(), 0);
            }
          } else {
            // Username path: we already looked it up successfully above, so it's a wrong password
            errorMessage = "❌ Password salah!";
            setPasswordError("Password salah!");
            setTimeout(() => passwordRef.current?.focus(), 0);
          }
        } else if (errorMsg.includes("user not found") || 
                   errorMsg.includes("email not found") ||
                   errorMsg.includes("no user found") ||
                   errorMsg.includes("user does not exist") ||
                   errorMsg.includes("email not registered") ||
                   errorMsg.includes("account not found")) {
          errorMessage = inputIsEmail ? "❌ Email tidak terdaftar!" : "❌ Username tidak ditemukan!";
        } else if (errorMsg.includes("email not confirmed") || 
                   errorMsg.includes("unconfirmed") ||
                   errorMsg.includes("confirmation required") ||
                   errorMsg.includes("confirm your email") ||
                   errorMsg.includes("email confirmation")) {
          errorMessage = "📧 Email belum dikonfirmasi!";
        } else if (errorMsg.includes("too many requests") || 
                   errorMsg.includes("rate limit") ||
                   errorMsg.includes("exceeded") ||
                   errorMsg.includes("retry after")) {
          errorMessage = "⏱️ Terlalu banyak percobaan. Coba lagi nanti!";
        } else if (errorMsg.includes("network") || 
                   errorMsg.includes("connection") ||
                   errorMsg.includes("timeout") ||
                   errorMsg.includes("fetch failed")) {
          errorMessage = "🌐 Masalah koneksi internet!";
        } else {
          // Default error for any other case
          if (result.error && result.error.length > 0) {
            errorMessage = `❌ ${result.error}`;
          } else {
            errorMessage = inputIsEmail ? "❌ Email atau password salah!" : "❌ Username atau password salah!";
          }
        }
        
        console.log("🔥 Setting error message:", errorMessage);
        
        // Set error using persistent method
        setErrorMessage(errorMessage);
        
        logger.error("Login failed with error:", result.error);
      }
    } catch (err: any) {
      console.log("❌ Catch block executed");
      
      // Log complete error for debugging
      console.log("Catch Block Error Details:", {
        error: err,
        message: err.message,
        name: err.name,
        stack: err.stack
      });
      
      logger.error("Login error:", err);
      
      let errorMessage = "❌ Login gagal!";
      const errorMsg = String(err.message || err || "").toLowerCase();
      
      if (errorMsg.includes("invalid login credentials") || 
          errorMsg.includes("invalid_credentials") ||
          errorMsg.includes("wrong password") ||
          errorMsg.includes("authentication failed")) {
        if (inputIsEmail) {
          try {
            const { data } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", identifier)
              .single();
            if (data) {
              errorMessage = "❌ Password salah!";
              setPasswordError("Password salah!");
              setTimeout(() => passwordRef.current?.focus(), 0);
            } else {
              errorMessage = "❌ Email tidak terdaftar!";
              setEmailError("Email tidak terdaftar!");
              setTimeout(() => identifierRef.current?.focus(), 0);
            }
          } catch {
            errorMessage = "❌ Email tidak terdaftar!";
            setEmailError("Email tidak terdaftar!");
            setTimeout(() => identifierRef.current?.focus(), 0);
          }
        } else {
          errorMessage = "❌ Password salah!";
          setPasswordError("Password salah!");
          setTimeout(() => passwordRef.current?.focus(), 0);
        }
      } else if (errorMsg.includes("user not found") || 
                 errorMsg.includes("email not found") ||
                 errorMsg.includes("user does not exist")) {
        errorMessage = inputIsEmail ? "❌ Email tidak terdaftar!" : "❌ Username tidak ditemukan!";
      } else if (errorMsg.includes("network") || 
                 errorMsg.includes("fetch") ||
                 errorMsg.includes("connection")) {
        errorMessage = "🌐 Masalah koneksi internet!";
      } else {
        if (err.message && err.message.length > 0) {
          errorMessage = `❌ ${err.message}`;
        } else {
          errorMessage = inputIsEmail ? "❌ Email tidak terdaftar atau password salah!" : "❌ Username tidak ditemukan atau password salah!";
        }
      }
      
      console.log("🔥 Setting catch error message:", errorMessage);
      
      // Set error using persistent method
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
      console.log("🔍 Finally block - current display error:", displayError);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      clearErrorMessage();
      await signInWithGoogle();
      // Navigation will be handled by AuthCallback component
    } catch (err: any) {
      setErrorMessage("Gagal login dengan Google. Silakan coba lagi.");
      logger.error("Google login error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
      {/* Back Button */}
      <Link
        to="/"
        className="absolute top-6 left-6 inline-flex items-center px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Kembali
      </Link>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Masuk Akun</h2>
          <p className="text-slate-400">Masuk ke akun Anda untuk melanjutkan</p>
        </div>

        {/* Login Form */}
        <div className="bg-slate-700 rounded-2xl shadow-xl p-8 border border-slate-600">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            {/* Identifier Field (Email or Username) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email atau Username *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  ref={identifierRef}
                  value={loginField}
                  onChange={handleEmailChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200 bg-slate-600 text-white placeholder-slate-400 ${
                    emailError 
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                      : loginField && !emailError 
                      ? "border-green-500 focus:ring-green-500 focus:border-green-500"
                      : "border-slate-600 focus:ring-blue-500 focus:border-blue-500"
                  }`}
                  placeholder="Masukkan email atau username"
                  required
                />
              </div>
              {emailError && (
                <p className="mt-2 text-sm text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {emailError}
                </p>
              )}
              {/* Show 'Email valid' only when input is actually an email format */}
              {loginField && !emailError && isEmailFormat(loginField) && (
                <p className="mt-2 text-sm text-green-400 flex items-center">
                  <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Email valid
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  ref={passwordRef}
                  value={password}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 transition-all duration-200 bg-slate-600 text-white placeholder-slate-400 ${
                    passwordError 
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                      : password && !passwordError 
                      ? "border-green-500 focus:ring-green-500 focus:border-green-500"
                      : "border-slate-600 focus:ring-blue-500 focus:border-blue-500"
                  }`}
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-2 text-sm text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {passwordError}
                </p>
              )}
              {password && !passwordError && password.length >= 8 && (
                <p className="mt-2 text-sm text-green-400 flex items-center">
                  <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Password valid
                </p>
              )}
            </div>

            {/* Success Message from Registration */}
            {successMessage && (
              <div className="bg-green-900 border border-green-600 rounded-lg p-4 animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="ml-3 text-sm text-green-300 font-medium">{successMessage}</p>
                  </div>
                  <button
                    onClick={() => setSuccessMessage("")}
                    className="flex-shrink-0 ml-4 text-green-400 hover:text-green-300 transition-colors"
                    aria-label="Close success"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {displayError && (
              <div className="bg-red-900 border border-red-600 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="ml-3 text-sm text-red-300 font-medium">{displayError}</p>
                  </div>
                  <button
                    onClick={clearErrorMessage}
                    className="flex-shrink-0 ml-4 text-red-400 hover:text-red-300 transition-colors"
                    aria-label="Close error"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}



            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || authLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 ${
                loading || authLoading
                  ? "bg-blue-500 cursor-not-allowed opacity-70"
                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5"
              } focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-700`}
            >
              {loading || authLoading ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
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
                  Sedang masuk...
                </div>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          {/* Google Login Button */}
          {isSupabaseConfigured() && (
            <div className="mt-6">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-700 text-slate-400">atau</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
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
                  : "Masuk dengan Google"}
              </button>
            </div>
          )}

          {/* Register Link */}
          <div className="mt-6 pt-6 border-t border-slate-600 text-center">
            <p className="text-slate-400">
              Belum punya akun?{" "}
              <Link
                to="/register"
                className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors"
              >
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
