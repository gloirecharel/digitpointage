import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Employee } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { formatMoney} from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { Button, Input, Select, Badge, Card, PageHeader, Spinner, ErrorBanner, EmptyState } from '@/components/ui';
import { Plus, Search, Pencil, Trash2, UserCog } from 'lucide-react';

const emptyForm: Partial<Employee> = {
  code: '', full_name: '', phone: '', email: '', address: '',
  job_title: '', department: '', hire_date: '', base_salary: 0, status: 'ACTIVE',
};

export function EmployeesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'RH']);
  const canDelete = hasRole(['ADMIN', 'RH']);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Partial<Employee>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);

  const load = () => {
    setLoading(true);
    api.getEmployees()
      .then(setEmployees)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e =>
    e.code.toLowerCase().includes(search.toLowerCase()) ||
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.job_title || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = async () => {
    setEditing(null);
    setFormError('');
    try {
      const { code } = await api.getNextCode('employee');
      setForm({ ...emptyForm, code });
    } catch {
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({ ...e });
    setFormError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.code || !form.full_name) { setFormError('Code et nom complet obligatoires'); return; }
    setSaving(true);
    try {
      if (editing) await api.updateEmployee(editing.id, form);
      else await api.createEmployee(form);
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteEmployee(confirmDelete.id);
      setConfirmDelete(null);
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
        title="Employés"
        subtitle={`${employees.length} employé(s)`}
        action={canEdit && <Button onClick={openCreate}><Plus size={18} /> Nouvel employé</Button>}
      />

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par code, nom ou poste..." className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<UserCog size={48} />} title="Aucun employé trouvé" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Nom complet</th>
                  <th className="px-4 py-3 font-semibold">Poste</th>
                  <th className="px-4 py-3 font-semibold">Département</th>
                  <th className="px-4 py-3 font-semibold text-right">Salaire base</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{e.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{e.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{e.job_title || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.department || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatMoney(e.base_salary)}</td>
                    <td className="px-4 py-3"><Badge color={e.status === 'ACTIVE' ? 'green' : 'slate'}>{e.status === 'ACTIVE' ? 'Actif' : 'Inactif'}</Badge></td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(e)} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 transition-colors" title="Modifier"><Pencil size={16} /></button>
                          {canDelete && <button onClick={() => setConfirmDelete(e)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors" title="Supprimer"><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier l\'employé' : 'Nouvel employé'} size="lg">
        {formError && <ErrorBanner message={formError} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Code *" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} />
          <Input label="Nom complet *" value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Téléphone" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Adresse" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
          <Input label="Poste" value={form.job_title || ''} onChange={e => setForm({ ...form, job_title: e.target.value })} />
          <Input label="Département" value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} />
          <Input label="Date d'embauche" type="date" value={form.hire_date || ''} onChange={e => setForm({ ...form, hire_date: e.target.value })} />
          <Input label="Salaire de base (FCFA)" type="number" value={form.base_salary || 0} onChange={e => setForm({ ...form, base_salary: Number(e.target.value) })} />
          <Select label="Statut" value={form.status || 'ACTIVE'} onChange={e => setForm({ ...form, status: e.target.value as Employee['status'] })}>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
          </Select>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={save} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmer la suppression" size="sm">
        <p className="text-sm text-slate-600">Voulez-vous vraiment supprimer l'employé <strong>{confirmDelete?.full_name}</strong> ({confirmDelete?.code}) ? Toutes les paies liées seront supprimées.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
          <Button variant="danger" onClick={doDelete}><Trash2 size={16} /> Supprimer</Button>
        </div>
      </Modal>
    </div>
  );
}
