import APIInterceptor from "../utils/apiInterceptor";

// API base URL
const API_BASE_URL = "http://localhost:8000/api";

// Get API interceptor instance
const apiInterceptor = APIInterceptor.getInstance();

// Helper function to make authenticated API calls
const apiCall = async (
  url: string,
  method: string = "GET",
  data?: any
): Promise<any> => {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data && method !== "GET") {
    options.body = JSON.stringify(data);
  }

  const response = await apiInterceptor.fetch(`${API_BASE_URL}${url}`, options);

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(errorData || "API call failed");
  }

  return await response.json();
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

// Health Profile API calls
export const getHealthProfile = async (): Promise<HealthProfile> => {
  const response = await apiCall("/health-profile/", "GET");
  return response.profile || response; // Extract profile from backend response structure
};

export const createHealthProfile = async (
  data: Partial<HealthProfile>
): Promise<HealthProfile> => {
  const response = await apiCall("/health-profile/", "POST", data);
  return response.profile || response;
};

export const updateHealthProfile = async (
  data: Partial<HealthProfile>
): Promise<HealthProfile> => {
  const response = await apiCall("/health-profile/", "PUT", data);
  return response.profile || response; // Extract profile from backend response structure
};

// Exposure Log API calls
export const getExposureLogs = async (
  startDate?: string,
  endDate?: string
): Promise<ExposureLog[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const url = `/exposure-logs/${
    params.toString() ? "?" + params.toString() : ""
  }`;
  const response = await apiCall(url, "GET");
  return response.logs || response; // Extract logs from backend response structure
};

export const createExposureLog = async (
  data: Partial<ExposureLog>
): Promise<ExposureLog> => {
  const response = await apiCall("/exposure-logs/", "POST", data);
  return response.log || response; // Extract log from backend response structure
};

// Weekly Summary API call
export const getWeeklySummary = async (
  weekStart?: string
): Promise<WeeklySummary> => {
  const params = new URLSearchParams();
  if (weekStart) params.append("week_start", weekStart);

  const url = `/weekly-summary/${
    params.toString() ? "?" + params.toString() : ""
  }`;
  return await apiCall(url, "GET");
};

// Health Dashboard API call
export const getHealthDashboard = async (): Promise<HealthDashboard> => {
  const response = await apiCall("/health-dashboard/", "GET");
  return response.dashboard || response; // Extract dashboard from backend response structure
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
