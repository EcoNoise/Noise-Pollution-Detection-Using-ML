// File: src/services/profileService.ts

// Tentukan alamat base URL backend Anda
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const getAuthToken = (): string | null => {
    return localStorage.getItem('accessToken');
};

const getAuthHeaders = (): HeadersInit => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Token otentikasi tidak ditemukan. Silakan login kembali.');
    }
    return { 'Authorization': `Bearer ${token}` };
};

/**
 * Mengambil data profil pengguna yang sedang login.
 */
export const getUserProfile = async () => {
    // --- PERBAIKAN ---
    // Gunakan URL lengkap ke backend
    const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        method: 'GET',
        headers: { 
            ...getAuthHeaders(),
            'Content-Type': 'application/json' 
        },
    });

    if (!response.ok) {
        throw new Error('Gagal memuat profil. Pastikan Anda sudah login.');
    }
    return response.json();
};

/**
 * Memperbarui data profil pengguna.
 */
export const updateUserProfile = async (formData: FormData) => {
    // --- PERBAIKAN ---
    // Gunakan URL lengkap ke backend
    const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        method: 'PUT',
        headers: getAuthHeaders(), // Untuk FormData, jangan set Content-Type
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Gagal menyimpan perubahan.' }));
        throw new Error(errorData.detail || 'Gagal menyimpan perubahan');
    }
    return response.json();
};