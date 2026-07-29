import { useQuery } from '@tanstack/react-query';
import type { Currency } from '@/features/transactions/transactions.types';
import { getDashboardSummary } from './dashboard.api';
import type { DashboardPeriod } from './dashboard.types';

export const dashboardQueryKeys = {
  summary: (currency: Currency, period: DashboardPeriod) => ['dashboard', 'summary', currency, period] as const,
};

export function useDashboardSummaryQuery(currency: Currency, period: DashboardPeriod) {
  return useQuery({
    queryKey: dashboardQueryKeys.summary(currency, period),
    queryFn: () => getDashboardSummary({ currency, period }),
  });
}
