import { EmptyState, PageHeader } from '@/features/dashboard/components/ui';

export default function SavingsPage() {
  return <div className="space-y-7"><PageHeader title="Savings Goals" description="Birikim hedeflerinizi buradan takip edeceksiniz." /><EmptyState icon="target" title="Savings Goals yakında" description="Bu özellik sonraki sprintte geliştirilecek." /></div>;
}
