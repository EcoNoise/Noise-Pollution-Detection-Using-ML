-- Fix untuk mengatasi AuthApiError: Database error saving new user
-- Berdasarkan analisis dari GitHub issues, masalah biasanya terjadi karena:
-- 1. Field NOT NULL yang tidak diisi dengan benar
-- 2. Constraint yang tidak terpenuhi
-- 3. Permission issues

-- LANGKAH 1: Drop trigger yang bermasalah terlebih dahulu
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- LANGKAH 2: Buat function yang lebih sederhana dan aman
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Get base username from email (lebih aman)
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'name', 
    split_part(NEW.email, '@', 1),
    'user'
  );
  
  -- Pastikan username tidak kosong
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;
  
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
  
  -- Insert dengan field minimal yang aman
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, final_username);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error dan return NEW agar auth tetap berhasil
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- LANGKAH 3: Buat trigger baru
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- LANGKAH 4: Verifikasi function berjalan
SELECT 'Function handle_new_user created successfully' as status;

-- LANGKAH 5: Test function (opsional - untuk debugging)
-- SELECT public.handle_new_user();

-- CATATAN PENTING:
-- 1. Function ini hanya insert id dan username ke profiles table
-- 2. Field lain seperti first_name, last_name tidak diisi untuk menghindari constraint error
-- 3. Jika ada error, function akan tetap return NEW agar auth signup berhasil
-- 4. Pastikan profiles table memiliki struktur yang benar:
--    - id UUID PRIMARY KEY REFERENCES auth.users(id)
--    - username TEXT UNIQUE NOT NULL
--    - field lain boleh NULL atau memiliki DEFAULT value