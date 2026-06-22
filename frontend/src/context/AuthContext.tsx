import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from '../api/client';
import type { User } from '../types';

interface AuthCtx {
  user: User | null;
  isAdmin: boolean; // administrador global (acceso completo a la gestión)
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) { setLoading(false); return; }
    api.me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const { token, user } = await api.login(username, password);
    tokenStore.set(token);
    setUser(user);
  };

  const logout = () => {
    api.logout().catch(() => {});
    tokenStore.clear();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, isAdmin: !!user?.isAdmin, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
