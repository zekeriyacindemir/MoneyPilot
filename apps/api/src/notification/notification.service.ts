import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  BudgetPeriod,
  type Currency,
  GoalStatus,
  type Notification,
  NotificationType,
  Prisma,
  TransactionType,
} from '@prisma/client';
import { BudgetService } from '../budget/budget.service';
import { ExchangeRateService } from '../dashboard/exchange-rate.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, istanbulToday } from '../recurring-transaction/recurrence';

const LIST_LIMIT = 30;
const USER_BATCH_SIZE = 200;
// Listing notifications re-checks the user's alerts at most this often, so a new expense shows
// up in the bell within minutes instead of waiting for the hourly run.
const ON_DEMAND_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const GOAL_DEADLINE_DAYS = 7;
const GOAL_COMPLETED_LOOKBACK_DAYS = 7;
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

const periodLabels: Record<BudgetPeriod, string> = {
  WEEKLY: 'Bu hafta',
  MONTHLY: 'Bu ay',
  YEARLY: 'Bu yıl',
};

interface NotificationDraft {
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
}

interface AlertUser {
  id: string;
  email: string;
  createdAt: Date;
  defaultCurrency: Currency;
  budgetAlertsEnabled: boolean;
  savingsGoalAlertsEnabled: boolean;
  weeklySummaryEnabled: boolean;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationListResponse {
  items: NotificationResponse[];
  unreadCount: number;
}

const alertUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  defaultCurrency: true,
  budgetAlertsEnabled: true,
  savingsGoalAlertsEnabled: true,
  weeklySummaryEnabled: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly lastOnDemandCheck = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly budgets: BudgetService,
    private readonly exchangeRates: ExchangeRateService,
    private readonly mail: MailService,
  ) {}

  async list(userId: string): Promise<NotificationListResponse> {
    await this.checkUserOnDemand(userId);
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items: items.map((item) => this.toResponse(item)), unreadCount };
  }

  async markRead(userId: string, id: string): Promise<void> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      const exists = await this.prisma.notification.count({ where: { id, userId } });
      if (!exists) throw new NotFoundException('Notification not found.');
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /** Evaluates alerts for every user with at least one notification preference enabled. */
  async runChecks(now = new Date()): Promise<number> {
    let created = 0;
    let cursor: string | undefined;
    for (;;) {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { budgetAlertsEnabled: true },
            { savingsGoalAlertsEnabled: true },
            { weeklySummaryEnabled: true },
          ],
        },
        select: alertUserSelect,
        orderBy: { id: 'asc' },
        take: USER_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (users.length === 0) return created;
      for (const user of users) {
        try {
          created += await this.checkLoadedUser(user, now);
        } catch (error) {
          // One user's failure (for example missing FX rates) must not block the others;
          // the next run retries and dedupe keys prevent duplicates.
          this.logger.warn(
            `Notification check failed for a user: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
        }
      }
      cursor = users[users.length - 1]?.id;
    }
  }

  async checkUser(userId: string, now = new Date()): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: alertUserSelect,
    });
    return user ? this.checkLoadedUser(user, now) : 0;
  }

  private async checkUserOnDemand(userId: string): Promise<void> {
    const now = Date.now();
    if (now - (this.lastOnDemandCheck.get(userId) ?? 0) < ON_DEMAND_CHECK_INTERVAL_MS) return;
    this.lastOnDemandCheck.set(userId, now);
    try {
      await this.checkUser(userId);
    } catch (error) {
      // Listing must keep working when a check fails; the hourly run retries.
      this.logger.warn(
        `On-demand notification check failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async checkLoadedUser(user: AlertUser, now: Date): Promise<number> {
    const drafts = [
      ...(user.budgetAlertsEnabled ? await this.budgetDrafts(user.id, now) : []),
      ...(user.savingsGoalAlertsEnabled ? await this.goalDrafts(user.id, now) : []),
      ...(user.weeklySummaryEnabled ? await this.weeklySummaryDrafts(user, now) : []),
    ];
    let created = 0;
    for (const draft of drafts) {
      if (await this.deliver(user, draft)) created += 1;
    }
    return created;
  }

  private async budgetDrafts(userId: string, now: Date): Promise<NotificationDraft[]> {
    const budgets = await this.budgets.findAll(userId, { date: now });
    return budgets
      .filter((budget) => budget.type === TransactionType.EXPENSE)
      .flatMap((budget) => {
        const progress = new Prisma.Decimal(budget.progressPercent);
        if (progress.lt(80)) return [];
        const exceeded = progress.gte(100);
        const name = budget.category.name;
        const spent = `${periodLabels[budget.period]} ${this.money(budget.actualAmount, budget.currency)} / ${this.money(budget.amount, budget.currency)} harcandı.`;
        return [
          {
            type: exceeded ? NotificationType.BUDGET_EXCEEDED : NotificationType.BUDGET_WARNING,
            title: exceeded
              ? `${name} bütçenizi aştınız`
              : `${name} bütçeniz: %${progress.floor().toString()} kullanıldı`,
            body: exceeded
              ? `${spent} Aşım: ${this.money(new Prisma.Decimal(budget.remainingAmount).neg(), budget.currency)}.`
              : `${spent} Kalan: ${this.money(budget.remainingAmount, budget.currency)}.`,
            href: '/dashboard/budgets',
            dedupeKey: `budget:${budget.id}:${this.isoDate(budget.periodStart)}:${exceeded ? 100 : 80}`,
          },
        ];
      });
  }

  private async goalDrafts(userId: string, now: Date): Promise<NotificationDraft[]> {
    const today = istanbulToday(now);
    const goals = await this.prisma.savingsGoal.findMany({
      where: {
        userId,
        OR: [
          {
            status: GoalStatus.ACTIVE,
            targetDate: { gte: today, lte: addDays(today, GOAL_DEADLINE_DAYS) },
          },
          {
            status: GoalStatus.COMPLETED,
            completedAt: { gte: addDays(now, -GOAL_COMPLETED_LOOKBACK_DAYS) },
          },
        ],
      },
    });

    return goals.flatMap((goal): NotificationDraft[] => {
      if (goal.status === GoalStatus.COMPLETED) {
        return [
          {
            type: NotificationType.GOAL_COMPLETED,
            title: `Tebrikler! “${goal.name}” hedefinize ulaştınız`,
            body: `${this.money(goal.targetAmount, goal.currency)} biriktirdiniz. Yeni bir hedef belirlemeye ne dersiniz?`,
            href: '/dashboard/savings',
            dedupeKey: `goal:${goal.id}:completed`,
          },
        ];
      }
      if (!goal.targetDate || goal.currentAmount.gte(goal.targetAmount)) return [];
      const daysLeft = Math.round((goal.targetDate.getTime() - today.getTime()) / 86_400_000);
      const percent = goal.targetAmount.isZero()
        ? '0'
        : goal.currentAmount.div(goal.targetAmount).mul(100).floor().toString();
      return [
        {
          type: NotificationType.GOAL_DEADLINE,
          title:
            daysLeft === 0
              ? `“${goal.name}” hedefinizin son günü bugün`
              : `“${goal.name}” hedefinize ${daysLeft} gün kaldı`,
          body: `Biriken: ${this.money(goal.currentAmount, goal.currency)} / ${this.money(goal.targetAmount, goal.currency)} (%${percent}). Kalan: ${this.money(goal.targetAmount.sub(goal.currentAmount), goal.currency)}.`,
          href: '/dashboard/savings',
          dedupeKey: `goal:${goal.id}:deadline:${this.isoDate(goal.targetDate)}`,
        },
      ];
    });
  }

  /** Summarizes the last completed Monday–Sunday week (Istanbul) if it had any transactions. */
  private async weeklySummaryDrafts(user: AlertUser, now: Date): Promise<NotificationDraft[]> {
    const today = istanbulToday(now);
    const thisMonday = addDays(today, -((today.getUTCDay() || 7) - 1));
    const weekStart = addDays(thisMonday, -7);
    const rangeStart = new Date(weekStart.getTime() - ISTANBUL_OFFSET_MS);
    const rangeEnd = new Date(thisMonday.getTime() - ISTANBUL_OFFSET_MS);
    if (user.createdAt >= rangeEnd) return [];

    const where = { userId: user.id, occurredAt: { gte: rangeStart, lt: rangeEnd } };
    const [totals, expenseByCategory] = await Promise.all([
      this.prisma.transaction.groupBy({ by: ['type', 'currency'], where, _sum: { amount: true } }),
      this.prisma.transaction.groupBy({
        by: ['categoryId', 'currency'],
        where: { ...where, type: TransactionType.EXPENSE },
        _sum: { amount: true },
      }),
    ]);
    if (totals.length === 0) return [];

    const currency = user.defaultCurrency;
    const convert = (amount: Prisma.Decimal | null, from: Currency) =>
      this.exchangeRates.convert(amount ?? new Prisma.Decimal(0), from, currency);
    let income = new Prisma.Decimal(0);
    let expense = new Prisma.Decimal(0);
    for (const row of totals) {
      const value = await convert(row._sum.amount, row.currency);
      if (row.type === TransactionType.INCOME) income = income.add(value);
      else expense = expense.add(value);
    }
    const perCategory = new Map<string, Prisma.Decimal>();
    for (const row of expenseByCategory) {
      const value = await convert(row._sum.amount, row.currency);
      perCategory.set(
        row.categoryId,
        (perCategory.get(row.categoryId) ?? new Prisma.Decimal(0)).add(value),
      );
    }
    const top = [...perCategory.entries()].sort(([, a], [, b]) => b.comparedTo(a))[0];
    const topCategory = top
      ? await this.prisma.category.findUnique({ where: { id: top[0] }, select: { name: true } })
      : null;

    const weekEnd = addDays(thisMonday, -1);
    const range = `${this.dayMonth(weekStart)} – ${this.dayMonth(weekEnd)}`;
    const net = income.sub(expense);
    return [
      {
        type: NotificationType.WEEKLY_SUMMARY,
        title: `Haftalık özet · ${range}`,
        body: [
          `Gelir ${this.money(income, currency)} · Gider ${this.money(expense, currency)} · Net ${net.gte(0) ? '+' : ''}${this.money(net, currency)}.`,
          top && topCategory
            ? `En çok harcama: ${topCategory.name} (${this.money(top[1], currency)}).`
            : null,
        ]
          .filter(Boolean)
          .join(' '),
        href: '/dashboard/reports',
        dedupeKey: `weekly:${this.isoDate(weekStart)}`,
      },
    ];
  }

  /** Stores the notification once per dedupe key and emails it when SMTP is configured. */
  private async deliver(user: AlertUser, draft: NotificationDraft): Promise<boolean> {
    let notification: Notification;
    try {
      notification = await this.prisma.notification.create({
        data: { userId: user.id, ...draft },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return false;
      }
      throw error;
    }

    if (this.mail.isConfigured()) {
      try {
        await this.mail.send({
          to: user.email,
          subject: `MoneyPilot · ${draft.title}`,
          text: `${draft.title}\n\n${draft.body}\n\n${this.mail.appLink(draft.href).toString()}\n\nBildirim tercihlerinizi Ayarlar sayfasından değiştirebilirsiniz.`,
        });
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { emailedAt: new Date() },
        });
      } catch (error) {
        // The in-app notification is already stored; delivery errors are logged without PII.
        this.logger.warn(
          `Notification email failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }
    return true;
  }

  private money(amount: Prisma.Decimal | string, currency: Currency): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(
      Number(amount.toString()),
    );
  }

  private isoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private dayMonth(date: Date): string {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(date);
  }

  private toResponse(notification: Notification): NotificationResponse {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      href: notification.href,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
