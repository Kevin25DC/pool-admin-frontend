'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

// ---- Toast ----
type ToastItem = { id: number; kind: 'success' | 'error' | 'warning' | 'info'; message: string };
type ToastCtx = { success(m: string): void; error(m: string): void; warning(m: string): void; info(m: string): void };
const ToastContext = createContext<ToastCtx>({ success: () => {}, error: () => {}, warning: () => {}, info: () => {} });
export const useToast = () => useContext(ToastContext);

const ICONS: Record<string, string> = {
  success: 'bi-check-circle-fill',
  error:   'bi-x-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info:    'bi-info-circle-fill',
};

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((kind: ToastItem['kind'], message: string) => {
    const id = ++counter.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const ctx: ToastCtx = {
    success: (m) => push('success', m),
    error:   (m) => push('error', m),
    warning: (m) => push('warning', m),
    info:    (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <i className={`bi ${ICONS[t.kind]} toast-icon`} />
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---- QueryClient ----
function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(makeClient);
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
