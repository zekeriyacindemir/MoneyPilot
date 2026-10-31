import { invalidateFinances } from '@/lib/api/invalidate-finances';
import { transactionQueryKeys } from '@/features/transactions/transactions.queries';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  listRecurringTransactions,
  updateRecurringTransaction,
} from './recurring.api';
import type {
  CreateRecurringTransactionRequest,
  UpdateRecurringTransactionRequest,
} from './recurring.types';

export const recurringQueryKeys = { all: ['recurring-transactions'] as const };

export function useRecurringTransactionsQuery() {
  return useQuery({ queryKey: recurringQueryKeys.all, queryFn: listRecurringTransactions });
}

// Creating or resuming a schedule can create transactions immediately.
function invalidateRecurringConsumers(queryClient: QueryClient) {
  return Promise.all([
    invalidateFinances(queryClient),
    queryClient.invalidateQueries({ queryKey: recurringQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
  ]);
}

export function useCreateRecurringTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateRecurringTransactionRequest) => createRecurringTransaction(request),
    onSuccess: () => invalidateRecurringConsumers(queryClient),
  });
}

export function useUpdateRecurringTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateRecurringTransactionRequest }) =>
      updateRecurringTransaction(id, request),
    onSuccess: () => invalidateRecurringConsumers(queryClient),
  });
}

export function useDeleteRecurringTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRecurringTransaction(id),
    onSuccess: () => invalidateRecurringConsumers(queryClient),
  });
}
