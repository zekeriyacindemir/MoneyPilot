'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { ThemeProvider } from '@/features/theme/theme-provider';

function SessionQueries({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  useEffect(
    () => () => {
      client.clear();
    },
    [client],
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function UserQueries({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <SessionQueries key={user?.id ?? 'anonymous'}>{children}</SessionQueries>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserQueries>{children}</UserQueries>
      </AuthProvider>
    </ThemeProvider>
  );
}
