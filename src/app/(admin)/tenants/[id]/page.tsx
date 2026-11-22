'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { cx, fdate, fdatetime, statusBadge, statusLabel } from '@/lib/utils';
import { useToast } from '@/components/providers';

type PlanOut = { id: number; code: string; name: string; price_month: string };
type TenantOut = {
  id: string; slug: string; name: string; status: string;
  plan: PlanOut | null; owner_email: string; phone: string | null;
  trial_ends_at: string | null; license_expires_at: string | null;
  suspended_reason: string | null; notes: string | null; created_at: string;
};
type TenantUsage = { users: number; products: number; customers: number; sales_month: number; sales_total: number; limits: Record<string, number> };
type TenantUserOut = { id: number; email: string; name: string; is_owner: boolean; is_active: boolean; last_login_at: string | null };

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast   = useToast();
  const qc      = useQueryClient();
  const router  = useRouter();

  const [tab, setTab] = useState<'info' | 'users' | 'acciones'>('info');
  const [extendMonths, setExtendMonths] = useState('1');
  const [suspendReason, setSuspendReason] = useState('');
  const [cancelReason, setCancelReason]   = useState('');
  const [confirmAction, setConfirmAction] = useState<'suspend' | 'cancel' | null>(null);
  const [resetUser, setResetUser]   = useState<TenantUserOut | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => api.get<TenantOut>(`/tenants/${id}`),
  });

  const { data: usage } = useQuery({
    queryKey: ['tenant-usage', id],
    queryFn: () => api.get<TenantUsage>(`/tenants/${id}/usage`),
  });

  const { data: users } = useQuery({
    queryKey: ['tenant-users', id],
    queryFn: () => api.get<TenantUserOut[]>(`/tenants/${id}/users`),
    enabled: tab === 'users',
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<PlanOut[]>('/plans'),
  });

  function invalidate() { qc.invalidateQueries({ queryKey: ['tenant', id] }); qc.invalidateQueries({ queryKey: ['tenants'] }); }

  const extendMutation = useMutation({
    mutationFn: () => api.post(`/tenants/${id}/extend`, { months: Number(extendMonths) }),
    onSuccess: () => { toast.success('Licencia extendida.'); invalidate(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Error.'),
  });

  const activateMutation = useMutation({
    mutationFn: () => api.post(`/tenants/${id}/activate`, {}),
    onSuccess: () => { toast.success('Tienda activada.'); invalidate(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Error.'),
  });

  const suspendMutation = useMutation({
    mutationFn: () => api.post(`/tenants/${id}/suspend`, { reason: suspendReason || undefined }),
    onSuccess: () => { toast.success('Tienda suspendida.'); setConfirmAction(null); invalidate(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Error.'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/tenants/${id}/cancel`, { reason: cancelReason || undefined }),
    onSuccess: () => { toast.success('Tienda cancelada.'); setConfirmAction(null); invalidate(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Error.'),
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: number; active: boolean }) =>
      api.post(`/tenants/${id}/users/${userId}/${active ? 'activate' : 'deactivate'}`, {}),
    onSuccess: () => { toast.success('Usuario actualizado.'); qc.invalidateQueries({ queryKey: ['tenant-users', id] }); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Error.'),
  });

  const resetPassMutation = useMutation({
    mutationFn: () => api.post(`/tenants/${id}/users/${resetUser!.id}/reset-password`, { new_password: newPassword }),
    onSuccess: () => { toast.success('Contraseña restablecida.'); setResetUser(null); setNewPassword(''); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Error.'),
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner spinner-lg" /></div>;
  if (!tenant)   return <div className="empty-state"><i className="bi bi-exclamation-circle" /><p>Tienda no encontrada</p></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }} onClick={() => router.push('/tenants')}>
            <i className="bi bi-arrow-left" /> Tiendas
          </button>
          <h2 className="page-title">{tenant.name}</h2>
          <p className="page-sub" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ fontSize: 12, background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>{tenant.slug}</code>
            <span className={cx('badge', statusBadge(tenant.status))}>{statusLabel(tenant.status)}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
        {(['info', 'users', 'acciones'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="btn btn-ghost btn-sm"
            style={{ borderBottom: tab === t ? '2px solid var(--brand)' : '2px solid transparent', borderRadius: 0, fontWeight: tab === t ? 600 : 400, color: tab === t ? 'var(--brand)' : 'var(--ink-2)', marginBottom: -2, padding: '6px 16px', textTransform: 'capitalize' }}>
            {t === 'info' ? 'Información' : t === 'users' ? 'Usuarios' : 'Acciones'}
          </button>
        ))}
      </div>

      {/* TAB: Información */}
      {tab === 'info' && (
        <div className="grid-2" style={{ gap: 20, alignItems: 'flex-start' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Datos generales</span></div>
            <div className="card-body">
              {[
                ['Owner', tenant.owner_email],
                ['Plan', tenant.plan?.name ?? '—'],
                ['Teléfono', tenant.phone ?? '—'],
                ['Estado', statusLabel(tenant.status)],
                ['Licencia hasta', fdate(tenant.license_expires_at)],
                ['Trial hasta', fdate(tenant.trial_ends_at)],
                ['Registrada', fdatetime(tenant.created_at)],
                ...(tenant.suspended_reason ? [['Motivo suspensión', tenant.suspended_reason]] : []),
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--surface-2)', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontWeight: 500, maxWidth: '55%', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {usage && (
            <div className="card">
              <div className="card-header"><span className="card-title">Uso</span></div>
              <div className="card-body">
                <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Usuarios', value: usage.users },
                    { label: 'Productos', value: usage.products },
                    { label: 'Clientes', value: usage.customers },
                    { label: 'Ventas (mes)', value: usage.sales_month },
                    { label: 'Ventas (total)', value: usage.sales_total },
                  ].map((s) => (
                    <div key={s.label} className="stat-card" style={{ padding: 14 }}>
                      <span className="stat-label">{s.label}</span>
                      <span className="stat-value" style={{ fontSize: 20 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Usuarios */}
      {tab === 'users' && (
        <div className="card">
          {!users?.length ? (
            <div className="empty-state"><i className="bi bi-people" /><p>Sin usuarios</p></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Usuario</th><th>Rol</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
                      </td>
                      <td>{u.is_owner ? <span className="badge badge-brand">Owner</span> : <span className="badge badge-neutral">Usuario</span>}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{fdatetime(u.last_login_at)}</td>
                      <td>{u.is_active ? <span className="badge badge-success">Activo</span> : <span className="badge badge-neutral">Inactivo</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => toggleUserMutation.mutate({ userId: u.id, active: !u.is_active })}>
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setResetUser(u); setNewPassword(''); }}>
                            <i className="bi bi-key" /> Contraseña
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Acciones */}
      {tab === 'acciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
          {/* Extender licencia */}
          <div className="card">
            <div className="card-header"><span className="card-title">Extender licencia</span></div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                Licencia actual: <strong>{fdate(tenant.license_expires_at) ?? 'No definida'}</strong>
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Meses a extender</label>
                  <select className="form-select" value={extendMonths} onChange={(e) => setExtendMonths(e.target.value)}>
                    {[1,2,3,6,12,24].map((m) => <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary" disabled={extendMutation.isPending} onClick={() => extendMutation.mutate()}>
                  {extendMutation.isPending ? <><span className="spinner spinner-sm" /> Extendiendo…</> : <><i className="bi bi-calendar-plus" /> Extender</>}
                </button>
              </div>
            </div>
          </div>

          {/* Activar */}
          {tenant.status !== 'active' && tenant.status !== 'cancelled' && (
            <div className="card">
              <div className="card-header"><span className="card-title">Activar tienda</span></div>
              <div className="card-body">
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Reactiva una tienda suspendida o en trial.</p>
                <button className="btn btn-success" disabled={activateMutation.isPending} onClick={() => activateMutation.mutate()}>
                  {activateMutation.isPending ? <><span className="spinner spinner-sm" /> Activando…</> : <><i className="bi bi-check-circle" /> Activar tienda</>}
                </button>
              </div>
            </div>
          )}

          {/* Suspender */}
          {tenant.status === 'active' || tenant.status === 'trial' ? (
            <div className="card">
              <div className="card-header"><span className="card-title" style={{ color: 'var(--warning)' }}>Suspender tienda</span></div>
              <div className="card-body">
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Motivo (opcional)</label>
                  <input className="form-input" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Pago pendiente, incumplimiento, etc." />
                </div>
                <button className="btn btn-danger" style={{ background: 'var(--warning)', borderColor: 'var(--warning)' }}
                  onClick={() => setConfirmAction('suspend')}>
                  <i className="bi bi-pause-circle" /> Suspender tienda
                </button>
              </div>
            </div>
          ) : null}

          {/* Cancelar */}
          {tenant.status !== 'cancelled' && (
            <div className="card">
              <div className="card-header"><span className="card-title" style={{ color: 'var(--danger)' }}>Cancelar tienda</span></div>
              <div className="card-body">
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Acción irreversible. Solo superadmins pueden cancelar.</p>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Motivo (opcional)</label>
                  <input className="form-input" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Fraude, baja definitiva, etc." />
                </div>
                <button className="btn btn-danger" onClick={() => setConfirmAction('cancel')}>
                  <i className="bi bi-x-circle" /> Cancelar tienda
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmar acción destructiva */}
      {confirmAction && (
        <div className="modal-backdrop" onClick={() => setConfirmAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ color: confirmAction === 'cancel' ? 'var(--danger)' : 'var(--warning)' }}>
                {confirmAction === 'suspend' ? '¿Suspender tienda?' : '¿Cancelar tienda?'}
              </span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirmAction(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13 }}>
                {confirmAction === 'suspend'
                  ? `Vas a suspender "${tenant.name}". Los usuarios no podrán acceder hasta que se reactive.`
                  : `Vas a cancelar "${tenant.name}". Esta acción es irreversible.`}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>Cancelar</button>
              <button className="btn btn-danger"
                disabled={suspendMutation.isPending || cancelMutation.isPending}
                onClick={() => confirmAction === 'suspend' ? suspendMutation.mutate() : cancelMutation.mutate()}>
                {(suspendMutation.isPending || cancelMutation.isPending)
                  ? <><span className="spinner spinner-sm" /> Procesando…</>
                  : confirmAction === 'suspend' ? 'Sí, suspender' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reset contraseña */}
      {resetUser && (
        <div className="modal-backdrop" onClick={() => setResetUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Restablecer contraseña — {resetUser.name}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setResetUser(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nueva contraseña <span className="req">*</span></label>
                <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setResetUser(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={newPassword.length < 8 || resetPassMutation.isPending} onClick={() => resetPassMutation.mutate()}>
                {resetPassMutation.isPending ? <><span className="spinner spinner-sm" /> Guardando…</> : <><i className="bi bi-key" /> Restablecer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
