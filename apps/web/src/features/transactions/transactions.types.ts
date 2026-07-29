export type TransactionType = 'INCOME' | 'EXPENSE';

export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET' | 'OTHER';

export type TransactionSortBy = 'occurredAt' | 'amount' | 'createdAt' | 'updatedAt';

export type SortOrder = 'asc' | 'desc';

export interface TransactionCategory {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
  isSystem: boolean;
}

export interface CategoryListParams {
  type?: TransactionType;
  search?: string;
}

export interface Transaction {
  id: string;
  categoryId: string;
  category: TransactionCategory;
  type: TransactionType;
  amount: string;
  currency: Currency;
  paymentMethod: PaymentMethod | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
  category?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: TransactionSortBy;
  sortOrder?: SortOrder;
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateTransactionRequest {
  categoryId: string;
  type: TransactionType;
  amount: string;
  currency: Currency;
  paymentMethod?: PaymentMethod;
  note?: string;
  occurredAt: string;
}

export interface UpdateTransactionRequest {
  categoryId?: string;
  type?: TransactionType;
  amount?: string;
  currency?: Currency;
  paymentMethod?: PaymentMethod;
  note?: string;
  occurredAt?: string;
}
