'use client';

import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { DashboardCard, EmptyState, PageHeader } from '@/features/dashboard/components/ui';
import { TransactionDeleteDialog } from './components/transaction-delete-dialog';
import { TransactionFormModal } from './components/transaction-form-modal';
import { useCategoriesQuery } from './categories.queries';
import { useDeleteTransactionMutation, useTransactionsQuery } from './transactions.queries';
import type { SortOrder, Transaction, TransactionListParams, TransactionSortBy, TransactionType } from './transactions.types';

const pageSize = 10;
const typeLabels: Record<TransactionType, string> = { INCOME: 'Gelir', EXPENSE: 'Gider' };
const paymentMethodLabels: Record<NonNullable<Transaction['paymentMethod']>, string> = { CASH: 'Nakit', CARD: 'Kart', BANK_TRANSFER: 'Banka transferi', DIGITAL_WALLET: 'Dijital cüzdan', OTHER: 'Diğer' };

function formatAmount(amount: string, currency: Transaction['currency']): string {
  const [whole, fraction] = amount.split('.');
  const groupedWhole = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${fraction ? `${groupedWhole},${fraction}` : groupedWhole} ${currency}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError<{ message?: string | string[] }>(error)) return fallback;
  const message = error.response?.data?.message;
  return Array.isArray(message) ? (message[0] ?? fallback) : (message ?? fallback);
}

