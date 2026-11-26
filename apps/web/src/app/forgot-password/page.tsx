import type { Metadata } from 'next';
import { PasswordRecovery } from '@/features/auth/password-recovery';

export const metadata: Metadata = {
  title: 'Şifremi unuttum',
  description: 'MoneyPilot hesabın için şifre yenileme bağlantısı iste.',
  robots: { index: false, follow: true },
};

export default function Page() {
  return <PasswordRecovery />;
}
