import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Storage configuration (centralized bucket names)
export const storageConfig = {
  profileBucket: process.env.REACT_APP_SUPABASE_PROFILE_BUCKET || 'profile-photos',
};

// Export configuration for debugging purposes
export const supabaseConfig = {
  url: supabaseUrl,
  // Don't expose the actual key in logs
  hasKey: !!supabaseKey,
  isConfigured: !!(supabaseUrl && supabaseKey),
};

// Helper function to check Supabase connection
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.warn('Supabase connection test failed:', error.message);
      return false;
    }
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
};