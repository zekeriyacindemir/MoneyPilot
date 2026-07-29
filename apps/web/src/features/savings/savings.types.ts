import type { Currency } from '@/features/transactions/transactions.types';

export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELED';
export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SavingsGoal {
  id: string; name: string; targetAmount: string; currentAmount: string; remainingAmount: string; progressPercent: string;
  currency: Currency; priority: GoalPriority; status: GoalStatus; targetDate: string | null; completedAt: string | null; createdAt: string; updatedAt: string;
}

export interface SavingsGoalRequest { name: string; targetAmount: string; currency: Currency; priority: GoalPriority; targetDate?: string; status?: GoalStatus; }
