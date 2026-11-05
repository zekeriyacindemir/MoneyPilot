'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { DashboardCard, EmptyState, PageHeader } from '@/features/dashboard/components/ui';
import { BudgetFormModal } from './components/budget-form-modal';
import { useBudgetsQuery, useDeleteBudgetMutation } from './budgets.queries';
import type { Budget, BudgetPeriod } from './budgets.types';

const periodLabels: Record<BudgetPeriod, string> = {
  WEEKLY: 'Haftalık',
  MONTHLY: 'Aylık',
  YEARLY: 'Yıllık',
};
const input =
  'h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--muted-foreground)] outline-none focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--secondary)]';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
const formatAmount = (value: string, currency: string) =>
  `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 4 }).format(Number(value))} ${currency}`;
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeZone: 'Europe/Istanbul' }).format(
    new Date(value),
  );
function errorMessage(error: unknown) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const m = error.response?.data?.message;
    return Array.isArray(m) ? (m[0] ?? 'İşlem tamamlanamadı.') : (m ?? 'İşlem tamamlanamadı.');
  }
  return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
}

export function BudgetsPageClient() {
  const [period, setPeriod] = useState<BudgetPeriod | ''>('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [formBudget, setFormBudget] = useState<Budget | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const budgetsQuery = useBudgetsQuery({
    ...(period ? { period } : {}),
    date: `${selectedDate}T12:00:00.000Z`,
  });
  const remove = useDeleteBudgetMutation();
  const budgets = budgetsQuery.data ?? [];
  async function deleteBudget() {
    if (!deleting) return;
    setActionError(null);
    try {
      await remove.mutateAsync(deleting.id);
      setDeleting(null);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }
  const openNew = () => {
    setFormBudget(undefined);
    setIsFormOpen(true);
  };
  return (
    <div className="space-y-7">
      <PageHeader
        title="Budgets"
        description="Gider limitlerinizi ve gelir hedeflerinizi dönem bazında takip edin."
        action={
          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
          >
            + Yeni bütçe
          </button>
        }
      />
      <DashboardCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            aria-label="Dönem filtresi"
            value={period}
            onChange={(e) => setPeriod(e.target.value as BudgetPeriod | '')}
            className={input}
          >
            <option value="">Tüm dönemler</option>
            <option value="WEEKLY">Haftalık</option>
            <option value="MONTHLY">Aylık</option>
            <option value="YEARLY">Yıllık</option>
          </select>
          <input
            aria-label="Tarih filtresi"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={input}
          />
        </div>
      </DashboardCard>
      {actionError ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]"
        >
          {actionError}
        </p>
      ) : null}
      {budgetsQuery.isLoading ? (
        <DashboardCard className="p-5">
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-16 rounded bg-[var(--muted)]" />
            ))}
          </div>
        </DashboardCard>
      ) : null}
      {budgetsQuery.isError ? (
        <DashboardCard className="p-6">
          <p className="font-semibold text-[var(--foreground)]">Bütçeler yüklenemedi</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {errorMessage(budgetsQuery.error)}
          </p>
          <button
            type="button"
            onClick={() => void budgetsQuery.refetch()}
            className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"
          >
            Tekrar dene
          </button>
        </DashboardCard>
      ) : null}
      {!budgetsQuery.isLoading && !budgetsQuery.isError && budgets.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Bu dönem için bütçe yok"
          description="Bir gelir hedefi veya gider limiti ekleyerek başlayın."
          action={
            <button
              type="button"
              onClick={openNew}
              className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"
            >
              Yeni bütçe ekle
            </button>
          }
        />
      ) : null}
      {budgets.length > 0 ? (
        <BudgetList
          budgets={budgets}
          onEdit={(budget) => {
            setFormBudget(budget);
            setIsFormOpen(true);
          }}
          onDelete={setDeleting}
        />
      ) : null}
      {isFormOpen ? (
        <BudgetFormModal budget={formBudget} onClose={() => setIsFormOpen(false)} />
      ) : null}
      {deleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Bütçe silinsin mi?</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {deleting.category.name} bütçesi silinecek. Bu işlem geri alınamaz.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={remove.isPending}
                onClick={() => setDeleting(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              >
                Vazgeç
              </button>
              <button
                disabled={remove.isPending}
                onClick={() => void deleteBudget()}
                className="rounded-xl bg-[var(--destructive)] px-4 py-2.5 text-sm font-semibold text-[var(--destructive-foreground)] disabled:opacity-60"
              >
                {remove.isPending ? 'Siliniyor…' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BudgetList({
  budgets,
  onEdit,
  onDelete,
}: {
  budgets: Budget[];
  onEdit: (item: Budget) => void;
  onDelete: (item: Budget) => void;
}) {
  return (
    <DashboardCard className="overflow-hidden">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-[var(--border)] bg-[var(--card)] text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3.5">Kategori</th>
              <th className="px-5 py-3.5">Dönem</th>
              <th className="px-5 py-3.5">Limit / hedef</th>
              <th className="px-5 py-3.5">Gerçekleşen</th>
              <th className="px-5 py-3.5">Kalan</th>
              <th className="px-5 py-3.5">İlerleme</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {budgets.map((item) => (
              <tr key={item.id} className="text-sm">
                <td className="px-5 py-4 font-semibold text-[var(--foreground)]">
                  <span
                    className="mr-2 inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: item.category.color ?? '#94a3b8' }}
                  />
                  {item.category.name}
                  <p className="mt-1 text-xs font-medium text-[var(--muted-foreground)]">
                    {item.type === 'INCOME' ? 'Gelir hedefi' : 'Gider limiti'}
                  </p>
                </td>
                <td className="px-5 py-4 text-[var(--muted-foreground)]">
                  {periodLabels[item.period]}
                  <p className="mt-1 text-xs">
                    {formatDate(item.periodStart)} – {formatDate(item.periodEnd)}
                  </p>
                </td>
                <td className="px-5 py-4 font-semibold tabular-nums">
                  {formatAmount(item.amount, item.currency)}
                </td>
                <td className="px-5 py-4 tabular-nums">
                  {formatAmount(item.actualAmount, item.currency)}
                </td>
                <td
                  className={`px-5 py-4 font-semibold tabular-nums ${Number(item.remainingAmount) < 0 ? 'text-[var(--destructive)]' : ''}`}
                >
                  {formatAmount(item.remainingAmount, item.currency)}
                </td>
                <td className="px-5 py-4">
                  <Progress item={item} />
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => onEdit(item)}
                    className="mr-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-[var(--border)] lg:hidden">
        {budgets.map((item) => (
          <article key={item.id} className="p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--foreground)]">{item.category.name}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {periodLabels[item.period]} · {formatDate(item.periodStart)} –{' '}
                  {formatDate(item.periodEnd)}
                </p>
              </div>
              <p className="font-semibold">{formatAmount(item.amount, item.currency)}</p>
            </div>
            <div className="mt-4">
              <Progress item={item} />
            </div>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              Gerçekleşen:{' '}
              <span className="font-semibold text-[var(--foreground)]">
                {formatAmount(item.actualAmount, item.currency)}
              </span>{' '}
              · Kalan:{' '}
              <span className="font-semibold text-[var(--foreground)]">
                {formatAmount(item.remainingAmount, item.currency)}
              </span>
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => onEdit(item)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]"
              >
                Düzenle
              </button>
              <button
                onClick={() => onDelete(item)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
              >
                Sil
              </button>
            </div>
          </article>
        ))}
      </div>
    </DashboardCard>
  );
}
function Progress({ item }: { item: Budget }) {
  const progress = Math.max(0, Number(item.progressPercent));
  const complete = item.type === 'INCOME' ? progress >= 100 : progress > 100;
  const colour = complete
    ? item.type === 'INCOME'
      ? 'bg-[var(--success)]'
      : 'bg-[var(--destructive)]'
    : 'bg-[var(--primary)]';
  const label = complete
    ? item.type === 'INCOME'
      ? 'Hedefe ulaşıldı'
      : 'Limit aşıldı'
    : `%${progress.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
  return (
    <div className="min-w-32">
      <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
        <div
          className={`h-full rounded-full ${colour}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p
        className={`mt-1 text-xs font-semibold ${complete ? (item.type === 'INCOME' ? 'text-[var(--success)]' : 'text-[var(--destructive)]') : 'text-[var(--muted-foreground)]'}`}
      >
        {label}
      </p>
    </div>
  );
}
