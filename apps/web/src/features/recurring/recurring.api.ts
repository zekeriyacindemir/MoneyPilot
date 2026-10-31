import { apiClient } from '@/lib/api/client';
import type {
  CreateRecurringTransactionRequest,
  RecurringTransaction,
  UpdateRecurringTransactionRequest,
} from './recurring.types';

export async function listRecurringTransactions(): Promise<RecurringTransaction[]> {
  const response = await apiClient.get<RecurringTransaction[]>('/recurring-transactions');

  return response.data;
}

export async function createRecurringTransaction(
  request: CreateRecurringTransactionRequest,
): Promise<RecurringTransaction> {
  const response = await apiClient.post<RecurringTransaction>('/recurring-transactions', request);

  return response.data;
}

export async function updateRecurringTransaction(
  id: string,
  request: UpdateRecurringTransactionRequest,
): Promise<RecurringTransaction> {
  const response = await apiClient.patch<RecurringTransaction>(
    `/recurring-transactions/${id}`,
    request,
  );

  return response.data;
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  await apiClient.delete(`/recurring-transactions/${id}`);
}
