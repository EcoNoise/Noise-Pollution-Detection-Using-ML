-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom Users table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prediction History
CREATE TABLE public.prediction_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  noise_level FLOAT NOT NULL,
  noise_source VARCHAR(50) NOT NULL,
  health_impact VARCHAR(20) NOT NULL,
  confidence_score FLOAT NOT NULL,
  file_name VARCHAR(255),
  processing_time FLOAT NOT NULL
);

-- Noise Areas
CREATE TABLE public.noise_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  noise_level FLOAT NOT NULL,
  noise_source VARCHAR(100),
  health_impact VARCHAR(50),
  description TEXT,
  address VARCHAR(255),
  radius INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Health Profiles
CREATE TABLE public.health_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  home_latitude DECIMAL(20,15),
  home_longitude DECIMAL(20,15),
  home_address VARCHAR(255),
  work_latitude DECIMAL(20,15),
  work_longitude DECIMAL(20,15),
  work_address VARCHAR(255),
  tracking_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exposure Logs
CREATE TABLE public.exposure_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  home_exposure_hours FLOAT DEFAULT 16.0,
  work_exposure_hours FLOAT DEFAULT 8.0,
  commute_exposure_minutes FLOAT DEFAULT 45.0,
  home_avg_noise FLOAT,
  work_avg_noise FLOAT,
  commute_avg_noise FLOAT DEFAULT 70.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Indexes untuk performance
CREATE INDEX idx_noise_areas_location ON public.noise_areas(latitude, longitude);
CREATE INDEX idx_noise_areas_user ON public.noise_areas(user_id);
CREATE INDEX idx_prediction_history_user ON public.prediction_history(user_id);
CREATE INDEX idx_prediction_history_timestamp ON public.prediction_history(timestamp DESC);
CREATE INDEX idx_exposure_logs_user_date ON public.exposure_logs(user_id, date);