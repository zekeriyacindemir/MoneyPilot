'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Bir şeyler ters gitti</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted-foreground)]">
        Sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
      </p>
      <div className="mt-8 flex items-center gap-5">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)]"
        >
          Tekrar dene
        </button>
        <Link href="/" className="text-sm font-semibold">
          Ana sayfa
        </Link>
      </div>
    </main>
  );
}
