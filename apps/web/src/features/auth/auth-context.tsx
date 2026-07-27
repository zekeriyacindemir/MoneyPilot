'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  refresh as refreshRequest,
} from './auth.api';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/api/access-token';
import { subscribeToAuthenticationFailure } from '@/lib/api/auth-events';
import type { LoginRequest, RegisterRequest, User } from './auth.types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProperties {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProperties) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedCurrentUser = useRef(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const { accessToken } = await refreshRequest();

      setAccessToken(accessToken);
    } catch (error) {
      clearAccessToken();
      setUser(null);
      throw error;
    }
  }, []);

  const loadCurrentUser = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      if (!getAccessToken()) {
        await refresh();
      }

      setUser(await getCurrentUser());
    } catch {
      clearAccessToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (hasLoadedCurrentUser.current) {
      return;
    }

    hasLoadedCurrentUser.current = true;
    void Promise.resolve().then(loadCurrentUser);

    return;
  }, [loadCurrentUser]);

  useEffect(() => {
    return subscribeToAuthenticationFailure(() => {
      clearAccessToken();
      setUser(null);
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (request: LoginRequest): Promise<void> => {
    const response = await loginRequest(request);

    setAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  const register = useCallback(async (request: RegisterRequest): Promise<void> => {
    const response = await registerRequest(request);

    setAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      refresh,
      loadCurrentUser,
    }),
    [isLoading, loadCurrentUser, login, logout, refresh, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
