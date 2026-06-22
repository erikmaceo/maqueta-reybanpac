import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LdapPerson, Role, User } from '../types';
import { useToast } from '../context/ToastContext';
import { emitDataChanged } from '../lib/events';
import {
  Modal, Field, Empty, Confirm, Avatar, TypeBadge, SourceBadge, SearchBox, TableSkeleton, ErrorState,
} from '../components/ui';
import {
  IconPlus, IconUsers, IconTrash, IconEdit, IconRoles, IconShield, IconLdap,
  IconUserPlus, IconDownload, IconCheck,
} from '../components/icons';

type Tab = 'ALL' | 'ADMIN' | 'CLIENTE_FINAL';
const localBlank = { username: '', firstName: '', lastName: '', email: '', cargo: '', department: '', password: '', roleIds: [] as string[] };

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('ALL');
  const [q, setQ] = useState('');

  const [creating, setCreating] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [rolesUser, setRolesUser] = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [u, r] = await Promise.all([api.listUsers(), api.listRoles()]);
      setUsers(u); setRoles(r);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const roleById = (id: string) => roles.find((r) => r.id === id);
  const filtered = users
    .filter((u) => tab === 'ALL' || u.type === tab)
    .filter((u) => `${u.firstName} ${u.lastName} ${u.username} ${u.cargo} ${u.department}`.toLowerCase().includes(q.toLowerCase()));

  const remove = async (u: User) => {
    try { await api.deleteUser(u.id); toast.success('Usuario eliminado'); emitDataChanged(); load(); }
    catch (e) { toast.error('Error', (e as Error).message); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Usuarios</h1>
          <p>Los administradores se crean localmente en la consola; los clientes finales se integran exclusivamente desde LDAP. A todos se les asignan roles.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}><IconUserPlus /> Nuevo usuario</button>
      </div>

      <div className="row between mb-4 wrap gap-3">
        <div className="tabs" role="tablist" aria-label="Filtrar usuarios por tipo">
          <button role="tab" aria-selected={tab === 'ALL'} className={tab === 'ALL' ? 'active' : ''} onClick={() => setTab('ALL')}>Todos ({users.length})</button>
          <button role="tab" aria-selected={tab === 'ADMIN'} className={tab === 'ADMIN' ? 'active' : ''} onClick={() => setTab('ADMIN')}>Administradores ({users.filter((u) => u.type === 'ADMIN').length})</button>
          <button role="tab" aria-selected={tab === 'CLIENTE_FINAL'} className={tab === 'CLIENTE_FINAL' ? 'active' : ''} onClick={() => setTab('CLIENTE_FINAL')}>Clientes finales ({users.filter((u) => u.type === 'CLIENTE_FINAL').length})</button>
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar usuario…" />
      </div>

      {loading ? <TableSkeleton rows={6} cols={6} /> : error ? <ErrorState message={error} onRetry={load} /> : filtered.length === 0 ? (
        <div className="card"><Empty icon={<IconUsers />} title="Sin usuarios" hint="Cree un administrador local o integre un cliente final desde LDAP."
          action={<button className="btn btn-primary" onClick={() => setCreating(true)}><IconUserPlus /> Nuevo usuario</button>} /></div>
      ) : (
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>Usuario</th><th>Cargo / Departamento</th><th>Tipo</th><th>Origen</th><th>Roles</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="row gap-3">
                      <Avatar first={u.firstName} last={u.lastName} ldap={u.source === 'LDAP'} />
                      <div>
                        <div className="cell-strong">{u.firstName} {u.lastName}</div>
                        <div className="tiny dim mono">{u.username} · {u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><div className="small">{u.cargo || '—'}</div><div className="tiny dim">{u.department || '—'}</div></td>
                  <td><TypeBadge type={u.type} /></td>
                  <td><SourceBadge source={u.source} /></td>
                  <td>
                    {u.roleIds.length === 0 ? <span className="tiny dim">Sin roles</span> : (
                      <div className="row gap-2 wrap">
                        {u.roleIds.slice(0, 2).map((id) => { const r = roleById(id); return r ? <span key={id} className="badge badge-blue" style={{ background: r.color + '18', color: r.color, borderColor: r.color + '30' }}>{r.name}</span> : null; })}
                        {u.roleIds.length > 2 && <span className="badge badge-gray">+{u.roleIds.length - 2}</span>}
                      </div>
                    )}
                  </td>
                  <td>{u.status === 'ACTIVE' ? <span className="badge badge-green"><span className="dot" />Activo</span> : <span className="badge badge-gray">Inactivo</span>}</td>
                  <td>
                    <div className="cell-actions">
                      <button className="btn btn-ghost btn-sm btn-icon" title="Asignar roles" aria-label={`Asignar roles a ${u.firstName} ${u.lastName}`} onClick={() => setRolesUser(u)}><IconRoles width={15} height={15} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Editar" aria-label={`Editar a ${u.firstName} ${u.lastName}`} onClick={() => setEditUser(u)}><IconEdit width={15} height={15} /></button>
                      <button className="btn btn-danger btn-sm btn-icon" title="Eliminar" aria-label={`Eliminar a ${u.firstName} ${u.lastName}`} onClick={() => setToDelete(u)}><IconTrash width={15} height={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CreateUserModal roles={roles} existing={users} onClose={() => setCreating(false)} onDone={() => { setCreating(false); emitDataChanged(); load(); }} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onDone={() => { setEditUser(null); load(); }} />}
      {rolesUser && <AssignRolesModal user={rolesUser} roles={roles} onClose={() => setRolesUser(null)} onDone={() => { setRolesUser(null); emitDataChanged(); load(); }} />}
      {toDelete && <Confirm title="Eliminar usuario" message={`¿Eliminar a ${toDelete.firstName} ${toDelete.lastName}?`} onConfirm={() => remove(toDelete)} onClose={() => setToDelete(null)} />}
    </>
  );
}

/* ------------------------- Crear usuario ------------------------- */
function CreateUserModal({ roles, existing, onClose, onDone }: { roles: Role[]; existing: User[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<'ADMIN' | 'CLIENTE_FINAL'>('ADMIN');
  const [local, setLocal] = useState({ ...localBlank });
  const [ldap, setLdap] = useState<LdapPerson[]>([]);
  const [ldapSource, setLdapSource] = useState<string>('');
  const [ldapMsg, setLdapMsg] = useState<string>('');
  const [loadingLdap, setLoadingLdap] = useState(false);
  const [importingRoles, setImportingRoles] = useState<string[]>([]);

  useEffect(() => {
    if (mode === 'CLIENTE_FINAL' && ldap.length === 0) {
      setLoadingLdap(true);
      api.ldapUsers().then((r) => { setLdap(r.people); setLdapSource(r.source); setLdapMsg(r.message); }).finally(() => setLoadingLdap(false));
    }
  }, [mode]);

  const createLocal = async () => {
    if (!local.username || !local.firstName) return toast.error('Faltan datos', 'Usuario y nombre son obligatorios.');
    try {
      await api.createUser({ ...local, type: 'ADMIN', source: 'LOCAL', password: local.password || 'changeme' });
      toast.success('Administrador creado', `${local.firstName} fue creado localmente.`);
      onDone();
    } catch (e) { toast.error('Error', (e as Error).message); }
  };

  const importLdap = async (p: LdapPerson) => {
    try {
      await api.importLdap(p.username, importingRoles);
      toast.success('Cliente final integrado', `${p.firstName} ${p.lastName} se importó desde LDAP.`);
      onDone();
    } catch (e) { toast.error('Error', (e as Error).message); }
  };

  return (
    <Modal wide title="Nuevo usuario" subtitle="Elija el tipo de usuario que desea crear." onClose={onClose}
      footer={mode === 'ADMIN' ? <>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={createLocal}>Crear administrador</button>
      </> : <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>}>

      <div className="grid cols-2 mb-4">
        <button className={`check-card ${mode === 'ADMIN' ? 'checked' : ''}`} onClick={() => setMode('ADMIN')} style={{ textAlign: 'left' }}>
          <span className="icon-tile" style={{ width: 36, height: 36, background: 'var(--navy-600)' }}><IconShield width={18} height={18} /></span>
          <div><div className="cc-title">Administrador</div><div className="cc-desc">Se crea localmente en la consola, con contraseña.</div></div>
        </button>
        <button className={`check-card ${mode === 'CLIENTE_FINAL' ? 'checked' : ''}`} onClick={() => setMode('CLIENTE_FINAL')} style={{ textAlign: 'left' }}>
          <span className="icon-tile ldap" style={{ width: 36, height: 36, background: 'var(--amber-600)' }}><IconLdap width={18} height={18} /></span>
          <div><div className="cc-title">Cliente final</div><div className="cc-desc">Se integra exclusivamente desde el directorio LDAP.</div></div>
        </button>
      </div>

      {mode === 'ADMIN' ? (
        <>
          <div className="form-grid">
            <Field label="Usuario"><input className="input" value={local.username} onChange={(e) => setLocal({ ...local, username: e.target.value })} placeholder="jperez" /></Field>
            <Field label="Correo"><input className="input" value={local.email} onChange={(e) => setLocal({ ...local, email: e.target.value })} placeholder="jperez@reybanpac.com" /></Field>
            <Field label="Nombres"><input className="input" value={local.firstName} onChange={(e) => setLocal({ ...local, firstName: e.target.value })} /></Field>
            <Field label="Apellidos"><input className="input" value={local.lastName} onChange={(e) => setLocal({ ...local, lastName: e.target.value })} /></Field>
            <Field label="Cargo"><input className="input" value={local.cargo} onChange={(e) => setLocal({ ...local, cargo: e.target.value })} /></Field>
            <Field label="Departamento"><input className="input" value={local.department} onChange={(e) => setLocal({ ...local, department: e.target.value })} /></Field>
          </div>
          <Field label="Contraseña" hint="Credencial local para iniciar sesión. El administrador debería cambiarla en el primer ingreso."><input className="input" type="password" value={local.password} onChange={(e) => setLocal({ ...local, password: e.target.value })} placeholder="••••••••" /></Field>
          <Field label="Roles iniciales (opcional)">
            <div className="grid cols-2">
              {roles.map((r) => {
                const checked = local.roleIds.includes(r.id);
                return (
                  <label key={r.id} className={`check-card ${checked ? 'checked' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => setLocal({ ...local, roleIds: checked ? local.roleIds.filter((x) => x !== r.id) : [...local.roleIds, r.id] })} />
                    <div><div className="cc-title">{r.name}</div></div>
                  </label>
                );
              })}
            </div>
          </Field>
        </>
      ) : (
        <>
          <div className={`banner ${ldapSource === 'LDAP' ? 'banner-ok' : 'banner-warn'} mb-4`}>
            <IconLdap /> {loadingLdap ? 'Consultando directorio LDAP…' : ldapMsg || 'Directorio LDAP'}
          </div>
          <Field label="Roles a asignar al importar (opcional)">
            <div className="row gap-2 wrap">
              {roles.map((r) => {
                const checked = importingRoles.includes(r.id);
                return <button key={r.id} className={`badge ${checked ? 'badge-blue' : 'badge-gray'}`} onClick={() => setImportingRoles(checked ? importingRoles.filter((x) => x !== r.id) : [...importingRoles, r.id])} style={{ cursor: 'pointer' }}>{checked && <IconCheck width={11} height={11} />}{r.name}</button>;
              })}
            </div>
          </Field>
          <div className="table-wrap card mt-3">
            <table className="data">
              <thead><tr><th>Usuario LDAP</th><th>Cargo</th><th>DN</th><th></th></tr></thead>
              <tbody>
                {ldap.map((p) => {
                  const already = existing.some((u) => u.username.toLowerCase() === p.username.toLowerCase()) || p.imported;
                  return (
                    <tr key={p.dn}>
                      <td><div className="row gap-3"><Avatar first={p.firstName} last={p.lastName} ldap size="sm" /><div><div className="cell-strong small">{p.firstName} {p.lastName}</div><div className="tiny dim mono">{p.username}</div></div></div></td>
                      <td className="small">{p.cargo || '—'}<div className="tiny dim">{p.department}</div></td>
                      <td className="tiny dim mono">{p.dn}</td>
                      <td className="center">
                        {already ? <span className="badge badge-green"><IconCheck width={11} height={11} /> Integrado</span>
                          : <button className="btn btn-gold btn-sm" onClick={() => importLdap(p)}><IconDownload width={14} height={14} /> Integrar</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ------------------------- Editar usuario ------------------------- */
function EditUserModal({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ firstName: user.firstName, lastName: user.lastName, email: user.email, cargo: user.cargo, department: user.department, status: user.status, password: '' });
  const save = async () => {
    try { await api.updateUser(user.id, f); toast.success('Usuario actualizado'); onDone(); }
    catch (e) { toast.error('Error', (e as Error).message); }
  };
  return (
    <Modal title={`Editar · ${user.firstName} ${user.lastName}`} subtitle={user.source === 'LDAP' ? 'Usuario integrado desde LDAP' : 'Administrador local'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></>}>
      <div className="form-grid">
        <Field label="Nombres"><input className="input" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></Field>
        <Field label="Apellidos"><input className="input" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field>
        <Field label="Correo"><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Estado">
          <select className="select" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as User['status'] })}><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option></select>
        </Field>
        <Field label="Cargo"><input className="input" value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} /></Field>
        <Field label="Departamento"><input className="input" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></Field>
      </div>
      {user.source === 'LOCAL' && <Field label="Nueva contraseña" hint="Dejar vacío para no cambiarla."><input className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="••••••" /></Field>}
    </Modal>
  );
}

/* ------------------------- Asignar roles ------------------------- */
function AssignRolesModal({ user, roles, onClose, onDone }: { user: User; roles: Role[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [sel, setSel] = useState<string[]>([...user.roleIds]);
  const save = async () => {
    try { await api.setUserRoles(user.id, sel); toast.success('Roles asignados', `${sel.length} rol(es) para ${user.firstName}.`); onDone(); }
    catch (e) { toast.error('Error', (e as Error).message); }
  };
  return (
    <Modal title={`Asignar roles · ${user.firstName} ${user.lastName}`} subtitle="Seleccione los roles que tendrá este usuario." onClose={onClose}
      footer={<><span className="muted small grow">{sel.length} rol(es)</span><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></>}>
      <div className="grid" style={{ gap: 10 }}>
        {roles.map((r) => {
          const checked = sel.includes(r.id);
          return (
            <label key={r.id} className={`check-card ${checked ? 'checked' : ''}`}>
              <input type="checkbox" checked={checked} onChange={() => setSel(checked ? sel.filter((x) => x !== r.id) : [...sel, r.id])} />
              <span className="icon-tile" style={{ width: 30, height: 30, background: r.color }}>{r.isAdmin ? <IconShield width={14} height={14} /> : <IconRoles width={14} height={14} />}</span>
              <div className="grow"><div className="cc-title">{r.name} {r.isAdmin && <span className="badge badge-red">Acceso completo</span>}</div><div className="cc-desc">{r.description}</div></div>
            </label>
          );
        })}
      </div>
    </Modal>
  );
}
