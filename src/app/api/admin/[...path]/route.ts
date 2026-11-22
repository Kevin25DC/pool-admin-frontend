import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.API_URL ?? 'http://localhost:8000';

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const apiPath = path.join('/');
  const search = req.nextUrl.search;
  const url = `${API_BASE}/admin/v1/${apiPath}${search}`;

  const jar = await cookies();
  const token = jar.get('billar_admin_access')?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined;

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: body || undefined,
  });

  const data = await upstream.text();

  const res = new NextResponse(data, { status: upstream.status });
  res.headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'application/json');
  return res;
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
