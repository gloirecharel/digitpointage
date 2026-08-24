import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { AgentStat, Notification, User, AuditLog } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { formatMoney, formatDateTime, exportToExcel } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { Button, Input, Select, Badge, Card, PageHeader, Spinner, ErrorBanner, EmptyState } from '@/components/ui';
import { BarChart3, Bell, Shield, CircleDot, Plus, Database, Download, TrendingUp, TrendingDown, Activity, FileSpreadsheet, Search, RotateCcw } from 'lucide-react';

export function AgentStatsPage() {
  const [stats, setStats] = useState<AgentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAgentStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  const maxOps = Math.max(...stats.map(s => s.operations), 1);

  const exportExcel = () => {
    exportToExcel(
      'statistiques_agents',
      [
        { key: 'full_name', label: 'Agent' },
        { key: 'username', label: 'Utilisateur' },
        { key: 'role', label: 'Role' },
        { key: 'operations', label: 'Operations' },
        { key: 'deposits', label: 'Versements (FCFA)' },
        { key: 'withdrawals', label: 'Retraits (FCFA)' },
      ],
      stats.map(s => ({
        full_name: s.full_name,
        username: s.username,
        role: s.role,
        operations: s.operations,
        deposits: s.deposits,
        withdrawals: s.withdrawals,
      })),
      'Statistiques des agents - DigitPointage SMART',
    );
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Statistiques des agents"
        subtitle="Performance des utilisateurs"
        action={stats.length > 0 && <Button variant="outline" onClick={exportExcel}><FileSpreadsheet size={18} /> Export Excel</Button>}
      />
      <Card>
        {stats.length === 0 ? (
          <EmptyState icon={<BarChart3 size={48} />} title="Aucune donnee" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Agent</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold text-center">Operations</th>
                  <th className="px-4 py-3 font-semibold text-right">Versements</th>
                  <th className="px-4 py-3 font-semibold text-right">Retraits</th>
                  <th className="px-4 py-3 font-semibold">Activite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{s.full_name}</p>
                      <p className="text-xs text-slate-500">@{s.username}</p>
                    </td>
                    <td className="px-4 py-3"><Badge color="blue">{s.role}</Badge></td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{s.operations}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(s.deposits)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatMoney(s.withdrawals)}</td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-24 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500" style={{ width: `${(s.operations / maxOps) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.getNotifications()
      .then(setNotifs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  const icons = {
    success: <TrendingUp className="text-emerald-600" size={20} />,
    info: <Bell className="text-blue-600" size={20} />,
    warning: <Activity className="text-amber-600" size={20} />,
  };
  const bgs = { success: 'bg-emerald-50', info: 'bg-blue-50', warning: 'bg-amber-50' };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Alertes" subtitle="Notifications intelligentes" />
      {notifs.length === 0 ? (
        <Card><EmptyState icon={<Bell size={48} />} title="Aucune notification" message="Tout est a jour" /></Card>
      ) : (
        <div className="space-y-3">
          {notifs.map((n, i) => (
            <Card key={i} className={`flex items-center gap-4 p-4 ${bgs[n.level]} animate-slide-up`} >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">{icons[n.level]}</div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                <p className="text-xs text-slate-600">{n.message}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function UsersPage() {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ full_name: '', username: '', password: '', role: 'ADMIN' });

  const load = () => {
    setLoading(true);
    api.getUsers()
      .then(setUsers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.full_name || !form.username || !form.password) { setFormError('Tous les champs sont obligatoires'); return; }
    setSaving(true);
    setFormError('');
    try {
      await api.createUser(form);
      setModalOpen(false);
      setForm({ full_name: '', username: '', password: '', role: 'ADMIN' });
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u: User) => {
    try {
      await api.updateUserStatus(u.id, u.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users.length} utilisateur(s)`}
        action={hasRole(['ADMIN']) && <Button onClick={() => { setForm({ full_name: '', username: '', password: '', role: 'ADMIN' }); setFormError(''); setModalOpen(true); }}><Plus size={18} /> Nouvel utilisateur</Button>}
      />
      <Card>
        {users.length === 0 ? (
          <EmptyState icon={<Shield size={48} />} title="Aucun utilisateur" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Utilisateur</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Cree le</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">@{u.username}</td>
                    <td className="px-4 py-3"><Badge color={u.role === 'SUPER_ADMIN' ? 'purple' : 'blue'}>{u.role}</Badge></td>
                    <td className="px-4 py-3"><Badge color={u.status === 'ACTIVE' ? 'green' : 'red'}>{u.status === 'ACTIVE' ? 'Actif' : 'Bloque'}</Badge></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'SUPER_ADMIN' && (
                        <button onClick={() => toggleStatus(u)} className="text-xs font-medium text-blue-600 hover:underline">
                          {u.status === 'ACTIVE' ? 'Bloquer' : 'Activer'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel utilisateur" size="md">
        {formError && <ErrorBanner message={formError} />}
        <div className="space-y-4">
          <Input label="Nom complet *" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Nom d'utilisateur *" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <Input label="Mot de passe *" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Select label="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="ADMIN">Admin</option>
            <option value="CAISSIER">Caissier</option>
            <option value="RH">Ressources Humaines</option>
            <option value="CONSULTATION">Consultation</option>
          </Select>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={create} loading={saving}>Creer</Button>
        </div>
      </Modal>
    </div>
  );
}

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    api.getAuditLogs()
      .then(setLogs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  const actions = [...new Set(logs.map(log => log.action))].sort();
  const users = [...new Set(logs.map(log => log.full_name || 'Systeme'))].sort();
  const normalizedSearch = search.trim().toLowerCase();
  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.created_at).getTime();
    const matchesSearch = !normalizedSearch || [log.action, log.details, log.full_name || 'Systeme']
      .join(' ').toLowerCase().includes(normalizedSearch);
    const matchesAction = !actionFilter || log.action === actionFilter;
    const matchesUser = !userFilter || (log.full_name || 'Systeme') === userFilter;
    const matchesFrom = !dateFrom || logDate >= new Date(`${dateFrom}T00:00:00`).getTime();
    const matchesTo = !dateTo || logDate <= new Date(`${dateTo}T23:59:59.999`).getTime();
    return matchesSearch && matchesAction && matchesUser && matchesFrom && matchesTo;
  });

  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const exportExcel = () => {
    exportToExcel(
      'journal_actions',
      [
        { key: 'date', label: 'Date' },
        { key: 'user', label: 'Utilisateur' },
        { key: 'action', label: 'Action' },
        { key: 'details', label: 'Details' },
      ],
      filteredLogs.map(l => ({
        date: formatDateTime(l.created_at),
        user: l.full_name || 'Systeme',
        action: l.action,
        details: l.details || '',
      })),
      'Journal des actions - DigitPointage SMART',
    );
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Journal des actions"
        subtitle={`${filteredLogs.length} action(s) affichee(s) sur ${logs.length} (200 dernieres)`}
        action={filteredLogs.length > 0 && <Button variant="outline" onClick={exportExcel}><FileSpreadsheet size={18} /> Export Excel</Button>}
      />
      <Card>
        {logs.length > 0 && (
          <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-6">
            <Input placeholder="Rechercher une action..." value={search} onChange={e => setSearch(e.target.value)} className="lg:col-span-2" />
            <Select value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
              <option value="">Toutes les actions</option>
              {actions.map(action => <option key={action} value={action}>{action}</option>)}
            </Select>
            <Select value={userFilter} onChange={e => setUserFilter(e.target.value)}>
              <option value="">Tous les utilisateurs</option>
              {users.map(user => <option key={user} value={user}>{user}</option>)}
            </Select>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-2">
              <Input className="min-w-0" type="date" aria-label="Date de debut" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <Input className="min-w-0" type="date" aria-label="Date de fin" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            {(search || actionFilter || userFilter || dateFrom || dateTo) && (
              <Button variant="ghost" onClick={clearFilters}><RotateCcw size={16} /> Reinitialiser</Button>
            )}
          </div>
        )}
        {logs.length === 0 ? (
          <EmptyState icon={<CircleDot size={48} />} title="Aucune action enregistree" />
        ) : filteredLogs.length === 0 ? (
          <EmptyState icon={<Search size={48} />} title="Aucun resultat" message="Modifiez les filtres pour afficher des actions." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Utilisateur</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(l.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{l.full_name || 'Systeme'}</td>
                    <td className="px-4 py-3"><Badge color="blue">{l.action}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{l.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function BackupPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="Sauvegarde" subtitle="Centre de sauvegarde de la base de donnees" />
      <Card className="p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Database size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Telecharger la sauvegarde</h3>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Telechargez une copie complete de la base de donnees au format SQLite.
            Cette sauvegarde peut etre restauree ulterieurement en cas de besoin.
          </p>
          <a href={api.getBackupUrl()} target="_blank" rel="noreferrer" className="mt-6">
            <Button size="lg"><Download size={18} /> Telecharger la sauvegarde</Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
