import type { IconName } from './components/icons';

export interface DashboardNavigationItem {
  description: string;
  href: string;
  icon: IconName;
  title: string;
}

export const dashboardNavigation: DashboardNavigationItem[] = [
  { title: 'Genel bakış', description: 'Finansal özetiniz', href: '/dashboard', icon: 'grid' },
  { title: 'İşlemler', description: 'Gelir ve giderler', href: '/dashboard/transactions', icon: 'arrows' },
  { title: 'Bütçeler', description: 'Bütçe planlarınız', href: '/dashboard/budgets', icon: 'wallet' },
  { title: 'Birikim hedefleri', description: 'Birikim hedefleriniz', href: '/dashboard/savings', icon: 'target' },
  { title: 'Raporlar', description: 'Finansal raporlar', href: '/dashboard/reports', icon: 'chart' },
  { title: 'AI Asistan', description: 'Finansal alışkanlık koçu', href: '/dashboard/assistant', icon: 'chat' },
  { title: 'Ayarlar', description: 'Hesap ayarları', href: '/dashboard/settings', icon: 'settings' },
];

export function getDashboardNavigation(pathname: string) {
  return dashboardNavigation.find((item) => item.href === pathname) ?? dashboardNavigation[0];
}
