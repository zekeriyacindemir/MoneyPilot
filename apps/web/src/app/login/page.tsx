'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { getAuthErrorMessage } from '@/features/auth/auth-error';
import { useAuth } from '@/features/auth/auth-context';
import { PublicOnlyRoute } from '@/features/auth/public-only-route';
import {
  AuthField,
  AuthFormError,
  AuthLoadingFallback,
  AuthShell,
  authButtonClassName,
  authInputClassName,
} from '@/features/auth/components/auth-ui';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <PublicOnlyRoute fallback={<AuthLoadingFallback />}>
        <LoginForm />
      </PublicOnlyRoute>
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParameters = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    if (!emailPattern.test(email.trim())) {
      setError('Geçerli bir e-posta adresi girin.');
      return;
    }
    if (!password) {
      setError('Şifre zorunludur.');
      return;
    }
    setIsSubmitting(true);
    try {
      await login({ email, password });
      router.replace(getSafeRedirect(searchParameters.get('redirect')));
    } catch (submissionError) {
      setError(getAuthErrorMessage(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <AuthShell
      title="Tekrar hoş geldin"
      description="Finansal hedeflerine kaldığın yerden devam et."
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <AuthField label="E-posta" htmlFor="email" helper="Hesabına bağlı e-posta adresini kullan.">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authInputClassName}
            disabled={isSubmitting}
            required
            aria-describedby={error ? 'email-helper auth-form-error' : 'email-helper'}
            aria-invalid={Boolean(error)}
          />
        </AuthField>
        <AuthField label="Şifre" htmlFor="password" helper="Şifren en az 8 karakter olmalıdır.">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={authInputClassName}
            disabled={isSubmitting}
            required
            aria-describedby={error ? 'password-helper auth-form-error' : 'password-helper'}
            aria-invalid={Boolean(error)}
          />
        </AuthField>
        <AuthFormError error={error} />
        <button type="submit" className={authButtonClassName} disabled={isSubmitting}>
          {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Hesabın yok mu?{' '}
        <Link className="font-semibold text-[var(--primary)] hover:underline" href="/register">
          Kayıt ol
        </Link>
      </p>
    </AuthShell>
  );
}

function getSafeRedirect(redirect: string | null): string {
  return redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';
}
