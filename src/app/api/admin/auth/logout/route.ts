import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('billar_admin_access');
  res.cookies.delete('billar_admin_refresh');
  return res;
}
