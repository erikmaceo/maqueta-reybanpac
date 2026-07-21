import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Permission, Role, SystemApp, User } from '../types';
import { useToast } from '../context/ToastContext';
import { emitDataChanged } from '../lib/events';
import {
  Modal, Field, Empty, Confirm, Switch, LevelPill, SystemTile, SearchBox, TableSkeleton, ErrorState,
} from '../components/ui';
import {
  IconPlus, IconRoles, IconTrash, IconEdit, IconShield, IconKey, IconUsers,
} from '../components/icons';

const COLORS = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#dc2626', '#0891b2', '#db2777', '#475569'];

interface RoleForm {
  name: string; description: string; systemId: string | null;
  permissionIds: string[]; isAdmin: boolean; authorizerUserId: string | null; color: string;
}
const blank: RoleForm = { name: '', description: '', systemId: '', permissionIds: [], isAdmin: false, authorizerUserId: null, color: COLORS[0] };

export default function Roles() {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [systems, setSystems] = useState<SystemApp[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<RoleForm | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Role | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [r, s, p, u] = await Promise.all([api.listRoles(), api.listSystems(), api.listPermissions(), api.listUsers()]);
      setRoles(r); setSystems(s); setPermissions(p); setUsers(u);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const sysById = (id: string | null) => systems.find((s) => s.id === id);
  const userById = (id: string | null) => users.find((u) => u.id === id);
  const permById = (id: string) => permissions.find((p) => p.id === id);
  const countUsersWith = (roleId: string) => users.filter((u) => u.roleIds.includes(roleId)).length;

  const filtered = roles.filter((r) => `${r.name} ${r.description}`.toLowerCase().includes(q.toLowerCase()));

  // Accesos visibles en el constructor: del sistema elegido, o todos si es transversal.
  const builderPerms = useMemo(() => {
    if (!form) return [];
    if (!form.systemId) return permissions;
    return permissions.filter((p) => p.systemId === form.systemId);
  }, [form, permissions]);

  const grouped = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    builderPerms.forEach((p) => {
      const sys = sysById(p.systemId);
      const key = `${sys?.code || '—'} · ${p.category}`;
      (map[key] ||= []).push(p);
    });
    return map;
  }, [builderPerms, systems]);

  const togglePerm = (id: string) => {
    if (!form) return;
    setForm({ ...form, permissionIds: form.permissionIds.includes(id) ? form.permissionIds.filter((x) => x !== id) : [...form.permissionIds, id] });
  };

  const openCreate = () => { setForm({ ...blank }); setEditId(null); };
  const openEdit = (r: Role) => {
    setForm({ name: r.name, description: r.description, systemId: r.systemId ?? '', permissionIds: [...r.permissionIds], isAdmin: r.isAdmin, authorizerUserId: r.authorizerUserId, color: r.color });
    setEditId(r.id);
  };

  const save = async () => {
    if (!form) return;
    if (!form.name) return toast.error('Falta el nombre del rol');
    if (!form.isAdmin && form.permissionIds.length === 0) return toast.error('Seleccione accesos', 'Elija al menos un acceso o marque “acceso completo”.');
    const payload = { ...form, systemId: form.systemId || null };
    try {
      if (editId) { await api.updateRole(editId, payload); toast.success('Rol actualizado'); }
      else { await api.createRole(payload); toast.success('Rol creado', `"${form.name}" con ${form.isAdmin ? 'acceso completo' : form.permissionIds.length + ' accesos'}.`); }
      setForm(null); setEditId(null); emitDataChanged(); load();
    } catch (e) { toast.error('Error', (e as Error).message); }
  };

  const remove = async (r: Role) => {
    try { await api.deleteRole(r.id); toast.success('Rol eliminado'); emitDataChanged(); load(); }
    catch (e) { toast.error('No se pudo eliminar', (e as Error).message); }
  };

  const adminUsers = users.filter((u) => u.type === 'ADMIN');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Roles y accesos</h1>
          <p>Cree roles, seleccione los accesos que otorgan y designe un autorizador (Dueño Técnico). El rol administrador concentra el acceso completo.</p>
        </div>
        <div className="row gap-3">
          <SearchBox value={q} onChange={setQ} placeholder="Buscar rol…" />
          <button className="btn btn-primary" onClick={openCreate}><IconPlus /> Nuevo Rol</button>
        </div>
      </div>

      {loading ? <TableSkeleton rows={6} cols={3} /> : error ? <ErrorState message={error} onRetry={load} /> : filtered.length === 0 ? (
        <div className="card"><Empty icon={<IconRoles />} title="Sin roles" hint="Cree el primer rol y seleccione sus accesos."
          action={<button className="btn btn-primary" onClick={openCreate}><IconPlus /> Nuevo Rol</button>} /></div>
      ) : (
        <div className="grid cols-3">
          {filtered.map((r) => {
            const sys = sysById(r.systemId);
            const auth = userById(r.authorizerUserId);
            return (
              <div key={r.id} className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: `3px solid ${r.color}` }}>
                <div className="row between">
                  <div className="row gap-2">
                    <span className="icon-tile" style={{ width: 34, height: 34, background: r.color }}>{r.isAdmin ? <IconShield width={16} height={16} /> : <IconRoles width={16} height={16} />}</span>
                    <div>
                      <h3 style={{ fontSize: 15 }}>{r.name}</h3>
                      <div className="tiny dim">{sys ? sys.name : 'Transversal · todos los sistemas'}</div>
                    </div>
                  </div>
                  {r.isAdmin && <span className="badge badge-red"><IconShield width={12} height={12} /> Acceso completo</span>}
                </div>
                <p className="muted small" style={{ flex: 1, margin: 0 }}>{r.description}</p>
                <div className="row gap-3 small muted">
                  <span className="row gap-2"><IconKey width={14} height={14} /> {r.permissionIds.length} accesos</span>
                  <span className="row gap-2"><IconUsers width={14} height={14} /> {countUsersWith(r.id)} usuarios</span>
                </div>
                <div className="tiny dim">Autorizador: <b style={{ color: 'var(--text-2)' }}>{auth ? `${auth.firstName} ${auth.lastName}` : '— sin asignar'}</b></div>
                <div className="divider" style={{ margin: '4px 0' }} />
                <div className="row gap-2">
                  <button className="btn btn-ghost btn-sm grow" onClick={() => openEdit(r)}><IconEdit width={14} height={14} /> Editar Accesos</button>
                  <button className="btn btn-danger btn-sm btn-icon" title="Eliminar" aria-label={`Eliminar rol ${r.name}`} disabled={r.isAdmin} onClick={() => setToDelete(r)}><IconTrash width={15} height={15} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <Modal wide title={editId ? 'Editar rol' : 'Nuevo rol'} subtitle="Defina el alcance del rol y seleccione los accesos que otorga."
          onClose={() => { setForm(null); setEditId(null); }}
          footer={<>
            <span className="muted small grow">{form.isAdmin ? `Acceso completo · ${permissions.length} accesos` : `${form.permissionIds.length} accesos seleccionados`}</span>
            <button className="btn btn-ghost" onClick={() => { setForm(null); setEditId(null); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>{editId ? 'Guardar Cambios' : 'Crear rol'}</button>
          </>}>
          <div className="form-grid">
            <Field label="Nombre del rol"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="KS8 DEV — Edit" /></Field>
            <Field label="Sistema" hint="Déjelo en “Transversal” para un rol que abarque varios sistemas.">
              <select className="select" value={form.systemId ?? ''} onChange={(e) => setForm({ ...form, systemId: e.target.value, permissionIds: [] })}>
                <option value="">Transversal (todos los sistemas)</option>
                {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Descripción"><textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="¿Para qué sirve este rol?" /></Field>
          <div className="form-grid">
            <Field label="Autorizador (Dueño Técnico)" hint="Quién aprueba las solicitudes de este rol.">
              <select className="select" value={form.authorizerUserId ?? ''} onChange={(e) => setForm({ ...form, authorizerUserId: e.target.value || null })}>
                <option value="">— Sin asignar</option>
                {adminUsers.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </Field>
            <Field label="Color">
              <div className="row gap-2" style={{ paddingTop: 6 }}>
                {COLORS.map((c) => <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={form.color === c} onClick={() => setForm({ ...form, color: c })} style={{ width: 26, height: 26, borderRadius: 7, background: c, border: form.color === c ? '3px solid var(--navy-800)' : '2px solid #fff', boxShadow: 'var(--shadow-sm)' }} />)}
              </div>
            </Field>
          </div>

          <div className="check-card mb-4" style={{ borderColor: form.isAdmin ? 'var(--red-100)' : 'var(--border)', background: form.isAdmin ? 'var(--red-50)' : '#fff' }}>
            <Switch checked={form.isAdmin} onChange={(v) => setForm({ ...form, isAdmin: v })} />
            <div>
              <div className="cc-title row gap-2"><IconShield width={15} height={15} /> Rol administrador — acceso completo</div>
              <div className="cc-desc">Otorga automáticamente <b>todos</b> los accesos de todos los sistemas. Ideal para el rol administrador.</div>
            </div>
          </div>

          {!form.isAdmin && (
            <>
              <div className="row between mb-2">
                <b className="small">Seleccionar accesos</b>
                <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, permissionIds: form.permissionIds.length === builderPerms.length ? [] : builderPerms.map((p) => p.id) })}>
                  {form.permissionIds.length === builderPerms.length && builderPerms.length > 0 ? 'Quitar todos' : 'Seleccionar todos'}
                </button>
              </div>
              {Object.keys(grouped).length === 0 ? (
                <Empty icon={<IconKey />} title="Este sistema no tiene accesos" hint="Agregue accesos al sistema desde la sección Sistemas." />
              ) : (
                <div className="grid" style={{ gap: 16 }}>
                  {Object.entries(grouped).map(([cat, perms]) => (
                    <div key={cat}>
                      <div className="group-label" style={{ color: 'var(--text-3)', padding: '0 0 8px' }}>{cat}</div>
                      <div className="grid cols-2">
                        {perms.map((p) => {
                          const checked = form.permissionIds.includes(p.id);
                          return (
                            <label key={p.id} className={`check-card ${checked ? 'checked' : ''}`}>
                              <input type="checkbox" checked={checked} onChange={() => togglePerm(p.id)} />
                              <div className="grow">
                                <div className="row between"><span className="cc-title">{p.name}</span><LevelPill level={p.level} /></div>
                                <div className="cc-desc">{p.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {form.isAdmin && (
            <div className="banner banner-warn"><IconShield /> Este rol recibirá automáticamente los {permissions.length} accesos catalogados en la plataforma.</div>
          )}
        </Modal>
      )}

      {toDelete && (
        <Confirm title="Eliminar rol" message={`¿Eliminar el rol "${toDelete.name}"? Se quitará de los usuarios que lo tengan asignado.`}
          onConfirm={() => remove(toDelete)} onClose={() => setToDelete(null)} />
      )}
    </>
  );
}
