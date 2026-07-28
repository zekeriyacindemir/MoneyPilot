import type { IconName } from './components/icons';

export interface DashboardNavigationItem {
  description: string;
  href: string;
  icon: IconName;
  title: string;
}

export const dashboardNavigation: DashboardNavigationItem[] = [
  { title: 'Overview', description: 'Finansal özetiniz', href: '/dashboard', icon: 'grid' },
  { title: 'Transactions', description: 'Gelir ve giderler', href: '/dashboard/transactions', icon: 'arrows' },
  { title: 'Budgets', description: 'Bütçe planlarınız', href: '/dashboard/budgets', icon: 'wallet' },
  { title: 'Savings Goals', description: 'Birikim hedefleriniz', href: '/dashboard/savings', icon: 'target' },
  { title: 'Reports', description: 'Finansal raporlar', href: '/dashboard/reports', icon: 'chart' },
  { title: 'Settings', description: 'Hesap ayarları', href: '/dashboard/settings', icon: 'settings' },
];

export function getDashboardNavigation(pathname: string) {
  return dashboardNavigation.find((item) => item.href === pathname) ?? dashboardNavigation[0];
}
