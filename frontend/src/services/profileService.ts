// File: src/services/profileService.ts
import APIInterceptor from "../utils/apiInterceptor";

// Tentukan alamat base URL backend Anda
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

// Get API interceptor instance
const apiInterceptor = APIInterceptor.getInstance();

/**
 * Mengambil data profil pengguna yang sedang login.
 */
export const getUserProfile = async (): Promise<any> => {
  try {
    const response = await apiInterceptor.fetch(`${API_BASE_URL}/api/auth/me/`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

/**
 * Memperbarui data profil pengguna.
 */
export const updateUserProfile = async (formData: FormData): Promise<any> => {
  try {
    const response = await apiInterceptor.fetch(
      `${API_BASE_URL}/api/auth/me/`,
      {
        method: "PUT",
        body: formData, // FormData tidak perlu Content-Type header
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};
