import { type ReactNode, useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, ArrowLeftRight, Wallet, Building2, UserCog,
  FileText, Bell, Shield, BarChart3, LogOut, Menu, X, Database,
  ChevronRight, CircleDot,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { UserRole } from '@/lib/types';
import logo from '@/assets/digitpointage-logo.svg';

export type PageKey =
  | 'dashboard' | 'clients' | 'operations' | 'withdrawals'
  | 'cash' | 'operating-cash' | 'employees' | 'payrolls'
  | 'agent-stats' | 'notifications' | 'users' | 'audit' | 'backup';

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
  roles: UserRole[];
  group: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard size={18} />, roles: ['ADMIN', 'CAISSIER', 'RH', 'CONSULTATION'], group: 'Principal' },
  { key: 'clients', label: 'Clients', icon: <Users size={18} />, roles: ['ADMIN', 'CAISSIER', 'CONSULTATION'], group: 'Principal' },
  { key: 'operations', label: 'Versements / Retraits', icon: <ArrowLeftRight size={18} />, roles: ['ADMIN', 'CAISSIER'], group: 'Principal' },
  { key: 'withdrawals', label: 'Demandes de retrait', icon: <FileText size={18} />, roles: ['ADMIN', 'CAISSIER', 'CONSULTATION'], group: 'Principal' },
  { key: 'cash', label: 'Caisse', icon: <Wallet size={18} />, roles: ['ADMIN', 'RH', 'CONSULTATION'], group: 'Finance' },
  { key: 'operating-cash', label: 'Caisse de fonctionnement', icon: <Building2 size={18} />, roles: ['ADMIN', 'CAISSIER', 'CONSULTATION'], group: 'Finance' },
  { key: 'employees', label: 'Employés', icon: <UserCog size={18} />, roles: ['ADMIN', 'RH', 'CONSULTATION'], group: 'Personnel' },
  { key: 'payrolls', label: 'Paies', icon: <FileText size={18} />, roles: ['ADMIN', 'RH', 'CONSULTATION'], group: 'Personnel' },
  { key: 'agent-stats', label: 'Statistiques agents', icon: <BarChart3 size={18} />, roles: ['ADMIN', 'CONSULTATION'], group: 'Outils' },
  { key: 'notifications', label: 'Alertes', icon: <Bell size={18} />, roles: ['ADMIN', 'CAISSIER', 'RH', 'CONSULTATION'], group: 'Outils' },
  { key: 'users', label: 'Utilisateurs', icon: <Shield size={18} />, roles: ['ADMIN'], group: 'Administration' },
  { key: 'audit', label: 'Journal des actions', icon: <CircleDot size={18} />, roles: ['ADMIN'], group: 'Administration' },
  { key: 'backup', label: 'Sauvegarde', icon: <Database size={18} />, roles: ['ADMIN'], group: 'Administration' },
];

export function Layout({ current, onNavigate, children }: { current: PageKey; onNavigate: (p: PageKey) => void; children: ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const list = await api.getNotifications();
        setNotifCount(list.length);
      } catch { /* ignore */ }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [current]);

  const visibleItems = navItems.filter(item => hasRole(item.roles));
  const groups = [...new Set(visibleItems.map(i => i.group))];

  const handleNavigate = (p: PageKey) => {
    onNavigate(p);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed z-40 flex h-full w-64 flex-col bg-slate-900 transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
            <img src={logo} alt="DigitPointage" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">DigitPointage</p>
            <p className="text-slate-400 text-xs">SMART</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map(group => (
            <div key={group} className="mb-4">
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{group}</p>
              {visibleItems.filter(i => i.group === group).map(item => (
                <button
                  key={item.key}
                  onClick={() => handleNavigate(item.key)}
                  className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    current === item.key
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.key === 'notifications' && notifCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{notifCount}</span>
                  )}
                  {current === item.key && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-700 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-lg bg-slate-800 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.full_name}</p>
              <p className="truncate text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-red-600/20 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
            <Menu size={20} />
          </button>
          <p className="font-bold text-slate-800">DigitPointage</p>
          <button onClick={() => handleNavigate('notifications')} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
            <Bell size={20} />
            {notifCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
