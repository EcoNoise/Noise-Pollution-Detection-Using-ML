import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../config/supabaseConfig";
import { logger } from "../config/appConfig";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string,
    metadata?: any
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          logger.error("Error getting session:", error);
        } else {
          setUser(session?.user ?? null);
          logger.info("Initial session loaded:", session?.user?.email);
        }
      } catch (error) {
        logger.error("Error in getSession:", error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info("Auth state changed:", event, session?.user?.email);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle different auth events
      switch (event) {
        case "SIGNED_IN":
          logger.info("User signed in:", session?.user?.email);
          break;
        case "SIGNED_OUT":
          logger.info("User signed out");
          // Clear any local storage if needed
          localStorage.removeItem("userId");
          localStorage.removeItem("userEmail");
          break;
        case "TOKEN_REFRESHED":
          logger.info("Token refreshed for user:", session?.user?.email);
          break;
        default:
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        logger.error("Error signing in with Google:", error);
        throw error;
      }
    } catch (error) {
      logger.error("Google sign in error:", error);
      setLoading(false);
      throw error;
    }
  };

  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error("Error signing in with email:", error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        logger.info("Email sign in successful:", data.user.email);
        // Store user info in localStorage for compatibility with existing code
        localStorage.setItem("userId", data.user.id);
        localStorage.setItem("userEmail", data.user.email || "");
        return { success: true };
      }

      return { success: false, error: "Unknown error occurred" };
    } catch (error: any) {
      logger.error("Email sign in error:", error);
      return { success: false, error: error.message || "Sign in failed" };
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    metadata?: any
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
        },
      });

      if (error) {
        logger.error("Error signing up with email:", error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        logger.info("Email sign up successful:", data.user.email);

        // If email confirmation is required
        if (!data.session && data.user && !data.user.email_confirmed_at) {
          return {
            success: true,
            error:
              "Please check your email for a confirmation link before signing in.",
          };
        }

        return { success: true };
      }

      return { success: false, error: "Unknown error occurred" };
    } catch (error: any) {
      logger.error("Email sign up error:", error);
      return { success: false, error: error.message || "Sign up failed" };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error("Error signing out:", error);
        throw error;
      }

      logger.info("User signed out successfully");
      // Clear local storage
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
    } catch (error) {
      logger.error("Sign out error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

  return !!(url && key && url !== "https://your-project-id.supabase.co");
};
