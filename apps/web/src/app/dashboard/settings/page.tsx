import { EmptyState, PageHeader } from '@/features/dashboard/components/ui';

export default function SettingsPage() {
  return <div className="space-y-7"><PageHeader title="Settings" description="Hesap ve uygulama tercihlerinizi buradan yöneteceksiniz." /><EmptyState icon="settings" title="Settings yakında" description="Bu özellik sonraki sprintte geliştirilecek." /></div>;
}
