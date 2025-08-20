-- SQL script to fix the handle_new_user function
-- Run this in Supabase SQL Editor to fix the database error

-- Fix handle_new_user function to handle unique username constraint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Get base username from metadata or email
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1)
  );
  
  -- Ensure username is unique by adding counter if needed
  final_username := base_username;
  
  -- Check if username already exists and increment counter
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter;
  END LOOP;
  
  -- Insert profile with unique username
  INSERT INTO public.profiles (id, username, first_name, last_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'firstName', NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', NEW.raw_user_meta_data->>'last_name', '')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If still getting unique violation, try with UUID suffix
    final_username := base_username || '_' || substring(NEW.id::text from 1 for 8);
    INSERT INTO public.profiles (id, username, first_name, last_name)
    VALUES (
      NEW.id,
      final_username,
      COALESCE(NEW.raw_user_meta_data->>'firstName', NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'lastName', NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Optional: Clean up any existing duplicate usernames
-- UPDATE public.profiles 
-- SET username = username || '_' || substring(id::text from 1 for 8)
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id, username, ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
--     FROM public.profiles
--   ) t WHERE t.rn > 1
-- );

SELECT 'Database function updated successfully!' as status;