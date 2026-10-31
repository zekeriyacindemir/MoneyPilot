import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { CategoryType, PrismaClient, RecurrenceFrequency } from '@prisma/client';
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
const { RecurringTransactionService } =
  require('../src/recurring-transaction/recurring-transaction.service') as typeof import('../src/recurring-transaction/recurring-transaction.service');

const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

// 12:00 in Istanbul on 31 October 2026.
const NOW = new Date('2026-10-31T09:00:00.000Z');

interface AuthenticationResponse {
  accessToken: string;
  user: { id: string };
}

interface RecurringResponse {
  id: string;
  nextRunOn: string | null;
  isActive: boolean;
  startDate: string;
  frequency: RecurrenceFrequency;
}

describe('Recurring transactions (e2e)', () => {
  let application: INestApplication;
  let service: InstanceType<typeof RecurringTransactionService>;
  let firstUser: AuthenticationResponse;
  let secondUser: AuthenticationResponse;
  let rentCategoryId: string;
  let salaryCategoryId: string;
  let secondUserCategoryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    application = moduleRef.createNestApplication();
    application.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await application.init();
    service = application.get(RecurringTransactionService);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "AuthSession", "Transaction", "RecurringTransaction", "Budget", "SavingsGoal", "Category", "User" CASCADE',
    );
    const [rent, salary] = await Promise.all([
      prisma.category.create({
        data: { name: 'Kira', type: CategoryType.EXPENSE, isSystem: true },
      }),
      prisma.category.create({
        data: { name: 'Maaş', type: CategoryType.INCOME, isSystem: true },
      }),
    ]);
    rentCategoryId = rent.id;
    salaryCategoryId = salary.id;
    firstUser = await registerUser('first');
    secondUser = await registerUser('second');
    secondUserCategoryId = (
      await prisma.category.create({
        data: { userId: secondUser.user.id, name: 'Private', type: CategoryType.EXPENSE },
      })
    ).id;
  });

  afterAll(async () => {
    await application.close();
    await prisma.$disconnect();
  });

  function rentSchedule(overrides: Record<string, unknown> = {}) {
    return {
      categoryId: rentCategoryId,
      type: 'EXPENSE' as const,
      amount: '15000',
      currency: 'TRY' as const,
      frequency: RecurrenceFrequency.MONTHLY,
      startDate: '2026-08-31',
      ...overrides,
    };
  }

  function generatedTransactions(recurringTransactionId: string) {
    return prisma.transaction.findMany({
      where: { recurringTransactionId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  it('rejects unauthenticated requests', async () => {
    const response = await request(application.getHttpServer()).get('/recurring-transactions');

    expect(response.status).toBe(401);
  });

  it('creates past occurrences immediately, clamped to the end of shorter months', async () => {
    const rule = await service.create(firstUser.user.id, rentSchedule(), NOW);
    const transactions = await generatedTransactions(rule.id);

    expect(rule.nextRunOn).toBe('2026-11-30');
    expect(transactions.map((transaction) => transaction.occurredAt.toISOString())).toEqual([
      '2026-08-31T06:00:00.000Z',
      '2026-09-30T06:00:00.000Z',
      '2026-10-31T06:00:00.000Z',
    ]);
    expect(transactions.map((transaction) => transaction.recurrenceIndex)).toEqual([0, 1, 2]);
    expect(transactions.every((transaction) => transaction.userId === firstUser.user.id)).toBe(
      true,
    );

    const list = await request(application.getHttpServer())
      .get('/transactions')
      .set('Authorization', `Bearer ${firstUser.accessToken}`);
    expect(list.body.items[0]).toEqual(
      expect.objectContaining({ recurringTransactionId: rule.id }),
    );
  });

  it('generates each occurrence exactly once, even when runs overlap', async () => {
    const rule = await service.create(firstUser.user.id, rentSchedule(), NOW);

    const sameDay = await Promise.all(Array.from({ length: 5 }, () => service.generateDue(NOW)));
    const nextMonth = new Date('2026-12-01T09:00:00.000Z');
    const overlapping = await Promise.all(
      Array.from({ length: 5 }, () => service.generateDue(nextMonth)),
    );

    expect(sameDay).toEqual([0, 0, 0, 0, 0]);
    expect(overlapping.reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(await generatedTransactions(rule.id)).toHaveLength(4);
  });

  it('stops after the end date', async () => {
    const rule = await service.create(
      firstUser.user.id,
      rentSchedule({
        frequency: RecurrenceFrequency.WEEKLY,
        startDate: '2026-10-01',
        endDate: '2026-10-20',
      }),
      NOW,
    );

    expect(rule.nextRunOn).toBeNull();
    expect(await service.generateDue(new Date('2027-06-01T09:00:00.000Z'))).toBe(0);
    expect(await generatedTransactions(rule.id)).toHaveLength(3);
  });

  it('skips occurrences missed while paused', async () => {
    const rule = await service.create(
      firstUser.user.id,
      rentSchedule({ startDate: '2026-10-31' }),
      NOW,
    );
    await service.update(firstUser.user.id, rule.id, { isActive: false }, NOW);

    const mid = new Date('2027-01-15T09:00:00.000Z');
    expect(await service.generateDue(mid)).toBe(0);
    const resumed = await service.update(firstUser.user.id, rule.id, { isActive: true }, mid);

    expect(resumed.nextRunOn).toBe('2027-01-31');
    expect(await generatedTransactions(rule.id)).toHaveLength(1);
    expect(await service.generateDue(new Date('2027-01-31T09:00:00.000Z'))).toBe(1);
  });

  it('applies schedule changes from a future start date without touching history', async () => {
    const rule = await service.create(firstUser.user.id, rentSchedule(), NOW);

    await expect(
      service.update(firstUser.user.id, rule.id, { startDate: '2026-10-01' }, NOW),
    ).rejects.toMatchObject({ status: 400 });
    const rescheduled = await service.update(
      firstUser.user.id,
      rule.id,
      { startDate: '2026-11-15', frequency: RecurrenceFrequency.WEEKLY, amount: '16000' },
      NOW,
    );
    const updatedAmountOnly = await service.update(
      firstUser.user.id,
      rule.id,
      { amount: '16500', startDate: '2026-11-15' },
      NOW,
    );

    expect(rescheduled).toEqual(
      expect.objectContaining({ nextRunOn: '2026-11-15', frequency: 'WEEKLY' }),
    );
    expect(updatedAmountOnly.nextRunOn).toBe('2026-11-15');
    const transactions = await generatedTransactions(rule.id);
    expect(transactions).toHaveLength(3);
    expect(transactions.every((transaction) => transaction.amount.equals(15000))).toBe(true);
  });

  it('validates input', async () => {
    const invalid = [
      rentSchedule({ amount: '-5' }),
      rentSchedule({ startDate: '2026-02-30' }),
      rentSchedule({ startDate: '31/08/2026' }),
      rentSchedule({ frequency: 'DAILY' }),
      rentSchedule({ startDate: '2020-01-01' }),
      rentSchedule({ startDate: '2026-11-10', endDate: '2026-11-01' }),
      rentSchedule({ type: 'INCOME' }),
      rentSchedule({ recurrenceIndex: 3 }),
    ];

    for (const body of invalid) {
      const response = await request(application.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${firstUser.accessToken}`)
        .send(body);
      expect(response.status).toBe(400);
    }
    const income = await request(application.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${firstUser.accessToken}`)
      .send(rentSchedule({ type: 'INCOME', categoryId: salaryCategoryId }));
    expect(income.status).toBe(201);
  });

  it('enforces category access and the per-user limit', async () => {
    const foreignCategory = await request(application.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${firstUser.accessToken}`)
      .send(rentSchedule({ categoryId: secondUserCategoryId }));
    await prisma.recurringTransaction.createMany({
      data: Array.from({ length: 50 }, () => ({
        userId: firstUser.user.id,
        categoryId: rentCategoryId,
        type: 'EXPENSE' as const,
        amount: '1',
        currency: 'TRY' as const,
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: new Date('2026-12-01T00:00:00.000Z'),
        nextRunOn: new Date('2026-12-01T00:00:00.000Z'),
      })),
    });
    const overLimit = await request(application.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${firstUser.accessToken}`)
      .send(rentSchedule());

    expect(foreignCategory.status).toBe(403);
    expect(overLimit.status).toBe(400);
  });

  it('keeps schedules private to their owner', async () => {
    const rule = await service.create(firstUser.user.id, rentSchedule(), NOW);

    const [list, update, remove] = await Promise.all([
      request(application.getHttpServer())
        .get('/recurring-transactions')
        .set('Authorization', `Bearer ${secondUser.accessToken}`),
      request(application.getHttpServer())
        .patch(`/recurring-transactions/${rule.id}`)
        .set('Authorization', `Bearer ${secondUser.accessToken}`)
        .send({ amount: '1' }),
      request(application.getHttpServer())
        .delete(`/recurring-transactions/${rule.id}`)
        .set('Authorization', `Bearer ${secondUser.accessToken}`),
    ]);

    expect(list.body).toEqual([]);
    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);
    await expect(
      prisma.recurringTransaction.findUniqueOrThrow({ where: { id: rule.id } }),
    ).resolves.toEqual(expect.objectContaining({ amount: expect.anything() as unknown }));
  });

  it('keeps generated transactions when a schedule is deleted', async () => {
    const rule = await service.create(firstUser.user.id, rentSchedule(), NOW);

    const response = await request(application.getHttpServer())
      .delete(`/recurring-transactions/${rule.id}`)
      .set('Authorization', `Bearer ${firstUser.accessToken}`);

    expect(response.status).toBe(204);
    const transactions = await prisma.transaction.findMany({
      where: { userId: firstUser.user.id },
    });
    expect(transactions).toHaveLength(3);
    expect(transactions.every((transaction) => transaction.recurringTransactionId === null)).toBe(
      true,
    );
  });

  it('prevents deleting a category used by a schedule', async () => {
    const category = await prisma.category.create({
      data: { userId: firstUser.user.id, name: 'Spor salonu', type: CategoryType.EXPENSE },
    });
    await service.create(
      firstUser.user.id,
      rentSchedule({ categoryId: category.id, startDate: '2026-12-01' }),
      NOW,
    );

    const response = await request(application.getHttpServer())
      .delete(`/categories/${category.id}`)
      .set('Authorization', `Bearer ${firstUser.accessToken}`);

    expect(response.status).toBe(409);
    expect(response.body).toEqual(
      expect.objectContaining({ transactionCount: 0, recurringTransactionCount: 1 }),
    );
  });

  it('includes the opening balance in the dashboard total', async () => {
    const invalid = await request(application.getHttpServer())
      .patch('/auth/preferences')
      .set('Authorization', `Bearer ${firstUser.accessToken}`)
      .send({ openingBalance: '12,5' });
    const updated = await request(application.getHttpServer())
      .patch('/auth/preferences')
      .set('Authorization', `Bearer ${firstUser.accessToken}`)
      .send({ openingBalance: '1000.50', openingBalanceCurrency: 'TRY' });
    await request(application.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${firstUser.accessToken}`)
      .send({
        categoryId: rentCategoryId,
        type: 'EXPENSE',
        amount: '200',
        currency: 'TRY',
        occurredAt: '2026-10-01T10:00:00.000Z',
      });
    const summary = await request(application.getHttpServer())
      .get('/dashboard/summary')
      .query({ currency: 'TRY' })
      .set('Authorization', `Bearer ${firstUser.accessToken}`);
    const debt = await request(application.getHttpServer())
      .patch('/auth/preferences')
      .set('Authorization', `Bearer ${firstUser.accessToken}`)
      .send({ openingBalance: '-250' });

    expect(invalid.status).toBe(400);
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual(
      expect.objectContaining({ openingBalance: '1000.5', openingBalanceCurrency: 'TRY' }),
    );
    expect(summary.status).toBe(200);
    expect(summary.body.totalBalance).toBe('800.5');
    expect(debt.body.openingBalance).toBe('-250');
  });

  it('deletes an account that has schedules', async () => {
    await service.create(firstUser.user.id, rentSchedule(), NOW);

    const response = await request(application.getHttpServer())
      .delete('/auth/account')
      .set('Authorization', `Bearer ${firstUser.accessToken}`)
      .send({ currentPassword: 'password123' });

    expect(response.status).toBe(204);
    expect(await prisma.recurringTransaction.count()).toBe(0);
  });

  async function registerUser(prefix: string): Promise<AuthenticationResponse> {
    const response = await request(application.getHttpServer())
      .post('/auth/register')
      .send({
        name: `${prefix} user`,
        email: `${prefix}@recurring.example.com`,
        password: 'password123',
      });

    expect(response.status).toBe(201);
    return response.body as AuthenticationResponse;
  }
});
