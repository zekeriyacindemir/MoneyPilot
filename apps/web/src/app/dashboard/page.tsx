import { DashboardCard, EmptyState, PageHeader, SectionHeader, SkeletonCard, StatCard } from '@/features/dashboard/components/ui';

const demoStats = [
  { label: 'Total Balance', value: '₺48.750', detail: 'Geçici demo veri', tone: 'neutral' as const },
  { label: 'Monthly Income', value: '₺32.400', detail: '+12,4% geçen aya göre', tone: 'positive' as const },
  { label: 'Monthly Expenses', value: '₺18.920', detail: 'Planlanan aralıkta', tone: 'neutral' as const },
  { label: 'Savings Rate', value: '%41,6', detail: 'Hedefin üzerinde', tone: 'positive' as const },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="MoneyPilot overview" title="Finansal görünümünüz" description="Bu ekranın değerleri şimdilik yalnızca arayüzü göstermek için kullanılan geçici demo verileridir." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {demoStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <DashboardCard className="p-5 sm:p-6">
          <SectionHeader title="Recent Transactions" description="İşlemleriniz burada görünecek." />
          <div className="mt-5"><EmptyState icon="arrows" title="Henüz işlem yok" description="İlk gelir veya gider kaydınız burada zaman akışı olarak yer alacak." /></div>
        </DashboardCard>
        <div className="grid gap-5">
          <DashboardCard className="p-5 sm:p-6"><SectionHeader title="Budget Overview" description="Bütçe görünümü yakında." /><div className="mt-5"><EmptyState icon="wallet" title="Bütçe bekleniyor" description="Kategorileriniz için aylık bütçeler oluşturduğunuzda burada özetlenecek." /></div></DashboardCard>
          <DashboardCard className="p-5 sm:p-6"><SectionHeader title="Savings Goals" description="Hedeflerinize odaklanın." /><div className="mt-5"><EmptyState icon="target" title="Bir hedef belirleyin" description="Birikim hedeflerinizin ilerlemesini tek bakışta takip edebileceksiniz." /></div></DashboardCard>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3" aria-label="Yüklenme durumu örneği">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </section>
    </div>
  );
}
