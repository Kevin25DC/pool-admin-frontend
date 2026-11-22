'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Stats = {
  tenants_total: number;
  tenants_by_status: Record<string, number>;
  sales_today: number;
  sales_month: number;
  new_tenants_month: number;
  expiring_30_days: number;
};

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => api.get<Stats>('/stats'),
    refetchInterval: 60_000,
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-sub">Vista general de la plataforma</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner spinner-lg" /></div>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <span className="stat-label">Tiendas activas</span>
              <span className="stat-value" style={{ color: 'var(--success)' }}>{stats?.tenants_by_status?.['active'] ?? 0}</span>
              <span className="stat-sub">{stats?.tenants_total ?? 0} tiendas en total</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">En trial</span>
              <span className="stat-value" style={{ color: 'var(--info)' }}>{stats?.tenants_by_status?.['trial'] ?? 0}</span>
              <span className="stat-sub">período de prueba</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Ventas hoy</span>
              <span className="stat-value">{stats?.sales_today ?? 0}</span>
              <span className="stat-sub">transacciones</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Ventas del mes</span>
              <span className="stat-value">{stats?.sales_month ?? 0}</span>
              <span className="stat-sub">transacciones</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Nuevas tiendas</span>
              <span className="stat-value" style={{ color: 'var(--brand)' }}>{stats?.new_tenants_month ?? 0}</span>
              <span className="stat-sub">este mes</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Licencias por vencer</span>
              <span className="stat-value" style={{ color: (stats?.expiring_30_days ?? 0) > 0 ? 'var(--warning)' : 'var(--muted)' }}>
                {stats?.expiring_30_days ?? 0}
              </span>
              <span className="stat-sub">en los próximos 30 días</span>
            </div>
          </div>

          {stats && Object.keys(stats.tenants_by_status).length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">Estado de tiendas</span></div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {Object.entries(stats.tenants_by_status).map(([status, count]) => {
                    const colors: Record<string, string> = {
                      active: 'var(--success)', trial: 'var(--info)',
                      suspended: 'var(--warning)', cancelled: 'var(--muted)',
                    };
                    const labels: Record<string, string> = {
                      active: 'Activas', trial: 'Trial',
                      suspended: 'Suspendidas', cancelled: 'Canceladas',
                    };
                    return (
                      <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: colors[status] ?? 'var(--muted)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{labels[status] ?? status}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: colors[status] ?? 'var(--muted)' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
