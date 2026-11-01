export type NotificationType =
  'BUDGET_WARNING' | 'BUDGET_EXCEEDED' | 'GOAL_DEADLINE' | 'GOAL_COMPLETED' | 'WEEKLY_SUMMARY';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}
