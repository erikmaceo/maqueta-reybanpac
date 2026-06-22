import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Field } from '../components/ui';
import { IconShield, IconRoles, IconLdap, IconLock, IconUser } from '../components/icons';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('ctudela');
  const [password, setPassword] = useState('admin123');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(username, password);
      toast.success('Bienvenido', 'Sesión iniciada correctamente.');
    } catch (err) {
      toast.error('No se pudo iniciar sesión', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <aside className="login-aside">
        <div className="brand-lg" style={{ textAlign: 'center' }}>
          <img src="/logo-reybanpac.png" alt="Logo Reybanpac" style={{ width: 200, height: 'auto' }} />
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 24 }}>Central Access Manager</div>
            <div style={{ color: 'var(--gold-500)', fontSize: 14, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>Favorita Fruit Company · Reybanpac</div>
          </div>
        </div>

        <div>
          <h2>Administración centralizada de accesos a sistemas mediante roles.</h2>
          <div className="feat"><IconRoles /><div><b style={{ color: '#fff' }}>Roles y accesos</b><br />Defina roles y seleccione qué accesos otorgan en cada sistema.</div></div>
          <div className="feat"><IconShield /><div><b style={{ color: '#fff' }}>Módulo autorizador</b><br />Flujo de aprobación para autorizar el acceso de los usuarios.</div></div>
          <div className="feat"><IconLdap /><div><b style={{ color: '#fff' }}>Integración LDAP</b><br />Los clientes finales se integran exclusivamente desde el directorio.</div></div>
        </div>

        <div style={{ color: '#8aa6da', fontSize: 12 }}>© {new Date().getFullYear()} Reybanpac · Maqueta de gobierno de identidades</div>
      </aside>

      <div className="login-form-side">
        <form className="login-card" onSubmit={submit}>
          <div className="lc-logo"><img src="/logo-reybanpac.png" alt="Logo Reybanpac" style={{ width: 80, height: 'auto' }} /><b>Central Access Manager</b></div>
          <h1 style={{ fontSize: 24 }}>Iniciar sesión</h1>
          <p className="muted mt-2 mb-4">Acceda con su cuenta de administrador local.</p>

          <Field label="Usuario">
            <div className="search" style={{ padding: '0 12px' }}>
              <IconUser />
              <input style={{ width: '100%' }} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="usuario" autoFocus />
            </div>
          </Field>
          <Field label="Contraseña">
            <div className="search" style={{ padding: '0 12px' }}>
              <IconLock />
              <input style={{ width: '100%' }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </Field>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, padding: '11px' }} disabled={busy}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>

          <div className="hint-box mt-4">
            <b>Maqueta:</b> use <span className="mono">ctudela</span> / <span className="mono">admin123</span> (Administrador Global).
          </div>
        </form>
      </div>
    </div>
  );
}
