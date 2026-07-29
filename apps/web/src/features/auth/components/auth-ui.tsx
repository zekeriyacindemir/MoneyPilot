import type { ReactNode } from 'react';

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_var(--secondary),_transparent_70%)] opacity-70 dark:opacity-40"
      />
      <section className="relative w-full max-w-md rounded-3xl border bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-[0_20px_50px_rgb(16_24_40_/_0.10)] sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold tracking-tight text-[var(--primary-foreground)]">
            M
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">MoneyPilot</p>
            <p className="text-xs text-[var(--muted-foreground)]">Kişisel finans alanın</p>
          </div>
        </div>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
        <div className="mt-8">{children}</div>
      </section>
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
