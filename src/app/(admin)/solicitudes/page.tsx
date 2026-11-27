'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { cx, fdatetime } from '@/lib/utils';
import { useToast } from '@/components/providers';

/* Solicitudes de demo que llegan desde tendicloud.com.
   Nada se crea solo: el administrador decide. "Aprobar" crea el tenant en trial con los datos pre-llenados. */

type DemoStatus = 'pending' | 'contacted' | 'approved' | 'rejected';
type DemoRequest = {
  id: number; business_type: 'tienda' | 'billar'; business_name: string; contact_name: string;
  email: string; phone: string; city: string | null; message: string | null; status: DemoStatus;
  admin_notes: string | null; reject_reason: string | null; approved_tenant: string | null;
  decided_at: string | null; source: string | null; created_at: string;
};
type Stats = Record<DemoStatus, number>;
type PlanOut = { id: number; code: string; name: string; is_active: boolean };
type Page<T> = { items: T[]; total: number; page: number; page_size: number };

const PAGE_SIZE = 20;
const STATUS: Record<DemoStatus, { label: string; badge: string; icon: string }> = {
  pending:   { label: 'Pendiente',  badge: 'badge-warning', icon: 'bi-hourglass-split' },
  contacted: { label: 'Contactado', badge: 'badge-info',    icon: 'bi-telephone' },
  approved:  { label: 'Aprobada',   badge: 'badge-success', icon: 'bi-check2-circle' },
  rejected:  { label: 'Rechazada',  badge: 'badge-neutral', icon: 'bi-x-circle' },
};
const TYPE_LABEL = { tienda: 'Tienda', billar: 'Billar' } as const;
const isOpen = (s: DemoStatus) => s === 'pending' || s === 'contacted';

