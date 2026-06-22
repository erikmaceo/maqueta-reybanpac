import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { AuditEntry } from '../types';
import { useToast } from '../context/ToastContext';
import { emitDataChanged, formatDateTime } from '../lib/events';
import { Empty, SearchBox, Confirm } from '../components/ui';
import { IconAudit, IconRefresh, IconClock } from '../components/icons';

const ACTION_STYLE: Record<string, string> = {
  LOGIN: 'badge-gray', CREATE_SYSTEM: 'badge-blue', UPDATE_SYSTEM: 'badge-blue', DELETE_SYSTEM: 'badge-red',
  CREATE_ROLE: 'badge-violet', UPDATE_ROLE: 'badge-violet', DELETE_ROLE: 'badge-red',
  CREATE_USER: 'badge-green', UPDATE_USER: 'badge-blue', DELETE_USER: 'badge-red', ASSIGN_ROLES: 'badge-blue',
  IMPORT_LDAP_USER: 'badge-gold', CREATE_REQUEST: 'badge-amber', APPROVE_REQUEST: 'badge-green',
  REJECT_REQUEST: 'badge-red', REVOKE_GRANT: 'badge-red', CREATE_PERMISSION: 'badge-blue', RESET: 'badge-gray',
};

export default function Audit() {
  const toast = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const load = () => api.listAudit().then(setEntries).catch(() => {});
  useEffect(() => { load(); }, []);

  const actions = useMemo(() => [...new Set(entries.map((e) => e.action))], [entries]);
  const filtered = entries
    .filter((e) => !action || e.action === action)
    .filter((e) => `${e.actor} ${e.detail} ${e.action}`.toLowerCase().includes(q.toLowerCase()));

  const reset = async () => {
    // Recarga la app tras el reset: re-sincroniza la sesión/datos del front con la
    // semilla (si el token quedó huérfano, AuthContext redirige al login).
    try { await api.reset(); window.location.reload(); }
    catch (e) { toast.error('Error', (e as Error).message); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Auditoría</h1>
          <p>Trazabilidad completa de las acciones realizadas en la consola de gestión de accesos.</p>
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost" onClick={load}><IconRefresh /> Actualizar</button>
          <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>Reiniciar maqueta</button>
        </div>
      </div>

      <div className="row between mb-4 wrap gap-3">
        <select className="select" style={{ maxWidth: 240 }} aria-label="Filtrar por acción" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Todas las acciones ({entries.length})</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar en auditoría…" />
      </div>

      {filtered.length === 0 ? (
        <div className="card"><Empty icon={<IconAudit />} title="Sin registros" hint="No hay eventos que coincidan con el filtro." /></div>
      ) : (
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>Fecha y hora</th><th>Actor</th><th>Acción</th><th>Detalle</th></tr></thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="small nowrap"><div className="row gap-2"><IconClock width={13} height={13} /> {formatDateTime(e.timestamp)}</div></td>
                  <td className="cell-strong small mono">{e.actor}</td>
                  <td><span className={`badge ${ACTION_STYLE[e.action] || 'badge-gray'}`}>{e.action}</span></td>
                  <td className="small">{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmReset && <Confirm title="Reiniciar maqueta" message="Se restaurarán todos los datos de ejemplo a su estado inicial. ¿Continuar?" confirmLabel="Reiniciar" onConfirm={reset} onClose={() => setConfirmReset(false)} />}
    </>
  );
}
