import { apiClient } from '@/lib/api/client';
import type { Currency } from '@/features/transactions/transactions.types';
import type { DailyCoaching, DashboardPeriod, DashboardSummary, FinancialHealth } from './dashboard.types';

export async function getDashboardSummary({
  currency,
  period,
}: {
  currency: Currency;
  period: DashboardPeriod;
}): Promise<DashboardSummary> {
  const response = await apiClient.get<DashboardSummary>('/dashboard/summary', {
    params: { currency, period },
  });

  return response.data;
}

export async function getFinancialHealth(currency: Currency): Promise<FinancialHealth> {
  const response = await apiClient.get<FinancialHealth>('/dashboard/financial-health', {
    params: { currency },
  });
  return response.data;
}

export async function getDailyCoaching(currency: Currency): Promise<DailyCoaching> {
  const response = await apiClient.get<DailyCoaching>('/dashboard/daily-coaching', {
    params: { currency },
  });
  return response.data;
}
