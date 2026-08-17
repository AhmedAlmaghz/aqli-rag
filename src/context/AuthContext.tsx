import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, AuthProviderInfo, Language } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeProvider: string;
  providers: AuthProviderInfo[];
  login: (email: string, password: string, workspaceId?: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role?: string, workspaceId?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (email: string, password?: string) => Promise<boolean>;
  refreshUserSession: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'aqli_auth_token_v1';
const USER_STORAGE_KEY = 'aqli_auth_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeProvider, setActiveProvider] = useState<string>('database');
  const [providers, setProviders] = useState<AuthProviderInfo[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Fetch configured providers from API
  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        setActiveProvider(data.defaultProvider || 'database');
      }
    } catch (e) {
      console.warn('Could not fetch auth providers:', e);
    }
  }, []);

  // Validate session on boot
  const validateSession = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          return true;
        }
      }
      // If invalid token, clear
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      return false;
    } catch (e) {
      console.warn('Session verification fallback to cached state:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      validateSession(storedToken);
    } else {
      // If no token, auto-login with default root administrator from seeded local DB for smooth onboarding
      handleAutoLoginDefaultAdmin();
    }
  }, [fetchProviders, validateSession]);

  const handleAutoLoginDefaultAdmin = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@aqli.sa',
          password: 'password123',
          workspaceId: 'ws-enterprise-legal',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token && data.user) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        }
      }
    } catch (e) {
      console.warn('Default admin auto-login:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, workspaceId?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, workspaceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.error || 'فشل تسجيل الدخول' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      setIsLoading(false);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e.message || 'حدث خطأ في الاتصال بالخادم' };
    }
  };

  const register = async (name: string, email: string, password: string, role?: string, workspaceId?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, workspaceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.error || 'فشل إنشاء الحساب' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      setIsLoading(false);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e.message || 'حدث خطأ في الاتصال بالخادم' };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.warn('Logout API error:', e);
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const switchUser = async (email: string, password = 'password123') => {
    const res = await login(email, password);
    return res.success;
  };

  const refreshUserSession = async () => {
    if (token) {
      await validateSession(token);
    }
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        activeProvider,
        providers,
        login,
        register,
        logout,
        switchUser,
        refreshUserSession,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
