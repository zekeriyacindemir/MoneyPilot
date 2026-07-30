'use client';

import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import {
  DashboardCard,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionHeader,
  SkeletonCard,
} from '@/features/dashboard/components/ui';
import type { Currency } from '@/features/transactions/transactions.types';
import { useMonthlyReportQuery } from './reports.queries';
import type { MonthlyReport } from './reports.types';

const currencies: Currency[] = ['TRY', 'USD', 'EUR', 'GBP'];
const selectClassName = 'h-10 rounded-xl border bg-[var(--card)] px-3 text-sm font-medium text-[var(--foreground)] outline-none focus:ring-4 focus:ring-[var(--secondary)]';

function currentIstanbulMonth(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}`;
}
function formatAmount(amount: string, currency: Currency): string { return `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(Number(amount))} ${currency}`; }
function formatDifference(amount: string, currency: Currency): string { const value = Number(amount); return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatAmount(Math.abs(value).toString(), currency)}`; }
function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? (message[0] ?? 'Rapor yüklenemedi.') : (message ?? 'Rapor yüklenemedi.');
  }
  return 'Rapor yüklenemedi. Lütfen tekrar deneyin.';
}

export function ReportsPageClient() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [month, setMonth] = useState(currentIstanbulMonth);
  const [currency, setCurrency] = useState<Currency | null>(null);
  const selectedCurrency = currency ?? user?.defaultCurrency ?? 'TRY';
  const reportQuery = useMonthlyReportQuery(month, selectedCurrency, !isAuthLoading && user !== null);
  return <div className="space-y-8">
    <PageHeader eyebrow="Aylık analiz" title="Finansal raporlar" description="Seçtiğiniz aydaki değişimi ve harcama dağılımını ayrıntılı inceleyin." action={<div className="flex gap-2"><select aria-label="Para birimi" className={selectClassName} value={selectedCurrency} onChange={(event) => setCurrency(event.target.value as Currency)}>{currencies.map((item) => <option key={item}>{item}</option>)}</select><input aria-label="Rapor ayı" type="month" max={currentIstanbulMonth()} className={selectClassName} value={month} onChange={(event) => setMonth(event.target.value)} /></div>} />
    {reportQuery.isLoading ? <ReportsSkeleton /> : null}
    {reportQuery.isError ? <ErrorState title="Rapor yüklenemedi" description={getErrorMessage(reportQuery.error)} onRetry={() => void reportQuery.refetch()} /> : null}
    {reportQuery.data ? <ReportContent report={reportQuery.data} /> : null}
  </div>;
}

function ReportContent({ report }: { report: MonthlyReport }) {
  const monthLabel = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(`${report.month}-01T12:00:00+03:00`));
  const netPositive = Number(report.net) >= 0;
  return <>
    <section className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
      <DashboardCard className="p-5 sm:p-6">
        <SectionHeader title="Ayın finansal sonucu" description={`${monthLabel} · ${report.currency}`} />
        <p className={`mt-6 text-4xl font-semibold tracking-tight ${netPositive ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}`}>{netPositive ? '+' : ''}{formatAmount(report.net, report.currency)}</p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Gelir ve giderleriniz arasındaki net fark</p>
        <div className="mt-6 grid grid-cols-2 gap-3 border-t pt-5 text-sm">
          <div><p className="text-[var(--muted-foreground)]">Gelir</p><p className="mt-1 font-semibold text-[var(--success)]">{formatAmount(report.totalIncome, report.currency)}</p></div>
          <div><p className="text-[var(--muted-foreground)]">Gider</p><p className="mt-1 font-semibold text-[var(--destructive)]">{formatAmount(report.totalExpense, report.currency)}</p></div>
        </div>
        <p className="mt-5 text-sm text-[var(--muted-foreground)]">Tasarruf oranı: <strong className="text-[var(--card-foreground)]">{report.savingsRate === null ? 'Hesaplanamıyor' : `%${report.savingsRate}`}</strong></p>
      </DashboardCard>
      <DashboardCard className="p-5 sm:p-6">
        <SectionHeader title="Önceki aya göre değişim" description="Tutar farkları" />
        <div className="mt-5 space-y-4">
          <ComparisonRow label="Gelir" value={report.previousMonth.incomeDifference} currency={report.currency} positiveIsGood />
          <ComparisonRow label="Gider" value={report.previousMonth.expenseDifference} currency={report.currency} positiveIsGood={false} />
          <ComparisonRow label="Net durum" value={report.previousMonth.netDifference} currency={report.currency} positiveIsGood />
        </div>
      </DashboardCard>
    </section>
    <section className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
      <DashboardCard className="p-5 sm:p-6"><SectionHeader title="Gider dağılımı" description={`${monthLabel} · ${report.currency}`} /><div className="mt-6">{report.categories.length === 0 ? <EmptyState icon="chart" title="Bu ay gider yok" description="Gider eklediğinizde kategori dağılımı burada görünecek." /> : <CategoryBars report={report} />}</div></DashboardCard>
      <DashboardCard className="p-5 sm:p-6"><SectionHeader title="Kategori detayları" description="Gider tutarına göre sıralı" /><div className="mt-5">{report.categories.length === 0 ? <EmptyState icon="wallet" title="Gösterilecek kategori yok" description="Seçtiğiniz ayda bu para biriminde gider bulunmuyor." /> : <div className="divide-y">{report.categories.map((category) => <div key={category.categoryId} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"><div className="min-w-0"><div className="flex items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color ?? 'var(--primary)' }} /><p className="truncate text-sm font-semibold">{category.name}</p></div><p className="mt-1 text-xs text-[var(--muted-foreground)]">{category.transactionCount} işlem · %{category.percentage}</p></div><p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--card-foreground)]">{formatAmount(category.totalExpense, report.currency)}</p></div>)}</div>}</div></DashboardCard>
    </section>
  </>;
}

function ComparisonRow({ currency, label, positiveIsGood, value }: { currency: Currency; label: string; positiveIsGood: boolean; value: string }) {
  const positive = Number(value) >= 0;
  const tone = positive === positiveIsGood ? 'text-[var(--success)]' : 'text-[var(--destructive)]';
  return <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--muted)]/55 px-4 py-3"><span className="text-sm font-medium text-[var(--card-foreground)]">{label}</span><span className={`text-sm font-semibold tabular-nums ${tone}`}>{formatDifference(value, currency)}</span></div>;
}
function CategoryBars({ report }: { report: MonthlyReport }) { return <div className="space-y-4">{report.categories.map((category) => <div key={category.categoryId}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium">{category.name}</span><span className="shrink-0 text-xs text-[var(--muted-foreground)]">%{category.percentage}</span></div><div className="h-3 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, Number(category.percentage))}%`, backgroundColor: category.color ?? 'var(--primary)' }} /></div></div>)}</div>; }
function ReportsSkeleton() { return <><section className="grid gap-5 xl:grid-cols-2"><SkeletonCard /><SkeletonCard /></section><section className="grid gap-5 xl:grid-cols-2"><SkeletonCard /><SkeletonCard /></section></>; }
