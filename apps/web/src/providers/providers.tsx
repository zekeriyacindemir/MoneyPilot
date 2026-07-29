'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { AuthProvider } from '@/features/auth/auth-context';
import { ThemeProvider } from '@/features/theme/theme-provider';

interface ProvidersProperties {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProperties) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>
    </QueryClientProvider>
  );
}
