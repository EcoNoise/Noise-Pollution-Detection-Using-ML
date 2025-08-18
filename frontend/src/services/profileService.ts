// File: src/services/profileService.ts
// Supabase removed: using localStorage-backed mock profile

// Helper: get current user id from localStorage
const getCurrentUserId = (): string | null => {
  return localStorage.getItem('userId');
};

// Shape of stored profile
interface LocalUserProfile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  photo?: string;
  date_joined?: string;
  last_login?: string;
  is_active?: boolean;
}

const PROFILE_KEY = 'mock_profile';

const loadProfile = (): LocalUserProfile | null => {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveProfile = (profile: LocalUserProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

/**
 * Mengambil data profil pengguna yang sedang login (mock).
 */
export const getUserProfile = async (): Promise<any> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  // Try load from storage
  let profile = loadProfile();
  if (!profile) {
    // Initialize default profile from basic info
    const email = localStorage.getItem('userEmail') || '';
    const username = localStorage.getItem('username') || 'user';
    const first_name = localStorage.getItem('firstName') || '';
    const last_name = localStorage.getItem('lastName') || '';

    profile = {
      id: userId,
      username,
      first_name,
      last_name,
      email,
      date_joined: new Date().toISOString(),
      last_login: new Date().toISOString(),
      is_active: true,
      photo: undefined,
    };
    saveProfile(profile);
  }
  return profile;
};

/**
 * Memperbarui data profil pengguna (mock).
 */
export const updateUserProfile = async (profileData: any): Promise<any> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const current = (await getUserProfile()) as LocalUserProfile;
  const updated: LocalUserProfile = {
    ...current,
    ...profileData,
    id: userId,
    last_login: new Date().toISOString(),
  };
  saveProfile(updated);

  // Keep simple mirrors in localStorage for other parts of app
  if (updated.email) localStorage.setItem('userEmail', updated.email);
  if (updated.username) localStorage.setItem('username', updated.username);
  if (updated.first_name) localStorage.setItem('firstName', updated.first_name);
  if (updated.last_name) localStorage.setItem('lastName', updated.last_name);

  return updated;
};
