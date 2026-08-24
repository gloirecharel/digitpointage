import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { Client, Transaction } from '@/lib/types';
import { formatMoney, formatDateTime } from '@/lib/utils';
import { Button, Card, Spinner, Input, Textarea } from '@/components/ui';
import { ArrowDownCircle, ArrowUpCircle, Wallet, LandPlot, Send, LogOut } from 'lucide-react';

export function ClientSpacePage() {
  const { user, logout } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [deposits, setDeposits] = useState(0);
  const [withdrawals, setWithdrawals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getClientPortal();
      setClient(data.client);
      setBalance(data.balance);
      setDeposits(data.totalDeposits);
      setWithdrawals(data.totalWithdrawals);
      setTransactions(data.withdrawals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submitWithdrawal = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Le montant du retrait est invalide');
      return;
    }

    if (!reason.trim()) {
      setError('Le motif du retrait est obligatoire');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const res = await api.createClientWithdrawalRequest({ amount: Number(amount), reason: reason.trim() });
      alert(res.message);
      setAmount('');
      setReason('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Spinner /></div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Espace client</p>
            <h1 className="text-3xl font-bold text-slate-800">Bonjour {user?.full_name}</h1>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Solde actuel</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">{formatMoney(balance)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Wallet size={22} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Versements</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">{formatMoney(deposits)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <ArrowDownCircle size={22} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Retraits</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">{formatMoney(withdrawals)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <ArrowUpCircle size={22} />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <LandPlot className="text-cyan-600" size={18} />
              <h2 className="text-lg font-bold text-slate-800">Informations du compte</h2>
            </div>

            {client && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Code client</p>
                  <p className="mt-1 font-mono font-bold text-slate-800">{client.code}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Nom</p>
                  <p className="mt-1 font-bold text-slate-800">{client.full_name}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Type de compte</p>
                  <p className="mt-1 font-bold text-slate-800">{client.account_type === 'CARTE_CLASSIQUE' ? 'Carte Classique' : 'Compte Libre'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Téléphone</p>
                  <p className="mt-1 font-bold text-slate-800">{client.phone || '-'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-xs text-slate-500">Adresse</p>
                  <p className="mt-1 font-bold text-slate-800">{client.address || '-'}</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <Send className="text-amber-600" size={18} />
              <h2 className="text-lg font-bold text-slate-800">Demande de retrait</h2>
            </div>

            <div className="space-y-4">
              <Input label="Montant" type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 50000" />
              <Textarea label="Motif" value={reason} onChange={e => setReason(e.target.value)} placeholder="Décrivez le motif de votre retrait" rows={4} />
              <Button onClick={submitWithdrawal} loading={saving} className="w-full">Envoyer la demande</Button>
            </div>
          </Card>
        </div>

        <Card className="mt-6 p-5">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Historique des retraits</h2>

          {transactions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Aucun retrait enregistré pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Montant</th>
                    <th className="px-3 py-2 font-medium">Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{formatDateTime(tx.created_at)}</td>
                      <td className="px-3 py-2 font-bold text-slate-800">{formatMoney(tx.amount)}</td>
                      <td className="px-3 py-2 text-slate-700">{tx.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
