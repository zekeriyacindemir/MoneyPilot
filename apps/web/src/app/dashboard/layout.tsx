import { Suspense, type ReactNode } from 'react';
import { ProtectedRoute } from '@/features/auth/protected-route';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';

function DashboardLoadingState() {
  return <div className="flex min-h-screen items-center justify-center bg-[var(--background)]"><div className="flex items-center gap-3 rounded-2xl border bg-[var(--card)] px-5 py-4 text-sm font-medium text-[var(--muted-foreground)] shadow-sm"><span className="size-2.5 animate-pulse rounded-full bg-[var(--primary)]" />Dashboard hazırlanıyor</div></div>;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<DashboardLoadingState />}><ProtectedRoute fallback={<DashboardLoadingState />}><DashboardShell>{children}</DashboardShell></ProtectedRoute></Suspense>;
}
