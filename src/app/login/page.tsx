'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/providers';

export default function LoginPage() {
  const router = useRouter();
  const toast  = useToast();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.detail ?? 'Credenciales incorrectas.');
        return;
      }
      const { access_token, refresh_token } = await res.json();
      // Guardar tokens en cookies via API route dedicada
      await fetch('/api/admin/auth/set-cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token, refresh_token }),
      });
      toast.success('Sesión iniciada.');
      router.replace('/');
    } catch {
      setError('Error de conexión. Verifica que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: 'var(--brand)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#fff', fontSize: 22 }}>
            <i className="bi bi-shield-lock-fill" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>TendiCloud Billar</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>Panel de administración</p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input
                  type="email" required autoFocus
                  className="form-input"
                  placeholder="admin@tendicloud.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  type="password" required
                  className="form-input"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <div style={{ background: 'var(--danger-l)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 13 }}>
                  <i className="bi bi-exclamation-circle" style={{ marginRight: 6 }} />{error}
                </div>
              )}
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 4 }}>
                {loading
                  ? <><span className="spinner spinner-sm" /> Iniciando…</>
                  : <><i className="bi bi-box-arrow-in-right" /> Iniciar sesión</>}
              </button>
            </form>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 20 }}>
          Acceso exclusivo para administradores de plataforma
        </p>
      </div>
    </div>
  );
}
