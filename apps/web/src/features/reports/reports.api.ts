import { apiClient } from '@/lib/api/client';
import type { Currency } from '@/features/transactions/transactions.types';
import type { MonthlyReport } from './reports.types';

export async function getMonthlyReport({ currency, month }: { currency: Currency; month: string }): Promise<MonthlyReport> {
  const response = await apiClient.get<MonthlyReport>('/reports/monthly', { params: { currency, month } });
  return response.data;
}
