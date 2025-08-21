// src/services/healthService.ts

import { supabase } from '../config/supabaseConfig';

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

// New interfaces for Supabase integration
export interface HealthAnalysisSession {
  id?: string;
  user_id?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  avg_db?: number;
  avg_dba?: number;
  health_impact?: 'Aman' | 'Perhatian' | 'Berbahaya' | 'Sangat Berbahaya';
  created_at?: string;
}

export interface TodayDashboard {
  total_analysis: number;
  average_noise: number;
  health_status: 'Aman' | 'Perhatian' | 'Berbahaya' | 'Sangat Berbahaya' | null;
}

export interface WeeklyAudioSummary {
  day_index: number;
  day_date: string;
  total_analysis_hours: number;
  average_noise_level: number;
}

export interface WeeklyAlertsRecommendations {
  alerts: string[];
  recommendations: string[];
}

// Health Session Services
export const createHealthSession = async (data: {
  avg_db?: number;
  avg_dba?: number;
  health_impact?: 'Aman' | 'Perhatian' | 'Berbahaya' | 'Sangat Berbahaya';
}): Promise<HealthAnalysisSession> => {
  const { data: result, error } = await supabase
    .from('health_analysis_sessions')
    .insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      started_at: new Date().toISOString(),
      avg_db: data.avg_db,
      avg_dba: data.avg_dba,
      health_impact: data.health_impact,
    })
    .select()
    .single();

  if (error) throw error;
  return result;
};

export const endHealthSession = async (
  sessionId: string,
  data: {
    duration_seconds?: number;
    avg_db?: number;
    avg_dba?: number;
    health_impact?: 'Aman' | 'Perhatian' | 'Berbahaya' | 'Sangat Berbahaya';
  }
): Promise<HealthAnalysisSession> => {
  const { data: result, error } = await supabase
    .from('health_analysis_sessions')
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: data.duration_seconds,
      avg_db: data.avg_db,
      avg_dba: data.avg_dba,
      health_impact: data.health_impact,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return result;
};

// Dashboard Data Services
export const getTodayDashboard = async (date?: string): Promise<TodayDashboard | null> => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const userId = (await supabase.auth.getUser()).data.user?.id;
  
  if (!userId) throw new Error('User not authenticated');

  const { data, error } = await supabase.rpc('get_today_dashboard', {
    p_user_id: userId,
    p_date: targetDate,
  });

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
};

export const getWeeklyAudioSummary = async (date?: string): Promise<WeeklyAudioSummary[]> => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const userId = (await supabase.auth.getUser()).data.user?.id;
  
  if (!userId) throw new Error('User not authenticated');

  const { data, error } = await supabase.rpc('get_weekly_audio_summary', {
    p_user_id: userId,
    p_date: targetDate,
  });

  if (error) throw error;
  return data || [];
};

export const getWeeklyAlertsRecommendations = async (date?: string): Promise<WeeklyAlertsRecommendations> => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const userId = (await supabase.auth.getUser()).data.user?.id;
  
  if (!userId) throw new Error('User not authenticated');

  const { data, error } = await supabase.rpc('get_weekly_alerts_recommendations', {
    p_user_id: userId,
    p_date: targetDate,
  });

  if (error) throw error;
  return data || { alerts: [], recommendations: [] };
};

// Health Dashboard Integration
export interface HealthDashboard {
  profile: HealthProfile;
  recent_logs: ExposureLog[];
  summary: {
    avg_noise_7days: number;
    total_alerts: number;
    tracking_enabled: boolean;
  };
}

// Helpers for auth and storage (for backward compatibility)
const getCurrentUserId = (): string | null => localStorage.getItem('userId');
const profileKey = (userId: string) => `health_profile_${userId}`;
const logsKey = (userId: string) => `exposure_logs_${userId}`;

const loadProfile = (userId: string): HealthProfile | null => {
  const raw = localStorage.getItem(profileKey(userId));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};
const saveProfile = (userId: string, profile: HealthProfile) => {
  localStorage.setItem(profileKey(userId), JSON.stringify(profile));
};

const loadLogs = (userId: string): ExposureLog[] => {
  const raw = localStorage.getItem(logsKey(userId));
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};
const saveLogs = (userId: string, logs: ExposureLog[]) => {
  localStorage.setItem(logsKey(userId), JSON.stringify(logs));
};

// Health Profile API calls (mock - maintained for backward compatibility)
export const getHealthProfile = async (): Promise<HealthProfile> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  return loadProfile(userId) || {};
};

export const createHealthProfile = async (
  data: Partial<HealthProfile>
): Promise<HealthProfile> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  const newProfile: HealthProfile = { ...data } as HealthProfile;
  saveProfile(userId, newProfile);
  return newProfile;
};

export const updateHealthProfile = async (
  data: Partial<HealthProfile>
): Promise<HealthProfile> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  const current = loadProfile(userId) || {};
  const updated: HealthProfile = { ...current, ...data };
  saveProfile(userId, updated);
  return updated;
};

// Exposure Log API calls (mock - maintained for backward compatibility)
export const getExposureLogs = async (
  startDate?: string,
  endDate?: string
): Promise<ExposureLog[]> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  let logs = loadLogs(userId);

  // Filter by date range if provided
  if (startDate) {
    logs = logs.filter((l) => l.date >= startDate);
  }
  if (endDate) {
    logs = logs.filter((l) => l.date <= endDate);
  }

  // Sort by date desc
  logs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return logs;
};

export const createExposureLog = async (
  data: Partial<ExposureLog>
): Promise<ExposureLog> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const logs = loadLogs(userId);
  const nextId = (logs[0]?.id || 0) + 1;
  const total_exposure_hours = (data.home_hours || 0) + (data.work_hours || 0) + (data.commute_hours || 0);
  const weighted_avg_noise = total_exposure_hours > 0
    ? (((data.home_avg_noise || 0) * (data.home_hours || 0)) +
       ((data.work_avg_noise || 0) * (data.work_hours || 0)) +
       ((data.commute_avg_noise || 0) * (data.commute_hours || 0))) / total_exposure_hours
    : 0;

  const log: ExposureLog = {
    id: nextId,
    date: data.date || formatDate(new Date()),
    home_hours: data.home_hours || 0,
    work_hours: data.work_hours || 0,
    commute_hours: data.commute_hours || 0,
    home_avg_noise: data.home_avg_noise || 0,
    work_avg_noise: data.work_avg_noise || 0,
    commute_avg_noise: data.commute_avg_noise || 0,
    total_exposure_hours,
    weighted_avg_noise,
    health_alerts: data.health_alerts || [],
  };

  logs.unshift(log);
  saveLogs(userId, logs);
  return log;
};

// Weekly Summary (mock - maintained for backward compatibility)
export const getWeeklySummary = async (
  weekStart?: string
): Promise<WeeklySummary> => {
  const startDate = weekStart || getCurrentWeekStart();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const endDateStr = formatDate(endDate);

  const logs = await getExposureLogs(startDate, endDateStr);

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

// Health Dashboard (now integrates with Supabase)
export const getHealthDashboard = async (): Promise<HealthDashboard> => {
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
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const getLast7Days = (): string[] => {
  const dates = [] as string[];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(formatDate(date));
  }
  return dates;
};
