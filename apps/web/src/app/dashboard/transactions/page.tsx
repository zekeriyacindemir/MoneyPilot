import { EmptyState, PageHeader } from '@/features/dashboard/components/ui';

export default function TransactionsPage() {
  return <div className="space-y-7"><PageHeader title="Transactions" description="Gelir ve gider kayıtlarınızı buradan yöneteceksiniz." /><EmptyState icon="arrows" title="Transactions yakında" description="Bu özellik sonraki sprintte geliştirilecek." /></div>;
}
