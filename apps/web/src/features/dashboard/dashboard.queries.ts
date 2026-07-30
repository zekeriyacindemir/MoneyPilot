import { useQuery } from '@tanstack/react-query';
import type { Currency } from '@/features/transactions/transactions.types';
import { getDailyCoaching, getDashboardSummary, getFinancialHealth } from './dashboard.api';
import type { DashboardPeriod } from './dashboard.types';

export const dashboardQueryKeys = {
  summary: (currency: Currency, period: DashboardPeriod) =>
    ['dashboard', 'summary', currency, period] as const,
  financialHealth: (currency: Currency) => ['dashboard', 'financial-health', currency] as const,
  dailyCoaching: (currency: Currency) => ['dashboard', 'daily-coaching', currency] as const,
};

export function useDashboardSummaryQuery(currency: Currency, period: DashboardPeriod) {
  return useQuery({
    queryKey: dashboardQueryKeys.summary(currency, period),
    queryFn: () => getDashboardSummary({ currency, period }),
  });
}

export function useFinancialHealthQuery(currency: Currency) {
  return useQuery({
    queryKey: dashboardQueryKeys.financialHealth(currency),
    queryFn: () => getFinancialHealth(currency),
  });
}

export function useDailyCoachingQuery(currency: Currency) {
  return useQuery({
    queryKey: dashboardQueryKeys.dailyCoaching(currency),
    queryFn: () => getDailyCoaching(currency),
  });
}
