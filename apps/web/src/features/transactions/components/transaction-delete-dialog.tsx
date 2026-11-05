'use client';

import type { Transaction } from '../transactions.types';

interface TransactionDeleteDialogProperties {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  transaction: Transaction | null;
}

export function TransactionDeleteDialog({
  isDeleting,
  onCancel,
  onConfirm,
  transaction,
}: TransactionDeleteDialogProperties) {
  if (!transaction) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-transaction-title"
        className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-2xl shadow-slate-950/20"
      >
        <h2
          id="delete-transaction-title"
          className="text-lg font-semibold text-[var(--foreground)]"
        >
          İşlemi sil
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">{transaction.category.name}</span>{' '}
          kategorisindeki işlemi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] disabled:opacity-50"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className="rounded-xl bg-[var(--destructive)] px-4 py-2.5 text-sm font-semibold text-[var(--destructive-foreground)] transition hover:bg-[var(--destructive)]/90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Siliniyor…' : 'İşlemi sil'}
          </button>
        </div>
      </div>
    </div>
  );
}
