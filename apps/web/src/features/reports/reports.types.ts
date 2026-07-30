import type { Currency } from '@/features/transactions/transactions.types';

export interface MonthlyReportCategory {
  categoryId: string;
  color: string | null;
  name: string;
  percentage: string;
  totalExpense: string;
  transactionCount: number;
}

export interface MonthlyReport {
  categories: MonthlyReportCategory[];
  currency: Currency;
  month: string;
  net: string;
  previousMonth: { expenseDifference: string; incomeDifference: string; netDifference: string };
  savingsRate: string | null;
  totalExpense: string;
  totalIncome: string;
}
