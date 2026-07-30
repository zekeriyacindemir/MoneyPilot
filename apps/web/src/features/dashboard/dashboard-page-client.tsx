'use client';

import Link from 'next/link';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import {
  DashboardCard,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionHeader,
  SkeletonCard,
  StatCard,
} from './components/ui';
import { Icon } from './components/icons';
import {
  useDashboardSummaryQuery,
  useDailyCoachingQuery,
  useFinancialHealthQuery,
} from './dashboard.queries';
import type {
  DashboardPeriod,
  DashboardSummary,
  DashboardTrendPoint,
  FinancialHealth,
  DailyCoaching,
} from './dashboard.types';
import type { Currency } from '@/features/transactions/transactions.types';

const periodLabels: Record<DashboardPeriod, string> = {
  current_month: 'Bu ay',
  last_3_months: 'Son 3 ay',
  last_6_months: 'Son 6 ay',
  last_12_months: 'Son 12 ay',
};
const selectClassName =
  'h-10 rounded-xl border bg-[var(--card)] px-3 text-sm font-medium text-[var(--foreground)] outline-none focus:ring-4 focus:ring-[var(--secondary)]';
function formatAmount(amount: string, currency: Currency): string {
  const [whole, fraction] = amount.split('.');
  const grouped = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${fraction ? `${grouped},${fraction}` : grouped} ${currency}`;
}
function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message)
      ? (message[0] ?? 'Dashboard yüklenemedi.')
      : (message ?? 'Dashboard yüklenemedi.');
  }
  return 'Dashboard yüklenemedi. Lütfen tekrar deneyin.';
}

export function DashboardPageClient() {
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [period, setPeriod] = useState<DashboardPeriod>('current_month');
  const summaryQuery = useDashboardSummaryQuery(currency, period);
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="MoneyPilot overview"
        title="Finansal görünümünüz"
        description="Seçtiğiniz para birimi ve dönemdeki finansal durumunuzu tek bakışta takip edin."
        action={
          <div className="flex gap-2">
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as Currency)}
              aria-label="Para birimi"
              className={selectClassName}
            >
              {(['TRY', 'USD', 'EUR', 'GBP'] as Currency[]).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}
              aria-label="Dönem"
              className={selectClassName}
            >
              {Object.entries(periodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        }
      />
      {summaryQuery.isLoading ? <DashboardSkeleton /> : null}
      {summaryQuery.isError ? (
        <ErrorState
          title="Dashboard yüklenemedi"
          description={getErrorMessage(summaryQuery.error)}
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : null}
      {summaryQuery.data ? <DashboardContent summary={summaryQuery.data} period={period} /> : null}
    </div>
  );
}

function DashboardContent({
  period,
  summary,
}: {
  period: DashboardPeriod;
  summary: DashboardSummary;
}) {
  const healthQuery = useFinancialHealthQuery(summary.currency);
  const coachingQuery = useDailyCoachingQuery(summary.currency);
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="wallet"
          label="Toplam bakiye"
          value={formatAmount(summary.totalBalance, summary.currency)}
          detail="Tüm zamanlar"
          tone={summary.totalBalance.startsWith('-') ? 'warning' : 'positive'}
        />
        <StatCard
          icon="arrows"
          label="Dönem geliri"
          value={formatAmount(summary.periodIncome, summary.currency)}
          detail={periodLabels[period]}
          tone="positive"
        />
        <StatCard
          icon="chart"
          label="Dönem gideri"
          value={formatAmount(summary.periodExpense, summary.currency)}
          detail={periodLabels[period]}
          tone="warning"
        />
        <StatCard
          icon="target"
          label="Tasarruf oranı"
          value={summary.savingsRate === null ? '—' : `%${summary.savingsRate}`}
          detail={summary.savingsRate === null ? 'Gelir oluşmadı' : periodLabels[period]}
          tone={
            summary.savingsRate !== null && Number(summary.savingsRate) >= 0
              ? 'positive'
              : 'warning'
          }
        />
      </section>
      {healthQuery.isLoading ? <SkeletonCard /> : null}
      {healthQuery.isError ? (
        <ErrorState
          title="Finansal sağlık skoru yüklenemedi"
          description={getErrorMessage(healthQuery.error)}
          onRetry={() => void healthQuery.refetch()}
        />
      ) : null}
      {healthQuery.data ? <FinancialHealthCard health={healthQuery.data} /> : null}
      {coachingQuery.isLoading ? <SkeletonCard /> : null}
      {coachingQuery.isError ? (
        <ErrorState
          title="Günlük koçluk notu yüklenemedi"
          description={getErrorMessage(coachingQuery.error)}
          onRetry={() => void coachingQuery.refetch()}
        />
      ) : null}
      {coachingQuery.data ? <DailyCoachingCard coaching={coachingQuery.data} /> : null}
      <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <DashboardCard className="p-5 sm:p-6">
          <SectionHeader
            title="Gelir ve gider trendi"
            description={`${periodLabels[period]} · ${summary.currency}`}
          />
          <div className="mt-6">
            {summary.trend.some((point) => point.income !== '0' || point.expense !== '0') ? (
              <IncomeExpenseChart points={summary.trend} currency={summary.currency} />
            ) : (
              <EmptyState
                icon="chart"
                title="Bu dönemde veri yok"
                description="Gelir veya gider eklediğinizde trendiniz burada görünecek."
              />
            )}
          </div>
        </DashboardCard>
        <DashboardCard className="p-5 sm:p-6">
          <SectionHeader
            title="Son işlemler"
            description="Seçili para birimindeki son kayıtlar"
            action={
              <Link
                href="/dashboard/transactions"
                className="text-sm font-semibold text-[var(--primary)] hover:underline"
              >
                Tümünü gör
              </Link>
            }
          />
          <div className="mt-5">
            {summary.recentTransactions.length === 0 ? (
              <EmptyState
                icon="arrows"
                title="Henüz işlem yok"
                description="İlk gelir veya gider kaydınızı ekleyerek başlayın."
                action={
                  <Link
                    href="/dashboard/transactions"
                    className="text-sm font-semibold text-[var(--primary)] hover:underline"
                  >
                    İşlemlere git
                  </Link>
                }
              />
            ) : (
              <div className="divide-y">
                {summary.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)]"
                        style={{ color: transaction.category.color ?? 'var(--primary)' }}
                      >
                        <Icon name="wallet" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--card-foreground)]">
                          {transaction.category.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                          {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(
                            new Date(transaction.occurredAt),
                          )}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-semibold tabular-nums ${transaction.type === 'INCOME' ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}`}
                    >
                      {transaction.type === 'INCOME' ? '+' : '-'}
                      {formatAmount(transaction.amount, transaction.currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardCard>
      </section>
    </>
  );
}

