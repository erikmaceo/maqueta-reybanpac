import { type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Systems from './pages/Systems';
import Roles from './pages/Roles';
import Users from './pages/Users';
import Directory from './pages/Directory';
import Authorizer from './pages/Authorizer';
import Access from './pages/Access';
import Audit from './pages/Audit';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <div className="row gap-3 muted">
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
          Cargando consola…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        {/* Gestión: exclusiva de administradores globales. */}
        <Route path="/sistemas" element={<AdminOnly><Systems /></AdminOnly>} />
        <Route path="/roles" element={<AdminOnly><Roles /></AdminOnly>} />
        <Route path="/usuarios" element={<AdminOnly><Users /></AdminOnly>} />
        <Route path="/directorio" element={<AdminOnly><Directory /></AdminOnly>} />
        {/* Operación: el autorizador es accesible a los Dueños Técnicos. */}
        <Route path="/autorizador" element={<Authorizer />} />
        <Route path="/accesos" element={<AdminOnly><Access /></AdminOnly>} />
        <Route path="/auditoria" element={<AdminOnly><Audit /></AdminOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

/** Restringe una ruta a administradores globales; el resto se redirige al panel. */
function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}
