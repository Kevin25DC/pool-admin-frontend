export function cx(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function money(value: number | string) {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export function fdate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fdatetime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function statusBadge(status: string): string {
  const map: Record<string, string> = {
    active: 'badge-success',
    trial: 'badge-info',
    suspended: 'badge-warning',
    cancelled: 'badge-danger',
  };
  return map[status] ?? 'badge-neutral';
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Activo',
    trial: 'Trial',
    suspended: 'Suspendido',
    cancelled: 'Cancelado',
  };
  return map[status] ?? status;
}
