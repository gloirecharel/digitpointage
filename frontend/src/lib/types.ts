export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CAISSIER' | 'RH' | 'CONSULTATION' | 'CLIENT';
export type AccountType = 'CARTE_CLASSIQUE' | 'COMPTE_LIBRE';
export type ClientStatus = 'ACTIVE' | 'CLOSED' | 'BLOCKED';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type TransactionType = 'DEPOT' | 'RETRAIT';
export type CashType = 'ENTREE' | 'SORTIE';
export type WithdrawalStatus = 'PENDING' | 'PAID' | 'REJECTED';

export interface User {
  id: number;
  full_name: string;
  username: string;
  role: UserRole;
  status: string;
  created_at: string;
}

export interface AuthUser {
  id: number;
  full_name: string;
  username: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface ClientPortalData {
  client: Client;
  totalDeposits: number;
  totalWithdrawals: number;
  balance: number;
  depositCount: number;
  withdrawals: Transaction[];
  pendingWithdrawals: any[];
  upcomingWithdrawal: number;
}

export interface Client {
  id: number;
  code: string;
  full_name: string;
  piece_type: string | null;
  piece_number: string | null;
  phone: string | null;
  address: string | null;
  account_type: AccountType;
  fixed_amount: number;
  status: ClientStatus;
  created_at: string;
}

export interface ClientSummary {
  client: Client;
  totalDeposits: number;
  totalWithdrawals: number;
  balance: number;
  depositCount: number;
  expectedTotal: number;
  companyProfit: number;
  clientExpectedSaving: number;
}

export interface Transaction {
  id: number;
  client_id: number;
  type: TransactionType;
  amount: number;
  reason: string | null;
  created_by: number | null;
  created_at: string;
}

export interface TransactionWithClient extends Transaction {
  client_code?: string;
  client_name?: string;
}

export interface WithdrawalRequest {
  id: number;
  client_id: number;
  amount: number;
  reason: string;
  status: WithdrawalStatus;
  requested_at: string;
  validated_at: string | null;
  code?: string;
  full_name?: string;
  phone?: string;
}

export interface Employee {
  id: number;
  code: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  job_title: string | null;
  department: string | null;
  hire_date: string | null;
  base_salary: number;
  status: EmployeeStatus;
  created_at: string;
}

export interface Payroll {
  id: number;
  employee_id: number;
  month: string;
  base_salary: number;
  bonus: number;
  transport: number;
  deductions: number;
  advance: number;
  cnss: number;
  irpp: number;
  net_salary: number;
  paid_at: string;
  code?: string;
  full_name?: string;
  job_title?: string;
  phone?: string;
  department?: string;
}

export interface CashMovement {
  id: number;
  type: CashType;
  amount: number;
  reason: string | null;
  reference: string | null;
  created_by: number | null;
  created_at: string;
}

export interface OperatingCashMovement {
  id: number;
  type: CashType;
  amount: number;
  reason: string | null;
  reference: string | null;
  source: string;
  created_by: number | null;
  created_at: string;
}

export interface DashboardData {
  totalClients: number;
  carteClassique: number;
  compteLibre: number;
  totalEmployees: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  companyProfit: number;
  payrollMass: number;
  cashBalance: number;
  balance: number;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  details: string;
  created_at: string;
  full_name: string | null;
}

export interface AgentStat {
  id: number;
  full_name: string;
  username: string;
  role: string;
  operations: number;
  deposits: number;
  withdrawals: number;
}

export interface Notification {
  level: 'success' | 'info' | 'warning';
  title: string;
  message: string;
}

export interface NextCodeResponse {
  code: string;
}
