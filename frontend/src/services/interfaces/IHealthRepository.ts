// Backend-agnostic Health Repository Interface
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

export interface IHealthRepository {
  getHealthProfile(): Promise<HealthProfile>;
  createHealthProfile(data: Partial<HealthProfile>): Promise<HealthProfile>;
  updateHealthProfile(data: Partial<HealthProfile>): Promise<HealthProfile>;

  getExposureLogs(startDate?: string, endDate?: string): Promise<ExposureLog[]>;
  createExposureLog(data: Partial<ExposureLog>): Promise<ExposureLog>;

  getWeeklySummary(weekStart?: string): Promise<WeeklySummary>;
  getHealthDashboard(): Promise<HealthDashboard>;
}