import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { WithdrawalRequest, Client } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { formatMoney, formatDateTime, hoursSince } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, Input, Textarea, Badge, Card, PageHeader, Spinner, ErrorBanner, EmptyState } from '@/components/ui';
import { Plus, FileText, Check, X, Clock } from 'lucide-react';

export function WithdrawalsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'CAISSIER']);

  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({ client_id: '', amount: 0, reason: '' });

  const load = () => {
    setLoading(true);
    Promise.all([api.getWithdrawalRequests(), api.getClients()])
      .then(([r, c]) => { setRequests(r); setClients(c.filter(cl => cl.status === 'ACTIVE')); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.client_id) { setFormError('Sélectionnez un client'); return; }
    if (!form.amount || form.amount <= 0) { setFormError('Montant invalide'); return; }
    if (!form.reason) { setFormError('Motif obligatoire'); return; }
    setSaving(true);
    setFormError('');
    try {
      await api.createWithdrawalRequest({ client_id: Number(form.client_id), amount: Number(form.amount), reason: form.reason });
      setModalOpen(false);
      setForm({ client_id: '', amount: 0, reason: '' });
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const validate = async (id: number) => {
    try {
      await api.validateWithdrawalRequest(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const reject = async (id: number) => {
    try {
      await api.rejectWithdrawalRequest(id);
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
        title="Demandes de retrait"
        subtitle={`${requests.filter(r => r.status === 'PENDING').length} en attente`}
        action={canEdit && <Button onClick={() => { setForm({ client_id: '', amount: 0, reason: '' }); setFormError(''); setModalOpen(true); }}><Plus size={18} /> Nouvelle demande</Button>}
      />

      <Card>
        {requests.length === 0 ? (
          <EmptyState icon={<FileText size={48} />} title="Aucune demande de retrait" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Montant</th>
                  <th className="px-4 py-3 font-semibold">Motif</th>
                  <th className="px-4 py-3 font-semibold">Demandé le</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map(r => {
                  const hours = hoursSince(r.requested_at);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{r.full_name || '-'}</p>
                        <p className="text-xs text-slate-500">{r.code || ''}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{formatMoney(r.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{r.reason}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(r.requested_at)}</td>
                      <td className="px-4 py-3">
                        {r.status === 'PENDING' ? (
                          <Badge color={hours >= 24 ? 'green' : 'amber'}>
                            {hours >= 24 ? 'Prêt (24h atteintes)' : `Attente (${Math.ceil(24 - hours)}h restantes)`}
                          </Badge>
                        ) : r.status === 'PAID' ? (
                          <Badge color="green">Payé</Badge>
                        ) : (
                          <Badge color="red">Rejeté</Badge>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          {r.status === 'PENDING' && (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => validate(r.id)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 transition-colors" title="Valider">
                                <Check size={16} />
                              </button>
                              <button onClick={() => reject(r.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors" title="Rejeter">
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle demande de retrait" size="md">
        {formError && <ErrorBanner message={formError} />}
        <div className="space-y-4">
          <SearchSelect
            label="Client *"
            placeholder="Rechercher un client..."
            value={form.client_id}
            onChange={val => setForm({ ...form, client_id: val })}
            options={clients.map(c => ({
              value: String(c.id),
              label: `${c.code} - ${c.full_name}`,
              sublabel: c.account_type === 'CARTE_CLASSIQUE' ? 'Carte Classique' : 'Compte Libre',
            }))}
          />
          <Input label="Montant (FCFA) *" type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          <Textarea label="Motif *" rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            <Clock size={14} className="mt-0.5 shrink-0" />
            <span>Le paiement sera possible 24h après la création de la demande.</span>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={create} loading={saving}>Créer la demande</Button>
        </div>
      </Modal>
    </div>
  );
}
