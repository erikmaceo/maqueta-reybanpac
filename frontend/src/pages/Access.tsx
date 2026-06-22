import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Grant, Role, SystemApp, User } from '../types';
import { useToast } from '../context/ToastContext';
import { emitDataChanged, formatDate } from '../lib/events';
import { Empty, Confirm, Avatar, SystemTile, TableSkeleton, ErrorState } from '../components/ui';
import { IconAccess, IconTrash, IconLayers, IconShield, IconCheck, IconAuthorizer } from '../components/icons';

export default function Access() {
  const toast = useToast();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [systems, setSystems] = useState<SystemApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'matrix'>('list');
  const [toRevoke, setToRevoke] = useState<Grant | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [g, r, u, s] = await Promise.all([api.listGrants(), api.listRoles(), api.listUsers(), api.listSystems()]);
      setGrants(g); setRoles(r); setUsers(u); setSystems(s);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const roleById = (id: string) => roles.find((r) => r.id === id);
  const userById = (id: string) => users.find((u) => u.id === id);
  const sysById = (id: string | null) => systems.find((s) => s.id === id);

  const revoke = async (g: Grant) => {
    try { await api.revokeGrant(g.id); toast.success('Acceso revocado'); emitDataChanged(); load(); }
    catch (e) { toast.error('Error', (e as Error).message); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Accesos efectivos</h1>
          <p>Consulta de los accesos vigentes por usuario y sistema. Para otorgar un nuevo acceso, cree una solicitud en el módulo autorizador; al aprobarse aparecerá aquí.</p>
        </div>
        <div className="row gap-3">
          <div className="tabs" role="tablist" aria-label="Vista de accesos">
            <button role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Lista</button>
            <button role="tab" aria-selected={view === 'matrix'} className={view === 'matrix' ? 'active' : ''} onClick={() => setView('matrix')}>Matriz</button>
          </div>
          <Link to="/autorizador" className="btn btn-ghost"><IconAuthorizer /> Ir al autorizador</Link>
        </div>
      </div>

      {loading ? <TableSkeleton rows={6} cols={6} /> : error ? <ErrorState message={error} onRetry={load} /> : view === 'list' ? (
        grants.length === 0 ? (
          <div className="card"><Empty icon={<IconAccess />} title="Sin accesos vigentes" hint="Cree una solicitud en el módulo autorizador; al aprobarse, el acceso aparecerá aquí."
            action={<Link to="/autorizador" className="btn btn-primary"><IconAuthorizer /> Crear solicitud</Link>} /></div>
        ) : (
          <div className="card table-wrap">
            <table className="data">
              <thead><tr><th>Usuario</th><th>Rol</th><th>Sistema</th><th>Otorgado</th><th>Autorizado por</th><th>Origen</th><th></th></tr></thead>
              <tbody>
                {grants.map((g) => {
                  const u = userById(g.userId); const r = roleById(g.roleId); const s = sysById(g.systemId); const by = userById(g.authorizedByUserId || '');
                  return (
                    <tr key={g.id}>
                      <td><div className="row gap-3"><Avatar first={u?.firstName || '?'} last={u?.lastName} ldap={u?.source === 'LDAP'} size="sm" /><div><div className="cell-strong small">{u ? `${u.firstName} ${u.lastName}` : '—'}</div><div className="tiny dim mono">{u?.username}</div></div></div></td>
                      <td><span className="badge" style={{ background: (r?.color || '#888') + '18', color: r?.color, borderColor: (r?.color || '#888') + '30' }}>{r?.isAdmin && <IconShield width={11} height={11} />}{r?.name || '—'}</span></td>
                      <td>{s ? <div className="row gap-2"><SystemTile code={s.code} color={s.color} /><span className="small">{s.name}</span></div> : <span className="badge badge-gray">Transversal</span>}</td>
                      <td className="small">{formatDate(g.grantedAt)}</td>
                      <td className="small">{by ? `${by.firstName} ${by.lastName}` : '—'}</td>
                      <td>{g.requestId ? <span className="badge badge-green"><IconCheck width={11} height={11} /> Autorizado</span> : <span className="badge badge-gray">Directo</span>}</td>
                      <td><div className="cell-actions"><button className="btn btn-danger btn-sm btn-icon" title="Revocar" aria-label={`Revocar acceso de ${u ? `${u.firstName} ${u.lastName}` : 'usuario'}`} onClick={() => setToRevoke(g)}><IconTrash width={15} height={15} /></button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <MatrixView users={users} systems={systems} roles={roles} grants={grants} />
      )}

      {toRevoke && <Confirm title="Revocar acceso" message="¿Revocar este acceso efectivo? El rol se quitará del usuario." confirmLabel="Revocar" onConfirm={() => revoke(toRevoke)} onClose={() => setToRevoke(null)} />}
    </>
  );
}

function MatrixView({ users, systems, roles, grants }: { users: User[]; systems: SystemApp[]; roles: Role[]; grants: Grant[] }) {
  const roleById = (id: string) => roles.find((r) => r.id === id);
  const cell = (userId: string, systemId: string) => {
    const rs = grants.filter((g) => g.userId === userId && g.systemId === systemId).map((g) => roleById(g.roleId)).filter(Boolean) as Role[];
    // roles transversales (admin global) aplican a todos los sistemas
    const transversal = grants.filter((g) => g.userId === userId && g.systemId === null).map((g) => roleById(g.roleId)).filter(Boolean) as Role[];
    return [...rs, ...transversal];
  };
  const activeUsers = users.filter((u) => grants.some((g) => g.userId === u.id));
  if (activeUsers.length === 0) return <div className="card"><Empty icon={<IconLayers />} title="Sin datos para la matriz" hint="Aún no hay accesos otorgados." /></div>;

  return (
    <div className="card table-wrap">
      <table className="data">
        <thead><tr><th>Usuario</th>{systems.map((s) => <th key={s.id} className="center">{s.code}</th>)}</tr></thead>
        <tbody>
          {activeUsers.map((u) => (
            <tr key={u.id}>
              <td><div className="row gap-3"><Avatar first={u.firstName} last={u.lastName} ldap={u.source === 'LDAP'} size="sm" /><div className="cell-strong small">{u.firstName} {u.lastName}</div></div></td>
              {systems.map((s) => {
                const rs = cell(u.id, s.id);
                return (
                  <td key={s.id} className="center">
                    {rs.length === 0 ? <span className="dim">·</span> : (
                      <div className="row gap-2 wrap" style={{ justifyContent: 'center' }}>
                        {rs.map((r) => <span key={r.id} className="badge" title={r.name} style={{ background: r.color + '18', color: r.color, borderColor: r.color + '30' }}>{r.isAdmin ? 'Admin*' : r.name.split('—').pop()?.trim() || r.name}</span>)}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="card-body tiny dim">* Rol transversal (acceso completo) aplica a todos los sistemas.</div>
    </div>
  );
}
