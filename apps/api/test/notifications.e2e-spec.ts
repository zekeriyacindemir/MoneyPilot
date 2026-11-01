import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { CategoryType, GoalStatus, NotificationType, PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request = require('supertest');

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://moneypilot:moneypilot_dev_password@localhost:5432/moneypilot_test?schema=public';

process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-that-is-at-least-32-characters';
process.env.JWT_ACCESS_TOKEN_EXPIRES_IN = '15m';
process.env.NODE_ENV = 'test';
process.env.REFRESH_TOKEN_HMAC_SECRET = 'test-refresh-hmac-secret-that-is-at-least-32-characters';

const { AppModule } = require('../src/app.module') as typeof import('../src/app.module');
const { MailService } =
  require('../src/mail/mail.service') as typeof import('../src/mail/mail.service');
const { NotificationService } =
  require('../src/notification/notification.service') as typeof import('../src/notification/notification.service');

const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
const DAY_MS = 24 * 60 * 60 * 1000;

interface AuthenticationResponse {
  accessToken: string;
  user: { id: string };
}

interface NotificationListBody {
  items: {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    readAt: string | null;
  }[];
  unreadCount: number;
}

/** Istanbul calendar date as UTC midnight. */
function istanbulDate(offsetDays = 0): Date {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(
    new Date(),
  );
  return new Date(new Date(`${today}T00:00:00.000Z`).getTime() + offsetDays * DAY_MS);
}

describe('Notifications (e2e)', () => {
  let application: INestApplication;
  let service: InstanceType<typeof NotificationService>;
  const mail = {
    isConfigured: jest.fn(() => true),
    send: jest.fn(async () => undefined),
    appLink: (path: string) => new URL(path, 'http://localhost:3000'),
  };
  let user: AuthenticationResponse;
  let otherUser: AuthenticationResponse;
  let marketCategoryId: string;
  let salaryCategoryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue(mail)
      .compile();
    application = moduleRef.createNestApplication();
    application.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await application.init();
    service = application.get(NotificationService);
  });

  beforeEach(async () => {
    mail.isConfigured.mockReturnValue(true);
    mail.send.mockReset().mockResolvedValue(undefined);
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "AuthSession", "Notification", "Transaction", "RecurringTransaction", "Budget", "SavingsGoal", "Category", "User" CASCADE',
    );
    const [market, salary] = await Promise.all([
      prisma.category.create({
        data: { name: 'Market', type: CategoryType.EXPENSE, isSystem: true },
      }),
      prisma.category.create({ data: { name: 'Maaş', type: CategoryType.INCOME, isSystem: true } }),
    ]);
    marketCategoryId = market.id;
    salaryCategoryId = salary.id;
    user = await registerUser('owner');
    otherUser = await registerUser('other');
  });

  afterAll(async () => {
    await application.close();
    await prisma.$disconnect();
  });

  async function createBudget(amount: string): Promise<void> {
    const response = await request(application.getHttpServer())
      .post('/budgets')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        categoryId: marketCategoryId,
        type: 'EXPENSE',
        amount,
        currency: 'TRY',
        period: 'MONTHLY',
        periodStart: istanbulDate().toISOString().slice(0, 10),
      });
    expect(response.status).toBe(201);
  }

  async function addTransaction(
    amount: string,
    occurredAt = new Date(),
    type: 'INCOME' | 'EXPENSE' = 'EXPENSE',
  ): Promise<void> {
    await prisma.transaction.create({
      data: {
        userId: user.user.id,
        categoryId: type === 'EXPENSE' ? marketCategoryId : salaryCategoryId,
        type,
        amount,
        currency: 'TRY',
        occurredAt,
      },
    });
  }

  function notificationsOf(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  it('warns at 80% and again when a budget is exceeded, once each', async () => {
    await createBudget('1000');
    await addTransaction('850');

    expect(await service.checkUser(user.user.id)).toBe(1);
    expect(await service.checkUser(user.user.id)).toBe(0);
    await addTransaction('200');
    expect(await service.checkUser(user.user.id)).toBe(1);

    const notifications = await notificationsOf(user.user.id);
    expect(notifications.map((notification) => notification.type)).toEqual([
      NotificationType.BUDGET_WARNING,
      NotificationType.BUDGET_EXCEEDED,
    ]);
    expect(notifications[0]?.title).toBe('Market bütçeniz: %85 kullanıldı');
    expect(notifications[1]?.title).toBe('Market bütçenizi aştınız');
    expect(notifications.every((notification) => notification.emailedAt !== null)).toBe(true);
    expect(mail.send).toHaveBeenCalledTimes(2);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@notifications.example.com',
        subject: 'MoneyPilot · Market bütçeniz: %85 kullanıldı',
      }),
    );
  });

  it('respects disabled preferences', async () => {
    await createBudget('100');
    await addTransaction('150');
    await request(application.getHttpServer())
      .patch('/auth/preferences')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ budgetAlertsEnabled: false });

    expect(await service.checkUser(user.user.id)).toBe(0);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('reminds about close goal deadlines and celebrates recent completions', async () => {
    const goal = (data: {
      name: string;
      status?: GoalStatus;
      targetDate?: Date;
      completedAt?: Date;
      currentAmount?: string;
    }) =>
      prisma.savingsGoal.create({
        data: {
          userId: user.user.id,
          targetAmount: '1000',
          currentAmount: '250',
          currency: 'TRY',
          ...data,
        },
      });
    await Promise.all([
      goal({ name: 'Tatil', targetDate: istanbulDate(3) }),
      goal({ name: 'Uzak hedef', targetDate: istanbulDate(30) }),
      goal({
        name: 'Telefon',
        status: GoalStatus.COMPLETED,
        currentAmount: '1000',
        completedAt: new Date(),
      }),
      goal({
        name: 'Eski hedef',
        status: GoalStatus.COMPLETED,
        currentAmount: '1000',
        completedAt: new Date(Date.now() - 30 * DAY_MS),
      }),
    ]);

    expect(await service.checkUser(user.user.id)).toBe(2);
    const titles = (await notificationsOf(user.user.id)).map((notification) => notification.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        '“Tatil” hedefinize 3 gün kaldı',
        'Tebrikler! “Telefon” hedefinize ulaştınız',
      ]),
    );
  });

  it('summarizes the previous week when it had transactions', async () => {
    await prisma.user.update({
      where: { id: user.user.id },
      data: { weeklySummaryEnabled: true, createdAt: new Date(Date.now() - 30 * DAY_MS) },
    });
    await prisma.user.update({
      where: { id: otherUser.user.id },
      data: { weeklySummaryEnabled: true, createdAt: new Date(Date.now() - 30 * DAY_MS) },
    });
    const today = istanbulDate();
    const lastMonday = new Date(today.getTime() - ((today.getUTCDay() || 7) - 1 + 7) * DAY_MS);
    const lastTuesdayNoon = new Date(lastMonday.getTime() + DAY_MS + 9 * 60 * 60 * 1000);
    await addTransaction('1000', lastTuesdayNoon, 'INCOME');
    await addTransaction('300', lastTuesdayNoon);

    expect(await service.checkUser(user.user.id)).toBe(1);
    expect(await service.checkUser(user.user.id)).toBe(0);
    expect(await service.checkUser(otherUser.user.id)).toBe(0);
    const [summary] = await notificationsOf(user.user.id);
    expect(summary?.type).toBe(NotificationType.WEEKLY_SUMMARY);
    expect(summary?.body).toContain('Gelir ₺1.000,00 · Gider ₺300,00 · Net +₺700,00.');
    expect(summary?.body).toContain('En çok harcama: Market (₺300,00).');
  });

  it('keeps the in-app notification when email fails or SMTP is not configured', async () => {
    await createBudget('100');
    await addTransaction('90');
    mail.send.mockRejectedValueOnce(new Error('SMTP down'));
    await service.checkUser(user.user.id);
    mail.isConfigured.mockReturnValue(false);
    await addTransaction('20');
    await service.checkUser(user.user.id);

    const notifications = await notificationsOf(user.user.id);
    expect(notifications).toHaveLength(2);
    expect(notifications.every((notification) => notification.emailedAt === null)).toBe(true);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('lists, marks read and keeps notifications private', async () => {
    await createBudget('100');
    await addTransaction('120');

    const list = await request(application.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${user.accessToken}`);
    const body = list.body as NotificationListBody;
    const id = body.items[0]?.id ?? '';
    const [foreignRead, otherList] = await Promise.all([
      request(application.getHttpServer())
        .patch(`/notifications/${id}/read`)
        .set('Authorization', `Bearer ${otherUser.accessToken}`),
      request(application.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${otherUser.accessToken}`),
    ]);
    const ownRead = await request(application.getHttpServer())
      .patch(`/notifications/${id}/read`)
      .set('Authorization', `Bearer ${user.accessToken}`);
    await addTransaction('1', new Date());
    await prisma.notification.create({
      data: {
        userId: user.user.id,
        type: NotificationType.GOAL_COMPLETED,
        title: 'Extra',
        body: 'Extra',
        dedupeKey: 'extra',
      },
    });
    const readAll = await request(application.getHttpServer())
      .post('/notifications/read-all')
      .set('Authorization', `Bearer ${user.accessToken}`);
    const afterReadAll = await request(application.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${user.accessToken}`);

    expect(list.status).toBe(200);
    expect(body.unreadCount).toBe(1);
    expect(body.items[0]?.type).toBe(NotificationType.BUDGET_EXCEEDED);
    expect(foreignRead.status).toBe(404);
    expect((otherList.body as NotificationListBody).items).toEqual([]);
    expect(ownRead.status).toBe(204);
    expect(readAll.status).toBe(204);
    expect((afterReadAll.body as NotificationListBody).unreadCount).toBe(0);
    expect((afterReadAll.body as NotificationListBody).items).toHaveLength(2);
  });

  it('runs checks for all opted-in users', async () => {
    await createBudget('100');
    await addTransaction('100');
    await prisma.user.update({
      where: { id: otherUser.user.id },
      data: { budgetAlertsEnabled: false, savingsGoalAlertsEnabled: false },
    });

    expect(await service.runChecks()).toBe(1);
    expect(await service.runChecks()).toBe(0);
  });

  async function registerUser(prefix: string): Promise<AuthenticationResponse> {
    const response = await request(application.getHttpServer())
      .post('/auth/register')
      .send({
        name: `${prefix} user`,
        email: `${prefix}@notifications.example.com`,
        password: 'password123',
      });

    expect(response.status).toBe(201);
    return response.body as AuthenticationResponse;
  }
});
