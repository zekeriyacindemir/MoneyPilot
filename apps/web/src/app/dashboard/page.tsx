'use client';

import { AuthLoadingFallback } from '@/app/login/page';
import { useAuth } from '@/features/auth/auth-context';
import { ProtectedRoute } from '@/features/auth/protected-route';
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <ProtectedRoute fallback={<AuthLoadingFallback />}>
        <DashboardPlaceholder />
      </ProtectedRoute>
    </Suspense>
  );
}

function DashboardPlaceholder() {
  const { logout, user } = useAuth();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-sky-700">MoneyPilot</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          MoneyPilot Dashboard
        </h1>
        <p className="mt-3 text-slate-600">Hoş geldin, {user?.name || user?.email}.</p>
        <button type="button" className="mt-8 text-sm font-semibold text-sky-700 hover:text-sky-800" onClick={() => void logout()}>
          Çıkış yap
        </button>
      </section>
    </main>
  );
}
