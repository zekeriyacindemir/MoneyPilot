import { invalidateFinances } from '@/lib/api/invalidate-finances';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCategory, deleteCategory, listCategories, updateCategory } from './categories.api';
import { transactionQueryKeys } from './transactions.queries';
import type {
  CategoryListParams,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from './transactions.types';

export const categoryQueryKeys = {
  all: ['categories'] as const,
  list: (params: CategoryListParams) => [...categoryQueryKeys.all, 'list', params] as const,
};

export function useCategoriesQuery(params: CategoryListParams = {}) {
  return useQuery({
    queryKey: categoryQueryKeys.list(params),
    queryFn: () => listCategories(params),
  });
}

// Category names and colors are embedded in transaction, budget, dashboard and report responses.
function invalidateCategoryConsumers(queryClient: QueryClient) {
  return Promise.all([
    invalidateFinances(queryClient),
    queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
  ]);
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateCategoryRequest) => createCategory(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all }),
  });
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateCategoryRequest }) =>
      updateCategory(id, request),
    onSuccess: () => invalidateCategoryConsumers(queryClient),
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => invalidateCategoryConsumers(queryClient),
  });
}
