'use client';

import { Icon, type IconName } from '@/features/dashboard/components/icons';
import { useTheme, type Theme } from './theme-provider';

const options: { icon: IconName; label: string; value: Theme }[] = [
  { value: 'light', label: 'Açık tema', icon: 'sun' },
  { value: 'dark', label: 'Koyu tema', icon: 'moon' },
  { value: 'system', label: 'Sistem teması', icon: 'monitor' },
];

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return <div role="group" aria-label="Görünüm teması" className="hidden items-center rounded-xl border bg-[var(--card)] p-1 sm:flex">{options.map((option) => <button key={option.value} type="button" aria-label={option.label} aria-pressed={theme === option.value} title={option.label} onClick={() => setTheme(option.value)} className={`inline-flex size-8 items-center justify-center rounded-lg ${theme === option.value ? 'bg-[var(--secondary)] text-[var(--secondary-foreground)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}><Icon name={option.icon} className="size-4" /></button>)}</div>;
}
