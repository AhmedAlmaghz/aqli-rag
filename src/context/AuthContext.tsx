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

// Helper function to safely parse API responses even if the server returns non-JSON or HTML
async function safeParseAuthResponse(res: Response): Promise<{ data: any; isJson: boolean; rawText?: string }> {
  if (res.status === 204 || res.status === 205) {
    return { data: {}, isJson: true };
  }

  try {
    const rawText = await res.text();
    if (!rawText || rawText.trim() === '') {
      return { data: {}, isJson: true, rawText: '' };
    }

    try {
      const data = JSON.parse(rawText);
      return { data, isJson: true, rawText };
    } catch {
      return { data: null, isJson: false, rawText };
    }
  } catch (err: any) {
    return { data: null, isJson: false, rawText: err?.message };
  }
}

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
      const { data, isJson } = await safeParseAuthResponse(res);
      if (res.ok && isJson && data) {
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

      const { data, isJson } = await safeParseAuthResponse(res);
      if (res.ok && isJson && data?.user) {
        setUser(data.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        return true;
      }
      // If invalid token or server rejected, clear
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
      setIsLoading(false);
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
      const { data, isJson } = await safeParseAuthResponse(res);
      if (res.ok && isJson && data?.token && data?.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
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

      const { data, isJson, rawText } = await safeParseAuthResponse(res);

      if (!res.ok) {
        setIsLoading(false);
        if (isJson && data?.error) {
          return { success: false, error: data.error };
        }

        if (res.status === 401) {
          return { 
            success: false, 
            error: 'بيانات الاعتماد غير صحيحة. يرجى التحقق من البريد الإلكتروني وكلمة المرور.' 
          };
        }
        if (res.status === 403) {
          return { 
            success: false, 
            error: 'تم تقييد الوصول لهذا الحساب في مساحة العمل المحددة.' 
          };
        }
        if (res.status === 404) {
          return { 
            success: false, 
            error: 'خدمة تسجيل الدخول غير متاحة حالياً (رمز 404).' 
          };
        }
        if (res.status >= 500) {
          return { 
            success: false, 
            error: `استجاب خادم المصادقة برمز خطأ (${res.status}). يرجى إعادة المحاولة بعد لحظات.` 
          };
        }

        return { 
          success: false, 
          error: `تعذر تسجيل الدخول (رمز الاستجابة: ${res.status}).` 
        };
      }

      if (!isJson || !data) {
        setIsLoading(false);
        return {
          success: false,
          error: 'استلم التطبيق استجابة غير مهيكلة من الخادم. يرجى التحقق من اتصال الخادم وإعادة المحاولة.',
        };
      }

      if (!data.token || !data.user) {
        setIsLoading(false);
        return {
          success: false,
          error: data.error || 'لم يتم استلام مفتاح الجلسة من الخادم بشكل صحيح.',
        };
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
      const msg = e?.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network request failed')) {
        return {
          success: false,
          error: 'تعذر الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت أو جاهزية الخادم.',
        };
      }
      return { success: false, error: msg || 'حدث خطأ في الاتصال بالخادم أثناء تسجيل الدخول.' };
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

      const { data, isJson } = await safeParseAuthResponse(res);

      if (!res.ok) {
        setIsLoading(false);
        if (isJson && data?.error) {
          return { success: false, error: data.error };
        }
        if (res.status === 409) {
          return { success: false, error: 'البريد الإلكتروني مسجل مسبقاً في النظام.' };
        }
        if (res.status >= 500) {
          return { success: false, error: `فشل إنشاء الحساب بسبب خطأ في الخادم (${res.status}).` };
        }
        return { success: false, error: `فشل إنشاء الحساب (رمز ${res.status}).` };
      }

      if (!isJson || !data || !data.token || !data.user) {
        setIsLoading(false);
        return {
          success: false,
          error: data?.error || 'استلم التطبيق استجابة غير مهيكلة عند إنشاء الحساب.',
        };
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
      const msg = e?.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        return {
          success: false,
          error: 'تعذر الاتصال بالخادم لإنشاء الحساب. يرجى التحقق من اتصال الشبكة.',
        };
      }
      return { success: false, error: msg || 'حدث خطأ في الاتصال بالخادم' };
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
