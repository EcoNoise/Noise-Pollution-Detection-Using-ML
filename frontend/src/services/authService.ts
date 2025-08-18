import { apiService } from './api';
import SessionManager from '../utils/tokenManager';

// Fungsi untuk registrasi
export const register = async (formData: FormData) => {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const username = formData.get('username') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  // Note: photo handling will be implemented later for profile pictures

  const userData = {
    first_name: firstName,
    last_name: lastName,
    username: username,
    full_name: `${firstName} ${lastName}`.trim()
  };

  const result = await apiService.signUp(email, password, userData);
  
  if (result.error) {
    throw new Error(result.error.message);
  }

  // Store user info in localStorage for profile service compatibility
  if (result.data.user) {
    localStorage.setItem("userId", result.data.user.id);
    localStorage.setItem("userEmail", result.data.user.email || "");
    localStorage.setItem("username", username);
    localStorage.setItem("firstName", firstName);
    localStorage.setItem("lastName", lastName);
    
    // Set mock tokens for session management
    const sessionManager = SessionManager.getInstance();
    sessionManager.setTokens(`mock-token-${result.data.user.id}`, `refresh-token-${result.data.user.id}`);
  }
  
  return { data: result.data };
};

// Fungsi untuk login
export const login = async (loginField: string, password: string) => {
  const result = await apiService.signIn(loginField, password);
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  // Store user session data
  if (result.data.user) {
    localStorage.setItem("userId", result.data.user.id);
    localStorage.setItem("userEmail", result.data.user.email || "");
    if (result.data.user.username) {
      localStorage.setItem("username", result.data.user.username);
    }
    
    // Set mock tokens for session management
    const sessionManager = SessionManager.getInstance();
    sessionManager.setTokens(`mock-token-${result.data.user.id}`, `refresh-token-${result.data.user.id}`);
  }
  
  return { data: result.data };
};
