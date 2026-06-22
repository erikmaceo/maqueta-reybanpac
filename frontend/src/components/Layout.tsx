import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { onDataChanged } from '../lib/events';
import { Avatar } from './ui';
import {
  IconDashboard, IconSystems, IconRoles, IconUsers, IconAuthorizer,
  IconAccess, IconAudit, IconLogout, IconLdap,
} from './icons';

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true, group: 'General' },
  { to: '/sistemas', label: 'Sistemas', icon: IconSystems, group: 'Gobierno de accesos', adminOnly: true },
  { to: '/roles', label: 'Roles y accesos', icon: IconRoles, group: 'Gobierno de accesos', adminOnly: true },
  { to: '/usuarios', label: 'Usuarios', icon: IconUsers, group: 'Gobierno de accesos', adminOnly: true },
  { to: '/directorio', label: 'Directorio LDAP', icon: IconLdap, group: 'Gobierno de accesos', adminOnly: true },
  { to: '/autorizador', label: 'Autorizador', icon: IconAuthorizer, group: 'Operación', badge: true },
  { to: '/accesos', label: 'Accesos efectivos', icon: IconAccess, group: 'Operación', adminOnly: true },
  { to: '/auditoria', label: 'Auditoría', icon: IconAudit, group: 'Operación', adminOnly: true },
];

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Panel de control', sub: 'Resumen de la gestión centralizada de accesos' },
  '/sistemas': { title: 'Sistemas', sub: 'Aplicativos gobernados y su catálogo de accesos' },
  '/roles': { title: 'Roles y accesos', sub: 'Defina roles y seleccione los accesos que otorgan' },
  '/usuarios': { title: 'Usuarios', sub: 'Administradores locales y clientes finales desde LDAP' },
  '/directorio': { title: 'Directorio LDAP', sub: 'Usuarios cliente final integrados desde el directorio corporativo' },
  '/autorizador': { title: 'Módulo autorizador', sub: 'Aprobación y rechazo de solicitudes de acceso' },
  '/accesos': { title: 'Accesos efectivos', sub: 'Matriz de accesos vigentes por usuario y sistema' },
  '/auditoria': { title: 'Auditoría', sub: 'Trazabilidad de todas las acciones de la consola' },
};

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [pending, setPending] = useState(0);

  // El badge cuenta solo lo que el usuario puede resolver: todas (admin global) o
  // las solicitudes de los roles de los que es Dueño Técnico autorizador.
  const refreshPending = () => {
    if (isAdmin) {
      api.listRequests('PENDING').then((r) => setPending(r.length)).catch(() => {});
    } else if (user) {
      Promise.all([api.listRequests('PENDING'), api.listRoles()])
        .then(([reqs, roles]) =>
          setPending(reqs.filter((req) => roles.find((r) => r.id === req.roleId)?.authorizerUserId === user.id).length))
        .catch(() => {});
    }
  };
  useEffect(() => { refreshPending(); }, [location.pathname]);
  useEffect(() => onDataChanged(refreshPending), [isAdmin, user?.id]);

  const meta = PAGE_META[location.pathname] || { title: 'Central Access Manager', sub: '' };
  const visibleNav = NAV.filter((n) => isAdmin || !n.adminOnly);
  const groups = [...new Set(visibleNav.map((n) => n.group))];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo-reybanpac.png" alt="Reybanpac" />
          <div>
            <div className="title">Central Access<br />Manager</div>
            <div className="sub">Reybanpac</div>
          </div>
        </div>
        <nav className="nav">
          {groups.map((g) => (
            <div key={g}>
              <div className="group-label">{g}</div>
              {visibleNav.filter((n) => n.group === g).map((n) => {
                const Icon = n.icon;
                return (
                  <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                    <Icon />
                    <span>{n.label}</span>
                    {n.badge && pending > 0 && <span className="badge-count">{pending}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="foot">
          v1.0 · Maqueta · Datos en memoria<br />Favorita Fruit Company
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="grow">
            <div className="page-title">{meta.title}</div>
            <div className="page-sub">{meta.sub}</div>
          </div>
          {user && (
            <div className="row gap-3">
              <div className="userchip">
                <Avatar first={user.firstName} last={user.lastName} size="sm" />
                <div className="meta">
                  <b>{user.firstName} {user.lastName}</b><br />
                  <span>{user.cargo || 'Administrador'}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={logout}><IconLogout /></button>
            </div>
          )}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
