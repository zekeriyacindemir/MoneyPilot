import { apiClient } from '@/lib/api/client';
import type { NotificationList } from './notifications.types';

export async function listNotifications(): Promise<NotificationList> {
  const response = await apiClient.get<NotificationList>('/notifications');

  return response.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/read-all');
}
