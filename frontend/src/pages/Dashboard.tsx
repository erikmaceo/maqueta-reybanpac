import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Stats } from '../types';
import { relativeTime } from '../lib/events';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/ui';
import {
  IconSystems, IconRoles, IconUsers, IconAuthorizer, IconKey, IconAccess,
  IconChevronRight, IconClock, IconShield, IconLdap,
} from '../components/icons';

const KPI = ({ icon, val, label, foot, bg, color }: any) => (
  <div className="card kpi">
    <div className="kpi-icon" style={{ background: bg, color }}>{icon}</div>
    <div className="kpi-val">{val}</div>
    <div className="kpi-label">{label}</div>
    {foot && <div className="kpi-foot">{foot}</div>}
  </div>
);

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [myPending, setMyPending] = useState<number | null>(null);

  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);
  // Para un Dueño Técnico no-admin el KPI muestra solo lo que él puede resolver
  // (coherente con el badge del menú lateral); el admin global ve el total.
  useEffect(() => {
    if (isAdmin || !user) { setMyPending(null); return; }
    Promise.all([api.listRequests('PENDING'), api.listRoles()])
      .then(([reqs, roles]) => setMyPending(reqs.filter((req) => roles.find((r) => r.id === req.roleId)?.authorizerUserId === user.id).length))
      .catch(() => {});
  }, [isAdmin, user?.id]);

  if (!stats) return <TableSkeleton rows={6} cols={4} />;

  const pendingVal = isAdmin ? stats.pendingRequests : (myPending ?? 0);
  const pendingFoot = isAdmin ? 'Requieren autorización' : 'Le corresponde autorizar';
  const maxRoles = Math.max(1, ...stats.rolesPerSystem.map((s) => s.roles));
  const totalUsers = stats.usersByType.ADMIN + stats.usersByType.CLIENTE_FINAL || 1;
  const adminPct = Math.round((stats.usersByType.ADMIN / totalUsers) * 100);

  return (
    <div className="grid" style={{ gap: 18 }}>
      {/* KPIs */}
      <div className="grid cols-4">
        <KPI icon={<IconSystems />} val={stats.systems} label="Sistemas gobernados" foot={`${stats.permissions} accesos catalogados`} bg="var(--blue-50)" color="var(--navy-600)" />
        <KPI icon={<IconRoles />} val={stats.roles} label="Roles definidos" foot="Admin / Edit / View y más" bg="#f5f3ff" color="var(--violet-600)" />
        <KPI icon={<IconUsers />} val={stats.users} label="Usuarios" foot={`${stats.localUsers} locales · ${stats.ldapUsers} LDAP`} bg="var(--green-50)" color="var(--green-700)" />
        <KPI icon={<IconAuthorizer />} val={pendingVal} label="Solicitudes pendientes" foot={pendingFoot} bg="var(--amber-50)" color="var(--amber-700)" />
      </div>

      <div className="grid cols-3">
        {/* Roles por sistema */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-head">
            <h3>Roles por sistema</h3>
            {isAdmin && <Link to="/sistemas" className="btn btn-ghost btn-sm">Ver sistemas <IconChevronRight width={14} height={14} /></Link>}
          </div>
          <div className="card-body grid" style={{ gap: 14 }}>
            {stats.rolesPerSystem.map((s) => (
              <div key={s.systemId}>
                <div className="row between mb-2">
                  <div className="row gap-2">
                    <span className="icon-tile" style={{ width: 26, height: 26, fontSize: 10, background: s.color }}>{s.code.slice(0, 2)}</span>
                    <b className="small">{s.name}</b>
                  </div>
                  <span className="muted small">{s.roles} {s.roles === 1 ? 'rol' : 'roles'}</span>
                </div>
                <div className="bar"><span style={{ width: `${(s.roles / maxRoles) * 100}%`, background: s.color }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución de usuarios */}
        <div className="card">
          <div className="card-head"><h3>Usuarios</h3></div>
          <div className="card-body">
            <div className="row gap-3 mb-4">
              <div className="grow">
                <div className="row gap-2"><IconShield width={16} height={16} /><b className="small">Administradores</b></div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.usersByType.ADMIN}</div>
                <div className="tiny dim">Creados localmente</div>
              </div>
              <div className="grow">
                <div className="row gap-2"><IconLdap width={16} height={16} /><b className="small">Cliente final</b></div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.usersByType.CLIENTE_FINAL}</div>
                <div className="tiny dim">Desde LDAP</div>
              </div>
            </div>
            <div className="bar" style={{ height: 10 }}>
              <span style={{ width: `${adminPct}%`, background: 'var(--navy-500)' }} />
            </div>
            <div className="row between tiny dim mt-2">
              <span>{adminPct}% admin local</span>
              <span>{100 - adminPct}% LDAP</span>
            </div>

            <div className="divider" />
            <div className="grid" style={{ gap: 8 }}>
              <div className="row between"><span className="muted small">Accesos vigentes</span><b>{stats.grants}</b></div>
              <div className="row between"><span className="muted small">Aprobadas</span><span className="badge badge-green">{stats.approvedRequests}</span></div>
              <div className="row between"><span className="muted small">Rechazadas</span><span className="badge badge-red">{stats.rejectedRequests}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid cols-3">
        {/* Accesos rápidos */}
        <div className="card pad">
          <h3 className="mb-3">Accesos rápidos</h3>
          <div className="grid" style={{ gap: 10 }}>
            {isAdmin && <Link to="/roles" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}><IconRoles /> Crear un rol y elegir accesos</Link>}
            {isAdmin && <Link to="/usuarios" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}><IconUsers /> Crear usuario y asignar roles</Link>}
            <Link to="/autorizador" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}><IconAuthorizer /> Crear y autorizar solicitudes</Link>
            {isAdmin && <Link to="/accesos" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}><IconAccess /> Consultar accesos efectivos</Link>}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-head">
            <h3>Actividad reciente</h3>
            {isAdmin && <Link to="/auditoria" className="btn btn-ghost btn-sm">Ver auditoría <IconChevronRight width={14} height={14} /></Link>}
          </div>
          <div className="card-body">
            <ul className="list-clean">
              {stats.recentAudit.map((a) => (
                <li key={a.id} className="timeline-item">
                  <span className="timeline-dot"><IconClock /></span>
                  <div className="grow">
                    <div className="small"><b>{a.actor}</b> · {a.detail}</div>
                    <div className="tiny dim">{relativeTime(a.timestamp)} · {a.action}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
