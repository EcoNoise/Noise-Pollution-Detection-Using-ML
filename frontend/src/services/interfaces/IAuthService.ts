// Backend-agnostic Authentication Service Interface
export interface User {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  data: {
    user: User;
    session?: any;
  };
  error?: any;
}

export interface SignUpData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  first_name: string;
  last_name: string;
}

export interface SignInData {
  loginField: string;
  password: string;
}

export interface IAuthService {
  signUp(email: string, password: string, userData: any): Promise<AuthResponse>;
  signIn(email: string, password: string): Promise<AuthResponse>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): Promise<boolean>;
}