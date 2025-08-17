-- Add email column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on email for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Update existing profiles with email from auth.users
UPDATE profiles 
SET email = au.email 
FROM auth.users au 
WHERE profiles.id = au.id AND profiles.email IS NULL;