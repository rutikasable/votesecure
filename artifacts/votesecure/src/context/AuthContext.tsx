import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  getCurrentUser,
  getToken,
  loginUser,
  logoutUser,
  removeToken,
  type User,
} from '@/services/api';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore authenticated session from JWT token on startup/refresh
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const token = getToken();
      if (!token) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await getCurrentUser();
        if (mounted && response && response.user) {
          setUser(response.user);
        } else if (mounted) {
          removeToken();
          setUser(null);
        }
      } catch (error) {
        console.warn('Session verification failed on startup:', error);
        removeToken();
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const handleAuthExpired = () => {
      removeToken();
      if (mounted) {
        setUser(null);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:expired', handleAuthExpired);
    }

    return () => {
      mounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:expired', handleAuthExpired);
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await loginUser({ email, password });
    setUser(response.user);
    return response.user;
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const response = await getCurrentUser();
      if (response && response.user) {
        setUser(response.user);
        return response.user;
      }
      logout();
      return null;
    } catch {
      logout();
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
