import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSavingsGoal, deleteSavingsGoal, getSavingsGoal, listSavingsGoals, updateSavingsGoal, updateSavingsGoalAmount } from './savings.api';

export const savingsGoalQueryKeys = { all: ['savings-goals'] as const, detail: (id: string) => [...savingsGoalQueryKeys.all, 'detail', id] as const };
export function useSavingsGoalsQuery() { return useQuery({ queryKey: savingsGoalQueryKeys.all, queryFn: listSavingsGoals }); }
export function useSavingsGoalQuery(id: string) { return useQuery({ queryKey: savingsGoalQueryKeys.detail(id), queryFn: () => getSavingsGoal(id), enabled: Boolean(id) }); }
function useInvalidate() { const client = useQueryClient(); return (id?: string) => Promise.all([client.invalidateQueries({ queryKey: savingsGoalQueryKeys.all }), ...(id ? [client.invalidateQueries({ queryKey: savingsGoalQueryKeys.detail(id) })] : [])]); }
export function useCreateSavingsGoalMutation() { const invalidate = useInvalidate(); return useMutation({ mutationFn: createSavingsGoal, onSuccess: (goal) => invalidate(goal.id) }); }
export function useUpdateSavingsGoalMutation() { const invalidate = useInvalidate(); return useMutation({ mutationFn: updateSavingsGoal, onSuccess: (goal) => invalidate(goal.id) }); }
export function useUpdateSavingsGoalAmountMutation() { const invalidate = useInvalidate(); return useMutation({ mutationFn: updateSavingsGoalAmount, onSuccess: (goal) => invalidate(goal.id) }); }
export function useDeleteSavingsGoalMutation() { const client = useQueryClient(); const invalidate = useInvalidate(); return useMutation({ mutationFn: deleteSavingsGoal, onSuccess: async (_result, id) => { await invalidate(); client.removeQueries({ queryKey: savingsGoalQueryKeys.detail(id) }); } }); }
