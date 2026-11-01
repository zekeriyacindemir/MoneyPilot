'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/features/dashboard/components/icons';
import { IconButton } from '@/features/dashboard/components/ui';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from './notifications.queries';
import type { AppNotification, NotificationType } from './notifications.types';

const toneByType: Record<NotificationType, string> = {
  BUDGET_WARNING: 'bg-[var(--warning)]',
  BUDGET_EXCEEDED: 'bg-[var(--destructive)]',
  GOAL_DEADLINE: 'bg-[var(--warning)]',
  GOAL_COMPLETED: 'bg-[var(--success)]',
  WEEKLY_SUMMARY: 'bg-[var(--primary)]',
};
const relativeTime = new Intl.RelativeTimeFormat('tr-TR', { numeric: 'auto' });

function formatRelative(value: string): string {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return relativeTime.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeTime.format(hours, 'hour');
  return relativeTime.format(Math.round(hours / 24), 'day');
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const reference = useRef<HTMLDivElement>(null);
  const query = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const unreadCount = query.data?.unreadCount ?? 0;
  const items = query.data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const pointerdown = (event: MouseEvent) => {
      if (!reference.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', keydown);
    document.addEventListener('mousedown', pointerdown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('mousedown', pointerdown);
    };
  }, [open]);

  function openNotification(notification: AppNotification): void {
    if (!notification.readAt) markRead.mutate(notification.id);
    setOpen(false);
    if (notification.href) router.push(notification.href);
  }

  const label = unreadCount > 0 ? `Bildirimler, ${unreadCount} okunmamış` : 'Bildirimler';

  return (
    <div ref={reference} className="relative">
      <IconButton
        label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" className="size-5" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[10px] font-semibold leading-4 text-[var(--destructive-foreground)]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </IconButton>
      {open ? (
        <div
          role="dialog"
          aria-label="Bildirimler"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-lg"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Bildirimler</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                disabled={markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
                className="text-xs font-semibold text-[var(--primary)] disabled:opacity-50"
              >
                Tümünü okundu işaretle
              </button>
            ) : null}
          </div>
          <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
            {query.isLoading ? (
              <p className="px-4 py-6 text-sm text-[var(--muted-foreground)]">Yükleniyor…</p>
            ) : query.isError ? (
              <p className="px-4 py-6 text-sm text-[var(--muted-foreground)]">
                Bildirimler yüklenemedi.{' '}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => void query.refetch()}
                >
                  Tekrar dene
                </button>
              </p>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium">Henüz bildirim yok</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                  Bütçe, hedef ve haftalık özet bildirimleriniz burada görünür.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-[var(--muted)] ${notification.readAt ? '' : 'bg-[var(--secondary)]/40'}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${toneByType[notification.type]} ${notification.readAt ? 'opacity-30' : ''}`}
                      />
                      <span className="min-w-0">
                        <span
                          className={`block text-sm ${notification.readAt ? 'font-medium' : 'font-semibold'}`}
                        >
                          {notification.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-[var(--muted-foreground)]">
                          {notification.body}
                        </span>
                        <span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">
                          {formatRelative(notification.createdAt)}
                          {notification.readAt ? '' : ' · Yeni'}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
