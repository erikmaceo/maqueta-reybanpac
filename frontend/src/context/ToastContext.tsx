import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { IconCheck, IconAlert, IconInfo, IconClose } from '../components/icons';

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; title: string; msg?: string; }

interface ToastCtx {
  toast: (kind: ToastKind, title: string, msg?: string) => void;
  success: (title: string, msg?: string) => void;
  error: (title: string, msg?: string) => void;
  info: (title: string, msg?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);
let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((kind: ToastKind, title: string, msg?: string) => {
    const id = ++counter;
    setToasts((t) => [...t, { id, kind, title, msg }]);
    setTimeout(() => remove(id), 4200);
  }, [remove]);

  const value: ToastCtx = {
    toast,
    success: (t, m) => toast('success', t, m),
    error: (t, m) => toast('error', t, m),
    info: (t, m) => toast('info', t, m),
  };

  const icon = (k: ToastKind) => (k === 'success' ? <IconCheck /> : k === 'error' ? <IconAlert /> : <IconInfo />);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span style={{ color: t.kind === 'success' ? 'var(--green-600)' : t.kind === 'error' ? 'var(--red-700)' : 'var(--navy-600)' }}>{icon(t.kind)}</span>
            <div className="grow">
              <div className="t-title">{t.title}</div>
              {t.msg && <div className="t-msg">{t.msg}</div>}
            </div>
            <button className="x-btn" onClick={() => remove(t.id)}><IconClose width={14} height={14} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
