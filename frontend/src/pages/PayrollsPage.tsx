import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Payroll, Employee } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { formatMoney, formatDate } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { SearchSelect } from '@/components/SearchSelect';
import { Button, Input, Badge, Card, PageHeader, Spinner, ErrorBanner, EmptyState } from '@/components/ui';
import { Plus, FileText, Printer, Eye } from 'lucide-react';

export function PayrollsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'RH']);

  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [detail, setDetail] = useState<Payroll | null>(null);

  const [form, setForm] = useState({
    employee_id: '', month: '', base_salary: 0, bonus: 0, transport: 0,
    deductions: 0, advance: 0, cnss: 0, irpp: 0,
  });

  const load = () => {
    setLoading(true);
    Promise.all([api.getPayrolls(), api.getEmployees()])
      .then(([p, e]) => { setPayrolls(p); setEmployees(e.filter(emp => emp.status === 'ACTIVE')); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const netCalc = () => {
    return Number(form.base_salary) + Number(form.bonus) + Number(form.transport)
      - Number(form.deductions) - Number(form.advance) - Number(form.cnss) - Number(form.irpp);
  };

  const save = async () => {
    if (!form.employee_id) { setFormError('Selectionnez un employe'); return; }
    if (!form.month) { setFormError('Mois obligatoire'); return; }
    setSaving(true);
    setFormError('');
    try {
      const res = await api.createPayroll({
        employee_id: Number(form.employee_id), month: form.month,
        base_salary: Number(form.base_salary), bonus: Number(form.bonus),
        transport: Number(form.transport), deductions: Number(form.deductions),
        advance: Number(form.advance), cnss: Number(form.cnss), irpp: Number(form.irpp),
      });
      setSuccess(`Paie enregistree. Net a payer : ${formatMoney(res.net_salary)}`);
      setTimeout(() => setSuccess(''), 5000);
      setModalOpen(false);
      setForm({ employee_id: '', month: '', base_salary: 0, bonus: 0, transport: 0, deductions: 0, advance: 0, cnss: 0, irpp: 0 });
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (p: Payroll) => {
    try {
      const full = await api.getPayroll(p.id);
      setDetail(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const printBulletin = (p: Payroll) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const gross = p.base_salary + p.bonus + p.transport;
    const totalDed = p.deductions + p.advance + p.cnss + p.irpp;
    w.document.write(`
      <html><head><title>Bulletin de paie - ${p.full_name || ''}</title>
      <style>
        @page{margin:15px}
        *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
        body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto;background:#f0f4f8;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .doc{background:white;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.1)}
        .header{background:linear-gradient(135deg,#1e40af,#3b82f6);padding:24px;text-align:center;color:white}
        .logo{font-size:28px;font-weight:800;letter-spacing:2px}
        .title{font-size:14px;opacity:0.9;margin-top:4px}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:20px 24px}
        .info-box{background:#f8fafc;border-radius:10px;padding:10px 14px}
        .info-label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px}
        .info-value{font-size:13px;font-weight:700;color:#1e293b;margin-top:2px}
        table{width:100%;border-collapse:collapse;margin:0 24px;width:calc(100% - 48px)}
        th{background:#1e40af;color:white;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
        th:first-child{border-radius:8px 0 0 0}
        th:last-child{border-radius:0 8px 0 0;text-align:right}
        td{padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px}
        td:last-child{text-align:right;font-weight:600}
        .positive{color:#059669}
        .negative{color:#dc2626}
        .total-section{margin:16px 24px;padding:20px;border-radius:12px;background:linear-gradient(135deg,#1e40af,#3b82f6);text-align:center}
        .total-label{font-size:14px;color:rgba(255,255,255,0.9)}
        .total-value{font-size:28px;font-weight:800;color:white;margin-top:4px}
        .summary-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:0 24px 16px}
        .summary-item{text-align:center;padding:10px;border-radius:8px;background:#f8fafc}
        .summary-label{font-size:10px;color:#64748b}
        .summary-value{font-size:14px;font-weight:700;color:#1e293b;margin-top:2px}
        .footer{text-align:center;font-size:10px;color:#94a3b8;padding:16px}
      </style></head><body>
      <div class="doc">
        <div class="header">
          <div class="logo">DigitPointage</div>
          <div class="title">Bulletin de paie - ${p.month}</div>
        </div>
        <div class="info-grid">
          <div class="info-box"><div class="info-label">Employe</div><div class="info-value">${p.full_name || '-'}</div></div>
          <div class="info-box"><div class="info-label">Code</div><div class="info-value" style="font-family:monospace">${p.code || '-'}</div></div>
          <div class="info-box"><div class="info-label">Poste</div><div class="info-value">${p.job_title || '-'}</div></div>
          <div class="info-box"><div class="info-label">Departement</div><div class="info-value">${p.department || '-'}</div></div>
        </div>
        <table>
          <tr><th>Rubrique</th><th style="text-align:right">Montant (FCFA)</th></tr>
          <tr><td>Salaire de base</td><td>${formatMoney(p.base_salary)}</td></tr>
          <tr><td>Prime</td><td class="positive">+${formatMoney(p.bonus)}</td></tr>
          <tr><td>Transport</td><td class="positive">+${formatMoney(p.transport)}</td></tr>
          <tr><td>Retenues</td><td class="negative">-${formatMoney(p.deductions)}</td></tr>
          <tr><td>Avance</td><td class="negative">-${formatMoney(p.advance)}</td></tr>
          <tr><td>CNSS</td><td class="negative">-${formatMoney(p.cnss)}</td></tr>
          <tr><td>IRPP</td><td class="negative">-${formatMoney(p.irpp)}</td></tr>
        </table>
        <div class="summary-grid">
          <div class="summary-item"><div class="summary-label">Brut</div><div class="summary-value">${formatMoney(gross)}</div></div>
          <div class="summary-item"><div class="summary-label">Retenues tot.</div><div class="summary-value" style="color:#dc2626">-${formatMoney(totalDed)}</div></div>
          <div class="summary-item"><div class="summary-label">Net</div><div class="summary-value" style="color:#059669">${formatMoney(p.net_salary)}</div></div>
        </div>
        <div class="total-section">
          <div class="total-label">NET A PAYER</div>
          <div class="total-value">${formatMoney(p.net_salary)}</div>
        </div>
        <div class="footer">Bulletin edite le ${formatDate(p.paid_at)} - DigitPointage SMART</div>
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
        title="Paies"
        subtitle={`${payrolls.length} bulletin(s) de paie`}
        action={canEdit && <Button onClick={() => { setForm({ employee_id: '', month: '', base_salary: 0, bonus: 0, transport: 0, deductions: 0, advance: 0, cnss: 0, irpp: 0 }); setFormError(''); setModalOpen(true); }}><Plus size={18} /> Nouvelle paie</Button>}
      />

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 animate-slide-up">{success}</div>
      )}

      <Card>
        {payrolls.length === 0 ? (
          <EmptyState icon={<FileText size={48} />} title="Aucune paie enregistree" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employe</th><th className="px-4 py-3 font-semibold">Mois</th>
                  <th className="px-4 py-3 font-semibold text-right">Salaire base</th><th className="px-4 py-3 font-semibold text-right">Net a payer</th>
                  <th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3"><p className="font-medium text-slate-800">{p.full_name || '-'}</p><p className="text-xs text-slate-500">{p.job_title || ''}</p></td>
                    <td className="px-4 py-3 text-slate-600">{p.month}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatMoney(p.base_salary)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{formatMoney(p.net_salary)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.paid_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openDetail(p)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-colors" title="Voir"><Eye size={16} /></button>
                        <button onClick={() => printBulletin(p)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors" title="Imprimer"><Printer size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle paie" size="lg">
        {formError && <ErrorBanner message={formError} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SearchSelect
            label="Employe *"
            placeholder="Rechercher un employe..."
            value={form.employee_id}
            onChange={(val) => {
              const emp = employees.find(x => x.id === Number(val));
              setForm({ ...form, employee_id: val, base_salary: emp?.base_salary || 0 });
            }}
            options={employees.map(e => ({
              value: String(e.id),
              label: `${e.code} - ${e.full_name}`,
              sublabel: e.job_title || undefined,
            }))}
          />
          <Input label="Mois *" type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} />
          <Input label="Salaire de base" type="number" value={form.base_salary || 0} onChange={e => setForm({ ...form, base_salary: Number(e.target.value) })} />
          <Input label="Prime" type="number" value={form.bonus || 0} onChange={e => setForm({ ...form, bonus: Number(e.target.value) })} />
          <Input label="Transport" type="number" value={form.transport || 0} onChange={e => setForm({ ...form, transport: Number(e.target.value) })} />
          <Input label="Retenues" type="number" value={form.deductions || 0} onChange={e => setForm({ ...form, deductions: Number(e.target.value) })} />
          <Input label="Avance" type="number" value={form.advance || 0} onChange={e => setForm({ ...form, advance: Number(e.target.value) })} />
          <Input label="CNSS" type="number" value={form.cnss || 0} onChange={e => setForm({ ...form, cnss: Number(e.target.value) })} />
          <Input label="IRPP" type="number" value={form.irpp || 0} onChange={e => setForm({ ...form, irpp: Number(e.target.value) })} />
        </div>
        <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 p-4 text-center shadow-lg">
          <p className="text-sm text-blue-100">Net a payer</p>
          <p className="text-3xl font-bold text-white">{formatMoney(netCalc())}</p>
        </div>
        <p className="mt-2 text-xs text-slate-400">Le paiement debite automatiquement la caisse. Blocage si caisse insuffisante.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={save} loading={saving}>Enregistrer la paie</Button>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Bulletin de paie" size="md">
        {detail && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Employe</p><p className="font-bold text-slate-800">{detail.full_name}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Code</p><p className="font-mono font-bold text-slate-800">{detail.code}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Poste</p><p className="text-slate-800">{detail.job_title || '-'}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Mois</p><p className="text-slate-800">{detail.month}</p></div>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="px-4 py-2 text-slate-600">Salaire de base</td><td className="px-4 py-2 text-right font-medium text-slate-800">{formatMoney(detail.base_salary)}</td></tr>
                  <tr><td className="px-4 py-2 text-slate-600">Prime</td><td className="px-4 py-2 text-right text-emerald-600">+{formatMoney(detail.bonus)}</td></tr>
                  <tr><td className="px-4 py-2 text-slate-600">Transport</td><td className="px-4 py-2 text-right text-emerald-600">+{formatMoney(detail.transport)}</td></tr>
                  <tr><td className="px-4 py-2 text-slate-600">Retenues</td><td className="px-4 py-2 text-right text-red-600">-{formatMoney(detail.deductions)}</td></tr>
                  <tr><td className="px-4 py-2 text-slate-600">Avance</td><td className="px-4 py-2 text-right text-red-600">-{formatMoney(detail.advance)}</td></tr>
                  <tr><td className="px-4 py-2 text-slate-600">CNSS</td><td className="px-4 py-2 text-right text-red-600">-{formatMoney(detail.cnss)}</td></tr>
                  <tr><td className="px-4 py-2 text-slate-600">IRPP</td><td className="px-4 py-2 text-right text-red-600">-{formatMoney(detail.irpp)}</td></tr>
                  <tr className="bg-blue-50"><td className="px-4 py-3 font-bold text-slate-700">Net a payer</td><td className="px-4 py-3 text-right text-lg font-bold text-blue-700">{formatMoney(detail.net_salary)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => printBulletin(detail)}><Printer size={16} /> Imprimer le bulletin</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
