// API Interceptor untuk handle auto-refresh dan 401 errors
import TokenManager from './tokenManager';

class APIInterceptor {
  private static instance: APIInterceptor;
  private tokenManager: TokenManager;

  private constructor() {
    this.tokenManager = TokenManager.getInstance();
  }

  static getInstance(): APIInterceptor {
    if (!APIInterceptor.instance) {
      APIInterceptor.instance = new APIInterceptor();
    }
    return APIInterceptor.instance;
  }

  // Enhanced fetch dengan auto-refresh
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      // Get valid access token (akan auto-refresh jika perlu)
      const accessToken = await this.tokenManager.getValidAccessToken();
      
      // Prepare headers - don't set Content-Type for FormData
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers as Record<string, string>,
      };

      // Only add Content-Type if body is not FormData
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      // Make API call
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Jika masih 401, coba refresh sekali lagi
      if (response.status === 401) {
        try {
          const newAccessToken = await this.tokenManager.refreshAccessToken();
          
          // Prepare retry headers
          const retryHeaders: Record<string, string> = {
            'Authorization': `Bearer ${newAccessToken}`,
            ...options.headers as Record<string, string>,
          };

          // Only add Content-Type if body is not FormData
          if (!(options.body instanceof FormData)) {
            retryHeaders['Content-Type'] = 'application/json';
          }
          
          // Retry dengan token baru
          const retryResponse = await fetch(url, {
            ...options,
            headers: retryHeaders,
          });

          if (retryResponse.status === 401) {
            // Jika masih 401, redirect ke login
            this.handleAuthenticationFailure();
          }

          return retryResponse;
        } catch (refreshError) {
          // Jika refresh gagal, redirect ke login
          this.handleAuthenticationFailure();
          throw new Error('Authentication failed');
        }
      }

      return response;
    } catch (error) {
      // Jika tidak ada token sama sekali
      if (error instanceof Error && error.message.includes('No access token')) {
        this.handleAuthenticationFailure();
      }
      throw error;
    }
  }

  // Handle authentication failure
  private handleAuthenticationFailure(): void {
    this.tokenManager.clearTokens();
    
    // Dispatch custom event untuk notify komponen lain
    window.dispatchEvent(new CustomEvent('auth:logout'));
    
    // Redirect ke login jika tidak di halaman login
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  // Method untuk API calls yang tidak perlu auth
  async fetchPublic(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }
}

export default APIInterceptor;