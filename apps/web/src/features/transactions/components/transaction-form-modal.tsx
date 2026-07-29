'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { useCategoriesQuery } from '../categories.queries';
import { useCreateTransactionMutation, useUpdateTransactionMutation } from '../transactions.queries';
import type { Currency, PaymentMethod, Transaction, TransactionType, UpdateTransactionRequest } from '../transactions.types';

interface FormValues {
  amount: string;
  categoryId: string;
  currency: Currency;
  note: string;
  occurredAt: string;
  paymentMethod: PaymentMethod | '';
  type: TransactionType;
}

interface TransactionFormModalProperties {
  onClose: () => void;
  transaction?: Transaction;
}

const paymentMethods: { label: string; value: PaymentMethod }[] = [
  { value: 'CASH', label: 'Nakit' },
  { value: 'CARD', label: 'Kart' },
  { value: 'BANK_TRANSFER', label: 'Banka transferi' },
  { value: 'DIGITAL_WALLET', label: 'Dijital cüzdan' },
  { value: 'OTHER', label: 'Diğer' },
];

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function getInitialValues(transaction?: Transaction): FormValues {
  if (transaction) {
    return {
      amount: transaction.amount,
      categoryId: transaction.categoryId,
      currency: transaction.currency,
      note: transaction.note ?? '',
      occurredAt: toDateTimeLocal(transaction.occurredAt),
      paymentMethod: transaction.paymentMethod ?? '',
      type: transaction.type,
    };
  }

  return {
    amount: '',
    categoryId: '',
    currency: 'TRY',
    note: '',
    occurredAt: toDateTimeLocal(new Date().toISOString()),
    paymentMethod: '',
    type: 'EXPENSE',
  };
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;

    return Array.isArray(message) ? (message[0] ?? 'İşlem kaydedilemedi.') : (message ?? 'İşlem kaydedilemedi.');
  }

  return 'İşlem kaydedilemedi. Lütfen tekrar deneyin.';
}

export function TransactionFormModal({ onClose, transaction }: TransactionFormModalProperties) {
  const initialValues = getInitialValues(transaction);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [formError, setFormError] = useState<string | null>(null);
  const categoriesQuery = useCategoriesQuery({ type: values.type });
  const createMutation = useCreateTransactionMutation();
  const updateMutation = useUpdateTransactionMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isEdit = Boolean(transaction);

  function updateValues(nextValues: Partial<FormValues>): void {
    setValues((currentValues) => ({ ...currentValues, ...nextValues }));
  }

  function handleTypeChange(type: TransactionType): void {
    updateValues({ type, categoryId: '' });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    const amount = values.amount.trim();

    if (!/^(?=.*[1-9])(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/.test(amount)) {
      setFormError('Tutar sıfırdan büyük, en fazla dört ondalıklı geçerli bir değer olmalıdır.');
      return;
    }

    if (!values.categoryId) {
      setFormError('Bir kategori seçin.');
      return;
    }

    const occurredAt = new Date(values.occurredAt);

    if (Number.isNaN(occurredAt.getTime())) {
      setFormError('Geçerli bir tarih ve saat girin.');
      return;
    }

    try {
      if (transaction) {
        const request = createUpdateRequest(transaction, values, amount, occurredAt.toISOString());

        if (Object.keys(request).length > 0) {
          await updateMutation.mutateAsync({ id: transaction.id, request });
        }
      } else {
        await createMutation.mutateAsync({
          categoryId: values.categoryId,
          type: values.type,
          amount,
          currency: values.currency,
          ...(values.paymentMethod ? { paymentMethod: values.paymentMethod } : {}),
          ...(values.note.trim() ? { note: values.note.trim() } : {}),
          occurredAt: occurredAt.toISOString(),
        });
      }

      onClose();
    } catch (error: unknown) {
      setFormError(getErrorMessage(error));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="transaction-form-title" className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl shadow-slate-950/20 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="transaction-form-title" className="text-lg font-semibold text-slate-950">{isEdit ? 'İşlemi düzenle' : 'Yeni işlem'}</h2>
            <p className="mt-1 text-sm text-slate-500">Gelir veya gider kaydınızın ayrıntılarını girin.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50">Kapat</button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="İşlem türü"><select value={values.type} onChange={(event) => handleTypeChange(event.target.value as TransactionType)} disabled={isSubmitting} className={inputClassName}><option value="EXPENSE">Gider</option><option value="INCOME">Gelir</option></select></Field>
            <Field label="Kategori"><select value={values.categoryId} onChange={(event) => updateValues({ categoryId: event.target.value })} disabled={isSubmitting || categoriesQuery.isLoading || categoriesQuery.isError} className={inputClassName}><option value="">{categoriesQuery.isLoading ? 'Kategoriler yükleniyor…' : 'Kategori seçin'}</option>{categoriesQuery.data?.map((category) => <option key={category.id} value={category.id}>{category.name}{category.isSystem ? '' : ' · Özel'}</option>)}</select>{categoriesQuery.isError ? <p className="mt-1.5 text-xs font-medium text-rose-700">Kategoriler yüklenemedi. Form verileriniz korunuyor; tekrar deneyin.</p> : null}</Field>
            <Field label="Tutar"><input required inputMode="decimal" value={values.amount} onChange={(event) => updateValues({ amount: event.target.value })} placeholder="0.00" disabled={isSubmitting} className={inputClassName} /></Field>
            <Field label="Para birimi"><select value={values.currency} onChange={(event) => updateValues({ currency: event.target.value as Currency })} disabled={isSubmitting} className={inputClassName}><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></Field>
            <Field label="Ödeme yöntemi"><select value={values.paymentMethod} onChange={(event) => updateValues({ paymentMethod: event.target.value as PaymentMethod | '' })} disabled={isSubmitting} className={inputClassName}><option value="">Belirtilmedi</option>{paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></Field>
            <Field label="Tarih"><input required type="datetime-local" value={values.occurredAt} onChange={(event) => updateValues({ occurredAt: event.target.value })} disabled={isSubmitting} className={inputClassName} /></Field>
          </div>
          <Field label="Not"><textarea value={values.note} onChange={(event) => updateValues({ note: event.target.value })} maxLength={500} disabled={isSubmitting} rows={3} className={`${inputClassName} h-auto py-2.5`} placeholder="İsteğe bağlı not" /></Field>
          {formError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-800">{formError}</p> : null}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">Vazgeç</button><button type="submit" disabled={isSubmitting || categoriesQuery.isLoading || categoriesQuery.isError} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Kaydediliyor…' : isEdit ? 'Değişiklikleri kaydet' : 'İşlemi kaydet'}</button></div>
        </form>
      </div>
    </div>
  );
}

function createUpdateRequest(transaction: Transaction, values: FormValues, amount: string, occurredAt: string): UpdateTransactionRequest {
  const request: UpdateTransactionRequest = {};

  if (values.categoryId !== transaction.categoryId) request.categoryId = values.categoryId;
  if (values.type !== transaction.type) request.type = values.type;
  if (amount !== transaction.amount) request.amount = amount;
  if (values.currency !== transaction.currency) request.currency = values.currency;
  if (values.paymentMethod && values.paymentMethod !== transaction.paymentMethod) request.paymentMethod = values.paymentMethod;
  if (values.note.trim() && values.note.trim() !== transaction.note) request.note = values.note.trim();
  if (new Date(occurredAt).getTime() !== new Date(transaction.occurredAt).getTime()) request.occurredAt = occurredAt;

  return request;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className="block text-sm font-medium text-slate-700"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

const inputClassName = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
