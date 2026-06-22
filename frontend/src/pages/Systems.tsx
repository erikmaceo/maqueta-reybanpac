import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Permission, Role, SystemApp, Environment } from '../types';
import { useToast } from '../context/ToastContext';
import { emitDataChanged } from '../lib/events';
import {
  Modal, Field, Empty, Confirm, EnvBadge, LevelPill, SystemTile, TableSkeleton, ErrorState,
} from '../components/ui';
import {
  IconPlus, IconSystems, IconTrash, IconEdit, IconKey, IconRoles,
} from '../components/icons';

const COLORS = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#dc2626', '#0891b2', '#db2777'];
const blank = { code: '', name: '', description: '', environment: 'DEV' as Environment, ownerName: '', color: COLORS[0] };

export default function Systems() {
  const toast = useToast();
  const [systems, setSystems] = useState<SystemApp[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<typeof blank | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SystemApp | null>(null);
  const [toDelete, setToDelete] = useState<SystemApp | null>(null);
  const [permForm, setPermForm] = useState<{ name: string; level: Permission['level']; category: string; description: string } | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [s, p, r] = await Promise.all([api.listSystems(), api.listPermissions(), api.listRoles()]);
      setSystems(s); setPermissions(p); setRoles(r);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const permsOf = (id: string) => permissions.filter((p) => p.systemId === id);
  const rolesOf = (id: string) => roles.filter((r) => r.systemId === id);

  const save = async () => {
    if (!form) return;
    if (!form.code || !form.name) return toast.error('Faltan datos', 'Código y nombre son obligatorios.');
    try {
      if (editId) { await api.updateSystem(editId, form); toast.success('Sistema actualizado'); }
      else { await api.createSystem(form); toast.success('Sistema creado', `${form.name} fue agregado.`); }
      setForm(null); setEditId(null); emitDataChanged(); load();
    } catch (e) { toast.error('Error', (e as Error).message); }
  };

  const remove = async (s: SystemApp) => {
    try { await api.deleteSystem(s.id); toast.success('Sistema eliminado'); emitDataChanged(); load(); }
    catch (e) { toast.error('Error', (e as Error).message); }
  };

  const addPermission = async () => {
    if (!detail || !permForm) return;
    if (!permForm.name) return toast.error('Falta el nombre del acceso');
    try {
      await api.createPermission({ ...permForm, systemId: detail.id });
      toast.success('Acceso agregado', `"${permForm.name}" añadido a ${detail.code}.`);
      setPermForm(null); load();
    } catch (e) { toast.error('Error', (e as Error).message); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sistemas y aplicativos</h1>
          <p>Cada sistema expone un catálogo de accesos que luego se agrupan en roles para autorizar usuarios.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(blank); setEditId(null); }}><IconPlus /> Nuevo sistema</button>
      </div>

      {loading ? <TableSkeleton rows={6} cols={3} /> : error ? <ErrorState message={error} onRetry={load} /> : systems.length === 0 ? (
        <div className="card"><Empty icon={<IconSystems />} title="Aún no hay sistemas" hint="Cree el primer sistema gobernado por la consola."
          action={<button className="btn btn-primary" onClick={() => setForm(blank)}><IconPlus /> Nuevo sistema</button>} /></div>
      ) : (
        <div className="grid cols-3">
          {systems.map((s) => (
            <div key={s.id} className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="row between">
                <SystemTile code={s.code} color={s.color} />
                <EnvBadge env={s.environment} />
              </div>
              <div>
                <h3 style={{ fontSize: 16 }}>{s.name}</h3>
                <div className="mono tiny dim">{s.code}</div>
              </div>
              <p className="muted small" style={{ flex: 1, margin: 0 }}>{s.description}</p>
              <div className="row gap-3 small muted">
                <span className="row gap-2"><IconKey width={14} height={14} /> {permsOf(s.id).length} accesos</span>
                <span className="row gap-2"><IconRoles width={14} height={14} /> {rolesOf(s.id).length} roles</span>
              </div>
              <div className="tiny dim">Dueño: {s.ownerName || '—'}</div>
              <div className="divider" style={{ margin: '4px 0' }} />
              <div className="row gap-2">
                <button className="btn btn-ghost btn-sm grow" onClick={() => setDetail(s)}><IconKey width={14} height={14} /> Accesos</button>
                <button className="btn btn-ghost btn-sm btn-icon" title="Editar" aria-label={`Editar sistema ${s.name}`} onClick={() => { setForm({ code: s.code, name: s.name, description: s.description, environment: s.environment, ownerName: s.ownerName, color: s.color }); setEditId(s.id); }}><IconEdit width={15} height={15} /></button>
                <button className="btn btn-danger btn-sm btn-icon" title="Eliminar" aria-label={`Eliminar sistema ${s.name}`} onClick={() => setToDelete(s)}><IconTrash width={15} height={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Crear / editar sistema */}
      {form && (
        <Modal title={editId ? 'Editar sistema' : 'Nuevo sistema'} subtitle="Defina los datos del aplicativo gobernado."
          onClose={() => { setForm(null); setEditId(null); }}
          footer={<>
            <button className="btn btn-ghost" onClick={() => { setForm(null); setEditId(null); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>{editId ? 'Guardar cambios' : 'Crear sistema'}</button>
          </>}>
          <div className="form-grid">
            <Field label="Código"><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="KS8" /></Field>
            <Field label="Nombre"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kubernetes KS8" /></Field>
          </div>
          <Field label="Descripción"><textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="Entorno">
              <select className="select" value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value as Environment })}>
                <option value="DEV">DEV</option><option value="QAS">QAS</option><option value="PRE">PRE</option><option value="PROD">PROD</option>
              </select>
            </Field>
            <Field label="Dueño / responsable"><input className="input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></Field>
          </div>
          <Field label="Color">
            <div className="row gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={form.color === c} onClick={() => setForm({ ...form, color: c })} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: form.color === c ? '3px solid var(--navy-800)' : '2px solid #fff', boxShadow: 'var(--shadow-sm)' }} />
              ))}
            </div>
          </Field>
        </Modal>
      )}

      {/* Detalle de accesos del sistema */}
      {detail && (
        <Modal wide title={`Accesos · ${detail.name}`} subtitle="Catálogo de accesos disponibles para construir roles."
          onClose={() => { setDetail(null); setPermForm(null); }}
          footer={<>
            <button className="btn btn-ghost" onClick={() => { setDetail(null); setPermForm(null); }}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => setPermForm({ name: '', level: 'VIEW', category: 'General', description: '' })}><IconPlus /> Nuevo acceso</button>
          </>}>
          {permForm && (
            <div className="card pad mb-4" style={{ background: 'var(--surface-2)' }}>
              <b className="small">Agregar acceso a {detail.code}</b>
              <div className="form-grid mt-3">
                <Field label="Nombre"><input className="input" value={permForm.name} onChange={(e) => setPermForm({ ...permForm, name: e.target.value })} placeholder="Ver pods" /></Field>
                <Field label="Categoría"><input className="input" value={permForm.category} onChange={(e) => setPermForm({ ...permForm, category: e.target.value })} /></Field>
              </div>
              <Field label="Nivel">
                <select className="select" value={permForm.level} onChange={(e) => setPermForm({ ...permForm, level: e.target.value as Permission['level'] })}>
                  <option value="VIEW">VIEW · Lectura</option><option value="EDIT">EDIT · Escritura</option><option value="ADMIN">ADMIN · Total</option>
                </select>
              </Field>
              <Field label="Descripción"><input className="input" value={permForm.description} onChange={(e) => setPermForm({ ...permForm, description: e.target.value })} /></Field>
              <div className="row gap-2"><button className="btn btn-primary btn-sm" onClick={addPermission}>Agregar</button><button className="btn btn-ghost btn-sm" onClick={() => setPermForm(null)}>Cancelar</button></div>
            </div>
          )}
          <PermTable perms={permsOf(detail.id)} />
        </Modal>
      )}

      {toDelete && (
        <Confirm title="Eliminar sistema" message={`¿Eliminar "${toDelete.name}"? Se eliminarán también sus accesos y roles asociados.`}
          onConfirm={() => remove(toDelete)} onClose={() => setToDelete(null)} />
      )}
    </>
  );
}

function PermTable({ perms }: { perms: Permission[] }) {
  const cats = useMemo(() => [...new Set(perms.map((p) => p.category))], [perms]);
  if (!perms.length) return <Empty icon={<IconKey />} title="Sin accesos definidos" hint="Agregue el primer acceso de este sistema." />;
  return (
    <div className="grid" style={{ gap: 16 }}>
      {cats.map((cat) => (
        <div key={cat}>
          <div className="group-label" style={{ color: 'var(--text-3)', padding: '0 0 6px' }}>{cat}</div>
          <div className="table-wrap card">
            <table className="data">
              <thead><tr><th>Acceso</th><th>Código</th><th>Nivel</th></tr></thead>
              <tbody>
                {perms.filter((p) => p.category === cat).map((p) => (
                  <tr key={p.id}>
                    <td><div className="cell-strong">{p.name}</div><div className="tiny dim">{p.description}</div></td>
                    <td className="mono tiny dim">{p.code}</td>
                    <td><LevelPill level={p.level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
