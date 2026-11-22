import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin · TendiCloud Billar',
  description: 'Panel de administración de plataforma',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
