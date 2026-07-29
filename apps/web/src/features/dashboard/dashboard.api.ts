import { apiClient } from '@/lib/api/client';
import type { Currency } from '@/features/transactions/transactions.types';
import type { DashboardPeriod, DashboardSummary } from './dashboard.types';

export async function getDashboardSummary({ currency, period }: { currency: Currency; period: DashboardPeriod }): Promise<DashboardSummary> {
  const response = await apiClient.get<DashboardSummary>('/dashboard/summary', { params: { currency, period } });

  return response.data;
}
