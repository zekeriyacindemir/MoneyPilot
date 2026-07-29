import { apiClient } from '@/lib/api/client';
import type { Category, CategoryListParams } from './transactions.types';

export async function listCategories(params: CategoryListParams = {}): Promise<Category[]> {
  const response = await apiClient.get<Category[]>('/categories', { params });

  return response.data;
}
