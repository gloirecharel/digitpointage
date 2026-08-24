import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Client, ClientSummary, Transaction } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { formatMoney, formatDateTime, formatDate, exportToExcel, calculateMaxWithdrawal } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { Button, Input, Select, Badge, Card, PageHeader, Spinner, ErrorBanner, EmptyState } from '@/components/ui';
import {
  Plus, Search, Pencil, Trash2, Eye, Download, Users, Printer,
  CreditCard, Scale, Info, FileSpreadsheet,
} from 'lucide-react';

type ClientFormState = Partial<Client> & { password?: string };

const emptyForm: ClientFormState = {
  code: '', full_name: '', piece_type: 'CNI', piece_number: '', phone: '',
  address: '', account_type: 'CARTE_CLASSIQUE', fixed_amount: 0, status: 'ACTIVE', password: '',
};

function AccountTypeCard({ type, selected, onClick }: { type: 'CARTE_CLASSIQUE' | 'COMPTE_LIBRE'; selected: boolean; onClick: () => void }) {
  const isClassic = type === 'CARTE_CLASSIQUE';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all duration-200 ${
        selected
          ? isClassic
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-cyan-500 bg-cyan-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm"
        style={{ backgroundImage: isClassic ? 'linear-gradient(to bottom right, #3b82f6, #2563eb)' : 'linear-gradient(to bottom right, #06b6d4, #0891b2)' }}
      >
        {isClassic ? <CreditCard size={20} /> : <Scale size={20} />}
      </div>
      <p className="text-sm font-bold text-slate-800">{isClassic ? 'Carte Classique (31 carreaux)' : 'Compte Libre'}</p>
      <p className="mt-1 text-xs text-slate-500">
        {isClassic
          ? 'Versement fixe regulier. 30 carreaux pour le client, 1 carreau = benefice entreprise. Carte de pointage.'
          : 'Compte epargne libre. Le client depose n\'importe quel somme a tout moment.'}
      </p>
    </button>
  );
}

