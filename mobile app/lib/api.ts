import Constants from 'expo-constants';

const DEFAULT_SERVER_URL = 'https://digitpointage-api.onrender.com';

function getServerUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const expoUrl = Constants.expoConfig?.extra?.apiUrl?.trim();
  if (expoUrl) return expoUrl.replace(/\/$/, '');

  return DEFAULT_SERVER_URL;
}

export const SERVER_URL = getServerUrl();

export type ClientUser = {
  id: number;
  full_name: string;
  username: string;
  role: 'CLIENT';
};

export type Transaction = {
  id: number;
  type: 'DEPOT' | 'RETRAIT';
  amount: number | string;
  reason: string | null;
  created_at: string;
};

export type WithdrawalRequest = {
  id: number;
  amount: number | string;
  reason: string | null;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  requested_at: string;
  validated_at: string | null;
};

export type ClientInfo = {
  code: string;
  full_name: string;
  piece_type: string | null;
  piece_number: string | null;
  phone: string | null;
  address: string | null;
  account_type: string;
  fixed_amount: number | string;
  status: string;
  created_at: string;
};

export type DashboardData = {
  client: ClientInfo;
  totalDeposits: number;
  totalWithdrawals: number;
  balance: number;
  depositCount: number;
  history: Transaction[];
  withdrawals: Transaction[];
  pendingWithdrawals: WithdrawalRequest[];
  upcomingWithdrawal: number;
};

type LoginResponse = { token: string; user: ClientUser };

export async function clientLogin(code: string, password: string): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${SERVER_URL}/api/client/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), password }),
    });
  } catch {
    throw new Error(`Serveur inaccessible (${SERVER_URL}). Vérifiez le Wi-Fi et le backend.`);
  }
  const payload: unknown = await response.json();
  if (!response.ok || !isLoginResponse(payload)) {
    throw new Error(getMessage(payload, 'Impossible de se connecter'));
  }
  return payload;
}

export async function getDashboard(token: string): Promise<DashboardData> {
  const dashboard = await request<DashboardData>(token, '/api/client/dashboard');
  return {
    ...dashboard,
    history: Array.isArray(dashboard.history)
      ? dashboard.history
      : Array.isArray(dashboard.withdrawals)
        ? dashboard.withdrawals
        : [],
  };
}

export async function requestWithdrawal(token: string, amount: number, reason: string): Promise<void> {
  await request(token, '/api/client/withdrawal-requests', {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  });
}

async function request<T = { message: string }>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload: unknown = await response.json();
  if (!response.ok) throw new Error(getMessage(payload, 'Une erreur est survenue'));
  return payload as T;
}

function isLoginResponse(payload: unknown): payload is LoginResponse {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Record<string, unknown>;
  return typeof value.token === 'string' && typeof value.user === 'object' && value.user !== null;
}

function getMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}
