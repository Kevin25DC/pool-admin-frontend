'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cx } from '@/lib/utils';

const NAV = [
  { href: '/',          icon: 'bi-grid-1x2',    label: 'Dashboard' },
  { href: '/tenants',   icon: 'bi-shop',         label: 'Tiendas' },
  { href: '/planes',    icon: 'bi-layers',       label: 'Planes' },
  { href: '/auditoria', icon: 'bi-journal-text', label: 'Auditoría' },
];

const PAGE_TITLES: Record<string, string> = {
  '/':          'Dashboard',
  '/tenants':   'Tiendas',
  '/planes':    'Planes',
  '/auditoria': 'Auditoría',
};

function getPageTitle(pathname: string) {
  if (pathname === '/') return 'Dashboard';
  for (const [key, label] of Object.entries(PAGE_TITLES)) {
    if (key !== '/' && pathname.startsWith(key)) return label;
  }
  return 'Admin';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">

        {/* ── Brand ── */}
        <div className="sb-brand">
          <div className="sb-brand-icon">
            <i className="bi bi-shield-lock-fill" />
          </div>
          <div className="sb-brand-text">
            <span className="sb-brand-name">TendiCloud Billar</span>
            <span className="sb-brand-meta">
              <span className="admin-badge">ADMIN</span>
              <span className="sb-brand-sub">Plataforma</span>
            </span>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="sb-nav">
          <div className="sb-section">Principal</div>
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cx('sb-link', active && 'active')}>
                <i className={`bi ${item.icon}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Footer / user ── */}
        <div className="sb-footer">
          <div className="sb-user-card">
            <div className="sb-avatar">A</div>
            <div className="sb-user-info">
              <div className="sb-user-name">Super Admin</div>
              <div className="sb-user-role">Administrador de plataforma</div>
            </div>
          </div>
          <button className="sb-link sb-logout" onClick={logout}>
            <i className="bi bi-box-arrow-left" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="app-main">
        <header className="app-topbar">
          <div className="topbar-breadcrumb">
            <i className="bi bi-shield-lock-fill topbar-shield" />
            <span className="topbar-title">{getPageTitle(pathname)}</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-platform-pill">
              <i className="bi bi-circle-fill topbar-dot" />
              Plataforma activa
            </span>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
