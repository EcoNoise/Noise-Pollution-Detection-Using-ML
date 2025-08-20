import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, User, Lock, Mail, ArrowLeft } from "lucide-react";
import { logger } from "../config/appConfig";
import { useAuth, isSupabaseConfigured } from "../contexts/AuthContext";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [loginField, setLoginField] = useState(""); // Bisa username atau email
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Fungsi untuk mendeteksi apakah input adalah email
  const isEmailFormat = (input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  const { signInWithEmail, signInWithGoogle, loading: authLoading } = useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Check if input is email format, if not show error
      if (!isEmailFormat(loginField)) {
        setError("Silakan masukkan alamat email yang valid.");
        return;
      }

      const result = await signInWithEmail(loginField, password);

      if (result.success) {
        logger.info("Login berhasil dengan email:", loginField);
        onLoginSuccess();
        navigate("/home");
      } else {
        setError(
          result.error || "Login gagal. Periksa email dan password Anda."
        );
      }
    } catch (err: any) {
      setError("Terjadi kesalahan saat login. Silakan coba lagi.");
      logger.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      await signInWithGoogle();
      // Navigation will be handled by AuthCallback component
    } catch (err: any) {
      setError("Gagal login dengan Google. Silakan coba lagi.");
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
          {/* Google Login Button */}
          {isSupabaseConfigured() && (
            <div className="mb-6">
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

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-700 text-slate-400">atau</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={loginField}
                  onChange={(e) => setLoginField(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-slate-600 text-white placeholder-slate-400"
                  placeholder="Masukkan alamat email"
                  required
                />
              </div>
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-slate-600 text-white placeholder-slate-400"
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
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
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
                "Masuk dengan Email"
              )}
            </button>
          </form>

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
