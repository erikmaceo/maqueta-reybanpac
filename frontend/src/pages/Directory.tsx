import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LdapPerson, LdapResponse, Role } from '../types';
import { useToast } from '../context/ToastContext';
import { emitDataChanged } from '../lib/events';
import { Modal, Field, Empty, Avatar, SearchBox, TableSkeleton, ErrorState } from '../components/ui';
import { IconLdap, IconDownload, IconCheck, IconRefresh, IconServer } from '../components/icons';

export default function Directory() {
  const toast = useToast();
  const [data, setData] = useState<LdapResponse | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [importing, setImporting] = useState<LdapPerson | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [d, r] = await Promise.all([api.ldapUsers(), api.listRoles()]);
      setData(d); setRoles(r);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const people = (data?.people || []).filter((p) =>
    `${p.firstName} ${p.lastName} ${p.username} ${p.cargo} ${p.department}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Directorio LDAP</h1>
          <p>Origen exclusivo de los usuarios “cliente final”. Desde aquí se integran al sistema y se les pueden asignar roles.</p>
        </div>
        <button className="btn btn-ghost" onClick={load}><IconRefresh /> Actualizar</button>
      </div>

      {data && (
        <div className={`banner ${data.source === 'LDAP' ? 'banner-ok' : 'banner-warn'} mb-4`}>
          <IconServer />
          <div>
            <b>{data.source === 'LDAP' ? 'Conectado al servidor LDAP' : 'Directorio de respaldo (LDAP no disponible)'}</b>
            <div className="small" style={{ opacity: .9 }}>{data.message}</div>
          </div>
        </div>
      )}

      <div className="row between mb-3 wrap gap-3">
        <div className="row gap-2 muted small"><IconLdap width={16} height={16} /> {people.length} usuarios en el directorio</div>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar en el directorio…" />
      </div>

      {loading ? <TableSkeleton rows={6} cols={5} /> : error ? <ErrorState message={error} onRetry={load} /> : people.length === 0 ? (
        <div className="card"><Empty icon={<IconLdap />} title="Sin resultados" hint="No se encontraron usuarios en el directorio." /></div>
      ) : (
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>Usuario</th><th>Cargo</th><th>Departamento</th><th>Distinguished Name (DN)</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.dn}>
                  <td><div className="row gap-3"><Avatar first={p.firstName} last={p.lastName} ldap /><div><div className="cell-strong">{p.firstName} {p.lastName}</div><div className="tiny dim mono">{p.username} · {p.email}</div></div></div></td>
                  <td className="small">{p.cargo || '—'}</td>
                  <td className="small">{p.department || '—'}</td>
                  <td className="tiny dim mono">{p.dn}</td>
                  <td>{p.imported ? <span className="badge badge-green"><IconCheck width={11} height={11} /> Integrado</span> : <span className="badge badge-gray">No integrado</span>}</td>
                  <td className="center">
                    {p.imported ? <span className="tiny dim">—</span>
                      : <button className="btn btn-gold btn-sm" onClick={() => setImporting(p)}><IconDownload width={14} height={14} /> Integrar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {importing && <ImportModal person={importing} roles={roles} onClose={() => setImporting(null)} onDone={() => { setImporting(null); emitDataChanged(); load(); }} />}
    </>
  );
}

function ImportModal({ person, roles, onClose, onDone }: { person: LdapPerson; roles: Role[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [sel, setSel] = useState<string[]>([]);
  const doImport = async () => {
    try {
      await api.importLdap(person.username, sel);
      toast.success('Cliente final integrado', `${person.firstName} ${person.lastName} fue integrado desde LDAP.`);
      onDone();
    } catch (e) { toast.error('Error', (e as Error).message); }
  };
  return (
    <Modal title="Integrar cliente final desde LDAP" subtitle={`${person.firstName} ${person.lastName} · ${person.dn}`} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={doImport}><IconDownload width={15} height={15} /> Integrar usuario</button></>}>
      <div className="card pad mb-4" style={{ background: 'var(--surface-2)' }}>
        <div className="row gap-3"><Avatar first={person.firstName} last={person.lastName} ldap size="lg" />
          <div><b>{person.firstName} {person.lastName}</b><div className="small muted">{person.cargo} · {person.department}</div><div className="tiny dim mono">{person.email}</div></div>
        </div>
      </div>
      <Field label="Asignar roles (opcional)">
        <div className="grid" style={{ gap: 8 }}>
          {roles.map((r) => {
            const checked = sel.includes(r.id);
            return (
              <label key={r.id} className={`check-card ${checked ? 'checked' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => setSel(checked ? sel.filter((x) => x !== r.id) : [...sel, r.id])} />
                <span className="icon-tile" style={{ width: 28, height: 28, background: r.color, fontSize: 11 }}>{r.name.slice(0, 2)}</span>
                <div className="grow"><div className="cc-title">{r.name}</div></div>
              </label>
            );
          })}
        </div>
      </Field>
    </Modal>
  );
}
