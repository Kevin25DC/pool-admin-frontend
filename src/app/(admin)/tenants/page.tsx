'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { cx, fdate, fdatetime, statusBadge, statusLabel } from '@/lib/utils';
import { useToast } from '@/components/providers';

type PlanOut = { id: number; code: string; name: string; price_month: string; is_active: boolean };
type TenantOut = {
  id: string; slug: string; name: string; status: string;
  plan: PlanOut | null; owner_email: string; phone: string | null;
  trial_ends_at: string | null; license_expires_at: string | null;
  suspended_reason: string | null; notes: string | null; created_at: string;
};
type Page<T> = { items: T[]; total: number; page: number; page_size: number };

const PAGE_SIZE = 20;

export default function TenantsPage() {
  const toast  = useToast();
  const router = useRouter();
  const qc     = useQueryClient();

  const [page,     setPage]     = useState(1);
  const [q,        setQ]        = useState('');
  const [status,   setStatus]   = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', plan_code: 'pro', owner_email: '', owner_name: '', owner_password: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', page, q, status],
    queryFn: () => api.get<Page<TenantOut>>('/tenants', { page, page_size: PAGE_SIZE, q: q || undefined, status: status || undefined }),
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<PlanOut[]>('/plans'),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const createMutation = useMutation({
    mutationFn: () => api.post<TenantOut>('/tenants', form),
    onSuccess: (t) => {
      toast.success(`Tienda "${t.name}" creada.`);
      setCreating(false);
      setForm({ slug: '', name: '', plan_code: 'pro', owner_email: '', owner_name: '', owner_password: '', status: 'active' });
      qc.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Error al crear tienda.'),
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Tiendas</h2>
          <p className="page-sub">{data ? `${data.total} tiendas registradas` : '…'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <i className="bi bi-plus-lg" /> Nueva tienda
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="form-input" style={{ flex: 1, minWidth: 220 }} placeholder="Buscar por nombre o slug…"
              value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            <select className="form-select" style={{ width: 160 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspendidas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner spinner-lg" /></div>
        ) : !data?.items.length ? (
          <div className="empty-state"><i className="bi bi-shop" /><p>No hay tiendas con estos filtros</p></div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tienda</th><th>Owner</th><th>Plan</th>
                    <th>Licencia</th><th>Creada</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((t) => (
                    <tr key={t.id} className="row-link" onClick={() => router.push(`/tenants/${t.id}`)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{t.slug}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{t.owner_email}</td>
                      <td>{t.plan ? <span className="badge badge-brand">{t.plan.name}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                      <td style={{ fontSize: 13 }}>
                        {t.status === 'trial'
                          ? <span style={{ color: 'var(--info)' }}><i className="bi bi-clock" style={{ marginRight: 4 }} />Trial hasta {fdate(t.trial_ends_at)}</span>
                          : t.license_expires_at
                            ? fdate(t.license_expires_at)
                            : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{fdatetime(t.created_at)}</td>
                      <td><span className={cx('badge', statusBadge(t.status))}>{statusLabel(t.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <span>{data.total} tiendas</span>
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

      {/* Modal crear tienda */}
      {creating && (
        <div className="modal-backdrop" onClick={() => setCreating(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nueva tienda</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setCreating(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre de la tienda <span className="req">*</span></label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Slug (URL) <span className="req">*</span></label>
                  <input className="form-input" placeholder="mi-tienda" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))} />
                  <span className="form-hint">Solo letras, números y guiones</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Plan <span className="req">*</span></label>
                  <select className="form-select" value={form.plan_code} onChange={(e) => setForm((f) => ({ ...f, plan_code: e.target.value }))}>
                    {plans?.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado inicial</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="active">Activo</option>
                    <option value="trial">Trial</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    Propietario (owner)
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre <span className="req">*</span></label>
                  <input className="form-input" value={form.owner_name} onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo <span className="req">*</span></label>
                  <input type="email" className="form-input" value={form.owner_email} onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Contraseña inicial <span className="req">*</span></label>
                  <input type="password" className="form-input" value={form.owner_password} onChange={(e) => setForm((f) => ({ ...f, owner_password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCreating(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving || createMutation.isPending} onClick={() => {
                if (!form.name || !form.slug || !form.owner_email || !form.owner_name || !form.owner_password) {
                  toast.warning('Completa todos los campos obligatorios.');
                  return;
                }
                createMutation.mutate();
              }}>
                {createMutation.isPending ? <><span className="spinner spinner-sm" /> Creando…</> : <><i className="bi bi-check2" /> Crear tienda</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