export function ClientsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'CAISSIER']);
  const canDelete = hasRole(['ADMIN']);

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [detailSummary, setDetailSummary] = useState<ClientSummary | null>(null);
  const [detailHistory, setDetailHistory] = useState<Transaction[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);

  const load = () => {
    setLoading(true);
    api.getClients()
      .then(setClients)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  const openCreate = async () => {
    setEditing(null);
    setFormError('');
    try {
      const { code } = await api.getNextCode('client');
      setForm({ ...emptyForm, code });
    } catch {
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ ...c });
    setFormError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.code || !form.full_name || !form.account_type) {
      setFormError('Code, nom complet et type de compte sont obligatoires');
      return;
    }
    if (form.account_type === 'CARTE_CLASSIQUE' && (!form.fixed_amount || form.fixed_amount <= 0)) {
      setFormError('Le montant fixe est obligatoire pour une carte classique');
      return;
    }
    if (!editing && !form.password) {
      setFormError('Le mot de passe du client est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) {
        if (!payload.password) delete payload.password;
        await api.updateClient(editing.id, payload);
      } else {
        await api.createClient(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (c: Client) => {
    setDetailClient(c);
    setDetailLoading(true);
    try {
      const [summary, history] = await Promise.all([
        api.getClientSummary(c.id),
        api.getClientHistory(c.id),
      ]);
      setDetailSummary(summary);
      setDetailHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDetailLoading(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteClient(confirmDelete.id);
      setConfirmDelete(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const exportHistoryExcel = () => {
    if (!detailClient || !detailHistory.length) return;
    exportToExcel(
      `historique_${detailClient.code}`,
      [
        { key: 'date', label: 'Date' },
        { key: 'type', label: 'Operation' },
        { key: 'amount', label: 'Montant (FCFA)' },
        { key: 'reason', label: 'Motif' },
      ],
      detailHistory.map(t => ({
        date: formatDateTime(t.created_at),
        type: t.type === 'DEPOT' ? 'Versement' : 'Retrait',
        amount: t.amount,
        reason: t.reason || '',
      })),
      `Historique des mouvements - ${detailClient.full_name} (${detailClient.code})`,
    );
  };

  const printReceipt = (client: Client, summary: ClientSummary | null) => {
    const calc = summary ? calculateMaxWithdrawal(
      client.account_type, client.fixed_amount, summary.totalDeposits, summary.totalWithdrawals,
    ) : null;
    const w = window.open('', '_blank');
    if (!w) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=DIGITPOINTAGE-${client.code}`;
    w.document.write(`
      <html><head><title>Carte Client - ${client.full_name}</title>
      <style>
        @page{margin:15px}
        *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
        body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;max-width:480px;margin:0 auto;background:#f0f4f8;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .card{background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:20px;padding:0;overflow:hidden;box-shadow:0 10px 40px rgba(30,64,175,0.3)}
        .card-header{padding:20px 24px;text-align:center;color:white}
        .logo{font-size:28px;font-weight:800;letter-spacing:2px}
        .subtitle{font-size:11px;opacity:0.8;margin-top:2px}
        .card-body{background:white;border-radius:16px;margin:0 12px 12px;padding:20px 24px}
        .row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9}
        .row:last-child{border-bottom:none}
        .label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px}
        .value{font-size:14px;font-weight:700;color:#1e293b}
        .type-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600}
        .type-classic{background:#dbeafe;color:#1e40af}
        .type-libre{background:#cffafe;color:#0e7490}
        .qr-section{text-align:center;padding:16px 0 8px}
        .balance-box{background:#f0f9ff;border:2px solid #bae6fd;border-radius:12px;padding:12px;text-align:center;margin:12px 0}
        .balance-label{font-size:11px;color:#0369a1}
        .balance-value{font-size:22px;font-weight:800;color:#0c4a6e}
        .footer{text-align:center;font-size:9px;color:#94a3b8;padding:8px 0}
        .carreaux-info{display:flex;justify-content:space-around;margin-top:12px}
        .carreau-item{text-align:center}
        .carreau-num{font-size:20px;font-weight:800;color:#1e40af}
        .carreau-label{font-size:9px;color:#64748b}
      </style></head><body>
      <div class="card">
        <div class="card-header">
          <div class="logo">DigitPointage</div>
          <div class="subtitle">Carte Client - SMART</div>
        </div>
        <div class="card-body">
          <div class="row"><span class="label">Nom complet</span><span class="value">${client.full_name}</span></div>
          <div class="row"><span class="label">Code</span><span class="value" style="font-family:monospace">${client.code}</span></div>
          <div class="row"><span class="label">Type de compte</span><span class="type-badge ${client.account_type === 'CARTE_CLASSIQUE' ? 'type-classic' : 'type-libre'}">${client.account_type === 'CARTE_CLASSIQUE' ? 'Carte Classique (31 carreaux)' : 'Compte Libre'}</span></div>
          <div class="row"><span class="label">Telephone</span><span class="value">${client.phone || '-'}</span></div>
          <div class="row"><span class="label">Adresse</span><span class="value">${client.address || '-'}</span></div>
          ${client.account_type === 'CARTE_CLASSIQUE' ? `<div class="row"><span class="label">Montant fixe / carreau</span><span class="value">${formatMoney(client.fixed_amount)}</span></div>` : ''}
          ${summary ? `
          <div class="balance-box">
            <div class="balance-label">Solde disponible</div>
            <div class="balance-value">${formatMoney(summary.balance)}</div>
          </div>
          ${calc && client.account_type === 'CARTE_CLASSIQUE' ? `
          <div class="carreaux-info">
            <div class="carreau-item"><div class="carreau-num">${calc.carreauxPaid}/31</div><div class="carreau-label">Carreaux payes</div></div>
            <div class="carreau-item"><div class="carreau-num">${calc.carreauxRemaining}</div><div class="carreau-label">Carreaux restants</div></div>
            <div class="carreau-item"><div class="carreau-num">${formatMoney(calc.clientSaving)}</div><div class="carreau-label">Epargne prevue</div></div>
          </div>` : ''}
          ` : ''}
          <div class="qr-section"><img src="${qrUrl}" alt="QR" width="90" height="90" /></div>
        </div>
        <div class="footer">Emis le ${formatDate(client.created_at)} - DigitPointage SMART</div>
      </div>
      <script>window.print()</script>
      </body></html>
    `);
    w.document.close();
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client(s) enregistre(s)`}
        action={canEdit && <Button onClick={openCreate}><Plus size={18} /> Nouveau client</Button>}
      />

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par code, nom ou telephone..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<Users size={48} />} title="Aucun client trouve" message="Creez un nouveau client pour commencer" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Nom complet</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Telephone</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{c.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.full_name}</td>
                    <td className="px-4 py-3">
                      <Badge color={c.account_type === 'CARTE_CLASSIQUE' ? 'blue' : 'cyan'}>
                        {c.account_type === 'CARTE_CLASSIQUE' ? 'Carte Classique' : 'Compte Libre'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge color={c.status === 'ACTIVE' ? 'green' : 'red'}>
                        {c.status === 'ACTIVE' ? 'Actif' : 'Bloque'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openDetail(c)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-colors" title="Voir details">
                          <Eye size={16} />
                        </button>
                        {canEdit && (
                          <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 transition-colors" title="Modifier">
                            <Pencil size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setConfirmDelete(c)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le client' : 'Nouveau client'} size="lg">
        {formError && <ErrorBanner message={formError} />}
        <div className="space-y-4">
          {/* Account type selector */}
          {!editing && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Type de compte *</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AccountTypeCard type="CARTE_CLASSIQUE" selected={form.account_type === 'CARTE_CLASSIQUE'} onClick={() => setForm({ ...form, account_type: 'CARTE_CLASSIQUE' })} />
                <AccountTypeCard type="COMPTE_LIBRE" selected={form.account_type === 'COMPTE_LIBRE'} onClick={() => setForm({ ...form, account_type: 'COMPTE_LIBRE', fixed_amount: 0 })} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Code *" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} />
            <Input label="Nom complet *" value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            <Select label="Type de piece" value={form.piece_type || 'CNI'} onChange={e => setForm({ ...form, piece_type: e.target.value })}>
              <option value="CNI">CNI</option>
              <option value="PASSEPORT">Passeport</option>
              <option value="PERMIS">Permis</option>
              <option value="AUTRE">Autre</option>
            </Select>
            <Input label="Numero de piece" value={form.piece_number || ''} onChange={e => setForm({ ...form, piece_number: e.target.value })} />
            <Input label="Telephone" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input label="Adresse" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
            <Input
              label="Mot de passe client *"
              type="password"
              value={form.password || ''}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? 'Laisser vide pour conserver l\'ancien mot de passe' : 'Saisir un mot de passe'}
            />
            {form.account_type === 'CARTE_CLASSIQUE' && (
              <Input label="Montant fixe par carreau (FCFA) *" type="number" value={form.fixed_amount || 0} onChange={e => setForm({ ...form, fixed_amount: Number(e.target.value) })} />
            )}
            <Select label="Statut" value={form.status || 'ACTIVE'} onChange={e => setForm({ ...form, status: e.target.value as Client['status'] })}>
              <option value="ACTIVE">Actif</option>
              <option value="BLOCKED">Bloque</option>
            </Select>
          </div>

          {form.account_type === 'CARTE_CLASSIQUE' && (form.fixed_amount || 0) > 0 && (
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-xs text-blue-700">
              <Info size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Carte Classique - 31 carreaux</p>
                <p className="mt-0.5">Versement total prevu: <strong>{formatMoney((form.fixed_amount || 0) * 31)}</strong> | Epargne client (30 carreaux): <strong>{formatMoney((form.fixed_amount || 0) * 30)}</strong> | Benefice entreprise (1 carreau): <strong>{formatMoney(form.fixed_amount || 0)}</strong></p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={save} loading={saving}>{editing ? 'Enregistrer' : 'Creer'}</Button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailClient} onClose={() => { setDetailClient(null); setDetailSummary(null); setDetailHistory([]); }} title="Details du client" size="lg">
        {detailLoading ? <Spinner /> : detailClient && (() => {
          const calc = detailSummary ? calculateMaxWithdrawal(
            detailClient.account_type, detailClient.fixed_amount,
            detailSummary.totalDeposits, detailSummary.totalWithdrawals,
          ) : null;
          return (
            <div className="animate-fade-in">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Code</p><p className="font-mono font-bold text-slate-800">{detailClient.code}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Nom</p><p className="font-bold text-slate-800">{detailClient.full_name}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Telephone</p><p className="text-slate-800">{detailClient.phone || '-'}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Type</p><Badge color={detailClient.account_type === 'CARTE_CLASSIQUE' ? 'blue' : 'cyan'}>{detailClient.account_type === 'CARTE_CLASSIQUE' ? 'Carte Classique' : 'Compte Libre'}</Badge></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Montant fixe</p><p className="text-slate-800">{formatMoney(detailClient.fixed_amount)}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Statut</p><Badge color={detailClient.status === 'ACTIVE' ? 'green' : 'red'}>{detailClient.status === 'ACTIVE' ? 'Actif' : 'Bloque'}</Badge></div>
              </div>

              {detailSummary && (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg bg-emerald-50 p-3 text-center"><p className="text-xs text-emerald-600">Versements</p><p className="text-sm font-bold text-emerald-700">{formatMoney(detailSummary.totalDeposits)}</p></div>
                  <div className="rounded-lg bg-red-50 p-3 text-center"><p className="text-xs text-red-600">Retraits</p><p className="text-sm font-bold text-red-700">{formatMoney(detailSummary.totalWithdrawals)}</p></div>
                  <div className="rounded-lg bg-blue-50 p-3 text-center"><p className="text-xs text-blue-600">Solde</p><p className="text-sm font-bold text-blue-700">{formatMoney(detailSummary.balance)}</p></div>
                  <div className="rounded-lg bg-purple-50 p-3 text-center"><p className="text-xs text-purple-600">Benefice</p><p className="text-sm font-bold text-purple-700">{formatMoney(detailSummary.companyProfit)}</p></div>
                </div>
              )}

              {calc && detailClient.account_type === 'CARTE_CLASSIQUE' && (
                <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-700">Suivi carte de pointage - 31 carreaux</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-lg font-bold text-blue-700">{calc.carreauxPaid}/31</p><p className="text-xs text-blue-600">Carreaux payes</p></div>
                    <div><p className="text-lg font-bold text-blue-700">{calc.carreauxRemaining}</p><p className="text-xs text-blue-600">Carreaux restants</p></div>
                    <div><p className="text-lg font-bold text-blue-700">{formatMoney(calc.maxWithdrawal)}</p><p className="text-xs text-blue-600">Retrait max</p></div>
                  </div>
                  <div className="mt-3 space-y-1 rounded-lg bg-white/60 p-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-600">Benefice entreprise (1 carreau):</span><strong className="text-purple-600">{formatMoney(calc.companyProfit)}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-600">Caution bloquee (1 carreau):</span><strong className="text-amber-600">{formatMoney(calc.lockedAmount)}</strong></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {Array.from({ length: 31 }, (_, i) => (
                      <div key={i} className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${
                        i < calc.carreauxPaid ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
                      }`}>{i + 1}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => printReceipt(detailClient, detailSummary)}><Printer size={14} /> Carte client</Button>
                <Button variant="outline" size="sm" onClick={exportHistoryExcel} disabled={!detailHistory.length}><FileSpreadsheet size={14} /> Export Excel</Button>
                <a href={api.exportClientCsv(detailClient.id)} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm"><Download size={14} /> Export CSV</Button>
                </a>
              </div>

              <h3 className="mb-2 mt-6 text-sm font-bold text-slate-700">Historique des operations</h3>
              {detailHistory.length === 0 ? (
                <EmptyState icon={<Users size={32} />} title="Aucune operation" />
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                      <tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Montant</th><th className="px-3 py-2 text-left">Motif</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailHistory.map(t => (
                        <tr key={t.id}>
                          <td className="px-3 py-2 text-xs text-slate-500">{formatDateTime(t.created_at)}</td>
                          <td className="px-3 py-2"><Badge color={t.type === 'DEPOT' ? 'green' : 'red'}>{t.type === 'DEPOT' ? 'Versement' : 'Retrait'}</Badge></td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">{formatMoney(t.amount)}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{t.reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmer la suppression" size="sm">
        <p className="text-sm text-slate-600">Voulez-vous vraiment supprimer le client <strong>{confirmDelete?.full_name}</strong> ({confirmDelete?.code}) ? Toutes les operations liees seront egalement supprimees.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
          <Button variant="danger" onClick={doDelete}><Trash2 size={16} /> Supprimer</Button>
        </div>
      </Modal>
    </div>
  );
}
