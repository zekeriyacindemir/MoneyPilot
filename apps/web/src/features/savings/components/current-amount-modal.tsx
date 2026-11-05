'use client';
import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { useUpdateSavingsGoalAmountMutation } from '../savings.queries';
import type { SavingsGoal } from '../savings.types';
const pattern = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;
function message(error: unknown) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const item = error.response?.data?.message;
    return Array.isArray(item)
      ? (item[0] ?? 'Birikim güncellenemedi.')
      : (item ?? 'Birikim güncellenemedi.');
  }
  return 'Birikim güncellenemedi. Lütfen tekrar deneyin.';
}
export function CurrentAmountModal({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const [amount, setAmount] = useState(goal.currentAmount);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateSavingsGoalAmountMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentAmount = amount.trim();
    setError(null);
    if (!pattern.test(currentAmount)) {
      setError('Birikim tutarı sıfır veya pozitif ve en fazla dört ondalıklı olmalıdır.');
      return;
    }
    try {
      await update.mutateAsync({ id: goal.id, currentAmount });
      onClose();
    } catch (reason) {
      setError(message(reason));
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="amount-title"
        className="w-full max-w-md rounded-2xl bg-[var(--card)] p-5 shadow-2xl sm:p-6"
      >
        <h2 id="amount-title" className="text-lg font-semibold text-[var(--foreground)]">
          Birimi güncelle
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {goal.name} için mevcut toplam birikimi girin.
        </p>
        <form onSubmit={(event) => void submit(event)} className="mt-6">
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">
            <span className="mb-1.5 block">Mevcut birikim ({goal.currency})</span>
            <input
              autoFocus
              required
              inputMode="decimal"
              value={amount}
              disabled={update.isPending}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--secondary)]"
            />
          </label>
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2.5 text-sm text-[var(--destructive)]"
            >
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={update.isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={update.isPending}
              className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
            >
              {update.isPending ? 'Güncelleniyor…' : 'Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
