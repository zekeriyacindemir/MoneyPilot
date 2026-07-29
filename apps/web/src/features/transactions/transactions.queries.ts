import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from './transactions.api';
import type { CreateTransactionRequest, TransactionListParams, UpdateTransactionRequest } from './transactions.types';

export const transactionQueryKeys = {
  all: ['transactions'] as const,
  detail: (id: string) => [...transactionQueryKeys.all, 'detail', id] as const,
  list: (params: TransactionListParams) => [...transactionQueryKeys.all, 'list', params] as const,
};

export function useTransactionsQuery(params: TransactionListParams, enabled = true) {
  return useQuery({
    queryKey: transactionQueryKeys.list(params),
    queryFn: () => listTransactions(params),
    enabled,
  });
}

export function useTransactionQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: transactionQueryKeys.detail(id),
    queryFn: () => getTransaction(id),
    enabled: enabled && Boolean(id),
  });
}

export function useCreateTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTransactionRequest) => createTransaction(request),
    onSuccess: (transaction) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.detail(transaction.id) }),
      ]),
  });
}

export function useUpdateTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateTransactionRequest }) =>
      updateTransaction({ id, request }),
    onSuccess: (transaction) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.detail(transaction.id) }),
      ]),
  });
}

export function useDeleteTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: (_result, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
        queryClient.removeQueries({ queryKey: transactionQueryKeys.detail(id) }),
      ]),
  });
}
