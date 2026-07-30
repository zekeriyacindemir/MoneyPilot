import type { Currency, TransactionType } from '@/features/transactions/transactions.types';

export type DashboardPeriod =
  'current_month' | 'last_3_months' | 'last_6_months' | 'last_12_months';

export interface DashboardTrendPoint {
  expense: string;
  income: string;
  period: string;
}

export interface DashboardRecentTransaction {
  id: string;
  category: {
    id: string;
    name: string;
    type: TransactionType;
    color: string | null;
    icon: string | null;
  };
  type: TransactionType;
  amount: string;
  currency: Currency;
  occurredAt: string;
}

export interface DashboardSummary {
  currency: Currency;
  period: DashboardPeriod;
  totalBalance: string;
  periodIncome: string;
  periodExpense: string;
  savingsRate: string | null;
  recentTransactions: DashboardRecentTransaction[];
  trend: DashboardTrendPoint[];
}

export type FinancialHealthSignal = 'income' | 'budget' | 'goal';
export type FinancialHealthLevel = 'Kritik' | 'Dikkat' | 'İyi' | 'Çok iyi';
export interface FinancialHealthComponent {
  key: 'savingsRate' | 'budgetAdherence' | 'goalProgress';
  label: string;
  score: number | null;
  description: string;
}
export interface FinancialHealthRecommendation {
  title: string;
  description: string;
  href: '/dashboard/transactions' | '/dashboard/budgets' | '/dashboard/savings';
}
export interface FinancialHealth {
  currency: Currency;
  isReady: boolean;
  missingSignals: FinancialHealthSignal[];
  score: number | null;
  level: FinancialHealthLevel | null;
  components: FinancialHealthComponent[];
  strongestFactor: string | null;
  recommendations: FinancialHealthRecommendation[];
}

export type CoachingHref =
  | '/dashboard/transactions'
  | '/dashboard/budgets'
  | '/dashboard/savings'
  | '/dashboard/reports';
export interface CoachingItem {
  title: string;
  body: string;
  actionHref: CoachingHref;
  actionLabel: string;
}
export interface DailyCoaching {
  currency: Currency;
  personalInsight: CoachingItem;
  generalTip: CoachingItem;
}
