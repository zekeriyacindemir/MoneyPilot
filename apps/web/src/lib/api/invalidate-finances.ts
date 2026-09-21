import type { QueryClient } from '@tanstack/react-query';

export function invalidateFinances(client: QueryClient) {
  return Promise.all(['dashboard', 'reports', 'budgets'].map((key) => client.invalidateQueries({ queryKey: [key] })));
}
