import React, { useState } from 'react';
import { login } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Mail, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [loginField, setLoginField] = useState(''); // Bisa username atau email
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    // Fungsi untuk mendeteksi apakah input adalah email
    const isEmailFormat = (input: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Kirim loginField (bisa username atau email) ke service
            const response = await login(loginField, password);
            console.log('Login berhasil:', response.data);
            
            localStorage.setItem('accessToken', response.data.access);
            localStorage.setItem('refreshToken', response.data.refresh);
            
            onLoginSuccess();
            navigate('/home'); 

        } catch (err: any) {
            setError(err.response?.data?.error || 'Login gagal. Periksa kredensial Anda.');
            console.error(err);
        } finally {
            setLoading(false);
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
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Username/Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Username atau Email *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    {isEmailFormat(loginField) ? (
                                        <Mail className="h-5 w-5 text-slate-400" />
                                    ) : (
                                        <User className="h-5 w-5 text-slate-400" />
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={loginField}
                                    onChange={(e) => setLoginField(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-slate-600 text-white placeholder-slate-400"
                                    placeholder="Masukkan username atau email"
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
                                    type={showPassword ? 'text' : 'password'}
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
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 ${
                                loading
                                    ? 'bg-blue-500 cursor-not-allowed opacity-70'
                                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
                            } focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-700`}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Sedang masuk...
                                </div>
                            ) : (
                                'Masuk'
                            )}
                        </button>

                        {/* Forgot Password Link */}
                        <div className="text-center">
                            <Link
                                to="/forgot-password"
                                className="text-sm text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors"
                            >
                                Lupa password?
                            </Link>
                        </div>
                    </form>

                    {/* Register Link */}
                    <div className="mt-6 pt-6 border-t border-slate-600 text-center">
                        <p className="text-slate-400">
                            Belum punya akun?{' '}
                            <Link
                                to="/register"
                                className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors"
                            >
                                Daftar di sini
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-sm text-slate-400">
                    <p>Dengan masuk, Anda menyetujui syarat dan ketentuan kami</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;