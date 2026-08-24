import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Client, TransactionType, ClientSummary } from '@/lib/types';
import { formatMoney, formatDateTime, calculateMaxWithdrawal } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, Input, Select, Textarea, Badge, Card, PageHeader, Spinner, ErrorBanner } from '@/components/ui';
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Printer, CheckCircle, Info, CreditCard, Scale } from 'lucide-react';

export function OperationsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({ client_id: '', type: 'DEPOT' as TransactionType, amount: 0, reason: '' });
  const [clientSummary, setClientSummary] = useState<ClientSummary | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [lastReceipt, setLastReceipt] = useState<{
    client: Client; type: string; amount: number; reason: string; date: string;
  } | null>(null);

  const load = () => {
    api.getClients()
      .then(c => setClients(c.filter(cl => cl.status === 'ACTIVE')))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onClientChange = async (id: string) => {
    const client = id ? clients.find(c => c.id === Number(id)) || null : null;
    setSelectedClient(client);
    if (client && client.account_type === 'CARTE_CLASSIQUE' && client.fixed_amount > 0 && form.type === 'DEPOT') {
      setForm({ ...form, client_id: id, amount: client.fixed_amount });
    } else {
      setForm({ ...form, client_id: id });
    }
    if (id) {
      try {
        const summary = await api.getClientSummary(Number(id));
        setClientSummary(summary);
      } catch { setClientSummary(null); }
    } else {
      setClientSummary(null);
    }
  };

  const calc = clientSummary && selectedClient
    ? calculateMaxWithdrawal(selectedClient.account_type, selectedClient.fixed_amount, clientSummary.totalDeposits, clientSummary.totalWithdrawals)
    : null;

  const save = async () => {
    if (!form.client_id) { setFormError('Selectionnez un client'); return; }
    if (!form.amount || form.amount <= 0) { setFormError('Montant invalide'); return; }
    if (form.type === 'RETRAIT' && !form.reason) { setFormError('Motif obligatoire pour le retrait'); return; }
    if (form.type === 'RETRAIT' && calc && form.amount > calc.maxWithdrawal) {
      setFormError(`Montant superieur au retrait maximum autorise: ${formatMoney(calc.maxWithdrawal)}`);
      return;
    }
    if (form.type === 'DEPOT' && selectedClient?.account_type === 'CARTE_CLASSIQUE' && selectedClient.fixed_amount > 0) {
      if (form.amount !== selectedClient.fixed_amount) {
        setFormError(`Pour une carte classique, le versement doit etre egal au montant fixe: ${formatMoney(selectedClient.fixed_amount)}`);
        return;
      }
    }
    setSaving(true);
    setFormError('');
    try {
      await api.createTransaction({ client_id: Number(form.client_id), type: form.type, amount: Number(form.amount), reason: form.reason });
      const client = clients.find(c => c.id === Number(form.client_id));
      if (client) {
        setLastReceipt({ client, type: form.type, amount: Number(form.amount), reason: form.reason, date: new Date().toISOString() });
      }
      setSuccess('Operation enregistree avec succes');
      setTimeout(() => setSuccess(''), 4000);
      setModalOpen(false);
      setForm({ client_id: '', type: 'DEPOT', amount: 0, reason: '' });
      setClientSummary(null);
      setSelectedClient(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const printReceipt = () => {
    if (!lastReceipt) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=DIGITPOINTAGE-RECU-${lastReceipt.client.code}-${Date.now()}`;
    const isDeposit = lastReceipt.type === 'DEPOT';
    w.document.write(`
      <html><head><title>Reco - ${lastReceipt.client.full_name}</title>
      <style>
        @page{margin:12px}
        *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
        body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;max-width:380px;margin:0 auto;background:#f0f4f8;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .receipt{background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(30,64,175,0.3)}
        .header{padding:20px 24px;text-align:center;color:white}
        .logo{font-size:26px;font-weight:800;letter-spacing:2px}
        .subtitle{font-size:11px;opacity:0.8;margin-top:2px}
        .body{background:white;border-radius:16px;margin:0 12px 12px;padding:20px 24px}
        .row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f1f5f9}
        .row:last-child{border-bottom:none}
        .label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px}
        .value{font-size:13px;font-weight:700;color:#1e293b}
        .total{margin-top:14px;padding:16px;border-radius:12px;text-align:center}
        .total-deposit{background:#ecfdf5;border:2px solid #a7f3d0}
        .total-withdraw{background:#fef2f2;border:2px solid #fecaca}
        .total-label{font-size:12px}
        .total-deposit .total-label{color:#047857}
        .total-withdraw .total-label{color:#b91c1c}
        .total-value{font-size:24px;font-weight:800;margin-top:4px}
        .total-deposit .total-value{color:#065f46}
        .total-withdraw .total-value{color:#991b1b}
        .qr{text-align:center;margin-top:14px}
        .footer{text-align:center;font-size:9px;color:#94a3b8;padding:8px 0}
      </style></head><body>
      <div class="receipt">
        <div class="header">
          <div class="logo">DigitPointage</div>
          <div class="subtitle">Reco de ${isDeposit ? 'Versement' : 'Retrait'}</div>
        </div>
        <div class="body">
          <div class="row"><span class="label">Client</span><span class="value">${lastReceipt.client.full_name}</span></div>
          <div class="row"><span class="label">Code</span><span class="value" style="font-family:monospace">${lastReceipt.client.code}</span></div>
          <div class="row"><span class="label">Telephone</span><span class="value">${lastReceipt.client.phone || '-'}</span></div>
          <div class="row"><span class="label">Type compte</span><span class="value">${lastReceipt.client.account_type === 'CARTE_CLASSIQUE' ? 'Carte Classique' : 'Compte Libre'}</span></div>
          <div class="row"><span class="label">Operation</span><span class="value">${isDeposit ? 'Versement' : 'Retrait'}</span></div>
          <div class="row"><span class="label">Motif</span><span class="value">${lastReceipt.reason || '-'}</span></div>
          <div class="row"><span class="label">Date</span><span class="value">${formatDateTime(lastReceipt.date)}</span></div>
          <div class="total ${isDeposit ? 'total-deposit' : 'total-withdraw'}">
            <div class="total-label">Montant ${isDeposit ? 'verse' : 'retire'}</div>
            <div class="total-value">${formatMoney(lastReceipt.amount)}</div>
          </div>
          <div class="qr"><img src="${qrUrl}" alt="QR" width="80" height="80" /></div>
        </div>
        <div class="footer">DigitPointage SMART - Reco officiel</div>
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
        title="Versements / Retraits"
        subtitle="Enregistrer une operation sur un compte client"
        action={<Button onClick={() => { setForm({ client_id: '', type: 'DEPOT', amount: 0, reason: '' }); setFormError(''); setClientSummary(null); setSelectedClient(null); setModalOpen(true); }}><Plus size={18} /> Nouvelle operation</Button>}
      />

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-slide-up">
          <CheckCircle size={18} /> {success}
          {lastReceipt && <button onClick={printReceipt} className="ml-auto text-blue-600 hover:underline font-medium">Imprimer le reco</button>}
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20">
            <ArrowLeftRight size={32} />
          </div>
          <p className="text-sm font-medium text-slate-600">Enregistrer un versement ou un retrait</p>
          <p className="mt-1 text-xs text-slate-400">Cliquez sur « Nouvelle operation » pour commencer</p>
          <Button className="mt-4" onClick={() => { setForm({ client_id: '', type: 'DEPOT', amount: 0, reason: '' }); setFormError(''); setClientSummary(null); setSelectedClient(null); setModalOpen(true); }}>
            <Plus size={18} /> Nouvelle operation
          </Button>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle operation" size="md">
        {formError && <ErrorBanner message={formError} />}
        <div className="space-y-4">
          <SearchSelect
            label="Client *"
            placeholder="Rechercher un client..."
            value={form.client_id}
            onChange={onClientChange}
            options={clients.map(c => ({
              value: String(c.id),
              label: `${c.code} - ${c.full_name}`,
              sublabel: c.account_type === 'CARTE_CLASSIQUE' ? 'Carte Classique' : 'Compte Libre',
            }))}
          />

          {selectedClient && (
            <div className={`flex items-center gap-3 rounded-lg p-3 ${selectedClient.account_type === 'CARTE_CLASSIQUE' ? 'bg-blue-50' : 'bg-cyan-50'}`}>
              {selectedClient.account_type === 'CARTE_CLASSIQUE' ? <CreditCard size={18} className="text-blue-600" /> : <Scale size={18} className="text-cyan-600" />}
              <div className="text-xs">
                <p className="font-semibold text-slate-700">{selectedClient.account_type === 'CARTE_CLASSIQUE' ? 'Carte Classique (31 carreaux)' : 'Compte Libre'}</p>
                {selectedClient.account_type === 'CARTE_CLASSIQUE' && <p className="text-slate-500">Montant fixe: {formatMoney(selectedClient.fixed_amount)}</p>}
              </div>
            </div>
          )}

          <Select label="Type d'operation *" value={form.type} onChange={e => {
            const newType = e.target.value as TransactionType;
            if (newType === 'DEPOT' && selectedClient?.account_type === 'CARTE_CLASSIQUE' && selectedClient.fixed_amount > 0) {
              setForm({ ...form, type: newType, amount: selectedClient.fixed_amount });
            } else {
              setForm({ ...form, type: newType });
            }
          }}>
            <option value="DEPOT">Versement</option>
            <option value="RETRAIT">Retrait</option>
          </Select>

          {selectedClient?.account_type === 'CARTE_CLASSIQUE' && form.type === 'DEPOT' && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>Pour une carte classique, le versement doit etre egal au montant fixe: <strong>{formatMoney(selectedClient.fixed_amount)}</strong></span>
            </div>
          )}

          <Input
            label="Montant (FCFA) *"
            type="number"
            value={form.amount || ''}
            onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
          />

          {calc && form.type === 'RETRAIT' && (
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold text-red-700">Limite de retrait</p>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-600">Total verse:</span> <strong className="text-slate-800">{formatMoney(selectedClient ? (clientSummary?.totalDeposits || 0) : 0)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Total retire:</span> <strong className="text-slate-800">{formatMoney(clientSummary?.totalWithdrawals || 0)}</strong></div>
                {selectedClient?.account_type === 'CARTE_CLASSIQUE' && (
                  <>
                    <div className="flex justify-between"><span className="text-slate-600">Benefice entreprise (1 carreau):</span> <strong className="text-red-600">-{formatMoney(calc.companyProfit)}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-600">Caution bloquee (1 carreau):</span> <strong className="text-red-600">-{formatMoney(calc.lockedAmount)}</strong></div>
                  </>
                )}
                <div className="mt-2 flex justify-between border-t border-red-200 pt-2"><span className="font-semibold text-red-700">Retrait maximum:</span> <strong className="text-lg text-red-700">{formatMoney(calc.maxWithdrawal)}</strong></div>
              </div>
              {form.amount > calc.maxWithdrawal && (
                <p className="mt-2 text-xs font-bold text-red-600">Le montant depasse le retrait maximum autorise!</p>
              )}
            </div>
          )}

          <Textarea label={form.type === 'RETRAIT' ? 'Motif (obligatoire pour retrait) *' : 'Motif (optionnel)'} rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={save} loading={saving}>
            {form.type === 'DEPOT' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
