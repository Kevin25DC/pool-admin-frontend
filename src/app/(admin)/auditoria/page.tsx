'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { cx, fdatetime } from '@/lib/utils';

type AuditOut = {
  id: number; tenant_id: string | null; actor_type: string; actor_id: number | null;
  action: string; entity: string | null; entity_id: string | null;
  data: Record<string, unknown> | null; created_at: string;
};
type Page<T> = { items: T[]; total: number; page: number; page_size: number };

const PAGE_SIZE = 30;

const ACTION_BADGE: Record<string, string> = {
  'tenant.create':   'badge-success',
  'tenant.suspend':  'badge-warning',
  'tenant.activate': 'badge-info',
  'tenant.cancel':   'badge-danger',
  'settings.update': 'badge-brand',
};

export default function AuditoriaPage() {
  const [page,   setPage]   = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, action],
    queryFn: () => api.get<Page<AuditOut>>('/audit', { page, page_size: PAGE_SIZE, action: action || undefined }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Auditoría</h2>
          <p className="page-sub">{data ? `${data.total} eventos registrados` : '…'}</p>
        </div>
      </div>

      {/* Filtro */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="form-input" style={{ maxWidth: 300 }} placeholder="Filtrar por acción (ej: tenant, settings…)"
              value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner spinner-lg" /></div>
        ) : !data?.items.length ? (
          <div className="empty-state"><i className="bi bi-journal-text" /><p>No hay eventos con este filtro</p></div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Acción</th><th>Actor</th><th>Entidad</th><th>Tienda</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fdatetime(e.created_at)}</td>
                      <td>
                        <span className={cx('badge', ACTION_BADGE[e.action] ?? 'badge-neutral')} style={{ fontFamily: 'monospace', fontSize: 11 }}>
                          {e.action}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>{e.actor_type}</span>
                        {e.actor_id && <span style={{ color: 'var(--muted)', marginLeft: 4 }}>#{e.actor_id}</span>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {e.entity ? <><strong style={{ color: 'var(--ink-2)' }}>{e.entity}</strong>{e.entity_id ? ` #${e.entity_id}` : ''}</> : '—'}
                      </td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted)' }}>
                        {e.tenant_id ? e.tenant_id.slice(0, 8) + '…' : <span style={{ color: 'var(--muted-2)' }}>plataforma</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <span>{data.total} eventos</span>
                <div className="pagination-pages">
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><i className="bi bi-chevron-left" /></button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((n) => (
                    <button key={n} className={cx('page-btn', page === n && 'active')} onClick={() => setPage(n)}>{n}</button>
                  ))}
                  <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><i className="bi bi-chevron-right" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
