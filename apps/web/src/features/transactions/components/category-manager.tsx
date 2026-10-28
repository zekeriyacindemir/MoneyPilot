'use client';

import { type FormEvent, useState } from 'react';
import { isAxiosError } from 'axios';
import { DashboardCard, SectionHeader } from '@/features/dashboard/components/ui';
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
} from '../categories.queries';
import type { Category, TransactionType } from '../transactions.types';

const NAME_MAX_LENGTH = 50;
const DEFAULT_COLOR = '#22C55E';
const palette = [
  DEFAULT_COLOR,
  '#14B8A6',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#84CC16',
  '#64748B',
];
const tabs: { value: TransactionType; label: string }[] = [
  { value: 'EXPENSE', label: 'Gider' },
  { value: 'INCOME', label: 'Gelir' },
];
const input =
  'h-10 w-full rounded-xl border bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--secondary)]';

function categoryErrorMessage(error: unknown): string {
  if (!isAxiosError<{ transactionCount?: number; budgetCount?: number }>(error)) {
    return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
  }
  const status = error.response?.status;
  const { transactionCount = 0, budgetCount = 0 } = error.response?.data ?? {};

  if (status === 409 && (transactionCount > 0 || budgetCount > 0)) {
    const usages = [
      transactionCount > 0 ? `${transactionCount} işlem` : null,
      budgetCount > 0 ? `${budgetCount} bütçe` : null,
    ].filter(Boolean);
    return `Bu kategori ${usages.join(' ve ')} tarafından kullanılıyor. Silmeden önce bu kayıtları başka bir kategoriye taşıyın.`;
  }
  if (status === 409) return 'Bu türde aynı isimli bir kategori zaten var.';
  if (status === 400) return 'Kategori bilgileri geçersiz veya kategori sınırına ulaştınız.';
  if (status === 403) return 'Sistem kategorileri değiştirilemez.';
  if (status === 404) return 'Kategori bulunamadı. Sayfayı yenileyip tekrar deneyin.';
  return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
}

export function CategoryManager() {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [editing, setEditing] = useState<{ id: string; name: string; color: string } | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const categories = useCategoriesQuery({ type });
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();

  const custom = categories.data?.filter((category) => !category.isSystem) ?? [];
  const system = categories.data?.filter((category) => category.isSystem) ?? [];

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      await createMutation.mutateAsync({ name: name.trim(), type, color });
      setName('');
      setMessage({ tone: 'success', text: 'Kategori eklendi.' });
    } catch (error) {
      setMessage({ tone: 'error', text: categoryErrorMessage(error) });
    }
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setMessage(null);
    try {
      await updateMutation.mutateAsync({
        id: editing.id,
        request: { name: editing.name.trim(), color: editing.color },
      });
      setEditing(null);
      setMessage({ tone: 'success', text: 'Kategori güncellendi.' });
    } catch (error) {
      setMessage({ tone: 'error', text: categoryErrorMessage(error) });
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`"${category.name}" kategorisi silinsin mi?`)) return;
    setMessage(null);
    try {
      await deleteMutation.mutateAsync(category.id);
      setMessage({ tone: 'success', text: 'Kategori silindi.' });
    } catch (error) {
      setMessage({ tone: 'error', text: categoryErrorMessage(error) });
    }
  }

  function switchType(next: TransactionType) {
    setType(next);
    setEditing(null);
    setMessage(null);
  }

  return (
    <DashboardCard className="p-5 sm:p-6">
      <SectionHeader
        title="Kategoriler"
        description="Kendi gelir ve gider kategorilerinizi oluşturun. Kategori türü sonradan değiştirilemez."
      />
      <div role="tablist" aria-label="Kategori türü" className="mt-5 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={type === tab.value}
            onClick={() => switchType(tab.value)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium ${type === tab.value ? 'border-[var(--primary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]' : 'text-[var(--muted-foreground)]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={(event) => void submitCreate(event)} className="mt-5 space-y-3">
        <label className="block text-sm font-medium">
          <span>Yeni {type === 'EXPENSE' ? 'gider' : 'gelir'} kategorisi</span>
          <div className="mt-1.5 flex gap-2">
            <input
              required
              maxLength={NAME_MAX_LENGTH}
              value={name}
              placeholder={type === 'EXPENSE' ? 'Örn. Evcil hayvan' : 'Örn. Serbest çalışma'}
              onChange={(event) => setName(event.target.value)}
              className={input}
            />
            <button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="shrink-0 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
            >
              {createMutation.isPending ? 'Ekleniyor…' : 'Ekle'}
            </button>
          </div>
        </label>
        <ColorPicker value={color} onChange={setColor} label="Yeni kategori rengi" />
      </form>

      {message ? (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-xl border px-3 py-2 text-sm ${message.tone === 'error' ? 'border-[var(--destructive)] text-[var(--destructive)]' : 'text-[var(--muted-foreground)]'}`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          Kategorileriniz
        </p>
        {categories.isLoading ? (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Yükleniyor…</p>
        ) : categories.isError ? (
          <p className="mt-3 text-sm text-[var(--destructive)]">
            Kategoriler yüklenemedi.{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => void categories.refetch()}
            >
              Tekrar dene
            </button>
          </p>
        ) : custom.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Henüz kendi kategoriniz yok. Yukarıdan ilkini ekleyebilirsiniz.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {custom.map((category) =>
              editing?.id === category.id ? (
                <li key={category.id} className="rounded-xl border p-3">
                  <form onSubmit={(event) => void submitEdit(event)} className="space-y-3">
                    <input
                      required
                      autoFocus
                      aria-label="Kategori adı"
                      maxLength={NAME_MAX_LENGTH}
                      value={editing.name}
                      onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                      className={input}
                    />
                    <ColorPicker
                      value={editing.color}
                      onChange={(value) => setEditing({ ...editing, color: value })}
                      label="Kategori rengi"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="submit"
                        disabled={updateMutation.isPending || !editing.name.trim()}
                        className="rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
                      >
                        {updateMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
                      </button>
                    </div>
                  </form>
                </li>
              ) : (
                <li
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color ?? '#94a3b8' }}
                    />
                    <span className="truncate">{category.name}</span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(null);
                        setEditing({
                          id: category.id,
                          name: category.name,
                          color: category.color ?? DEFAULT_COLOR,
                        });
                      }}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => void remove(category)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--destructive)] hover:bg-[var(--muted)] disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {system.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Hazır kategoriler
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {system.map((category) => (
              <li
                key={category.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]"
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: category.color ?? '#94a3b8' }}
                />
                {category.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </DashboardCard>
  );
}

function ColorPicker({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (color: string) => void;
  value: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {palette.map((swatch) => (
        <button
          key={swatch}
          type="button"
          role="radio"
          aria-checked={value === swatch}
          aria-label={swatch}
          onClick={() => onChange(swatch)}
          className={`size-7 rounded-full border-2 ${value === swatch ? 'border-[var(--foreground)]' : 'border-transparent'}`}
          style={{ backgroundColor: swatch }}
        />
      ))}
    </div>
  );
}