export function TransactionsPageClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TransactionType | ''>('');
  const [category, setCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<TransactionSortBy>('occurredAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const hasInvalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const categoriesQuery = useCategoriesQuery(type ? { type } : {});
  const queryParameters = useMemo<TransactionListParams>(() => ({
    page,
    limit: pageSize,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(type ? { type } : {}),
    ...(category ? { category } : {}),
    ...(dateFrom ? { dateFrom: `${dateFrom}T00:00:00.000Z` } : {}),
    ...(dateTo ? { dateTo: `${dateTo}T23:59:59.999Z` } : {}),
    sortBy,
    sortOrder,
  }), [category, dateFrom, dateTo, page, search, sortBy, sortOrder, type]);
  const transactionsQuery = useTransactionsQuery(queryParameters, !hasInvalidDateRange);
  const deleteMutation = useDeleteTransactionMutation();
  const transactions = transactionsQuery.data?.items ?? [];

  function resetPage(): void { setPage(1); }
  function handleTypeFilterChange(nextType: TransactionType | ''): void { setType(nextType); setCategory(''); resetPage(); }
  function openCreateForm(): void { setTransactionToEdit(null); setIsFormOpen(true); }
  function openEditForm(transaction: Transaction): void { setTransactionToEdit(transaction); setIsFormOpen(true); }
  async function handleDelete(): Promise<void> {
    if (!transactionToDelete) return;
    setActionError(null);
    try { await deleteMutation.mutateAsync(transactionToDelete.id); setTransactionToDelete(null); }
    catch (error: unknown) { setActionError(getErrorMessage(error, 'İşlem silinemedi. Lütfen tekrar deneyin.')); }
  }

  return <div className="space-y-7"><PageHeader title="Transactions" description="Gelir ve gider kayıtlarınızı görüntüleyin, filtreleyin ve yönetin." action={<button type="button" onClick={openCreateForm} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">+ Yeni işlem</button>} />
    <DashboardCard className="p-4 sm:p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7"><label className="xl:col-span-2"><span className="sr-only">İşlem ara</span><input value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder="Notlarda ara" className={inputClassName} /></label><label><span className="sr-only">İşlem türü</span><select value={type} onChange={(event) => handleTypeFilterChange(event.target.value as TransactionType | '')} className={inputClassName}><option value="">Tüm türler</option><option value="INCOME">Gelir</option><option value="EXPENSE">Gider</option></select></label><label><span className="sr-only">Kategori</span><select value={category} onChange={(event) => { setCategory(event.target.value); resetPage(); }} disabled={categoriesQuery.isLoading || categoriesQuery.isError} className={inputClassName}><option value="">{categoriesQuery.isLoading ? 'Kategoriler yükleniyor…' : 'Tüm kategoriler'}</option>{categoriesQuery.data?.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isSystem ? '' : ' · Özel'}</option>)}</select></label><label><span className="sr-only">Başlangıç tarihi</span><input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); resetPage(); }} className={inputClassName} /></label><label><span className="sr-only">Bitiş tarihi</span><input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); resetPage(); }} className={inputClassName} /></label><div className="flex gap-2"><select value={sortBy} onChange={(event) => { setSortBy(event.target.value as TransactionSortBy); resetPage(); }} aria-label="Sıralama alanı" className={inputClassName}><option value="occurredAt">İşlem tarihi</option><option value="amount">Tutar</option><option value="createdAt">Oluşturma</option><option value="updatedAt">Güncelleme</option></select><button type="button" onClick={() => { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); resetPage(); }} aria-label="Sıralama yönünü değiştir" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">{sortOrder === 'asc' ? 'Artan' : 'Azalan'}</button></div></div>{hasInvalidDateRange ? <p role="alert" className="mt-3 text-sm font-medium text-rose-700">Başlangıç tarihi bitiş tarihinden sonra olamaz. Bu filtre API’ye gönderilmedi.</p> : null}{categoriesQuery.isError ? <p role="alert" className="mt-3 text-sm font-medium text-rose-700">Kategori filtresi yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.</p> : null}</DashboardCard>
    {actionError ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{actionError}</div> : null}
    {transactionsQuery.isLoading ? <TransactionListSkeleton /> : null}
    {transactionsQuery.isError ? <DashboardCard className="p-6"><p className="text-sm font-semibold text-slate-900">İşlemler yüklenemedi</p><p className="mt-1 text-sm text-slate-500">{getErrorMessage(transactionsQuery.error, 'Bağlantınızı kontrol edip tekrar deneyin.')}</p><button type="button" onClick={() => void transactionsQuery.refetch()} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">Tekrar dene</button></DashboardCard> : null}
    {!transactionsQuery.isLoading && !transactionsQuery.isError && transactions.length === 0 ? <EmptyState icon="arrows" title="Henüz işlem yok" description="Yeni gelir veya gider işleminizi ekleyerek başlayın." action={<button type="button" onClick={openCreateForm} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">Yeni işlem ekle</button>} /> : null}
    {!transactionsQuery.isLoading && !transactionsQuery.isError && transactions.length > 0 ? <><TransactionList transactions={transactions} onDelete={setTransactionToDelete} onEdit={openEditForm} />{transactionsQuery.data ? <Pagination page={transactionsQuery.data.page} totalPages={transactionsQuery.data.totalPages} total={transactionsQuery.data.total} onPageChange={setPage} /> : null}</> : null}
    <TransactionDeleteDialog transaction={transactionToDelete} isDeleting={deleteMutation.isPending} onCancel={() => { if (!deleteMutation.isPending) setTransactionToDelete(null); }} onConfirm={() => void handleDelete()} />
    {isFormOpen ? <TransactionFormModal key={transactionToEdit?.id ?? 'new'} transaction={transactionToEdit ?? undefined} onClose={() => setIsFormOpen(false)} /> : null}
  </div>;
}

function TransactionList({ onDelete, onEdit, transactions }: { onDelete: (transaction: Transaction) => void; onEdit: (transaction: Transaction) => void; transactions: Transaction[] }) { return <DashboardCard className="overflow-hidden"><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1000px] text-left"><thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3.5">Kategori</th><th className="px-5 py-3.5">Tür</th><th className="px-5 py-3.5">Tutar</th><th className="px-5 py-3.5">Ödeme</th><th className="px-5 py-3.5">Not</th><th className="px-5 py-3.5">Tarih</th><th className="px-5 py-3.5 text-right">İşlemler</th></tr></thead><tbody className="divide-y divide-slate-100">{transactions.map((transaction) => <TransactionTableRow key={transaction.id} transaction={transaction} onDelete={onDelete} onEdit={onEdit} />)}</tbody></table></div><div className="divide-y divide-slate-100 lg:hidden">{transactions.map((transaction) => <TransactionMobileCard key={transaction.id} transaction={transaction} onDelete={onDelete} onEdit={onEdit} />)}</div></DashboardCard>; }
function TransactionTableRow({ onDelete, onEdit, transaction }: { onDelete: (transaction: Transaction) => void; onEdit: (transaction: Transaction) => void; transaction: Transaction }) { return <tr className="text-sm text-slate-600"><td className="px-5 py-4 font-medium text-slate-900"><span className="mr-2 inline-block size-2.5 rounded-full" style={{ backgroundColor: transaction.category.color ?? '#94a3b8' }} />{transaction.category.name}</td><td className="px-5 py-4"><TypeBadge type={transaction.type} /></td><td className="px-5 py-4 font-semibold tabular-nums text-slate-900">{formatAmount(transaction.amount, transaction.currency)}</td><td className="px-5 py-4">{transaction.paymentMethod ? paymentMethodLabels[transaction.paymentMethod] : '—'}</td><td className="max-w-56 truncate px-5 py-4" title={transaction.note ?? undefined}>{transaction.note || '—'}</td><td className="whitespace-nowrap px-5 py-4">{formatDate(transaction.occurredAt)}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => onEdit(transaction)} className="mr-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50">Düzenle</button><button type="button" onClick={() => onDelete(transaction)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">Sil</button></td></tr>; }
function TransactionMobileCard({ onDelete, onEdit, transaction }: { onDelete: (transaction: Transaction) => void; onEdit: (transaction: Transaction) => void; transaction: Transaction }) { return <article className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900"><span className="mr-2 inline-block size-2.5 rounded-full" style={{ backgroundColor: transaction.category.color ?? '#94a3b8' }} />{transaction.category.name}</p><p className="mt-1 text-xs text-slate-500">{formatDate(transaction.occurredAt)}</p></div><p className="font-semibold tabular-nums text-slate-950">{formatAmount(transaction.amount, transaction.currency)}</p></div><div className="mt-3 flex flex-wrap gap-2 text-xs"><TypeBadge type={transaction.type} /><span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{transaction.paymentMethod ? paymentMethodLabels[transaction.paymentMethod] : 'Ödeme yöntemi yok'}</span></div>{transaction.note ? <p className="mt-3 text-sm text-slate-600">{transaction.note}</p> : null}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => onEdit(transaction)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50">Düzenle</button><button type="button" onClick={() => onDelete(transaction)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">Sil</button></div></article>; }
function TypeBadge({ type }: { type: TransactionType }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{typeLabels[type]}</span>; }
function Pagination({ onPageChange, page, total, totalPages }: { onPageChange: (page: number) => void; page: number; total: number; totalPages: number }) { return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Toplam {total} işlem · Sayfa {page}/{totalPages || 1}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45">Önceki</button><button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45">Sonraki</button></div></div>; }
function TransactionListSkeleton() { return <DashboardCard className="p-5"><div className="space-y-4 animate-pulse">{Array.from({ length: 6 }, (_, index) => <div key={index} className="flex items-center justify-between gap-6 border-b border-slate-100 pb-4 last:border-0"><div className="h-5 w-36 rounded bg-slate-100" /><div className="h-5 w-24 rounded bg-slate-100" /><div className="h-5 w-20 rounded bg-slate-100" /></div>)}</div></DashboardCard>; }
const inputClassName = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50';
