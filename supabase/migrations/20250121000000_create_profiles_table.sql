-- Create profiles table with complete schema
-- Migration: 20250121000000_create_profiles_table.sql

-- Drop existing profiles table if exists (for clean migration)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table with all required fields
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE NOT NULL,
  photo_url TEXT,
  status_aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_status_aktif ON public.profiles(status_aktif);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy 2: Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Policy 4: Users cannot delete their own profile (soft delete via status_aktif)
CREATE POLICY "Users cannot delete profiles" ON public.profiles
  FOR DELETE USING (false);

-- Policy 5: Public read access for active profiles (for multi-tenant architecture)
-- This allows other users to see basic info of active users
CREATE POLICY "Public read access for active profiles" ON public.profiles
  FOR SELECT USING (status_aktif = true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on profile changes
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile photos
CREATE POLICY "Users can upload their own profile photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view profile photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can update their own profile photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

SELECT 'Profiles table created successfully with RLS policies and storage bucket' as status;