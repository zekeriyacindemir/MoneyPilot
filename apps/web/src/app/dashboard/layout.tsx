import { Suspense, type ReactNode } from 'react';
import { ProtectedRoute } from '@/features/auth/protected-route';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';

function DashboardLoadingState() {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm"><span className="size-2.5 animate-pulse rounded-full bg-blue-600" />Dashboard hazırlanıyor</div></div>;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<DashboardLoadingState />}><ProtectedRoute fallback={<DashboardLoadingState />}><DashboardShell>{children}</DashboardShell></ProtectedRoute></Suspense>;
}
