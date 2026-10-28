import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/features/brand/brand-logo';

export function AuthShell({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between bg-[#162b49] p-12 text-white lg:flex xl:p-20">
        <Link href="/" className="w-fit rounded-xl bg-white p-2" aria-label="MoneyPilot ana sayfa">
          <BrandLogo className="h-10 w-40" priority />
        </Link>
        <div className="my-20 max-w-md">
          <p className="text-xs font-semibold tracking-[.2em] text-blue-200">
            YARININ İÇİN BUGÜNDEN
          </p>
          <h2 className="mt-6 text-5xl font-semibold leading-tight tracking-tight">
            Hedeflerine giden yol,
            <br />
            net bir bakışla başlar.
          </h2>
          <p className="mt-6 text-base leading-8 text-blue-100/70">
            Harcamalarını anla. Bütçeni oluştur. Sana ait birikim yolculuğunu adım adım takip et.
          </p>
          <div className="mt-10 flex gap-3">
            {['Takip et', 'Planla', 'Biriktir'].map((label, index) => (
              <span
                key={label}
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-blue-100"
              >
                0{index + 1} · {label}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-blue-100/60">MoneyPilot · Kontrol sende.</p>
      </aside>
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <section className="w-full max-w-md">
          <Link href="/" className="mb-10 inline-block lg:hidden" aria-label="MoneyPilot ana sayfa">
            <BrandLogo className="h-12 w-44" priority />
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
          <div className="mt-9">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function AuthField({
  children,
  helper,
  htmlFor,
  label,
}: {
  children: ReactNode;
  helper: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <div>
      <label
        className="mb-2 block text-sm font-medium text-[var(--card-foreground)]"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
      <p
        id={`${htmlFor}-helper`}
        className="mt-1.5 text-xs leading-5 text-[var(--muted-foreground)]"
      >
        {helper}
      </p>
    </div>
  );
}

export function AuthFormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p
      id="auth-form-error"
      className="rounded-xl border border-[color-mix(in_srgb,var(--destructive)_30%,transparent)] bg-[color-mix(in_srgb,var(--destructive)_10%,var(--card))] px-3 py-2.5 text-sm text-[var(--destructive)]"
      role="alert"
      aria-live="polite"
    >
      {error}
    </p>
  );
}

export function AuthLoadingFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <p className="rounded-xl border bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
        Oturum kontrol ediliyor...
      </p>
    </main>
  );
}

export const authInputClassName =
  'w-full rounded-xl border bg-[var(--card)] px-3.5 py-3 text-[var(--foreground)] outline-none shadow-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_25%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--muted)] disabled:opacity-70';
export const authButtonClassName =
  'w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--card)] disabled:cursor-not-allowed disabled:opacity-60';
