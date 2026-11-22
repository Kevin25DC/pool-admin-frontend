import type { NextConfig } from 'next';

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options',        value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
];

const config: NextConfig = {
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }];
  },
};

export default config;
