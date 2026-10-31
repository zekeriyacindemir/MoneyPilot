'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '@/features/auth/auth-context';
import { useCategoriesQuery } from '@/features/transactions/categories.queries';
import type {
  Currency,
  PaymentMethod,
  TransactionType,
} from '@/features/transactions/transactions.types';
import {
  useCreateRecurringTransactionMutation,
  useUpdateRecurringTransactionMutation,
} from '../recurring.queries';
import type {
  RecurrenceFrequency,
  RecurringTransaction,
  UpdateRecurringTransactionRequest,
} from '../recurring.types';

interface FormValues {
  amount: string;
  categoryId: string;
  currency: Currency;
  endDate: string;
  frequency: RecurrenceFrequency;
  note: string;
  paymentMethod: PaymentMethod | '';
  startDate: string;
  type: TransactionType;
}

const AMOUNT_PATTERN = /^(?=.*[1-9])(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;
const paymentMethods: { label: string; value: PaymentMethod }[] = [
  { value: 'CASH', label: 'Nakit' },
  { value: 'CARD', label: 'Kart' },
  { value: 'BANK_TRANSFER', label: 'Banka transferi' },
  { value: 'DIGITAL_WALLET', label: 'Dijital cüzdan' },
  { value: 'OTHER', label: 'Diğer' },
];
const frequencyLabels: Record<RecurrenceFrequency, string> = {
  WEEKLY: 'Haftalık',
  MONTHLY: 'Aylık',
  YEARLY: 'Yıllık',
};

/** Today's calendar date in Istanbul as YYYY-MM-DD, matching the API's scheduling clock. */
function istanbulToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}

function addYears(date: string, years: number): string {
  const [year, rest] = [Number(date.slice(0, 4)), date.slice(4)];
  return `${year + years}${rest}`;
}

function getInitialValues(rule: RecurringTransaction | undefined, currency: Currency): FormValues {
  if (rule) {
    return {
      amount: rule.amount,
      categoryId: rule.categoryId,
      currency: rule.currency,
      endDate: rule.endDate ?? '',
      frequency: rule.frequency,
      note: rule.note ?? '',
      paymentMethod: rule.paymentMethod ?? '',
      startDate: rule.startDate,
      type: rule.type,
    };
  }
  return {
    amount: '',
    categoryId: '',
    currency,
    endDate: '',
    frequency: 'MONTHLY',
    note: '',
    paymentMethod: '',
    startDate: istanbulToday(),
    type: 'EXPENSE',
  };
}

function getErrorMessage(error: unknown): string {
  if (!isAxiosError<{ message?: string | string[] }>(error)) {
    return 'Kaydedilemedi. Lütfen tekrar deneyin.';
  }
  const raw = error.response?.data?.message;
  const message = (Array.isArray(raw) ? raw[0] : raw) ?? '';
  const known: [string, string][] = [
    ['one year in the past', 'Başlangıç tarihi en fazla bir yıl öncesi olabilir.'],
    ['five years in the future', 'Başlangıç tarihi en fazla beş yıl sonrası olabilir.'],
    ['endDate cannot be before', 'Bitiş tarihi başlangıç tarihinden önce olamaz.'],
    ['must start today or later', 'Yeni bir plan bugün veya sonraki bir tarihte başlamalıdır.'],
    ['at most', 'Tekrarlayan işlem sınırına ulaştınız.'],
    ['must match the category type', 'Kategori, işlem türüyle uyumlu olmalıdır.'],
  ];
  const match = known.find(([needle]) => message.includes(needle));
  if (match) return match[1];
  if (error.response?.status === 404) return 'Kayıt bulunamadı. Sayfayı yenileyip tekrar deneyin.';
  return 'Kaydedilemedi. Lütfen alanları kontrol edin.';
}

