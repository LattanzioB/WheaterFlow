import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '../api/client';
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
} from '../api/weatherflow';
import { getStoredToken, setStoredToken } from '../api/client';
import type { UserProfile } from '../api/types';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return;
    }
    const profile = await fetchCurrentUser();
    setUser(profile);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refreshUser();
      } catch {
        setStoredToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await loginUser({ email, password });
    setStoredToken(access_token);
    await refreshUser();
  }, [refreshUser]);

  const register = useCallback(
    async (payload: {
      name: string;
      lastName: string;
      email: string;
      password: string;
    }) => {
      const { access_token } = await registerUser(payload);
      setStoredToken(access_token);
      await refreshUser();
    },
    [refreshUser],
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}

export function useApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado';
}
