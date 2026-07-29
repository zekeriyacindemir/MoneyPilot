import { useQuery } from '@tanstack/react-query';
import { listCategories } from './categories.api';
import type { CategoryListParams } from './transactions.types';

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