function DailyCoachingCard({ coaching }: { coaching: DailyCoaching }) {
  const [isGeneralTipOpen, setIsGeneralTipOpen] = useState(false);
  const { personalInsight, generalTip } = coaching;
  return (
    <DashboardCard className="p-5 sm:p-6">
      <SectionHeader title="Günlük koçluk" description={`${coaching.currency} · Bugünün finans notu`} />
      <div className="mt-5 rounded-xl bg-[var(--muted)]/55 p-4">
        <p className="text-sm font-semibold text-[var(--card-foreground)]">{personalInsight.title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{personalInsight.body}</p>
        <Link
          href={personalInsight.actionHref}
          className="mt-3 inline-block text-sm font-semibold text-[var(--primary)] hover:underline"
        >
          {personalInsight.actionLabel} →
        </Link>
      </div>
      <div className="mt-4 border-t pt-4">
        <button
          type="button"
          onClick={() => setIsGeneralTipOpen((value) => !value)}
          aria-expanded={isGeneralTipOpen}
          className="flex w-full items-center justify-between text-left text-sm font-semibold text-[var(--card-foreground)]"
        >
          Genel günlük tavsiye
          <span aria-hidden="true">{isGeneralTipOpen ? '−' : '+'}</span>
        </button>
        {isGeneralTipOpen ? (
          <div className="mt-3 rounded-xl border p-4">
            <p className="text-sm font-semibold text-[var(--card-foreground)]">{generalTip.title}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{generalTip.body}</p>
            <Link
              href={generalTip.actionHref}
              className="mt-3 inline-block text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              {generalTip.actionLabel} →
            </Link>
          </div>
        ) : null}
      </div>
    </DashboardCard>
  );
}

function FinancialHealthCard({ health }: { health: FinancialHealth }) {
  if (!health.isReady) {
    return (
      <DashboardCard className="p-5 sm:p-6">
        <SectionHeader
          title="Finansal sağlık skoru"
          description={`${health.currency} · Skoru hazırlamak için birkaç adım kaldı`}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {health.recommendations.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border bg-[var(--muted)]/40 p-4 transition hover:bg-[var(--muted)]"
            >
              <p className="text-sm font-semibold text-[var(--card-foreground)]">{item.title}</p>
              <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">
                {item.description}
              </p>
              <span className="mt-3 inline-block text-sm font-semibold text-[var(--primary)]">
                Tamamla →
              </span>
            </Link>
          ))}
        </div>
      </DashboardCard>
    );
  }
  return (
    <DashboardCard className="p-5 sm:p-6">
      <SectionHeader
        title="Finansal sağlık skoru"
        description={`${health.currency} · Bu ayki finansal alışkanlıklarınız`}
      />
      <div className="mt-5 grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="flex size-28 shrink-0 flex-col items-center justify-center rounded-full border-8 border-[var(--secondary)] bg-[var(--muted)]">
          <strong className="text-3xl tracking-tight text-[var(--card-foreground)]">
            {health.score}
          </strong>
          <span className="text-xs font-semibold text-[var(--primary)]">{health.level}</span>
        </div>
        <div className="space-y-4">
          {health.components.map((item) => (
            <div key={item.key}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-semibold text-[var(--card-foreground)]">{item.label}</span>
                <span className="font-semibold tabular-nums text-[var(--primary)]">
                  {item.score}/100
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{ width: `${item.score ?? 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 rounded-xl bg-[var(--muted)]/55 p-4">
        <p className="text-sm font-semibold text-[var(--card-foreground)]">
          En güçlü etken: {health.strongestFactor}
        </p>
        {health.recommendations.map((item) => (
          <p key={item.href} className="mt-1 text-sm text-[var(--muted-foreground)]">
            <Link href={item.href} className="font-semibold text-[var(--primary)] hover:underline">
              {item.title}
            </Link>{' '}
            · {item.description}
          </p>
        ))}
      </div>
    </DashboardCard>
  );
}

function IncomeExpenseChart({
  currency,
  points,
}: {
  currency: Currency;
  points: DashboardTrendPoint[];
}) {
  const [active, setActive] = useState<DashboardTrendPoint | null>(null);
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [Number(point.income), Number(point.expense)]),
  );
  return (
    <div>
      <div
        className="relative flex h-56 items-end gap-1.5 border-b pb-1 sm:gap-2"
        onMouseLeave={() => setActive(null)}
      >
        {points.map((point) => (
          <button
            key={point.period}
            type="button"
            onFocus={() => setActive(point)}
            onMouseEnter={() => setActive(point)}
            className="group flex min-w-0 flex-1 items-end justify-center gap-0.5 rounded-sm focus-visible:outline-offset-2"
            aria-label={`${point.period}: ${formatAmount(point.income, currency)} gelir, ${formatAmount(point.expense, currency)} gider`}
          >
            <span
              className="w-full max-w-3 rounded-t bg-[var(--chart-income)]/85 transition-colors group-hover:bg-[var(--chart-income)]"
              style={{
                height: `${Math.max(Number(point.income) > 0 ? 4 : 0, (Number(point.income) / maxValue) * 100)}%`,
              }}
            />
            <span
              className="w-full max-w-3 rounded-t bg-[var(--chart-expense)]/85 transition-colors group-hover:bg-[var(--chart-expense)]"
              style={{
                height: `${Math.max(Number(point.expense) > 0 ? 4 : 0, (Number(point.expense) / maxValue) * 100)}%`,
              }}
            />
          </button>
        ))}
        {active ? (
          <div
            role="status"
            className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg border bg-[var(--card)] px-3 py-2 text-xs shadow-lg"
          >
            <p className="font-semibold text-[var(--card-foreground)]">{active.period}</p>
            <p className="mt-1 text-[var(--success)]">
              Gelir: {formatAmount(active.income, currency)}
            </p>
            <p className="text-[var(--destructive)]">
              Gider: {formatAmount(active.expense, currency)}
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
        <div className="flex gap-3">
          <span>
            <i className="mr-1 inline-block size-2 rounded-sm bg-[var(--chart-income)]" />
            Gelir
          </span>
          <span>
            <i className="mr-1 inline-block size-2 rounded-sm bg-[var(--chart-expense)]" />
            Gider
          </span>
        </div>
        <p>
          {formatTrendLabel(points[0]?.period)} — {formatTrendLabel(points.at(-1)?.period)}
        </p>
      </div>
    </div>
  );
}

function formatTrendLabel(period?: string): string {
  return period ? (period.length === 10 ? period.slice(8, 10) : period.slice(5)) : '';
}
function DashboardSkeleton() {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <SkeletonCard />
        <SkeletonCard />
      </section>
    </>
  );
}
