'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import {
  AuthLayout,
  AuthLoadingFallback,
  buttonClassName,
  Field,
  FormError,
  inputClassName,
} from '@/app/login/page';
import { getAuthErrorMessage } from '@/features/auth/auth-error';
import { useAuth } from '@/features/auth/auth-context';
import { PublicOnlyRoute } from '@/features/auth/public-only-route';

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
    <AuthLayout title="Hesabını oluştur" description="Finansal hayatını daha güvenle yönetmeye başla.">
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <Field label="Ad soyad" htmlFor="name">
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClassName}
            disabled={isSubmitting}
            required
          />
        </Field>
        <Field label="E-posta" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClassName}
            disabled={isSubmitting}
            required
          />
        </Field>
        <Field label="Şifre" htmlFor="password">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
            disabled={isSubmitting}
            required
          />
        </Field>
        <Field label="Şifre tekrarı" htmlFor="password-confirmation">
          <input
            id="password-confirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            className={inputClassName}
            disabled={isSubmitting}
            required
          />
        </Field>
        <FormError error={error} />
        <button type="submit" className={buttonClassName} disabled={isSubmitting}>
          {isSubmitting ? 'Hesap oluşturuluyor...' : 'Kayıt ol'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Zaten hesabın var mı?{' '}
        <Link className="font-semibold text-sky-700 hover:text-sky-800" href="/login">
          Giriş yap
        </Link>
      </p>
    </AuthLayout>
  );
}
