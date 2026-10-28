'use client';

import { type FormEvent, type ReactNode, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { DashboardCard, PageHeader, SectionHeader } from '@/features/dashboard/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import {
  changePassword,
  deleteAccount,
  getSessions,
  logoutAll,
  revokeSession,
  updatePreferences,
  updateProfile,
} from '@/features/auth/auth.api';
import { type Currency, type PreferencesRequest } from '@/features/auth/auth.types';
import { type Theme, useTheme } from '@/features/theme/theme-provider';
import { CategoryManager } from '@/features/transactions/components/category-manager';

const input =
  'mt-1.5 h-11 w-full rounded-xl border bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--secondary)]';
const button =
  'rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60';
const themes: { value: Theme; label: string; description: string }[] = [
  { value: 'light', label: 'Açık', description: 'Her zaman açık görünüm' },
  { value: 'dark', label: 'Koyu', description: 'Her zaman koyu görünüm' },
  { value: 'system', label: 'Sistem', description: 'Cihaz ayarını takip eder' },
];

function errorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data.message;
    return Array.isArray(message)
      ? (message[0] ?? 'İşlem tamamlanamadı.')
      : (message ?? 'İşlem tamamlanamadı.');
  }
  return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
}

export default function SettingsPage() {
  const { user, loadCurrentUser, logout } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    currentPassword: '',
  });
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmation: '',
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dangerPassword, setDangerPassword] = useState('');
  const [deleteWord, setDeleteWord] = useState('');
  const sessions = useQuery({ queryKey: ['auth', 'sessions'], queryFn: getSessions });

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await loadCurrentUser();
      setProfile((value) => ({ ...value, currentPassword: '' }));
      setNotice('Hesap bilgileriniz kaydedildi.');
    },
  });
  const preferenceMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: async () => {
      await loadCurrentUser();
      setNotice('Tercihleriniz kaydedildi.');
    },
  });
  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPassword({ currentPassword: '', newPassword: '', confirmation: '' });
      setNotice('Şifreniz değiştirildi.');
    },
  });
  const revokeMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: async (_data, id) => {
      await client.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      if (sessions.data?.find((session) => session.id === id)?.current) {
        await logout();
        router.replace('/login');
      }
    },
  });
  const deleteMutation = useMutation({ mutationFn: deleteAccount });
  const prefs = user;

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    try {
      await profileMutation.mutateAsync({
        name: profile.name,
        email: profile.email,
        ...(profile.email !== user?.email ? { currentPassword: profile.currentPassword } : {}),
      });
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }
  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    if (password.newPassword !== password.confirmation) {
      setNotice('Yeni şifreler eşleşmiyor.');
      return;
    }
    try {
      await passwordMutation.mutateAsync({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }
  async function savePreferences(change: PreferencesRequest) {
    setNotice(null);
    try {
      await preferenceMutation.mutateAsync(change);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }
  async function endAll() {
    if (!window.confirm('Tüm oturumlar sonlandırılsın mı? Bu cihazdan da çıkış yapılacak.')) return;
    try {
      await logoutAll();
      await logout();
      router.replace('/login');
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }
  async function removeAccount(event: FormEvent) {
    event.preventDefault();
    if (deleteWord !== 'SİL') {
      setNotice('Onay için SİL yazın.');
      return;
    }
    try {
      await deleteMutation.mutateAsync(dangerPassword);
      await logout();
      router.replace('/login');
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }
  function closeDeleteDialog() {
    if (deleteMutation.isPending) return;
    setIsDeleteDialogOpen(false);
    setDangerPassword('');
    setDeleteWord('');
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Tercihler"
        title="Ayarlar"
        description="Hesabınızı ve tercihlerinizi tek yerden yönetin."
      />
      {notice ? (
        <p role="status" className="rounded-xl border px-4 py-3 text-sm">
          {notice}
        </p>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <DashboardCard className="p-5 sm:p-6">
            <SectionHeader
              title="Hesap"
              description="Adınızı güncelleyin. E-posta değişiminde mevcut şifreniz gerekir."
            />
            <form onSubmit={(event) => void submitProfile(event)} className="mt-5 space-y-4">
              <Field label="Adınız">
                <input
                  required
                  minLength={2}
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                  className={input}
                />
              </Field>
              <Field label="E-posta adresi">
                <input
                  required
                  type="email"
                  value={profile.email}
                  onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                  className={input}
                />
              </Field>
              {profile.email !== user?.email ? (
                <Field label="Mevcut şifre">
                  <input
                    required
                    type="password"
                    value={profile.currentPassword}
                    onChange={(event) =>
                      setProfile({ ...profile, currentPassword: event.target.value })
                    }
                    className={input}
                  />
                </Field>
              ) : null}
              <button className={button} disabled={profileMutation.isPending}>
                {profileMutation.isPending ? 'Kaydediliyor…' : 'Hesabı kaydet'}
              </button>
            </form>
          </DashboardCard>
          <DashboardCard className="p-5 sm:p-6">
            <SectionHeader title="Güvenlik" description="Şifrenizi düzenli olarak güncelleyin." />
            <form onSubmit={(event) => void submitPassword(event)} className="mt-5 space-y-4">
              <Field label="Mevcut şifre">
                <input
                  required
                  type="password"
                  value={password.currentPassword}
                  onChange={(event) =>
                    setPassword({ ...password, currentPassword: event.target.value })
                  }
                  className={input}
                />
              </Field>
              <Field label="Yeni şifre">
                <input
                  required
                  minLength={8}
                  maxLength={128}
                  type="password"
                  value={password.newPassword}
                  onChange={(event) =>
                    setPassword({ ...password, newPassword: event.target.value })
                  }
                  className={input}
                />
              </Field>
              <Field label="Yeni şifre (tekrar)">
                <input
                  required
                  type="password"
                  value={password.confirmation}
                  onChange={(event) =>
                    setPassword({ ...password, confirmation: event.target.value })
                  }
                  className={input}
                />
              </Field>
              <button className={button} disabled={passwordMutation.isPending}>
                Şifreyi değiştir
              </button>
            </form>
          </DashboardCard>
          <DashboardCard className="p-5 sm:p-6">
            <SectionHeader
              title="Oturumlar"
              description="Cihaz, IP ve konum bilgisi toplanmaz."
              action={
                <button
                  onClick={() => void endAll()}
                  className="text-sm font-semibold text-red-600"
                >
                  Tümünü sonlandır
                </button>
              }
            />
            <div className="mt-5 space-y-3">
              {sessions.isLoading ? (
                <p className="text-sm text-[var(--muted-foreground)]">Yükleniyor…</p>
              ) : (
                sessions.data?.map((session) => (
                  <div key={session.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">
                        {session.current ? 'Bu oturum' : 'Etkin oturum'}
                      </p>
                      <button
                        onClick={() => {
                          if (window.confirm('Bu oturum sonlandırılsın mı?'))
                            void revokeMutation
                              .mutateAsync(session.id)
                              .catch((error) => setNotice(errorMessage(error)));
                        }}
                        className="text-sm font-semibold text-red-600"
                      >
                        Sonlandır
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Oluşturulma: {new Date(session.createdAt).toLocaleString('tr-TR')} · Son
                      kullanım:{' '}
                      {session.lastUsedAt
                        ? new Date(session.lastUsedAt).toLocaleString('tr-TR')
                        : 'Henüz kullanılmadı'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </DashboardCard>
        </div>
        <div className="space-y-6">
          <DashboardCard className="p-5 sm:p-6">
            <SectionHeader
              title="Tercihler"
              description="Varsayılan para birimi yalnızca yeni kayıtları etkiler; mevcut kayıtlar dönüştürülmez."
            />
            <Field label="Varsayılan para birimi">
              <select
                value={prefs?.defaultCurrency ?? 'TRY'}
                onChange={(event) =>
                  void savePreferences({ defaultCurrency: event.target.value as Currency })
                }
                className={input}
              >
                {(['TRY', 'USD', 'EUR', 'GBP'] as Currency[]).map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </Field>
            <div role="radiogroup" className="mt-5 space-y-2">
              {themes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={theme === item.value}
                  onClick={() => setTheme(item.value)}
                  className={`w-full rounded-xl border p-3 text-left ${theme === item.value ? 'border-[var(--primary)] bg-[var(--secondary)]' : ''}`}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-[var(--muted-foreground)]">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
          </DashboardCard>
          <CategoryManager />
          <DashboardCard className="p-5 sm:p-6">
            <SectionHeader
              title="Bildirimler"
              description="Bu tercihler ilerideki e-posta/push teslimatları için saklanır; bu sürümde gönderim yapılmaz."
            />
            <div className="mt-4 space-y-3">
              {(
                [
                  { key: 'budgetAlertsEnabled', label: 'Bütçe uyarıları' },
                  { key: 'savingsGoalAlertsEnabled', label: 'Birikim hedefi uyarıları' },
                  { key: 'weeklySummaryEnabled', label: 'Haftalık özet' },
                ] as const
              ).map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-xl border p-3 text-sm font-medium"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={prefs?.[key] ?? false}
                    onChange={(event) => void savePreferences({ [key]: event.target.checked })}
                  />
                </label>
              ))}
            </div>
          </DashboardCard>
          <DashboardCard className="border-red-200 p-5 sm:p-6">
            <SectionHeader
              title="Tehlikeli alan"
              description="Hesabınızı ve tüm finansal kayıtlarınızı kalıcı olarak silin."
            />
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="mt-5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Hesabı sil
            </button>
          </DashboardCard>
        </div>
      </div>
      {isDeleteDialogOpen ? (
        <DeleteAccountDialog
          password={dangerPassword}
          deleteWord={deleteWord}
          isPending={deleteMutation.isPending}
          onCancel={closeDeleteDialog}
          onPasswordChange={setDangerPassword}
          onDeleteWordChange={setDeleteWord}
          onSubmit={removeAccount}
        />
      ) : null}
    </div>
  );
}

function DeleteAccountDialog({
  deleteWord,
  isPending,
  onCancel,
  onDeleteWordChange,
  onPasswordChange,
  onSubmit,
  password,
}: {
  deleteWord: string;
  isPending: boolean;
  onCancel: () => void;
  onDeleteWordChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
  password: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-4 sm:items-center sm:justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="w-full max-w-md rounded-2xl bg-[var(--card)] p-5 shadow-2xl sm:p-6"
      >
        <h2
          id="delete-account-title"
          className="text-lg font-semibold text-[var(--card-foreground)]"
        >
          Hesabı kalıcı olarak sil
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          Bu işlem geri alınamaz. Devam etmek için şifrenizi girin ve SİL yazın.
        </p>
        <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
          <Field label="Mevcut şifre">
            <input
              autoFocus
              required
              minLength={8}
              maxLength={128}
              type="password"
              value={password}
              disabled={isPending}
              onChange={(event) => onPasswordChange(event.target.value)}
              className={input}
            />
          </Field>
          <Field label="Onay için SİL yazın">
            <input
              required
              value={deleteWord}
              disabled={isPending}
              onChange={(event) => onDeleteWordChange(event.target.value)}
              className={input}
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? 'Siliniyor…' : 'Hesabı kalıcı olarak sil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
