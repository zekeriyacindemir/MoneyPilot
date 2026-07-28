import { EmptyState, PageHeader } from '@/features/dashboard/components/ui';

export default function ReportsPage() {
  return <div className="space-y-7"><PageHeader title="Reports" description="Finansal içgörüleriniz ve raporlarınız burada yer alacak." /><EmptyState icon="chart" title="Reports yakında" description="Bu özellik sonraki sprintte geliştirilecek." /></div>;
}
