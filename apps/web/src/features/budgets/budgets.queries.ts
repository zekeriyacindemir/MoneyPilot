import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBudget, deleteBudget, getBudget, listBudgets, updateBudget } from './budgets.api';
import type { BudgetListParams } from './budgets.types';
export const budgetQueryKeys = { all: ['budgets'] as const, list: (params: BudgetListParams) => [...budgetQueryKeys.all, 'list', params] as const, detail: (id: string) => [...budgetQueryKeys.all, 'detail', id] as const };
export function useBudgetsQuery(params: BudgetListParams) { return useQuery({ queryKey: budgetQueryKeys.list(params), queryFn: () => listBudgets(params) }); }
export function useBudgetQuery(id: string) { return useQuery({ queryKey: budgetQueryKeys.detail(id), queryFn: () => getBudget(id), enabled: Boolean(id) }); }
function useInvalidate() { const client = useQueryClient(); return (id?: string) => Promise.all([client.invalidateQueries({ queryKey: budgetQueryKeys.all }), ...(id ? [client.invalidateQueries({ queryKey: budgetQueryKeys.detail(id) })] : [])]); }
export function useCreateBudgetMutation() { const invalidate = useInvalidate(); return useMutation({ mutationFn: createBudget, onSuccess: (item) => invalidate(item.id) }); }
export function useUpdateBudgetMutation() { const invalidate = useInvalidate(); return useMutation({ mutationFn: updateBudget, onSuccess: (item) => invalidate(item.id) }); }
export function useDeleteBudgetMutation() { const client = useQueryClient(); const invalidate = useInvalidate(); return useMutation({ mutationFn: deleteBudget, onSuccess: async (_item, id) => { await invalidate(); client.removeQueries({ queryKey: budgetQueryKeys.detail(id) }); } }); }
