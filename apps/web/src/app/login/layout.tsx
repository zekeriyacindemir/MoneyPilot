import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Giriş yap',
  description: 'MoneyPilot hesabına giriş yap ve finansal hedeflerine kaldığın yerden devam et.',
  alternates: { canonical: '/login' },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
