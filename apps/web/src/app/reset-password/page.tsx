import type { Metadata } from 'next';
import { PasswordRecovery } from '@/features/auth/password-recovery';

export const metadata: Metadata = {
  title: 'Şifre yenile',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PasswordRecovery reset />;
}
