'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { getAuthErrorMessage } from '@/features/auth/auth-error';
import { useAuth } from '@/features/auth/auth-context';
import { PublicOnlyRoute } from '@/features/auth/public-only-route';

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
    <AuthLayout title="Tekrar hoş geldin" description="Finansal hedeflerine kaldığın yerden devam et.">
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
            disabled={isSubmitting}
            required
          />
        </Field>
        <FormError error={error} />
        <button type="submit" className={buttonClassName} disabled={isSubmitting}>
          {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Hesabın yok mu?{' '}
        <Link className="font-semibold text-sky-700 hover:text-sky-800" href="/register">
          Kayıt ol
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-sky-700">MoneyPilot</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}

export function Field({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function FormError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {error}
    </p>
  );
}

export function AuthLoadingFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <p className="text-sm text-slate-600">Oturum kontrol ediliyor...</p>
    </main>
  );
}

export const inputClassName =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100';

export const buttonClassName =
  'w-full rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

function getSafeRedirect(redirect: string | null): string {
  if (redirect?.startsWith('/') && !redirect.startsWith('//')) {
    return redirect;
  }

  return '/dashboard';
}
