import { apiClient } from '@/lib/api/client';
import type {
  CreateTransactionRequest,
  Transaction,
  TransactionListParams,
  TransactionListResponse,
  UpdateTransactionRequest,
} from './transactions.types';

export async function listTransactions(params: TransactionListParams): Promise<TransactionListResponse> {
  const response = await apiClient.get<TransactionListResponse>('/transactions', { params });

  return response.data;
}

export async function getTransaction(id: string): Promise<Transaction> {
  const response = await apiClient.get<Transaction>(`/transactions/${id}`);

  return response.data;
}

export async function createTransaction(request: CreateTransactionRequest): Promise<Transaction> {
  const response = await apiClient.post<Transaction>('/transactions', request);

  return response.data;
}

export async function updateTransaction({ id, request }: { id: string; request: UpdateTransactionRequest }): Promise<Transaction> {
  const response = await apiClient.patch<Transaction>(`/transactions/${id}`, request);

  return response.data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiClient.delete(`/transactions/${id}`);
}
