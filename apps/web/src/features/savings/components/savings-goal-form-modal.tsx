'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import type { Currency } from '@/features/transactions/transactions.types';
import { useCreateSavingsGoalMutation, useUpdateSavingsGoalMutation } from '../savings.queries';
import type { GoalPriority, SavingsGoal, SavingsGoalRequest } from '../savings.types';
import { useAuth } from '@/features/auth/auth-context';

interface Values {
  name: string;
  targetAmount: string;
  currency: Currency;
  priority: GoalPriority;
  targetDate: string;
}
const input =
  'h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--secondary)] disabled:cursor-not-allowed disabled:bg-[var(--muted)]';
const amountPattern = /^(?=.*[1-9])(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;
function initial(goal?: SavingsGoal, defaultCurrency: Currency = 'TRY'): Values {
  return goal
    ? {
        name: goal.name,
        targetAmount: goal.targetAmount,
        currency: goal.currency,
        priority: goal.priority,
        targetDate: goal.targetDate?.slice(0, 10) ?? '',
      }
    : { name: '', targetAmount: '', currency: defaultCurrency, priority: 'MEDIUM', targetDate: '' };
}
function errorMessage(error: unknown) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const value = error.response?.data?.message;
    return Array.isArray(value)
      ? (value[0] ?? 'Hedef kaydedilemedi.')
      : (value ?? 'Hedef kaydedilemedi.');
  }
  return 'Hedef kaydedilemedi. Lütfen tekrar deneyin.';
}
export function SavingsGoalFormModal({
  goal,
  onClose,
}: {
  goal?: SavingsGoal;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [values, setValues] = useState<Values>(() => initial(goal, user?.defaultCurrency));
  const [error, setError] = useState<string | null>(null);
  const create = useCreateSavingsGoalMutation();
  const update = useUpdateSavingsGoalMutation();
  const submitting = create.isPending || update.isPending;
  const set = (next: Partial<Values>) => setValues((current) => ({ ...current, ...next }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const name = values.name.trim();
    const targetAmount = values.targetAmount.trim();
    if (!name) {
      setError('Hedef adı girin.');
      return;
    }
    if (!amountPattern.test(targetAmount)) {
      setError('Hedef tutarı sıfırdan büyük ve en fazla dört ondalıklı olmalıdır.');
      return;
    }
    const request: SavingsGoalRequest = {
      name,
      targetAmount,
      currency: values.currency,
      priority: values.priority,
      ...(values.targetDate ? { targetDate: `${values.targetDate}T12:00:00.000Z` } : {}),
    };
    try {
      if (goal) await update.mutateAsync({ id: goal.id, request });
      else await create.mutateAsync(request);
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="savings-form-title"
        className="w-full max-w-xl rounded-2xl bg-[var(--card)] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="savings-form-title" className="text-lg font-semibold text-[var(--foreground)]">
              {goal ? 'Hedefi düzenle' : 'Yeni birikim hedefi'}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Hedef tutarınızı ve önceliğinizi belirleyin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          >
            Kapat
          </button>
        </div>
        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hedef adı">
              <input
                required
                value={values.name}
                disabled={submitting}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Örn. Acil durum fonu"
                className={input}
              />
            </Field>
            <Field label="Hedef tutarı">
              <input
                required
                inputMode="decimal"
                value={values.targetAmount}
                disabled={submitting}
                onChange={(e) => set({ targetAmount: e.target.value })}
                placeholder="0.00"
                className={input}
              />
            </Field>
            <Field label="Para birimi">
              <select
                value={values.currency}
                disabled={submitting}
                onChange={(e) => set({ currency: e.target.value as Currency })}
                className={input}
              >
                {(['TRY', 'USD', 'EUR', 'GBP'] as Currency[]).map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </Field>
            <Field label="Öncelik">
              <select
                value={values.priority}
                disabled={submitting}
                onChange={(e) => set({ priority: e.target.value as GoalPriority })}
                className={input}
              >
                <option value="LOW">Düşük</option>
                <option value="MEDIUM">Orta</option>
                <option value="HIGH">Yüksek</option>
              </select>
            </Field>
            <Field label="Hedef tarihi (isteğe bağlı)">
              <input
                type="date"
                value={values.targetDate}
                disabled={submitting}
                onChange={(e) => set({ targetDate: e.target.value })}
                className={input}
              />
            </Field>
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2.5 text-sm text-[var(--destructive)]"
            >
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
            >
              {submitting ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-[var(--muted-foreground)]">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
