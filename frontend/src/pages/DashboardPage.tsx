import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { DashboardData, AgentStat, CashMovement } from '@/lib/types';
import { formatMoney, formatMoneyShort } from '@/lib/utils';
import { Spinner, ErrorBanner, StatCard, Card } from '@/components/ui';
import { DonutChart, BarChart, LineChart } from '@/components/Charts';
import {
  Users, CreditCard, Wallet, TrendingUp,  Building2,
  ArrowDownCircle, ArrowUpCircle, PiggyBank, FileText, Scale, AlertCircle,
  BarChart3, PieChart, Activity,
} from 'lucide-react';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [cashRows, setCashRows] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getDashboard(),
      api.getAgentStats().catch(() => []),
      api.getCash().catch(() => ({ totalIn: 0, totalOut: 0, balance: 0, rows: [] })),
    ])
      .then(([d, stats, cash]) => {
        setData(d);
        setAgentStats(stats);
        setCashRows(cash.rows || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  const stats = [
    { label: 'Total Clients', value: data.totalClients, icon: <Users size={20} />, gradient: 'from-blue-500 to-blue-600' },
    { label: 'Carte Classique', value: data.carteClassique, icon: <CreditCard size={20} />, gradient: 'from-purple-500 to-purple-600' },
    { label: 'Compte Libre', value: data.compteLibre, icon: <Scale size={20} />, gradient: 'from-cyan-500 to-cyan-600' },
    { label: 'Employes', value: data.totalEmployees, icon: <Building2 size={20} />, gradient: 'from-amber-500 to-amber-600' },
  ];

  const financials = [
    { label: 'Total Versements', value: formatMoney(data.totalDeposits), icon: <ArrowDownCircle size={20} />, gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Total Retraits', value: formatMoney(data.totalWithdrawals), icon: <ArrowUpCircle size={20} />, gradient: 'from-red-500 to-red-600' },
    { label: 'Benefice Entreprise', value: formatMoney(data.companyProfit), icon: <TrendingUp size={20} />, gradient: 'from-blue-500 to-blue-600' },
    { label: 'Solde Caisse', value: formatMoney(data.cashBalance), icon: <Wallet size={20} />, gradient: 'from-slate-600 to-slate-700' },
    { label: 'Masse Salariale', value: formatMoney(data.payrollMass), icon: <FileText size={20} />, gradient: 'from-orange-500 to-orange-600' },
    { label: 'Solde Net', value: formatMoney(data.balance), icon: <PiggyBank size={20} />, gradient: 'from-indigo-500 to-indigo-600' },
  ];

  const accountDonut = [
    { label: 'Carte Classique', value: data.carteClassique, color: '#8b5cf6' },
    { label: 'Compte Libre', value: data.compteLibre, color: '#06b6d4' },
  ];

  const flowBars = [
    { label: 'Versements', value: data.totalDeposits, color: 'linear-gradient(to top, #10b981, #34d399)' },
    { label: 'Retraits', value: data.totalWithdrawals, color: 'linear-gradient(to top, #ef4444, #f87171)' },
    { label: 'Benefice', value: data.companyProfit, color: 'linear-gradient(to top, #3b82f6, #60a5fa)' },
    { label: 'Salaires', value: data.payrollMass, color: 'linear-gradient(to top, #f97316, #fb923c)' },
    { label: 'Solde', value: data.balance, color: 'linear-gradient(to top, #6366f1, #818cf8)' },
  ];

  const last7 = cashRows.slice(0, 7).reverse();
  const lineData = last7.map((r, i) => ({
    label: `J-${last7.length - i}`,
    value: r.type === 'ENTREE' ? r.amount : -r.amount,
  }));

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-500">Vue d'ensemble de l'activite</p>
      </div>

      {/* Count cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 50} />
        ))}
      </div>

      {/* Financial cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {financials.map((f, i) => (
          <StatCard key={f.label} {...f} delay={200 + i * 50} />
        ))}
      </div>

      {/* Charts row */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Donut: account types */}
        <Card className="p-5 animate-slide-up" >
          <div className="mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-700">Repartition des comptes</h3>
          </div>
          <div className="flex items-center justify-center py-4">
            <DonutChart data={accountDonut} size={180} thickness={28} />
          </div>
        </Card>

        {/* Bar: financial flows */}
        <Card className="p-5 animate-slide-up">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-700">Flux financiers (FCFA)</h3>
          </div>
          <BarChart data={flowBars} height={200} formatValue={(n) => formatMoneyShort(n)} />
        </Card>
      </div>

      {/* Second row: agent activity + cash trend */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Agent activity bar chart */}
        <Card className="p-5 animate-slide-up">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-700">Activite des agents (operations)</h3>
          </div>
          {agentStats.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">Aucune donnee</div>
          ) : (
            <BarChart
              data={agentStats.slice(0, 8).map(a => ({
                label: a.full_name.split(' ')[0],
                value: a.operations,
                color: 'linear-gradient(to top, #3b82f6, #60a5fa)',
              }))}
              height={200}
            />
          )}
        </Card>

        {/* Cash trend line chart */}
        <Card className="p-5 animate-slide-up">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-700">Tendance caisse (7 derniers mouvements)</h3>
          </div>
          {lineData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">Aucun mouvement recent</div>
          ) : (
            <LineChart data={lineData} height={200} color="#3b82f6" formatValue={(n) => formatMoneyShort(Math.abs(n))} />
          )}
        </Card>
      </div>

      {/* Pending withdrawals alert */}
      {data.pendingWithdrawals > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 animate-slide-up">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">{data.pendingWithdrawals} demande(s) de retrait en attente</p>
            <p className="text-xs text-amber-600">Verifiez la page « Demandes de retrait » pour valider</p>
          </div>
        </div>
      )}
    </div>
  );
}
