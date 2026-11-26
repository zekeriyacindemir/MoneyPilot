import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo, BrandMark } from '@/features/brand/brand-logo';
import { AmbientVideo } from '@/features/landing/ambient-video';
import { ThemeToggle } from '@/features/theme/theme-toggle';

const BRAND_VIDEO = '/media/hero.mp4';
const BRAND_POSTER = '/media/hero-poster.jpg';

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
    <main className="grid min-h-screen bg-[var(--background)] lg:grid-cols-[1.05fr_1fr]">
      {/* Desktop: the same video panel as the landing hero */}
      <aside className="relative isolate hidden flex-col justify-between overflow-hidden bg-[#0b0c0f] p-12 text-white lg:flex xl:p-16">
        <AmbientVideo
          src={BRAND_VIDEO}
          poster={BRAND_POSTER}
          withControl
          className="absolute inset-0 -z-20 size-full scale-105"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-[#0b0c0f] via-[#0b0c0f]/70 to-[#0b0c0f]/35" />
        <Link href="/" className="w-fit rounded-xl" aria-label="MoneyPilot ana sayfa">
          <BrandLogo tone="light" />
        </Link>
        <div className="max-w-md pb-6">
          <p className="text-xs font-semibold tracking-[.2em] text-[#e6c06b]">
            YARININ İÇİN BUGÜNDEN
          </p>
          <h2 className="mt-6 text-5xl leading-[1.1] font-semibold tracking-[-0.04em]">
            Hedeflerine giden yol,
            <br />
            <span className="gold-text">net bir bakışla</span> başlar.
          </h2>
          <p className="mt-6 text-base leading-8 text-white/70">
            Harcamalarını anla. Bütçeni oluştur. Sana ait birikim yolculuğunu adım adım takip et.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {['Takip et', 'Planla', 'Biriktir'].map((label, index) => (
              <span
                key={label}
                className="glass-panel rounded-full px-4 py-2 text-xs text-white/85"
              >
                <span className="text-[#e6c06b]">0{index + 1}</span> · {label}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/50">MoneyPilot · Kontrol sende.</p>
      </aside>

      <div className="relative flex min-h-screen flex-col overflow-hidden lg:min-h-0">
        {/* Mobile: a short dark band carrying the brand, so the page still reads as one site */}
        <div className="relative isolate overflow-hidden bg-[#0b0c0f] px-5 pt-6 pb-14 text-white lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative still from the brand video */}
          <img
            src={BRAND_POSTER}
            alt=""
            className="absolute inset-0 -z-20 size-full object-cover opacity-60"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-b from-[#0b0c0f]/50 to-[#0b0c0f]/90" />
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="MoneyPilot ana sayfa">
              <BrandLogo tone="light" className="text-lg" />
            </Link>
            <Link href="/" className="text-sm text-white/75 hover:text-white">
              Ana sayfa
            </Link>
          </div>
        </div>

        <div className="pointer-events-none absolute -top-48 -right-32 size-[28rem] rounded-full bg-[#d6a443]/10 blur-3xl" />
        <div className="relative -mt-8 flex flex-1 flex-col rounded-t-[1.75rem] bg-[var(--background)] lg:mt-0 lg:rounded-none lg:bg-transparent">
          <div className="hidden items-center justify-between px-10 pt-8 lg:flex xl:px-14">
            <Link
              href="/"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <span aria-hidden="true">←</span> Ana sayfa
            </Link>
            <ThemeToggle />
          </div>
          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
            <section className="reveal-up w-full max-w-md">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
              <div className="mt-9">{children}</div>
            </section>
          </div>
        </div>
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] px-4">
      <BrandMark className="size-12 animate-pulse" />
      <p className="text-sm text-[var(--muted-foreground)]">Oturum kontrol ediliyor...</p>
    </main>
  );
}

export const authInputClassName =
  'w-full rounded-xl border bg-[var(--card)] px-3.5 py-3.5 text-[var(--foreground)] outline-none shadow-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_25%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--muted)] disabled:opacity-70';
export const authButtonClassName =
  'gold-button w-full rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60';
