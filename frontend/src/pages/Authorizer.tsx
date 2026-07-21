import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { AccessRequest, Role, SystemApp, User, RequestStatus } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { emitDataChanged, formatDateTime, relativeTime } from '../lib/events';
import { Modal, Field, Empty, Avatar, StatusBadge, TableSkeleton, ErrorState } from '../components/ui';
import RequestAccessModal from '../components/RequestAccessModal';
import { IconAuthorizer, IconCheck, IconClose, IconShield, IconClock, IconUser, IconPlus } from '../components/icons';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

export default function Authorizer() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [systems, setSystems] = useState<SystemApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('PENDING');
  const [decision, setDecision] = useState<{ req: AccessRequest; action: 'approve' | 'reject' } | null>(null);
  const [requesting, setRequesting] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [rq, r, u, s] = await Promise.all([api.listRequests(), api.listRoles(), api.listUsers(), api.listSystems()]);
      setRequests(rq); setRoles(r); setUsers(u); setSystems(s);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const roleById = (id: string) => roles.find((r) => r.id === id);
  const userById = (id: string | null) => users.find((u) => u.id === id);
  const sysById = (id: string | null) => systems.find((s) => s.id === id);

  const counts = useMemo(() => ({
    PENDING: requests.filter((r) => r.status === 'PENDING').length,
    APPROVED: requests.filter((r) => r.status === 'APPROVED').length,
    REJECTED: requests.filter((r) => r.status === 'REJECTED').length,
    ALL: requests.length,
  }), [requests]);

  const list = requests.filter((r) => tab === 'ALL' || r.status === (tab as RequestStatus));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Módulo autorizador</h1>
          <p>Bandeja de solicitudes de acceso. Apruebe o rechace la asignación de roles a usuarios; al aprobar se genera el acceso efectivo.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setRequesting(true)}><IconPlus /> Nueva Solicitud</button>
      </div>

      <div className="grid cols-4 mb-4">
        <StatCard label="Pendientes" value={counts.PENDING} cls="badge-amber" active={tab === 'PENDING'} onClick={() => setTab('PENDING')} />
        <StatCard label="Aprobadas" value={counts.APPROVED} cls="badge-green" active={tab === 'APPROVED'} onClick={() => setTab('APPROVED')} />
        <StatCard label="Rechazadas" value={counts.REJECTED} cls="badge-red" active={tab === 'REJECTED'} onClick={() => setTab('REJECTED')} />
        <StatCard label="Todas" value={counts.ALL} cls="badge-blue" active={tab === 'ALL'} onClick={() => setTab('ALL')} />
      </div>

      {loading ? <TableSkeleton rows={4} cols={3} /> : error ? <ErrorState message={error} onRetry={load} /> : list.length === 0 ? (
        <div className="card"><Empty icon={<IconAuthorizer />} title={tab === 'PENDING' ? '¡Todo al día!' : 'Sin solicitudes'} hint={tab === 'PENDING' ? 'No hay solicitudes pendientes de autorización.' : 'No hay solicitudes en esta categoría.'} /></div>
      ) : (
        <div className="grid" style={{ gap: 14 }}>
          {list.map((req) => {
            const role = roleById(req.roleId);
            const user = userById(req.userId);
            const sys = sysById(req.systemId);
            const authorizer = userById(role?.authorizerUserId ?? null);
            const requester = userById(req.requestedByUserId);
            const decider = userById(req.decidedByUserId);
            // Quién puede resolver: el Dueño Técnico del rol o un admin global, nunca el beneficiario.
            const canDecide = !!me && req.userId !== me.id && (!!me.isAdmin || role?.authorizerUserId === me.id);
            return (
              <div key={req.id} className="card pad" style={{ borderLeft: `4px solid ${req.status === 'PENDING' ? 'var(--amber-600)' : req.status === 'APPROVED' ? 'var(--green-600)' : 'var(--red-700)'}` }}>
                <div className="row between wrap gap-3">
                  <div className="row gap-3">
                    <Avatar first={user?.firstName || '?'} last={user?.lastName} ldap={user?.source === 'LDAP'} size="lg" />
                    <div>
                      <div className="row gap-2 wrap">
                        <b style={{ fontSize: 15 }}>{user ? `${user.firstName} ${user.lastName}` : 'Usuario'}</b>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="small muted">
                        Solicita el rol <b style={{ color: role?.color }}>{role?.name || '—'}</b>
                        {sys && <> en <b>{sys.name}</b></>}
                      </div>
                      <div className="tiny dim row gap-2 mt-2"><IconClock width={12} height={12} /> {relativeTime(req.createdAt)} · solicitado por {requester ? `${requester.firstName} ${requester.lastName}` : '—'}</div>
                    </div>
                  </div>
                  {req.status === 'PENDING' && (canDecide ? (
                    <div className="row gap-2">
                      <button className="btn btn-danger" onClick={() => setDecision({ req, action: 'reject' })}><IconClose width={15} height={15} /> Rechazar</button>
                      <button className="btn btn-success" onClick={() => setDecision({ req, action: 'approve' })}><IconCheck width={15} height={15} /> Aprobar</button>
                    </div>
                  ) : (
                    <span className="tiny dim" style={{ maxWidth: 240, textAlign: 'right' }}>
                      {me && req.userId === me.id
                        ? 'No puede resolver su propia solicitud (segregación de funciones).'
                        : 'Solo el Dueño Técnico de este rol o un administrador global puede resolverla.'}
                    </span>
                  ))}
                </div>

                <div className="card pad mt-3" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
                  <div className="tiny dim mb-2">JUSTIFICACIÓN</div>
                  <div className="small">{req.justification || 'Sin justificación.'}</div>
                </div>

                <div className="row gap-4 wrap mt-3 small">
                  <span className="row gap-2 muted"><IconShield width={14} height={14} /> Autorizador del rol: <b style={{ color: 'var(--text-2)' }}>{authorizer ? `${authorizer.firstName} ${authorizer.lastName}` : '— sin asignar'}</b></span>
                  {req.status !== 'PENDING' && (
                    <span className="row gap-2 muted"><IconUser width={14} height={14} /> Resuelta por <b style={{ color: 'var(--text-2)' }}>{decider ? `${decider.firstName} ${decider.lastName}` : '—'}</b> · {formatDateTime(req.decidedAt)}</span>
                  )}
                </div>
                {req.status !== 'PENDING' && req.decisionComment && (
                  <div className={`banner ${req.status === 'APPROVED' ? 'banner-ok' : 'banner-warn'} mt-3`}>
                    {req.status === 'APPROVED' ? <IconCheck /> : <IconClose />} {req.decisionComment}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {decision && (
        <DecisionModal info={decision} role={roleById(decision.req.roleId)} user={userById(decision.req.userId)}
          onClose={() => setDecision(null)} onDone={() => { setDecision(null); emitDataChanged(); load(); }} />
      )}

      {requesting && (
        <RequestAccessModal users={users} roles={roles} systems={systems}
          onClose={() => setRequesting(false)}
          onDone={() => { setRequesting(false); setTab('PENDING'); emitDataChanged(); load(); }} />
      )}
    </>
  );
}

function StatCard({ label, value, cls, active, onClick }: { label: string; value: number; cls: string; active: boolean; onClick: () => void }) {
  return (
    <button className="card kpi" onClick={onClick} style={{ textAlign: 'left', cursor: 'pointer', outline: active ? '2px solid var(--navy-500)' : 'none', borderColor: active ? 'var(--navy-500)' : undefined }}>
      <div className="row between"><span className="kpi-label">{label}</span><span className={`badge ${cls}`}><span className="dot" /></span></div>
      <div className="kpi-val">{value}</div>
    </button>
  );
}

function DecisionModal({ info, role, user, onClose, onDone }: { info: { req: AccessRequest; action: 'approve' | 'reject' }; role?: Role; user?: User; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const approve = info.action === 'approve';
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (approve) { await api.approveRequest(info.req.id, comment); toast.success('Solicitud aprobada', 'Se generó el acceso efectivo y se asignó el rol.'); }
      else { await api.rejectRequest(info.req.id, comment || 'Rechazado.'); toast.info('Solicitud rechazada'); }
      onDone();
    } catch (e) { toast.error('Error', (e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal title={approve ? 'Aprobar solicitud' : 'Rechazar solicitud'}
      subtitle={`${user ? `${user.firstName} ${user.lastName}` : ''} · rol ${role?.name || ''}`} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className={`btn ${approve ? 'btn-success' : 'btn-danger'}`} disabled={busy} onClick={submit}>
          {approve ? <><IconCheck width={15} height={15} /> Confirmar aprobación</> : <><IconClose width={15} height={15} /> Confirmar rechazo</>}
        </button>
      </>}>
      <div className={`banner ${approve ? 'banner-ok' : 'banner-warn'} mb-4`}>
        {approve ? <IconCheck /> : <IconClose />}
        {approve ? 'Al aprobar, el usuario recibirá el rol y se registrará el acceso efectivo.' : 'Al rechazar, la solicitud quedará registrada sin otorgar acceso.'}
      </div>
      <Field label={approve ? 'Comentario de aprobación' : 'Motivo del rechazo'}>
        <textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={approve ? 'Comentario…' : 'Indique el motivo del rechazo…'} />
      </Field>
    </Modal>
  );
}
