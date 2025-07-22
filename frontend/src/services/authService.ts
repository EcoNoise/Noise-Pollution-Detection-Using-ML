import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

// Fungsi untuk registrasi
export const register = (formData: FormData) => {
    return axios.post(`${API_URL}/auth/register/`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// Fungsi untuk login
export const login = (loginField: string, password: string) => {
    return axios.post(`${API_URL}/auth/login/`, {
        username: loginField, // Backend akan menerima ini sebagai username atau email
        password,
    });
};