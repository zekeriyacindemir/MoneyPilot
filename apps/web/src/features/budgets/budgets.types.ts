import type { Category, Currency, TransactionType } from '@/features/transactions/transactions.types';

export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export interface Budget { id: string; categoryId: string; category: Pick<Category, 'id' | 'name' | 'type' | 'color' | 'icon'>; type: TransactionType; amount: string; currency: Currency; period: BudgetPeriod; periodStart: string; periodEnd: string; actualAmount: string; remainingAmount: string; progressPercent: string; createdAt: string; updatedAt: string; }
export interface BudgetListParams { period?: BudgetPeriod; date?: string; }
export interface BudgetRequest { categoryId: string; type: TransactionType; amount: string; currency: Currency; period: BudgetPeriod; periodStart: string; }
