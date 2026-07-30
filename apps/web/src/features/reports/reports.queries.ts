import { useQuery } from '@tanstack/react-query';
import type { Currency } from '@/features/transactions/transactions.types';
import { getMonthlyReport } from './reports.api';

export const reportsQueryKeys = { monthly: (month: string, currency: Currency) => ['reports', 'monthly', month, currency] as const };

export function useMonthlyReportQuery(month: string, currency: Currency, enabled = true) {
  return useQuery({ queryKey: reportsQueryKeys.monthly(month, currency), queryFn: () => getMonthlyReport({ month, currency }), enabled });
}
