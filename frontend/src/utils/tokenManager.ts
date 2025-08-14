// Session Manager untuk handle Supabase authentication
class SessionManager {
  private static instance: SessionManager;
  private supabase: any = null;

  private constructor() {
    this.initSupabase();
  }

  private async initSupabase() {
    const { supabase } = await import('../lib/supabase');
    this.supabase = supabase;
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Get access token from Supabase session
  async getAccessToken(): Promise<string | null> {
    if (!this.supabase) await this.initSupabase();
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token || null;
  }

  // Get refresh token from Supabase session
  async getRefreshToken(): Promise<string | null> {
    if (!this.supabase) await this.initSupabase();
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.refresh_token || null;
  }

  // Supabase handles token storage automatically
  setTokens(accessToken: string, refreshToken: string): void {
    // No-op for Supabase as it handles tokens automatically
    console.log('Supabase handles token storage automatically');
  }

  // Clear session (sign out)
  async clearTokens(): Promise<void> {
    if (!this.supabase) await this.initSupabase();
    await this.supabase.auth.signOut();
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
  }

  // Supabase handles token expiry automatically
  async isTokenExpired(): Promise<boolean> {
    if (!this.supabase) await this.initSupabase();
    const { data: { session } } = await this.supabase.auth.getSession();
    return !session;
  }

  // Supabase handles token refresh automatically
  async refreshAccessToken(): Promise<string> {
    if (!this.supabase) await this.initSupabase();
    const { data: { session }, error } = await this.supabase.auth.refreshSession();
    
    if (error || !session) {
      throw new Error("Unable to refresh session");
    }
    
    return session.access_token;
  }

  // Get valid access token (Supabase handles refresh automatically)
  async getValidAccessToken(): Promise<string> {
    const accessToken = await this.getAccessToken();
    
    if (!accessToken) {
      throw new Error("No access token available");
    }
    
    return accessToken;
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    if (!this.supabase) await this.initSupabase();
    const { data: { session } } = await this.supabase.auth.getSession();
    return !!session;
  }
}

export default SessionManager;
