import { type NextRequest, NextResponse } from 'next/server';

const ACCESS = 'billar_admin_access';
const REFRESH = 'billar_admin_refresh';
const API_URL = process.env.API_URL ?? 'http://localhost:8000';
const IS_PROD = process.env.NODE_ENV === 'production';

/** true si el JWT falta, no se puede leer o vence en menos de `marginMs` (solo se lee `exp`; la firma la valida la API). */
function expiresSoon(token: string | undefined, marginMs = 30_000): boolean {
  if (!token) return true;
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')));
    return !payload.exp || payload.exp * 1000 < Date.now() + marginMs;
  } catch {
    return true;
  }
}

function toLogin(req: NextRequest, clear: boolean) {
  let res: NextResponse;
  if (req.nextUrl.pathname.startsWith('/api/')) {
    res = NextResponse.json({ detail: 'Sesión no iniciada.' }, { status: 401 });
  } else {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    res = NextResponse.redirect(url);
  }
  if (clear) { res.cookies.delete(ACCESS); res.cookies.delete(REFRESH); }
  return res;
}

/** El token de acceso dura 15 min: se renueva aquí con el refresh antes de vencer para no sacar al administrador. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/api/admin/auth/')) return NextResponse.next();

  const access = req.cookies.get(ACCESS)?.value;
  const refreshToken = req.cookies.get(REFRESH)?.value;
  if (!access && !refreshToken) return toLogin(req, false);
  if (!expiresSoon(access) || !refreshToken) return access ? NextResponse.next() : toLogin(req, true);

  let tokens: { access_token: string; refresh_token?: string; expires_in?: number } | null = null;
  try {
    const r = await fetch(`${API_URL}/admin/v1/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }), cache: 'no-store',
    });
    if (r.ok) tokens = await r.json();
  } catch { /* API no disponible */ }
  if (!tokens?.access_token) return !expiresSoon(access, 0) ? NextResponse.next() : toLogin(req, true);

  req.cookies.set(ACCESS, tokens.access_token);
  if (tokens.refresh_token) req.cookies.set(REFRESH, tokens.refresh_token);
  const res = NextResponse.next({ request: { headers: req.headers } });
  const base = { httpOnly: true, secure: IS_PROD, sameSite: 'strict' as const, path: '/' };
  res.cookies.set(ACCESS, tokens.access_token, { ...base, maxAge: tokens.expires_in ?? 900 });
  if (tokens.refresh_token) res.cookies.set(REFRESH, tokens.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 7 });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|css|js)$).*)'],
};
