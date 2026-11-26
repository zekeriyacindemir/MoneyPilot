import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Hesap oluştur',
  description:
    'Ücretsiz MoneyPilot hesabını oluştur; gelir, gider, bütçe ve birikim hedeflerini tek yerden takip etmeye başla.',
  alternates: { canonical: '/register' },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
