import { supabase } from '../lib/supabase';

// Helper function to get current user
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export interface HealthProfile {
  id?: number;
  home_latitude?: number;
  home_longitude?: number;
  home_address?: string;
  work_latitude?: number;
  work_longitude?: number;
  work_address?: string;
  home_avg_noise?: number;
  work_avg_noise?: number;
  tracking_enabled?: boolean;
}

export interface ExposureLog {
  id?: number;
  date: string;
  home_hours: number;
  work_hours: number;
  commute_hours: number;
  home_avg_noise: number;
  work_avg_noise: number;
  commute_avg_noise: number;
  total_exposure_hours?: number;
  weighted_avg_noise?: number;
  health_alerts?: string[];
}

export interface WeeklySummary {
  week_start: string;
  week_end: string;
  daily_exposures: ExposureLog[];
  weekly_avg_noise: number;
  total_alerts: number;
  recommendations: string[];
}

export interface HealthDashboard {
  profile: HealthProfile;
  recent_logs: ExposureLog[];
  summary: {
    avg_noise_7days: number;
    total_alerts: number;
    tracking_enabled: boolean;
  };
}

// Health Profile API calls using Supabase
export const getHealthProfile = async (): Promise<HealthProfile> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('health_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error;
  }

  return data || {};
};

export const createHealthProfile = async (
  data: Partial<HealthProfile>
): Promise<HealthProfile> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data: profile, error } = await supabase
    .from('health_profiles')
    .insert({ ...data, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return profile;
};

export const updateHealthProfile = async (
  data: Partial<HealthProfile>
): Promise<HealthProfile> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data: profile, error } = await supabase
    .from('health_profiles')
    .update(data)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return profile;
};

// Exposure Log API calls using Supabase
export const getExposureLogs = async (
  startDate?: string,
  endDate?: string
): Promise<ExposureLog[]> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  let query = supabase
    .from('exposure_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

export const createExposureLog = async (
  data: Partial<ExposureLog>
): Promise<ExposureLog> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data: log, error } = await supabase
    .from('exposure_logs')
    .insert({ ...data, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return log;
};

// Weekly Summary using Supabase
export const getWeeklySummary = async (
  weekStart?: string
): Promise<WeeklySummary> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const startDate = weekStart || getCurrentWeekStart();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const endDateStr = formatDate(endDate);

  const logs = await getExposureLogs(startDate, endDateStr);
  
  // Calculate weekly summary from logs
  const weeklyAvgNoise = logs.length > 0 
    ? logs.reduce((sum, log) => sum + (log.weighted_avg_noise || 0), 0) / logs.length
    : 0;
  
  const totalAlerts = logs.reduce((sum, log) => sum + (log.health_alerts?.length || 0), 0);
  
  return {
    week_start: startDate,
    week_end: endDateStr,
    daily_exposures: logs,
    weekly_avg_noise: weeklyAvgNoise,
    total_alerts: totalAlerts,
    recommendations: totalAlerts > 5 ? ['Consider reducing noise exposure', 'Use ear protection'] : ['Keep up the good work!']
  };
};

// Health Dashboard using Supabase
export const getHealthDashboard = async (): Promise<HealthDashboard> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const profile = await getHealthProfile();
  const recentLogs = await getExposureLogs();
  const last7Days = recentLogs.slice(0, 7);
  
  const avgNoise7Days = last7Days.length > 0
    ? last7Days.reduce((sum, log) => sum + (log.weighted_avg_noise || 0), 0) / last7Days.length
    : 0;
  
  const totalAlerts = last7Days.reduce((sum, log) => sum + (log.health_alerts?.length || 0), 0);
  
  return {
    profile,
    recent_logs: last7Days,
    summary: {
      avg_noise_7days: avgNoise7Days,
      total_alerts: totalAlerts,
      tracking_enabled: profile.tracking_enabled || false
    }
  };
};

// Utility functions
export const getCurrentWeekStart = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const getLast7Days = (): string[] => {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(formatDate(date));
  }
  return dates;
};
