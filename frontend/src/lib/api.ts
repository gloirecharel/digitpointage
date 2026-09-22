import type {
  LoginResponse,
  User,
  Client,
  ClientSummary,
  Transaction,
  WithdrawalRequest,
  Employee,
  Payroll,
  CashMovement,
  OperatingCashMovement,
  DashboardData,
  AuditLog,
  AgentStat,
  Notification,
  NextCodeResponse,
  ClientPortalData,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'https://digitpointage-api.onrender.com/api';

let cachedToken: string | null = null;

export function getToken(): string | null {
  if (cachedToken !== null) return cachedToken;
  cachedToken = localStorage.getItem('mapassa_token');
  return cachedToken;
}

export function setToken(token: string | null) {
  cachedToken = token;
  if (token) localStorage.setItem('mapassa_token', token);
  else localStorage.removeItem('mapassa_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || `Erreur ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<LoginResponse>('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  clientLogin: (code: string, password: string) =>
    request<LoginResponse>('/client/login', { method: 'POST', body: JSON.stringify({ code, password }) }),

  // Dashboard
  getDashboard: () => request<DashboardData>('/dashboard'),

  // Users
  getUsers: () => request<User[]>('/users'),
  createUser: (data: { full_name: string; username: string; password: string; role: string }) =>
    request<{ message: string }>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUserStatus: (id: number, status: string) =>
    request<{ message: string }>(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  resetUserPassword: (id: number) =>
    request<{ message: string; temporaryPassword: string }>(`/users/${id}/reset-password`, { method: 'POST' }),

  // Clients
  getClients: () => request<Client[]>('/clients'),
  createClient: (data: Partial<Client>) =>
    request<{ message: string }>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: number, data: Partial<Client>) =>
    request<{ message: string }>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetClientPassword: (id: number) =>
    request<{ message: string; temporaryPassword: string }>(`/clients/${id}/reset-password`, { method: 'POST' }),
  deleteClient: (id: number) =>
    request<{ message: string }>(`/clients/${id}`, { method: 'DELETE' }),
  getClientSummary: (id: number) => request<ClientSummary>(`/clients/${id}/summary`),
  getClientHistory: (id: number) => request<Transaction[]>(`/clients/${id}/history`),
  exportClientCsv: (id: number) => `${API_BASE}/clients/${id}/export-csv?token=${getToken() || ''}`,

  // Transactions
  createTransaction: (data: { client_id: number; type: string; amount: number; reason?: string }) =>
    request<{ message: string }>('/transactions', { method: 'POST', body: JSON.stringify(data) }),

  // Client portal
  getClientPortal: () => request<ClientPortalData>('/client/dashboard'),
  createClientWithdrawalRequest: (data: { amount: number; reason: string }) =>
    request<{ message: string }>('/client/withdrawal-requests', { method: 'POST', body: JSON.stringify(data) }),

  // Withdrawal requests
  getWithdrawalRequests: () => request<WithdrawalRequest[]>('/withdrawal-requests'),
  createWithdrawalRequest: (data: { client_id: number; amount: number; reason: string }) =>
    request<{ message: string }>('/withdrawal-requests', { method: 'POST', body: JSON.stringify(data) }),
  validateWithdrawalRequest: (id: number) =>
    request<{ message: string }>(`/withdrawal-requests/${id}/validate`, { method: 'POST' }),
  rejectWithdrawalRequest: (id: number) =>
    request<{ message: string }>(`/withdrawal-requests/${id}/reject`, { method: 'POST' }),

  // Employees
  getEmployees: () => request<Employee[]>('/employees'),
  createEmployee: (data: Partial<Employee>) =>
    request<{ message: string }>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: number, data: Partial<Employee>) =>
    request<{ message: string }>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: number) =>
    request<{ message: string }>(`/employees/${id}`, { method: 'DELETE' }),

  // Payrolls
  getPayrolls: () => request<Payroll[]>('/payrolls'),
  getPayroll: (id: number) => request<Payroll>(`/payrolls/${id}`),
  createPayroll: (data: {
    employee_id: number;
    month: string;
    base_salary?: number;
    bonus?: number;
    transport?: number;
    deductions?: number;
    advance?: number;
    cnss?: number;
    irpp?: number;
  }) => request<{ message: string; net_salary: number }>('/payrolls', { method: 'POST', body: JSON.stringify(data) }),

  // Cash
  getCash: () => request<{ totalIn: number; totalOut: number; balance: number; rows: CashMovement[] }>('/cash'),
  depositCash: (data: { amount: number; reason?: string; reference?: string }) =>
    request<{ message: string }>('/cash/deposit', { method: 'POST', body: JSON.stringify(data) }),

  // Operating cash
  getOperatingCash: () =>
    request<{ totalIn: number; totalOut: number; balance: number; rows: OperatingCashMovement[] }>('/operating-cash'),
  createOperatingCashMovement: (data: { type: string; amount: number; reason?: string; reference?: string }) =>
    request<{ message: string }>('/operating-cash/movement', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => request<Notification[]>('/notifications'),

  // Agent stats
  getAgentStats: () => request<AgentStat[]>('/reports/agents'),

  // Audit logs
  getAuditLogs: () => request<AuditLog[]>('/audit-logs'),

  // Next code
  getNextCode: (type: string) => request<NextCodeResponse>(`/next-code/${type}`),

  // Backup
  getBackupUrl: () => `${API_BASE}/backup/download?token=${getToken() || ''}`,
};
