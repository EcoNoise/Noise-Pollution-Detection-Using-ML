import { apiService } from './api';

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

  // If signup successful, create profile record
  if (result.data.user) {
    const { supabase } = await import('../lib/supabase');
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: result.data.user.id,
        username: username,
        first_name: firstName,
        last_name: lastName
      });
    
    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't throw error here as user is already created
    }
  }
  
  return { data: result.data };
};

// Fungsi untuk login
export const login = async (loginField: string, password: string) => {
  const result = await apiService.signIn(loginField, password);
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return { data: result.data };
};
