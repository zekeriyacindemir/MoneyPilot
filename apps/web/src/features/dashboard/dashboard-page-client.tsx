'use client';

import Link from 'next/link';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import { DashboardCard, EmptyState, PageHeader, SectionHeader, SkeletonCard, StatCard } from './components/ui';
import { useDashboardSummaryQuery } from './dashboard.queries';
import type { DashboardPeriod, DashboardSummary, DashboardTrendPoint } from './dashboard.types';
import type { Currency } from '@/features/transactions/transactions.types';

const periodLabels: Record<DashboardPeriod, string> = {
  current_month: 'Bu ay',
  last_3_months: 'Son 3 ay',
  last_6_months: 'Son 6 ay',
  last_12_months: 'Son 12 ay',
};

function formatAmount(amount: string, currency: Currency): string {
  const [whole, fraction] = amount.split('.');
  const groupedWhole = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const prefix = amount.startsWith('-') ? '-' : '';
  const normalizedWhole = groupedWhole.replace('-', '');

  return `${prefix}${fraction ? `${normalizedWhole},${fraction}` : normalizedWhole} ${currency}`;
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? (message[0] ?? 'Dashboard yüklenemedi.') : (message ?? 'Dashboard yüklenemedi.');
  }

  return 'Dashboard yüklenemedi. Lütfen tekrar deneyin.';
}

export function DashboardPageClient() {
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [period, setPeriod] = useState<DashboardPeriod>('current_month');
  const summaryQuery = useDashboardSummaryQuery(currency, period);

  return <div className="space-y-8"><PageHeader eyebrow="MoneyPilot overview" title="Finansal görünümünüz" description="Seçtiğiniz para birimi ve dönemdeki finansal durumunuzu tek bakışta takip edin." action={<div className="flex gap-2"><select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} aria-label="Para birimi" className={selectClassName}><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select><select value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)} aria-label="Dönem" className={selectClassName}>{Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>} />
    {summaryQuery.isLoading ? <DashboardSkeleton /> : null}
    {summaryQuery.isError ? <DashboardCard className="p-6"><p className="text-sm font-semibold text-slate-900">Dashboard yüklenemedi</p><p className="mt-1 text-sm text-slate-500">{getErrorMessage(summaryQuery.error)}</p><button type="button" onClick={() => void summaryQuery.refetch()} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">Tekrar dene</button></DashboardCard> : null}
    {summaryQuery.data ? <DashboardContent summary={summaryQuery.data} period={period} /> : null}
  </div>;
}

function DashboardContent({ period, summary }: { period: DashboardPeriod; summary: DashboardSummary }) {
  return <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Toplam bakiye" value={formatAmount(summary.totalBalance, summary.currency)} detail="Tüm zamanlar" tone={summary.totalBalance.startsWith('-') ? 'warning' : 'positive'} /><StatCard label="Dönem geliri" value={formatAmount(summary.periodIncome, summary.currency)} detail={periodLabels[period]} tone="positive" /><StatCard label="Dönem gideri" value={formatAmount(summary.periodExpense, summary.currency)} detail={periodLabels[period]} tone="warning" /><StatCard label="Tasarruf oranı" value={summary.savingsRate === null ? '—' : `%${summary.savingsRate}`} detail={summary.savingsRate === null ? 'Gelir oluşmadı' : periodLabels[period]} tone={summary.savingsRate !== null && Number(summary.savingsRate) >= 0 ? 'positive' : 'warning'} /></section>
    <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]"><DashboardCard className="p-5 sm:p-6"><SectionHeader title="Gelir ve gider trendi" description={`${periodLabels[period]} · ${summary.currency}`} /><div className="mt-5">{summary.trend.some((point) => point.income !== '0' || point.expense !== '0') ? <IncomeExpenseChart points={summary.trend} currency={summary.currency} /> : <EmptyState icon="chart" title="Bu dönemde veri yok" description="Gelir veya gider eklediğinizde trendiniz burada görünecek." />}</div></DashboardCard><DashboardCard className="p-5 sm:p-6"><SectionHeader title="Son işlemler" description="Seçili para birimindeki son kayıtlar" action={<Link href="/dashboard/transactions" className="text-sm font-semibold text-blue-700 hover:text-blue-800">Tümünü gör</Link>} /><div className="mt-5">{summary.recentTransactions.length === 0 ? <EmptyState icon="arrows" title="Henüz işlem yok" description="İlk gelir veya gider kaydınızı ekleyerek başlayın." action={<Link href="/dashboard/transactions" className="text-sm font-semibold text-blue-700">İşlemlere git</Link>} /> : <div className="divide-y divide-slate-100">{summary.recentTransactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900"><span className="mr-2 inline-block size-2.5 rounded-full" style={{ backgroundColor: transaction.category.color ?? '#94a3b8' }} />{transaction.category.name}</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(transaction.occurredAt))}</p></div><p className={`shrink-0 text-sm font-semibold tabular-nums ${transaction.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>{transaction.type === 'INCOME' ? '+' : '-'}{formatAmount(transaction.amount, transaction.currency)}</p></div>)}</div>}</div></DashboardCard></section></>;
}

function IncomeExpenseChart({ currency, points }: { currency: Currency; points: DashboardTrendPoint[] }) {
  const maxValue = Math.max(1, ...points.flatMap((point) => [Number(point.income), Number(point.expense)]));

  return <div><div className="flex h-52 items-end gap-1.5 border-b border-slate-200 pb-1 sm:gap-2">{points.map((point) => <div key={point.period} className="group flex min-w-0 flex-1 items-end justify-center gap-0.5" title={`${point.period}: ${formatAmount(point.income, currency)} gelir, ${formatAmount(point.expense, currency)} gider`}><span className="w-full max-w-3 rounded-t bg-emerald-400/90 transition group-hover:bg-emerald-500" style={{ height: `${Math.max(Number(point.income) > 0 ? 4 : 0, (Number(point.income) / maxValue) * 100)}%` }} /><span className="w-full max-w-3 rounded-t bg-rose-400/90 transition group-hover:bg-rose-500" style={{ height: `${Math.max(Number(point.expense) > 0 ? 4 : 0, (Number(point.expense) / maxValue) * 100)}%` }} /></div>)}</div><div className="mt-3 flex items-center justify-between gap-3"><div className="flex items-center gap-3 text-xs text-slate-500"><span><i className="mr-1 inline-block size-2 rounded-sm bg-emerald-400" />Gelir</span><span><i className="mr-1 inline-block size-2 rounded-sm bg-rose-400" />Gider</span></div><p className="text-xs text-slate-500">Üzerine gelerek değerleri görün</p></div><div className="mt-2 flex justify-between text-[11px] text-slate-400"><span>{formatTrendLabel(points[0]?.period)}</span><span>{formatTrendLabel(points.at(-1)?.period)}</span></div></div>;
}

function formatTrendLabel(period?: string): string { return period ? (period.length === 10 ? period.slice(8, 10) : period.slice(5)) : ''; }
function DashboardSkeleton() { return <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></section><section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]"><SkeletonCard /><SkeletonCard /></section></>; }
const selectClassName = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
