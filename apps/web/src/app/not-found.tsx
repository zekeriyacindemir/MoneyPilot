import Link from 'next/link';
import { BrandLogo } from '@/features/brand/brand-logo';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <BrandLogo className="h-12 w-44" />
      <p className="mt-10 text-xs font-semibold tracking-[.15em] text-[var(--primary)]">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sayfa bulunamadı</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted-foreground)]">
        Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)]"
      >
        Genel bakışa dön
      </Link>
    </main>
  );
}