function slugify(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'negocio';
}
function tempPassword() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => abc[n % abc.length]).join('');
}
function waLink(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.length === 10 ? '57' + digits : digits}`;
}

export default function SolicitudesPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('open');
  const [detail, setDetail] = useState<DemoRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [approving, setApproving] = useState<DemoRequest | null>(null);
  const [rejecting, setRejecting] = useState<DemoRequest | null>(null);
  const [reason, setReason] = useState('');
  const [form, setForm] = useState({
    name: '', slug: '', plan_code: '', owner_name: '', owner_email: '', owner_password: '',
    phone: '', status: 'trial', trial_days: 14, notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['demo-requests', page, q, status],
    queryFn: () => api.get<Page<DemoRequest>>('/demo-requests', { page, page_size: PAGE_SIZE, q: q || undefined, status: status || undefined }),
  });
  const { data: stats } = useQuery({ queryKey: ['demo-stats'], queryFn: () => api.get<Stats>('/demo-requests/stats') });
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: () => api.get<PlanOut[]>('/plans') });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['demo-requests'] });
    qc.invalidateQueries({ queryKey: ['demo-stats'] });
  };
  const onError = (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'No se pudo completar la acción.');

  const update = useMutation({
    mutationFn: (v: { id: number; body: { status?: string; admin_notes?: string } }) => api.patch<DemoRequest>(`/demo-requests/${v.id}`, v.body),
    onSuccess: (r) => { toast.success('Solicitud actualizada.'); setDetail(r); refresh(); },
    onError,
  });
  const approve = useMutation({
    mutationFn: (id: number) => api.post<DemoRequest>(`/demo-requests/${id}/approve`, form),
    onSuccess: (r) => {
      toast.success(`Demo aprobada: se creó "${r.business_name}". Envíale el acceso.`);
      setApproving(null); setDetail(null); refresh();
      qc.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError,
  });
  const reject = useMutation({
    mutationFn: (id: number) => api.post<DemoRequest>(`/demo-requests/${id}/reject`, { reason: reason || null }),
    onSuccess: () => { toast.info('Solicitud rechazada.'); setRejecting(null); setDetail(null); refresh(); },
    onError,
  });

  function openDetail(r: DemoRequest) { setDetail(r); setNotes(r.admin_notes ?? ''); }
  function openApprove(r: DemoRequest) {
    const active = plans?.filter((p) => p.is_active) ?? [];
    setForm({
      name: r.business_name, slug: slugify(r.business_name), plan_code: active[0]?.code ?? '',
      owner_name: r.contact_name, owner_email: r.email, owner_password: tempPassword(), phone: r.phone,
      status: 'trial', trial_days: 14,
      notes: `Demo solicitada desde tendicloud.com el ${fdatetime(r.created_at)}${r.city ? ` · ${r.city}` : ''}`,
    });
    setApproving(r);
  }
  function openReject(r: DemoRequest) { setReason(''); setRejecting(r); }

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);
  const setF = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Solicitudes de demo</h2>
          <p className="page-sub">Llegan desde el formulario de tendicloud.com. Apruébalas para crear el tenant en trial.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        {(Object.keys(STATUS) as DemoStatus[]).map((s) => (
          <button key={s} className="stat-card" style={{ textAlign: 'left', cursor: 'pointer', outline: status === s ? '2px solid var(--brand, #2f80e0)' : undefined }}
            onClick={() => { setStatus(status === s ? 'open' : s); setPage(1); }}>
            <div className="stat-label"><i className={`bi ${STATUS[s].icon}`} style={{ marginRight: 6 }} />{STATUS[s].label}s</div>
            <div className="stat-value">{stats ? stats[s] : '—'}</div>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="form-input" style={{ flex: 1, minWidth: 220 }} placeholder="Buscar por negocio, contacto, correo, celular o ciudad…"
              value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            <select className="form-select" style={{ width: 200 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="open">Por decidir</option>
              <option value="pending">Pendientes</option>
              <option value="contacted">Contactadas</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
              <option value="">Todas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner spinner-lg" /></div>
        ) : !data?.items.length ? (
          <div className="empty-state"><i className="bi bi-inbox" /><p>No hay solicitudes con estos filtros</p></div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Recibida</th><th>Negocio</th><th>Contacto</th><th>Ciudad</th><th>Estado</th><th style={{ textAlign: 'right' }}>Decisión</th></tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.id} className="row-link" onClick={() => openDetail(r)}>
                      <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fdatetime(r.created_at)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.business_name}</div>
                        <span className="badge badge-brand" style={{ marginTop: 4 }}>{TYPE_LABEL[r.business_type]}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        <div>{r.contact_name}</div>
                        <div style={{ color: 'var(--muted)' }}>{r.phone} · {r.email}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{r.city ?? '—'}</td>
                      <td><span className={cx('badge', STATUS[r.status].badge)}>{STATUS[r.status].label}</span></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        {isOpen(r.status) ? (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openReject(r)}><i className="bi bi-x-lg" /> Rechazar</button>
                            <button className="btn btn-success btn-sm" onClick={() => openApprove(r)}><i className="bi bi-check2" /> Aprobar</button>
                          </div>
                        ) : r.approved_tenant ? (
                          <Link className="btn btn-ghost btn-sm" href={`/tenants/${r.approved_tenant}`}><i className="bi bi-box-arrow-up-right" /> Ver tenant</Link>
                        ) : <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fdatetime(r.decided_at)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <span>{data.total} solicitudes</span>
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

      {/* Detalle */}
      {detail && !approving && !rejecting && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{detail.business_name} <span className="badge badge-brand" style={{ marginLeft: 8 }}>{TYPE_LABEL[detail.business_type]}</span></span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDetail(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', fontSize: 14 }}>
                <div><div className="form-label">Contacto</div>{detail.contact_name}</div>
                <div><div className="form-label">Estado</div><span className={cx('badge', STATUS[detail.status].badge)}>{STATUS[detail.status].label}</span></div>
                <div><div className="form-label">Celular / WhatsApp</div>
                  <a href={waLink(detail.phone)} target="_blank" rel="noreferrer" style={{ color: 'var(--info)' }}><i className="bi bi-whatsapp" /> {detail.phone}</a></div>
                <div><div className="form-label">Correo</div><a href={`mailto:${detail.email}`} style={{ color: 'var(--info)' }}>{detail.email}</a></div>
                <div><div className="form-label">Ciudad</div>{detail.city ?? '—'}</div>
                <div><div className="form-label">Recibida</div>{fdatetime(detail.created_at)}{detail.source ? ` · ${detail.source}` : ''}</div>
                <div style={{ gridColumn: '1 / -1' }}><div className="form-label">Mensaje</div>
                  <div style={{ whiteSpace: 'pre-wrap', color: detail.message ? undefined : 'var(--muted)' }}>{detail.message ?? 'Sin mensaje.'}</div></div>
                {detail.reject_reason && <div style={{ gridColumn: '1 / -1' }}><div className="form-label">Motivo del rechazo</div>{detail.reject_reason}</div>}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Notas internas</label>
                  <textarea className="form-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej.: llamé el martes, quiere la demo el viernes en la tarde" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" disabled={update.isPending || notes === (detail.admin_notes ?? '')}
                onClick={() => update.mutate({ id: detail.id, body: { admin_notes: notes } })}>Guardar notas</button>
              {detail.status === 'pending' && (
                <button className="btn btn-secondary" disabled={update.isPending}
                  onClick={() => update.mutate({ id: detail.id, body: { status: 'contacted', admin_notes: notes } })}>
                  <i className="bi bi-telephone" /> Marcar contactado</button>
              )}
              {isOpen(detail.status) && <>
                <button className="btn btn-secondary" onClick={() => openReject(detail)}><i className="bi bi-x-lg" /> Rechazar</button>
                <button className="btn btn-success" onClick={() => openApprove(detail)}><i className="bi bi-check2" /> Aprobar demo</button>
              </>}
              {detail.approved_tenant && <Link className="btn btn-primary" href={`/tenants/${detail.approved_tenant}`}>Ver tenant</Link>}
            </div>
          </div>
        </div>
      )}

      {/* Aprobar = crear tenant */}
      {approving && (
        <div className="modal-backdrop" onClick={() => setApproving(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><i className="bi bi-check2-circle" /> Aprobar demo de {approving.business_name}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setApproving(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                Se creará el tenant con su usuario dueño. Revisa los datos; la contraseña es temporal y se la debes enviar al cliente.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre del negocio <span className="req">*</span></label>
                  <input className="form-input" value={form.name} onChange={(e) => setF('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Slug (URL) <span className="req">*</span></label>
                  <input className="form-input" value={form.slug} onChange={(e) => setF('slug', e.target.value.toLowerCase())} />
                  <span className="form-hint">Solo letras, números y guiones</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Plan <span className="req">*</span></label>
                  <select className="form-select" value={form.plan_code} onChange={(e) => setF('plan_code', e.target.value)}>
                    {plans?.filter((p) => p.is_active).map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Días de demo (trial)</label>
                  <input type="number" min={1} max={365} className="form-input" value={form.trial_days}
                    onChange={(e) => setF('trial_days', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre del dueño <span className="req">*</span></label>
                  <input className="form-input" value={form.owner_name} onChange={(e) => setF('owner_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo (usuario) <span className="req">*</span></label>
                  <input type="email" className="form-input" value={form.owner_email} onChange={(e) => setF('owner_email', e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Contraseña temporal <span className="req">*</span></label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input text-mono" style={{ flex: 1 }} value={form.owner_password} onChange={(e) => setF('owner_password', e.target.value)} />
                    <button className="btn btn-secondary" title="Generar otra" onClick={() => setF('owner_password', tempPassword())}><i className="bi bi-arrow-repeat" /></button>
                    <button className="btn btn-secondary" title="Copiar" onClick={() => { navigator.clipboard.writeText(form.owner_password); toast.info('Contraseña copiada.'); }}><i className="bi bi-clipboard" /></button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setApproving(null)}>Cancelar</button>
              <button className="btn btn-success" disabled={approve.isPending} onClick={() => {
                if (!form.name || !form.slug || !form.plan_code || !form.owner_name || !form.owner_email || form.owner_password.length < 8) {
                  toast.warning('Completa los campos obligatorios (contraseña de mínimo 8 caracteres).');
                  return;
                }
                approve.mutate(approving.id);
              }}>
                {approve.isPending ? <><span className="spinner spinner-sm" /> Creando…</> : <><i className="bi bi-check2" /> Aprobar y crear tenant</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rechazar */}
      {rejecting && (
        <div className="modal-backdrop" onClick={() => setRejecting(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Rechazar demo de {rejecting.business_name}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setRejecting(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Motivo (opcional, solo interno)</label>
                <input className="form-input" maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: datos falsos, fuera de cobertura, duplicada…" autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRejecting(null)}>Cancelar</button>
              <button className="btn btn-danger" disabled={reject.isPending} onClick={() => reject.mutate(rejecting.id)}>
                {reject.isPending ? <span className="spinner spinner-sm" /> : <i className="bi bi-x-lg" />} Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
