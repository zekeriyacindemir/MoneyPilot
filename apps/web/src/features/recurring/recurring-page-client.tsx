'use client';

import { useState } from 'react';
import {
  Button,
  DashboardCard,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from '@/features/dashboard/components/ui';
import { RecurringFormModal } from './components/recurring-form-modal';
import {
  useDeleteRecurringTransactionMutation,
  useRecurringTransactionsQuery,
  useUpdateRecurringTransactionMutation,
} from './recurring.queries';
import type { RecurringTransaction } from './recurring.types';

function formatAmount(rule: RecurringTransaction): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: rule.currency }).format(
    Number(rule.amount),
  );
}

// Calendar dates are YYYY-MM-DD; format them in UTC so the day never shifts.
function formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('tr-TR', { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

function describeSchedule(rule: RecurringTransaction): string {
  if (rule.frequency === 'WEEKLY') {
    return `Her hafta ${formatDate(rule.startDate, { weekday: 'long' })}`;
  }
  if (rule.frequency === 'MONTHLY') {
    const day = Number(rule.startDate.slice(8, 10));
    return day >= 29 ? `Her ay ${day}. gün (kısa aylarda ay sonu)` : `Her ay ${day}. gün`;
  }
  return `Her yıl ${formatDate(rule.startDate, { day: 'numeric', month: 'long' })}`;
}

function status(rule: RecurringTransaction): {
  label: string;
  tone: 'success' | 'neutral' | 'warning';
} {
  if (!rule.isActive) return { label: 'Duraklatıldı', tone: 'warning' };
  if (!rule.nextRunOn) return { label: 'Tamamlandı', tone: 'neutral' };
  return { label: 'Aktif', tone: 'success' };
}

export function RecurringPageClient() {
  const query = useRecurringTransactionsQuery();
  const updateMutation = useUpdateRecurringTransactionMutation();
  const deleteMutation = useDeleteRecurringTransactionMutation();
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const rules = query.data ?? [];

  function openForm(rule: RecurringTransaction | null): void {
    setEditing(rule);
    setIsFormOpen(true);
  }

  async function toggle(rule: RecurringTransaction): Promise<void> {
    setActionError(null);
    try {
      await updateMutation.mutateAsync({ id: rule.id, request: { isActive: !rule.isActive } });
    } catch {
      setActionError('Durum güncellenemedi. Lütfen tekrar deneyin.');
    }
  }

  async function remove(rule: RecurringTransaction): Promise<void> {
    if (
      !window.confirm(
        `"${rule.category.name}" tekrarlayan işlemi silinsin mi? Daha önce oluşturulan işlemler korunur.`,
      )
    )
      return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(rule.id);
    } catch {
      setActionError('Silinemedi. Lütfen tekrar deneyin.');
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Otomatik kayıt"
        title="Tekrarlayan işlemler"
        description="Kira, maaş ve abonelikler gibi düzenli gelir ve giderlerinizi bir kez tanımlayın; zamanı geldiğinde işlemler listenize otomatik eklensin."
        action={<Button onClick={() => openForm(null)}>+ Yeni tekrarlayan işlem</Button>}
      />
      {actionError ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--destructive)] px-4 py-3 text-sm text-[var(--destructive)]"
        >
          {actionError}
        </p>
      ) : null}
      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : query.isError ? (
        <ErrorState
          description="Tekrarlayan işlemler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin."
          onRetry={() => void query.refetch()}
        />
      ) : rules.length === 0 ? (
        <EmptyState
          icon="repeat"
          title="Henüz tekrarlayan işlem yok"
          description="Her ay elle girdiğiniz kira, fatura veya maaş gibi kayıtları otomatikleştirin."
          action={<Button onClick={() => openForm(null)}>İlkini oluştur</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((rule) => {
            const badge = status(rule);
            return (
              <DashboardCard key={rule.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: rule.category.color ?? '#94a3b8' }}
                      />
                      <span className="truncate">{rule.category.name}</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {describeSchedule(rule)}
                    </p>
                  </div>
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                </div>
                <p
                  className={`money-number mt-4 text-2xl font-semibold tabular-nums ${rule.type === 'INCOME' ? 'text-[var(--success)]' : ''}`}
                >
                  {rule.type === 'INCOME' ? '+' : '−'}
                  {formatAmount(rule)}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-[var(--muted-foreground)]">Sonraki işlem</dt>
                    <dd className="mt-0.5 font-medium">
                      {rule.isActive && rule.nextRunOn
                        ? formatDate(rule.nextRunOn, { dateStyle: 'medium' })
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted-foreground)]">Bitiş</dt>
                    <dd className="mt-0.5 font-medium">
                      {rule.endDate ? formatDate(rule.endDate, { dateStyle: 'medium' }) : 'Yok'}
                    </dd>
                  </div>
                </dl>
                {rule.note ? (
                  <p className="mt-3 truncate text-sm text-[var(--muted-foreground)]">
                    {rule.note}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" onClick={() => openForm(rule)}>
                    Düzenle
                  </Button>
                  {rule.nextRunOn || !rule.isActive ? (
                    <Button
                      variant="ghost"
                      disabled={updateMutation.isPending}
                      onClick={() => void toggle(rule)}
                    >
                      {rule.isActive ? 'Duraklat' : 'Devam ettir'}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="text-[var(--destructive)]"
                    disabled={deleteMutation.isPending}
                    onClick={() => void remove(rule)}
                  >
                    Sil
                  </Button>
                </div>
              </DashboardCard>
            );
          })}
        </div>
      )}
      {isFormOpen ? (
        <RecurringFormModal
          key={editing?.id ?? 'new'}
          rule={editing ?? undefined}
          onClose={() => setIsFormOpen(false)}
        />
      ) : null}
    </div>
  );
}
