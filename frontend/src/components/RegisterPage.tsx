import React, { useState } from 'react';
import { register } from '../services/authService';
import { useNavigate } from 'react-router-dom';

interface RegisterPageProps {
    onRegisterSuccess?: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    
    // Individual state for each field
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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
                setError('Mohon lengkapi semua field yang wajib diisi');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setError('Format email tidak valid');
                return;
            }
        }
        
        // Validation for step 2
        if (step === 2) {
            if (!password || !confirmPassword) {
                setError('Mohon isi password dan konfirmasi password');
                return;
            }
            if (password.length < 8) {
                setError('Password minimal 8 karakter');
                return;
            }
            if (password !== confirmPassword) {
                setError('Password dan konfirmasi password tidak cocok');
                return;
            }
            const hasUpperCase = /[A-Z]/.test(password);
            const hasLowerCase = /[a-z]/.test(password);
            const hasNumbers = /[0-9]/.test(password);
            
            if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
                setError('Password harus mengandung huruf besar, huruf kecil, dan angka');
                return;
            }
        }
        
        setError('');
        setStep(step + 1);
    };

    const prevStep = () => {
        setError('');
        setStep(step - 1);
    };

    // Handle registration - hanya dipanggil di step 3
    const handleRegister = async () => {
        setError('');
        setLoading(true);

        const formData = new FormData();
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);
        formData.append('fullName', fullName);
        formData.append('username', username);
        formData.append('password', password);
        if (email) formData.append('email', email);
        if (photo) formData.append('profile.photo', photo);

        try {
            const response = await register(formData);
            console.log('Registrasi berhasil:', response.data);

            // Show success modal
            setShowSuccessModal(true);
            
            // Call onRegisterSuccess if provided
            if (onRegisterSuccess) {
                onRegisterSuccess();
            }

        } catch (err: any) {
            const responseData = err.response?.data;
            
            if (responseData && typeof responseData === 'object') {
                const errorMessages = Object.values(responseData).flat().join(' ');
                setError(errorMessages || 'Registrasi gagal. Coba lagi.');
            } else {
                setError('Terjadi galat pada server. Silakan coba lagi nanti.');
                console.error("Server returned non-JSON error:", responseData);
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Handle success modal close and navigation
    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        navigate('/login');
    };

    // Direct login navigation
    const handleLoginClick = () => {
        navigate('/login');
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
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                            stepNumber <= step 
                                ? 'bg-blue-600 text-white shadow-lg' 
                                : 'bg-slate-700 text-slate-400 border border-slate-600'
                        }`}>
                            {stepNumber}
                        </div>
                        {stepNumber < 3 && (
                            <div className={`w-8 h-1 rounded transition-all ${
                                stepNumber < step 
                                    ? 'bg-blue-600' 
                                    : 'bg-slate-700'
                            }`} />
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
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                
                {/* Success Message */}
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">Registrasi Berhasil!</h3>
                    <p className="text-slate-300">
                        Selamat! Akun Anda telah berhasil dibuat. Silakan login untuk melanjutkan.
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
                                    {firstName.charAt(0)}{lastName.charAt(0)}
                                </span>
                            </div>
                        )}
                        <div>
                            <p className="font-semibold text-white">{firstName} {lastName}</p>
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
                <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-blue-400 mb-2">Buat Akun</h2>
                        <p className="text-slate-300 text-sm">Step {step} dari 3 - Daftar untuk memulai perjalanan Anda</p>
                    </div>

                    <StepIndicator />

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
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-white placeholder-slate-400"
                                        placeholder="john@example.com"
                                        required
                                    />
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
                                        <span className={password.length >= 8 ? 'text-green-400' : 'text-slate-500'}>
                                            ✓ Min. 8 karakter
                                        </span>
                                        <span className={/[A-Z]/.test(password) ? 'text-green-400' : 'text-slate-500'}>
                                            ✓ Huruf besar
                                        </span>
                                        <span className={/[a-z]/.test(password) ? 'text-green-400' : 'text-slate-500'}>
                                            ✓ Huruf kecil
                                        </span>
                                        <span className={/[0-9]/.test(password) ? 'text-green-400' : 'text-slate-500'}>
                                            ✓ Angka
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
                                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
                                            <p className="text-xs text-slate-400 mt-1">PNG, JPG hingga 5MB</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Review */}
                                <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                                    <h4 className="font-medium text-white mb-3">Review Data Anda:</h4>
                                    <div className="text-sm text-slate-300 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="font-medium">Nama:</span> 
                                            <span>{firstName} {lastName}</span>
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

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-900 border border-red-600 rounded-lg p-4">
                                <div className="flex">
                                    <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="ml-3 text-sm text-red-300">{error}</p>
                                </div>
                            </div>
                        )}

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
                                    disabled={loading}
                                    className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                                        loading
                                            ? 'bg-slate-600 cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700 transform hover:scale-105 shadow-lg'
                                    }`}
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Mendaftar...
                                        </div>
                                    ) : (
                                        'Daftar Sekarang'
                                    )}
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-400">
                            Sudah punya akun?{' '}
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