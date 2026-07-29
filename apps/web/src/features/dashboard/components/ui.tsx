import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './icons';

export function PageHeader({ eyebrow, title, description, action }: { action?: ReactNode; description: string; eyebrow?: string; title: string }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function DashboardCard({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-panel)] shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${className}`}>{children}</section>;
}

export function SectionHeader({ title, description, action }: { action?: ReactNode; description?: string; title: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, detail, tone = 'neutral' }: { detail: string; label: string; tone?: 'neutral' | 'positive' | 'warning'; value: string }) {
  const toneClasses = {
    neutral: 'bg-slate-100 text-slate-600',
    positive: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-rose-50 text-rose-700',
  };

  return (
    <DashboardCard className="p-5 sm:p-6">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 tabular-nums sm:text-3xl">{value}</p>
      <span className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>{detail}</span>
    </DashboardCard>
  );
}

export function EmptyState({ icon, title, description, action }: { action?: ReactNode; description: string; icon: IconName; title: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm"><Icon name={icon} className="size-5" /></span>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Avatar({ name, className = '' }: { className?: string; name?: string | null }) {
  const initials = (name ?? 'MoneyPilot')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white ${className}`}>{initials}</span>;
}

export function IconButton({ children, label, className = '', type = 'button', ...properties }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; label: string }) {
  return (
    <button type={type} aria-label={label} className={`inline-flex size-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-50 ${className}`} {...properties}>
      {children}
    </button>
  );
}

export function SkeletonCard() {
  return <div aria-hidden="true" className="animate-pulse rounded-2xl border border-[var(--dashboard-border)] bg-white p-6"><div className="h-4 w-24 rounded bg-slate-100" /><div className="mt-4 h-8 w-32 rounded bg-slate-100" /><div className="mt-5 h-5 w-20 rounded-full bg-slate-100" /></div>;
}
