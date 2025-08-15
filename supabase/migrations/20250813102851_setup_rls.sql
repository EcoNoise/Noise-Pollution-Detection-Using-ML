-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noise_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exposure_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Prediction history policies
CREATE POLICY "Users can view own predictions" ON public.prediction_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own predictions" ON public.prediction_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Noise areas policies (public read, authenticated write)
CREATE POLICY "Anyone can view noise areas" ON public.noise_areas
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own noise areas" ON public.noise_areas
  FOR ALL USING (auth.uid() = user_id);

-- Health profiles policies
CREATE POLICY "Users can manage own health profile" ON public.health_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Exposure logs policies
CREATE POLICY "Users can manage own exposure logs" ON public.exposure_logs
  FOR ALL USING (auth.uid() = user_id);