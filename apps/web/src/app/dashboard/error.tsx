'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/features/dashboard/components/ui';

export default function DashboardError({
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
    <ErrorState
      description="Bu bölüm yüklenirken beklenmeyen bir hata oluştu. Verileriniz güvende; lütfen tekrar deneyin."
      onRetry={() => retry()}
    />
  );
}
