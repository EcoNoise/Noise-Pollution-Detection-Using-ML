// Mock Session Manager to replace Supabase authentication
class SessionManager {
  private static instance: SessionManager;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Access token stored in localStorage
  async getAccessToken(): Promise<string | null> {
    return localStorage.getItem("mock_access_token");
  }

  async getRefreshToken(): Promise<string | null> {
    return localStorage.getItem("mock_refresh_token");
  }

  // Store tokens (mock)
  setTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem("mock_access_token", accessToken);
    if (refreshToken) localStorage.setItem("mock_refresh_token", refreshToken);
  }

  // Clear session
  async clearTokens(): Promise<void> {
    localStorage.removeItem("mock_access_token");
    localStorage.removeItem("mock_refresh_token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
  }

  async isTokenExpired(): Promise<boolean> {
    // Simple check: token exists => not expired
    const token = await this.getAccessToken();
    return !token;
  }

  async refreshAccessToken(): Promise<string> {
    const token = await this.getAccessToken();
    if (!token) throw new Error("Unable to refresh session");
    return token;
  }

  async getValidAccessToken(): Promise<string> {
    const token = await this.getAccessToken();
    if (!token) throw new Error("No access token available");
    return token;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }
}

export default SessionManager;
