// Token Manager untuk handle auto-refresh dan 401 errors
class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<string> | null = null;
  private isRefreshing = false;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  // Get access token dari localStorage
  getAccessToken(): string | null {
    return localStorage.getItem("accessToken");
  }

  // Get refresh token dari localStorage
  getRefreshToken(): string | null {
    return localStorage.getItem("refreshToken");
  }

  // Set tokens ke localStorage
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  }

  // Clear tokens dari localStorage
  clearTokens(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  // Check apakah token expired (basic check)
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  // Refresh access token
  async refreshAccessToken(): Promise<string> {
    // Jika sudah ada proses refresh yang berjalan, tunggu hasil nya
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh(refreshToken);

    try {
      const newAccessToken = await this.refreshPromise;
      return newAccessToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(refreshToken: string): Promise<string> {
    const response = await fetch("http://127.0.0.1:8000/api/auth/refresh/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      // Jika refresh token juga expired, clear semua tokens
      this.clearTokens();
      throw new Error("Refresh token expired");
    }

    const data = await response.json();

    // Update tokens di localStorage
    this.setTokens(data.access, data.refresh);

    return data.access;
  }

  // Get valid access token (refresh jika perlu)
  async getValidAccessToken(): Promise<string> {
    let accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error("No access token available");
    }

    // Jika token expired, coba refresh
    if (this.isTokenExpired(accessToken)) {
      try {
        accessToken = await this.refreshAccessToken();
      } catch (error) {
        throw new Error("Unable to refresh token");
      }
    }

    return accessToken;
  }

  // Check apakah user masih authenticated
  isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (!accessToken || !refreshToken) {
      return false;
    }

    // Jika access token expired tapi refresh token masih ada, masih dianggap authenticated
    if (this.isTokenExpired(accessToken)) {
      return !this.isTokenExpired(refreshToken);
    }

    return true;
  }
}

export default TokenManager;
