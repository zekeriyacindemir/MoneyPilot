import { apiClient } from '@/lib/api/client';
import type { Budget, BudgetListParams, BudgetRequest } from './budgets.types';
export async function listBudgets(params: BudgetListParams): Promise<Budget[]> { return (await apiClient.get<Budget[]>('/budgets', { params })).data; }
export async function getBudget(id: string): Promise<Budget> { return (await apiClient.get<Budget>(`/budgets/${id}`)).data; }
export async function createBudget(request: BudgetRequest): Promise<Budget> { return (await apiClient.post<Budget>('/budgets', request)).data; }
export async function updateBudget({ id, request }: { id: string; request: Partial<BudgetRequest> }): Promise<Budget> { return (await apiClient.patch<Budget>(`/budgets/${id}`, request)).data; }
export async function deleteBudget(id: string): Promise<void> { await apiClient.delete(`/budgets/${id}`); }
