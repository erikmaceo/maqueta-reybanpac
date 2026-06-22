// Componentes de interfaz reutilizables.
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { IconClose, IconSearch, IconAlert, IconRefresh } from './icons';
import type { AccessLevel, Environment, RequestStatus, UserSource, UserType } from '../types';

// ---------- Modal ----------
export function Modal({
  title, subtitle, onClose, children, footer, wide,
}: {
  title: string; subtitle?: string; onClose: () => void;
  children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      // Focus trap: Tab/Shift+Tab ciclan dentro del diálogo (cumple aria-modal).
      if (e.key !== 'Tab' || !modalRef.current) return;
      const items = Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = modalRef.current.contains(active);
      if (e.shiftKey && (active === first || !inside)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !inside)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    // Foco al primer control al abrir; restaura el foco previo al cerrar.
    const prev = document.activeElement as HTMLElement | null;
    modalRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.x-btn)')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  // Cierra solo si el gesto empieza y termina en el overlay (evita cierres por
  // arrastre de selección de texto desde dentro del modal).
  const downOnOverlay = useRef(false);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => { downOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (downOnOverlay.current && e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className={`modal${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <div>
            <h3 id={titleId}>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="x-btn" onClick={onClose} aria-label="Cerrar"><IconClose /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Field ----------
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

// ---------- Search ----------
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const label = placeholder || 'Buscar…';
  return (
    <div className="search">
      <IconSearch />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} aria-label={label} />
    </div>
  );
}

// ---------- Estado de error con reintento ----------
export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="card">
      <Empty
        icon={<IconAlert />}
        title="No se pudieron cargar los datos"
        hint={message || 'Ocurrió un error al consultar el servidor. Inténtelo de nuevo.'}
        action={<button className="btn btn-primary" onClick={onRetry}><IconRefresh width={16} height={16} /> Reintentar</button>}
      />
    </div>
  );
}

// ---------- Empty ----------
export function Empty({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h4>{title}</h4>
      {hint && <p className="muted small">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------- Switch ----------
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      {label && <span className="small" style={{ fontWeight: 600 }}>{label}</span>}
    </label>
  );
}

// ---------- Badges semánticos ----------
export function StatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, [string, string]> = {
    PENDING: ['badge-amber', 'Pendiente'],
    APPROVED: ['badge-green', 'Aprobada'],
    REJECTED: ['badge-red', 'Rechazada'],
  };
  const [cls, label] = map[status];
  return <span className={`badge ${cls}`}><span className="dot" />{label}</span>;
}

export function LevelPill({ level }: { level: AccessLevel }) {
  const labels: Record<AccessLevel, string> = { VIEW: 'View', EDIT: 'Edit', ADMIN: 'Admin' };
  return <span className={`level-pill level-${level}`}>{labels[level]}</span>;
}

export function EnvBadge({ env }: { env: Environment }) {
  const map: Record<Environment, string> = { PROD: 'badge-red', PRE: 'badge-amber', QAS: 'badge-violet', DEV: 'badge-blue' };
  return <span className={`badge ${map[env]}`}>{env}</span>;
}

export function TypeBadge({ type }: { type: UserType }) {
  return type === 'ADMIN'
    ? <span className="badge badge-blue">Administrador</span>
    : <span className="badge badge-gray">Cliente final</span>;
}

export function SourceBadge({ source }: { source: UserSource }) {
  return source === 'LDAP'
    ? <span className="badge badge-gold">LDAP</span>
    : <span className="badge badge-green">Local</span>;
}

// ---------- Avatar ----------
export function Avatar({ first, last, size = '', ldap = false }: { first: string; last?: string; size?: 'sm' | 'lg' | ''; ldap?: boolean }) {
  const initials = `${first?.[0] || ''}${last?.[0] || ''}`;
  return <span className={`avatar ${size} ${ldap ? 'ldap' : ''}`}>{initials}</span>;
}

// ---------- Confirm ----------
export function Confirm({
  title, message, confirmLabel = 'Eliminar', danger = true, onConfirm, onClose,
}: {
  title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </>}>
      <p className="muted" style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}

// ---------- Skeleton de tabla ----------
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card">
      <div className="card-body">
        {Array.from({ length: rows }).map((_, r) => (
          <div className="row gap-4" key={r} style={{ padding: '10px 0' }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="skeleton" style={{ height: 14, flex: c === 0 ? 2 : 1 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Tile con color de sistema ----------
export function SystemTile({ code, color }: { code: string; color: string }) {
  return <span className="icon-tile" style={{ background: color }}>{code.slice(0, 2).toUpperCase()}</span>;
}
