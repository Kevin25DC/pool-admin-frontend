import { type NextRequest, NextResponse } from 'next/server';

const IS_PROD = process.env.NODE_ENV === 'production';

export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = await req.json();

  const res = NextResponse.json({ ok: true });

  res.cookies.set('billar_admin_access', access_token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60,        // 1h
  });

  if (refresh_token) {
    res.cookies.set('billar_admin_refresh', refresh_token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7d
    });
  }

  return res;
}
