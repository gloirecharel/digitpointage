import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { CashMovement, OperatingCashMovement } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { formatMoney, formatDateTime, exportToExcel } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { Button, Input, Badge, Card, PageHeader, Spinner, ErrorBanner, EmptyState, StatCard } from '@/components/ui';
import {
  Plus, Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown, Scale,
  Calculator, FileSpreadsheet, ChevronDown, ChevronUp,
} from 'lucide-react';

export function CashPage() {
  const { hasRole } = useAuth();
  const canDeposit = hasRole(['ADMIN']);

  const [data, setData] = useState<{ totalIn: number; totalOut: number; balance: number; rows: CashMovement[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ amount: 0, reason: '', reference: '' });

  const load = () => {
    setLoading(true);
    api.getCash().then(setData).catch(err => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deposit = async () => {
    if (!form.amount || form.amount <= 0) { setFormError('Montant invalide'); return; }
    setSaving(true); setFormError('');
    try {
      await api.depositCash({ amount: Number(form.amount), reason: form.reason, reference: form.reference });
      setModalOpen(false); setForm({ amount: 0, reason: '', reference: '' }); load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erreur'); }
    finally { setSaving(false); }
  };

  const openDepositModal = async () => {
    try {
      const { code } = await api.getNextCode('deposit');
      setForm({ amount: 0, reason: '', reference: code });
    } catch {
      setForm({ amount: 0, reason: '', reference: `DEP-${new Date().getFullYear()}-AUTO` });
    }
    setFormError('');
    setModalOpen(true);
  };

  const exportExcel = () => {
    if (!data || !data.rows.length) return;
    exportToExcel(
      'mouvements_caisse',
      [
        { key: 'date', label: 'Date' },
        { key: 'type', label: 'Type' },
        { key: 'amount', label: 'Montant (FCFA)' },
        { key: 'reason', label: 'Motif' },
        { key: 'reference', label: 'Reference' },
      ],
      data.rows.map(r => ({
        date: formatDateTime(r.created_at),
        type: r.type === 'ENTREE' ? 'Entree' : 'Sortie',
        amount: r.amount,
        reason: r.reason || '',
        reference: r.reference || '',
      })),
      'Mouvements de caisse - DigitPointage SMART',
    );
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Caisse" subtitle="Gestion de la caisse principale"
        action={
          <div className="flex gap-2">
            {data.rows.length > 0 && <Button variant="outline" onClick={exportExcel}><FileSpreadsheet size={18} /> Export Excel</Button>}
            {canDeposit && <Button onClick={openDepositModal}><Plus size={18} /> Depot en caisse</Button>}
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total entrees" value={formatMoney(data.totalIn)} icon={<ArrowDownCircle size={20} />} gradient="from-emerald-500 to-emerald-600" />
        <StatCard label="Total sorties" value={formatMoney(data.totalOut)} icon={<ArrowUpCircle size={20} />} gradient="from-red-500 to-red-600" />
        <StatCard label="Solde caisse" value={formatMoney(data.balance)} icon={<Wallet size={20} />} gradient="from-blue-500 to-blue-600" />
      </div>
      <Card className="mt-4">
        <div className="border-b border-slate-200 px-5 py-4"><h3 className="text-sm font-bold text-slate-700">Mouvements de caisse</h3></div>
        {data.rows.length === 0 ? <EmptyState icon={<Wallet size={48} />} title="Aucun mouvement" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>
                <th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold text-right">Montant</th><th className="px-4 py-3 font-semibold">Motif</th><th className="px-4 py-3 font-semibold">Reference</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(r.created_at)}</td>
                    <td className="px-4 py-3"><Badge color={r.type === 'ENTREE' ? 'green' : 'red'}>{r.type === 'ENTREE' ? 'Entree' : 'Sortie'}</Badge></td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatMoney(r.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{r.reason || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Depot en caisse" size="sm">
        {formError && <ErrorBanner message={formError} />}
        <div className="space-y-4">
          <Input label="Montant (FCFA) *" type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          <Input label="Motif" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          <Input label="Reference automatique" value={form.reference} readOnly />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={deposit} loading={saving}>Deposer</Button>
        </div>
      </Modal>
    </div>
  );
}

function CalculatorWidget() {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);

  const inputDigit = (d: string) => {
    if (resetNext) { setDisplay(d); setResetNext(false); }
    else setDisplay(display === '0' ? d : display + d);
  };

  const inputDecimal = () => {
    if (resetNext) { setDisplay('0.'); setResetNext(false); }
    else if (!display.includes('.')) setDisplay(display + '.');
  };

  const compute = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      case '%': return a * (b / 100);
      default: return b;
    }
  };

  const setOperator = (newOp: string) => {
    const current = parseFloat(display);
    if (prev !== null && op && !resetNext) {
      const result = compute(prev, current, op);
      setPrev(result);
      setDisplay(String(result));
    } else {
      setPrev(current);
    }
    setOp(newOp);
    setResetNext(true);
  };

  const equals = () => {
    if (prev !== null && op) {
      const result = compute(prev, parseFloat(display), op);
      setDisplay(String(result));
      setPrev(null); setOp(null); setResetNext(true);
    }
  };

  const clear = () => { setDisplay('0'); setPrev(null); setOp(null); setResetNext(false); };

  const formatDisplay = (s: string) => {
    const n = parseFloat(s);
    if (isNaN(n)) return '0';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(n);
  };

  const btnClass = "flex h-11 items-center justify-center rounded-lg text-sm font-bold transition-all active:scale-95 cursor-pointer select-none";
  const numBtn = `${btnClass} bg-slate-100 text-slate-800 hover:bg-slate-200`;
  const opBtn = `${btnClass} bg-blue-100 text-blue-700 hover:bg-blue-200`;
  const fnBtn = `${btnClass} bg-red-100 text-red-700 hover:bg-red-200`;

  return (
    <div className="w-full max-w-xs">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
        <div className="mb-3 rounded-xl bg-slate-900 px-4 py-4 text-right">
          {prev !== null && op && <p className="text-xs text-slate-400">{formatDisplay(String(prev))} {op}</p>}
          <p className="text-2xl font-bold text-white truncate">{formatDisplay(display)}</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button className={fnBtn} onClick={clear}>AC</button>
          <button className={fnBtn} onClick={() => setDisplay(String(parseFloat(display) * -1))}>+/-</button>
          <button className={fnBtn} onClick={() => setOperator('%')}>%</button>
          <button className={opBtn} onClick={() => setOperator('/')}>/</button>
          <button className={numBtn} onClick={() => inputDigit('7')}>7</button>
          <button className={numBtn} onClick={() => inputDigit('8')}>8</button>
          <button className={numBtn} onClick={() => inputDigit('9')}>9</button>
          <button className={opBtn} onClick={() => setOperator('*')}>x</button>
          <button className={numBtn} onClick={() => inputDigit('4')}>4</button>
          <button className={numBtn} onClick={() => inputDigit('5')}>5</button>
          <button className={numBtn} onClick={() => inputDigit('6')}>6</button>
          <button className={opBtn} onClick={() => setOperator('-')}>-</button>
          <button className={numBtn} onClick={() => inputDigit('1')}>1</button>
          <button className={numBtn} onClick={() => inputDigit('2')}>2</button>
          <button className={numBtn} onClick={() => inputDigit('3')}>3</button>
          <button className={opBtn} onClick={() => setOperator('+')}>+</button>
          <button className={numBtn} onClick={() => inputDigit('0')}>0</button>
          <button className={numBtn} onClick={inputDecimal}>.</button>
          <button className={`${btnClass} col-span-2 bg-blue-600 text-white hover:bg-blue-700`} onClick={equals}>=</button>
        </div>
      </div>
    </div>
  );
}

export function OperatingCashPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'CAISSIER']);

  const [data, setData] = useState<{ totalIn: number; totalOut: number; balance: number; rows: OperatingCashMovement[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ type: 'ENTREE', amount: 0, reason: '', reference: '' });
  const [showCalc, setShowCalc] = useState(false);

  const load = () => {
    setLoading(true);
    api.getOperatingCash().then(setData).catch(err => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.amount || form.amount <= 0) { setFormError('Montant invalide'); return; }
    setSaving(true); setFormError('');
    try {
      await api.createOperatingCashMovement({ type: form.type, amount: Number(form.amount), reason: form.reason, reference: form.reference });
      setModalOpen(false); setForm({ type: 'ENTREE', amount: 0, reason: '', reference: '' }); load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erreur'); }
    finally { setSaving(false); }
  };

  const openMovementModal = async () => {
    try {
      const { code } = await api.getNextCode('opcash');
      setForm({ type: 'ENTREE', amount: 0, reason: '', reference: code });
    } catch {
      setForm({ type: 'ENTREE', amount: 0, reason: '', reference: `CF-${new Date().getFullYear()}-AUTO` });
    }
    setFormError('');
    setModalOpen(true);
  };

  const exportExcel = () => {
    if (!data || !data.rows.length) return;
    exportToExcel(
      'mouvements_caisse_fonctionnement',
      [
        { key: 'date', label: 'Date' },
        { key: 'type', label: 'Type' },
        { key: 'amount', label: 'Montant (FCFA)' },
        { key: 'reason', label: 'Motif' },
        { key: 'source', label: 'Source' },
        { key: 'reference', label: 'Reference' },
      ],
      data.rows.map(r => ({
        date: formatDateTime(r.created_at),
        type: r.type === 'ENTREE' ? 'Entree' : 'Sortie',
        amount: r.amount,
        reason: r.reason || '',
        source: r.source,
        reference: r.reference || '',
      })),
      'Mouvements de caisse de fonctionnement - DigitPointage SMART',
    );
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Caisse de fonctionnement" subtitle="Suivi des flux operationnels"
        action={
          <div className="flex flex-wrap gap-2">
            {data.rows.length > 0 && <Button variant="outline" onClick={exportExcel}><FileSpreadsheet size={18} /> Export Excel</Button>}
            <Button variant="outline" onClick={() => setShowCalc(!showCalc)}>
              <Calculator size={18} /> {showCalc ? 'Masquer' : 'Calculatrice'}
              {showCalc ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
            {canEdit && <Button onClick={openMovementModal}><Plus size={18} /> Nouveau mouvement</Button>}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total entrees" value={formatMoney(data.totalIn)} icon={<TrendingUp size={20} />} gradient="from-emerald-500 to-emerald-600" />
        <StatCard label="Total sorties" value={formatMoney(data.totalOut)} icon={<TrendingDown size={20} />} gradient="from-red-500 to-red-600" />
        <StatCard label="Solde" value={formatMoney(data.balance)} icon={<Scale size={20} />} gradient="from-slate-600 to-slate-700" />
      </div>

      {showCalc && (
        <div className="mt-4 flex justify-center lg:justify-end animate-slide-up">
          <CalculatorWidget />
        </div>
      )}

      <Card className="mt-4">
        <div className="border-b border-slate-200 px-5 py-4"><h3 className="text-sm font-bold text-slate-700">Historique des mouvements</h3></div>
        {data.rows.length === 0 ? <EmptyState icon={<Scale size={48} />} title="Aucun mouvement" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>
                <th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold text-right">Montant</th><th className="px-4 py-3 font-semibold">Motif</th>
                <th className="px-4 py-3 font-semibold">Source</th><th className="px-4 py-3 font-semibold">Reference</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(r.created_at)}</td>
                    <td className="px-4 py-3"><Badge color={r.type === 'ENTREE' ? 'green' : 'red'}>{r.type === 'ENTREE' ? 'Entree' : 'Sortie'}</Badge></td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatMoney(r.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{r.reason || '-'}</td>
                    <td className="px-4 py-3"><Badge color="slate">{r.source}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau mouvement" size="sm">
        {formError && <ErrorBanner message={formError} />}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Type *</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="ENTREE">Entree</option>
              <option value="SORTIE">Sortie</option>
            </select>
          </div>
          <Input label="Montant (FCFA) *" type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          <Input label="Motif" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          <Input label="Reference automatique" value={form.reference} readOnly />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={save} loading={saving}>Enregistrer</Button>
        </div>
      </Modal>
    </div>
  );
}
