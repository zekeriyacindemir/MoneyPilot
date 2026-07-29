import { apiClient } from '@/lib/api/client';
import type { SavingsGoal, SavingsGoalRequest } from './savings.types';

export async function listSavingsGoals(): Promise<SavingsGoal[]> { return (await apiClient.get<SavingsGoal[]>('/savings-goals')).data; }
export async function getSavingsGoal(id: string): Promise<SavingsGoal> { return (await apiClient.get<SavingsGoal>(`/savings-goals/${id}`)).data; }
export async function createSavingsGoal(request: SavingsGoalRequest): Promise<SavingsGoal> { return (await apiClient.post<SavingsGoal>('/savings-goals', request)).data; }
export async function updateSavingsGoal({ id, request }: { id: string; request: Partial<SavingsGoalRequest> }): Promise<SavingsGoal> { return (await apiClient.patch<SavingsGoal>(`/savings-goals/${id}`, request)).data; }
export async function updateSavingsGoalAmount({ id, currentAmount }: { id: string; currentAmount: string }): Promise<SavingsGoal> { return (await apiClient.patch<SavingsGoal>(`/savings-goals/${id}/current-amount`, { currentAmount })).data; }
export async function deleteSavingsGoal(id: string): Promise<void> { await apiClient.delete(`/savings-goals/${id}`); }
