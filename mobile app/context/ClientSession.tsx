import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ClientUser, DashboardData, clientLogin, getDashboard } from '@/lib/api';

type ClientSessionValue = {
  user: ClientUser | null;
  dashboard: DashboardData | null;
  loading: boolean;
  error: string | null;
  signIn: (code: string, password: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  signOut: () => void;
  clearError: () => void;
  token: string;
};

const ClientSessionContext = createContext<ClientSessionValue | null>(null);

export function ClientSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (code: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await clientLogin(code, password);
      const data = await getDashboard(response.token);
      setToken(response.token);
      setUser(response.user);
      setDashboard(data);
      return true;
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Connexion impossible');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setDashboard(await getDashboard(token));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Actualisation impossible');
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setToken('');
    setUser(null);
    setDashboard(null);
    setError(null);
  };

  const value = useMemo<ClientSessionValue>(() => ({ user, dashboard, loading, error, token, signIn, refresh, signOut, clearError: () => setError(null) }), [user, dashboard, loading, error, token]);
  return <ClientSessionContext.Provider value={value}>{children}</ClientSessionContext.Provider>;
}

export function useClientSession() {
  const context = useContext(ClientSessionContext);
  if (!context) throw new Error('useClientSession doit être utilisé dans ClientSessionProvider');
  return context;
}
