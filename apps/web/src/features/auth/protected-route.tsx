'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './auth-context';

interface ProtectedRouteProperties {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback = null }: ProtectedRouteProperties) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParameters = useSearchParams();

  useEffect(() => {
    if (isLoading || isAuthenticated) {
      return;
    }

    const redirect = createInternalRedirect(pathname, searchParameters.toString());
    router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
  }, [isAuthenticated, isLoading, pathname, router, searchParameters]);

  if (isLoading || !isAuthenticated) {
    return fallback;
  }

  return children;
}

function createInternalRedirect(pathname: string, search: string): string {
  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    return '/';
  }

  return search ? `${pathname}?${search}` : pathname;
}
