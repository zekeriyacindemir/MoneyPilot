import { EmptyState, PageHeader } from '@/features/dashboard/components/ui';

export default function BudgetsPage() {
  return <div className="space-y-7"><PageHeader title="Budgets" description="Harcama planlarınızı ve limitlerinizi buradan izleyeceksiniz." /><EmptyState icon="wallet" title="Budgets yakında" description="Bu özellik sonraki sprintte geliştirilecek." /></div>;
}