export function RecurringFormModal({
  onClose,
  rule,
}: {
  onClose: () => void;
  rule?: RecurringTransaction;
}) {
  const { user } = useAuth();
  const [values, setValues] = useState<FormValues>(() =>
    getInitialValues(rule, user?.defaultCurrency ?? 'TRY'),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const categoriesQuery = useCategoriesQuery({ type: values.type });
  const createMutation = useCreateRecurringTransactionMutation();
  const updateMutation = useUpdateRecurringTransactionMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const today = istanbulToday();
  const scheduleChanged = Boolean(
    rule && (values.startDate !== rule.startDate || values.frequency !== rule.frequency),
  );

  function update(next: Partial<FormValues>): void {
    setValues((current) => ({ ...current, ...next }));
  }

  function validate(): string | null {
    if (!AMOUNT_PATTERN.test(values.amount.trim())) {
      return 'Tutar sıfırdan büyük, en fazla dört ondalıklı geçerli bir değer olmalıdır.';
    }
    if (!values.categoryId) return 'Bir kategori seçin.';
    if (!values.startDate) return 'Bir başlangıç tarihi seçin.';
    if (values.endDate && values.endDate < values.startDate) {
      return 'Bitiş tarihi başlangıç tarihinden önce olamaz.';
    }
    if (!rule && values.startDate < addYears(today, -1)) {
      return 'Başlangıç tarihi en fazla bir yıl öncesi olabilir.';
    }
    if (scheduleChanged && values.startDate < today) {
      return 'Sıklık veya başlangıç tarihi değişikliği bugünden itibaren uygulanır; bugün veya sonraki bir tarih seçin.';
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const validationError = validate();
    setFormError(validationError);
    if (validationError) return;

    const amount = values.amount.trim();
    const note = values.note.trim();
    try {
      if (rule) {
        const request: UpdateRecurringTransactionRequest = {};
        if (values.categoryId !== rule.categoryId) request.categoryId = values.categoryId;
        if (amount !== rule.amount) request.amount = amount;
        if (values.currency !== rule.currency) request.currency = values.currency;
        if (values.paymentMethod && values.paymentMethod !== rule.paymentMethod)
          request.paymentMethod = values.paymentMethod;
        if (note && note !== rule.note) request.note = note;
        if (scheduleChanged) {
          request.startDate = values.startDate;
          request.frequency = values.frequency;
        }
        if ((values.endDate || null) !== rule.endDate) request.endDate = values.endDate || null;
        if (Object.keys(request).length > 0) {
          await updateMutation.mutateAsync({ id: rule.id, request });
        }
      } else {
        await createMutation.mutateAsync({
          categoryId: values.categoryId,
          type: values.type,
          amount,
          currency: values.currency,
          frequency: values.frequency,
          startDate: values.startDate,
          ...(values.endDate ? { endDate: values.endDate } : {}),
          ...(values.paymentMethod ? { paymentMethod: values.paymentMethod } : {}),
          ...(note ? { note } : {}),
        });
      }
      onClose();
    } catch (error: unknown) {
      setFormError(getErrorMessage(error));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-4 sm:items-center sm:justify-center"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-form-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="recurring-form-title" className="text-lg font-semibold">
              {rule ? 'Tekrarlayan işlemi düzenle' : 'Yeni tekrarlayan işlem'}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {rule
                ? 'Değişiklikler yalnızca bundan sonraki işlemlere uygulanır.'
                : 'Zamanı gelen işlemler İşlemler listenize otomatik olarak eklenir.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
          >
            Kapat
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="İşlem türü">
              <select
                value={values.type}
                onChange={(event) =>
                  update({ type: event.target.value as TransactionType, categoryId: '' })
                }
                disabled={isSubmitting || Boolean(rule)}
                className={inputClassName}
              >
                <option value="EXPENSE">Gider</option>
                <option value="INCOME">Gelir</option>
              </select>
            </Field>
            <Field label="Kategori">
              <select
                value={values.categoryId}
                onChange={(event) => update({ categoryId: event.target.value })}
                disabled={isSubmitting || categoriesQuery.isLoading || categoriesQuery.isError}
                className={inputClassName}
              >
                <option value="">
                  {categoriesQuery.isLoading ? 'Kategoriler yükleniyor…' : 'Kategori seçin'}
                </option>
                {categoriesQuery.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.isSystem ? '' : ' · Özel'}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tutar">
              <input
                required
                inputMode="decimal"
                value={values.amount}
                onChange={(event) => update({ amount: event.target.value })}
                placeholder="0.00"
                disabled={isSubmitting}
                className={inputClassName}
              />
            </Field>
            <Field label="Para birimi">
              <select
                value={values.currency}
                onChange={(event) => update({ currency: event.target.value as Currency })}
                disabled={isSubmitting}
                className={inputClassName}
              >
                {(['TRY', 'USD', 'EUR', 'GBP'] as Currency[]).map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </Field>
            <Field label="Sıklık">
              <select
                value={values.frequency}
                onChange={(event) =>
                  update({ frequency: event.target.value as RecurrenceFrequency })
                }
                disabled={isSubmitting}
                className={inputClassName}
              >
                {(Object.keys(frequencyLabels) as RecurrenceFrequency[]).map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequencyLabels[frequency]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ödeme yöntemi">
              <select
                value={values.paymentMethod}
                onChange={(event) =>
                  update({ paymentMethod: event.target.value as PaymentMethod | '' })
                }
                disabled={isSubmitting}
                className={inputClassName}
              >
                <option value="">Belirtilmedi</option>
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={rule ? 'Plan başlangıcı' : 'İlk işlem tarihi'}>
              <input
                required
                type="date"
                value={values.startDate}
                onChange={(event) => update({ startDate: event.target.value })}
                disabled={isSubmitting}
                className={inputClassName}
              />
            </Field>
            <Field label="Bitiş tarihi (isteğe bağlı)">
              <input
                type="date"
                value={values.endDate}
                min={values.startDate}
                onChange={(event) => update({ endDate: event.target.value })}
                disabled={isSubmitting}
                className={inputClassName}
              />
            </Field>
          </div>
          {!rule && values.startDate && values.startDate < today ? (
            <p className="rounded-xl bg-[var(--muted)] px-3 py-2.5 text-sm text-[var(--muted-foreground)]">
              Başlangıç tarihi geçmişte: bugüne kadar olan işlemler kaydedildiğinde hemen
              oluşturulacak.
            </p>
          ) : null}
          <Field label="Not">
            <textarea
              value={values.note}
              onChange={(event) => update({ note: event.target.value })}
              maxLength={500}
              disabled={isSubmitting}
              rows={2}
              className={`${inputClassName} h-auto py-2.5`}
              placeholder="İsteğe bağlı not, örn. Ev kirası"
            />
          </Field>
          {formError ? (
            <p
              role="alert"
              className="rounded-xl border border-[var(--destructive)] px-3 py-2.5 text-sm font-medium text-[var(--destructive)]"
            >
              {formError}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting || categoriesQuery.isLoading || categoriesQuery.isError}
              className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Kaydediliyor…' : rule ? 'Değişiklikleri kaydet' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block text-sm font-medium">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  'h-11 w-full rounded-xl border bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-60';
