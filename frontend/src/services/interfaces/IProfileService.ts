// Backend-agnostic Profile Service Interface
export interface UserProfile {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  photo?: string;
  date_joined?: string;
  last_login?: string;
  is_active?: boolean;
}

export interface IProfileService {
  getUserProfile(): Promise<UserProfile>;
  updateUserProfile(data: FormData | Partial<UserProfile>): Promise<UserProfile>;
}