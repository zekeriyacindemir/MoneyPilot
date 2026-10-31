import type {
  Currency,
  PaymentMethod,
  TransactionCategory,
  TransactionType,
} from '@/features/transactions/transactions.types';

export type RecurrenceFrequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurringTransaction {
  id: string;
  categoryId: string;
  category: TransactionCategory;
  type: TransactionType;
  amount: string;
  currency: Currency;
  paymentMethod: PaymentMethod | null;
  note: string | null;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate: string | null;
  nextRunOn: string | null;
  isActive: boolean;
}

export interface CreateRecurringTransactionRequest {
  categoryId: string;
  type: TransactionType;
  amount: string;
  currency: Currency;
  paymentMethod?: PaymentMethod;
  note?: string;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
}

export type UpdateRecurringTransactionRequest = Partial<
  Omit<CreateRecurringTransactionRequest, 'type' | 'endDate'>
> & {
  endDate?: string | null;
  isActive?: boolean;
};
