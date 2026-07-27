'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';

interface PublicOnlyRouteProperties {
  children: ReactNode;
  fallback?: ReactNode;
}

export function PublicOnlyRoute({ children, fallback = null }: PublicOnlyRouteProperties) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return fallback;
  }

  return children;
}
