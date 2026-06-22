// Modal compartido para crear una solicitud de acceso (asignar un rol de un
// sistema a un usuario). La solicitud queda PENDIENTE en el módulo autorizador.
// Usado tanto en "Accesos efectivos" como en "Autorizador".
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Role, SystemApp, User } from '../types';
import { useToast } from '../context/ToastContext';
import { Modal, Field } from './ui';
import { IconAuthorizer, IconShield } from './icons';

interface Props {
  users?: User[];
  roles?: Role[];
  systems?: SystemApp[];
  /** Si se omiten users/roles/systems, el modal los carga por su cuenta. */
  onClose: () => void;
  onDone: () => void;
}

export default function RequestAccessModal({ users: usersProp, roles: rolesProp, systems: systemsProp, onClose, onDone }: Props) {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>(usersProp ?? []);
  const [roles, setRoles] = useState<Role[]>(rolesProp ?? []);
  const [systems, setSystems] = useState<SystemApp[]>(systemsProp ?? []);

  const [userId, setUserId] = useState('');
  const [systemId, setSystemId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [justification, setJustification] = useState('');
  const [busy, setBusy] = useState(false);

  // Si la página no pasó los catálogos, cargarlos al abrir.
  useEffect(() => {
    if (!usersProp || !rolesProp || !systemsProp) {
      Promise.all([api.listUsers(), api.listRoles(), api.listSystems()])
        .then(([u, r, s]) => { setUsers(u); setRoles(r); setSystems(s); })
        .catch((e) => toast.error('Error', (e as Error).message));
    }
  }, []);

  const availableRoles = useMemo(
    () => roles.filter((r) => !systemId || r.systemId === systemId || r.systemId === null),
    [roles, systemId],
  );
  const selectedRole = roles.find((r) => r.id === roleId);
  const authorizer = users.find((u) => u.id === selectedRole?.authorizerUserId);

  const submit = async () => {
    if (!userId || !roleId) return toast.error('Faltan datos', 'Seleccione usuario y rol.');
    setBusy(true);
    try {
      await api.createRequest({ userId, roleId, justification });
      toast.success('Solicitud enviada', 'La asignación quedó pendiente de autorización.');
      onDone();
    } catch (e) { toast.error('Error', (e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Solicitar acceso" subtitle="Asigne un rol de un sistema a un usuario. La solicitud pasará por el módulo autorizador." onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}><IconAuthorizer width={15} height={15} /> Enviar a autorización</button>
      </>}>
      <Field label="Usuario">
        <select className="select" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Seleccione un usuario…</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} · {u.type === 'ADMIN' ? 'Admin' : 'Cliente final'} ({u.source})</option>)}
        </select>
      </Field>
      <div className="form-grid">
        <Field label="Sistema" hint="Filtra los roles por sistema.">
          <select className="select" value={systemId} onChange={(e) => { setSystemId(e.target.value); setRoleId(''); }}>
            <option value="">Todos los sistemas</option>
            {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Rol">
          <select className="select" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Seleccione un rol…</option>
            {availableRoles.map((r) => <option key={r.id} value={r.id}>{r.name}{r.isAdmin ? ' (acceso completo)' : ''}</option>)}
          </select>
        </Field>
      </div>
      {selectedRole && (
        <div className="banner banner-ok mb-4"><IconShield />
          <div>Este rol será autorizado por <b>{authorizer ? `${authorizer.firstName} ${authorizer.lastName}` : 'un administrador global'}</b> (Dueño Técnico) · {selectedRole.permissionIds.length} accesos.</div>
        </div>
      )}
      {selectedRole?.isAdmin && (
        <div className="banner banner-warn mb-4"><IconShield />
          <div><b>Atención:</b> este rol concede <b>acceso completo</b> a todos los sistemas de la consola.</div>
        </div>
      )}
      <Field label="Justificación" hint="Motivo de la solicitud de acceso.">
        <textarea className="input" value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="¿Por qué este usuario necesita este rol?" />
      </Field>
    </Modal>
  );
}
