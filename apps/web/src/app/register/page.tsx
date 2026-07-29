'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
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
export default function RegisterPage() {
  return (
    <PublicOnlyRoute fallback={<AuthLoadingFallback />}>
      <RegisterForm />
    </PublicOnlyRoute>
  );
}
function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('Ad soyad en az 2 karakter olmalıdır.');
      return;
    }
    if (!emailPattern.test(email.trim())) {
      setError('Geçerli bir e-posta adresi girin.');
      return;
    }
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setIsSubmitting(true);
    try {
      await register({ name, email, password });
      router.replace('/dashboard');
    } catch (submissionError) {
      setError(getAuthErrorMessage(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <AuthShell
      title="Hesabını oluştur"
      description="Finansal hayatını daha güvenle yönetmeye başla."
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <AuthField label="Ad soyad" htmlFor="name" helper="Hesap özetinde görünen adın.">
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={authInputClassName}
            disabled={isSubmitting}
            required
            aria-describedby={error ? 'name-helper auth-form-error' : 'name-helper'}
            aria-invalid={Boolean(error)}
          />
        </AuthField>
        <AuthField
          label="E-posta"
          htmlFor="email"
          helper="Giriş ve hesap bildirimleri için kullanılır."
        >
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
        <AuthField label="Şifre" htmlFor="password" helper="En az 8 karakter kullan.">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={authInputClassName}
            disabled={isSubmitting}
            required
            aria-describedby={error ? 'password-helper auth-form-error' : 'password-helper'}
            aria-invalid={Boolean(error)}
          />
        </AuthField>
        <AuthField
          label="Şifre tekrarı"
          htmlFor="password-confirmation"
          helper="Şifreni doğrulamak için yeniden yaz."
        >
          <input
            id="password-confirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            className={authInputClassName}
            disabled={isSubmitting}
            required
            aria-describedby={
              error
                ? 'password-confirmation-helper auth-form-error'
                : 'password-confirmation-helper'
            }
            aria-invalid={Boolean(error)}
          />
        </AuthField>
        <AuthFormError error={error} />
        <button type="submit" className={authButtonClassName} disabled={isSubmitting}>
          {isSubmitting ? 'Hesap oluşturuluyor...' : 'Kayıt ol'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Zaten hesabın var mı?{' '}
        <Link className="font-semibold text-[var(--primary)] hover:underline" href="/login">
          Giriş yap
        </Link>
      </p>
    </AuthShell>
  );
}
