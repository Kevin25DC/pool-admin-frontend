import { type NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/login') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('billar_admin_access')?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
