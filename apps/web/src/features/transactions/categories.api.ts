import { apiClient } from '@/lib/api/client';
import type {
  Category,
  CategoryListParams,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from './transactions.types';

export async function listCategories(params: CategoryListParams = {}): Promise<Category[]> {
  const response = await apiClient.get<Category[]>('/categories', { params });

  return response.data;
}

export async function createCategory(request: CreateCategoryRequest): Promise<Category> {
  const response = await apiClient.post<Category>('/categories', request);

  return response.data;
}

export async function updateCategory(
  id: string,
  request: UpdateCategoryRequest,
): Promise<Category> {
  const response = await apiClient.patch<Category>(`/categories/${id}`, request);

  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
