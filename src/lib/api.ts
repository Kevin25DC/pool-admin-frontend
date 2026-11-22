export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  let url = `/api/admin${path}`;
  if (params) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    if (q.toString()) url += '?' + q.toString();
  }
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const j = await res.json(); msg = j.detail ?? j.message ?? msg; } catch { /* noop */ }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string, params?: Record<string, unknown>) => request<T>('GET',    path, undefined, params),
  post:   <T>(path: string, body?: unknown)                   => request<T>('POST',   path, body),
  put:    <T>(path: string, body?: unknown)                   => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body?: unknown)                   => request<T>('PATCH',  path, body),
  del:    <T>(path: string)                                   => request<T>('DELETE', path),
};
