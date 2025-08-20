-- Update handle_new_user function for new profiles schema
-- Migration: 20250121000001_update_handle_new_user_function.sql

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
  user_email TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
BEGIN
  -- Get user email (required field)
  user_email := COALESCE(NEW.email, '');
  
  -- Get user names from metadata or defaults
  user_first_name := COALESCE(
    NEW.raw_user_meta_data->>'firstName',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  
  user_last_name := COALESCE(
    NEW.raw_user_meta_data->>'lastName',
    NEW.raw_user_meta_data->>'last_name',
    ''
  );
  
  -- Generate base username from metadata or email
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(user_email, '@', 1),
    'user'
  );
  
  -- Ensure username is not empty and clean it
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;
  
  -- Remove special characters and make lowercase
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'));
  
  -- Ensure username is unique
  final_username := base_username;
  
  -- Check if username already exists and increment counter
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter;
    
    -- Prevent infinite loop
    IF counter > 1000 THEN
      final_username := base_username || '_' || substring(NEW.id::text from 1 for 8);
      EXIT;
    END IF;
  END LOOP;
  
  -- Insert profile with all required fields
  INSERT INTO public.profiles (
    id,
    username,
    first_name,
    last_name,
    email,
    photo_url,
    status_aktif,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    final_username,
    user_first_name,
    user_last_name,
    user_email,
    NEW.raw_user_meta_data->>'avatar_url', -- From OAuth providers
    true, -- Default active status
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth signup
    RAISE WARNING 'Error in handle_new_user: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    
    -- Try minimal insert as fallback
    BEGIN
      INSERT INTO public.profiles (id, username, email, status_aktif)
      VALUES (
        NEW.id,
        'user_' || substring(NEW.id::text from 1 for 8),
        COALESCE(NEW.email, ''),
        true
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Fallback insert also failed: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

SELECT 'handle_new_user function updated successfully' as status;