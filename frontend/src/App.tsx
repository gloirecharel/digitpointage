import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Layout, type PageKey } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { OperationsPage } from '@/pages/OperationsPage';
import { WithdrawalsPage } from '@/pages/WithdrawalsPage';
import { CashPage, OperatingCashPage } from '@/pages/CashPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { PayrollsPage } from '@/pages/PayrollsPage';
import { ClientSpacePage } from '@/pages/ClientSpacePage';
import {
  AgentStatsPage, NotificationsPage, UsersPage, AuditPage, BackupPage,
} from '@/pages/ToolsPages';

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('dashboard');

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Chargement...</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (user.role === 'CLIENT') return <ClientSpacePage />;

  const pages: Record<PageKey, React.ReactNode> = {
    'dashboard': <DashboardPage />,
    'clients': <ClientsPage />,
    'operations': <OperationsPage />,
    'withdrawals': <WithdrawalsPage />,
    'cash': <CashPage />,
    'operating-cash': <OperatingCashPage />,
    'employees': <EmployeesPage />,
    'payrolls': <PayrollsPage />,
    'agent-stats': <AgentStatsPage />,
    'notifications': <NotificationsPage />,
    'users': <UsersPage />,
    'audit': <AuditPage />,
    'backup': <BackupPage />,
  };

  return (
    <Layout current={page} onNavigate={setPage}>
      {pages[page]}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
