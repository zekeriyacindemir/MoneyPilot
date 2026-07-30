import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { BudgetPeriod, CategoryType, Currency, PrismaClient } from '@prisma/client';
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

const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

interface AuthenticationResponse {
  accessToken: string;
  user: { id: string };
}

interface DashboardResponse {
  currency: string;
  period: string;
  periodExpense: string;
  periodIncome: string;
  recentTransactions: { amount: string; currency: string }[];
  savingsRate: string | null;
  totalBalance: string;
  trend: { expense: string; income: string; period: string }[];
}

interface FinancialHealthResponse {
  currency: string;
  isReady: boolean;
  missingSignals: string[];
  score: number | null;
  level: string | null;
}

describe('Dashboard (e2e)', () => {
  let application: INestApplication;
  let incomeCategoryId: string;
  let expenseCategoryId: string;
  let user: AuthenticationResponse;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    application = moduleRef.createNestApplication();
    application.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await application.init();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "AuthSession", "Transaction", "Budget", "SavingsGoal", "Category", "User" CASCADE',
    );
    const [incomeCategory, expenseCategory] = await Promise.all([
      prisma.category.create({
        data: { name: 'Salary', type: CategoryType.INCOME, isSystem: true },
      }),
      prisma.category.create({
        data: { name: 'Market', type: CategoryType.EXPENSE, isSystem: true },
      }),
    ]);
    incomeCategoryId = incomeCategory.id;
    expenseCategoryId = expenseCategory.id;
    user = await registerUser('dashboard-user');
  });

  afterAll(async () => {
    await application.close();
    await prisma.$disconnect();
  });

  it('rejects unauthenticated summary requests', async () => {
    const response = await request(application.getHttpServer()).get('/dashboard/summary');

    expect(response.status).toBe(401);
  });

  it('returns currency-specific all-time balance, current-period metrics, and recent transactions', async () => {
    await createTransaction({
      type: 'INCOME',
      amount: '100',
      currency: 'TRY',
      categoryId: incomeCategoryId,
    });
    await createTransaction({
      type: 'EXPENSE',
      amount: '25',
      currency: 'TRY',
      categoryId: expenseCategoryId,
    });
    await createTransaction({
      type: 'EXPENSE',
      amount: '10',
      currency: 'TRY',
      categoryId: expenseCategoryId,
      occurredAt: monthsAgo(2),
    });
    const response = await request(application.getHttpServer())
      .get('/dashboard/summary')
      .query({ currency: 'TRY', period: 'current_month' })
      .set('Authorization', `Bearer ${user.accessToken}`);
    const body = response.body as DashboardResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      currency: 'TRY',
      period: 'current_month',
      totalBalance: '65',
      periodIncome: '100',
      periodExpense: '25',
      savingsRate: '75',
    });
    expect(body.recentTransactions).toHaveLength(3);
    expect(body.recentTransactions.every((transaction) => transaction.currency === 'TRY')).toBe(
      true,
    );
    expect(body.trend.some((point) => point.income === '100' && point.expense === '25')).toBe(true);
  });

  it('limits recent transactions, excludes other users, and returns a monthly trend for multi-month periods', async () => {
    for (let index = 0; index < 6; index += 1) {
      await createTransaction({
        type: index % 2 === 0 ? 'INCOME' : 'EXPENSE',
        amount: `${index + 1}`,
        currency: 'TRY',
        categoryId: index % 2 === 0 ? incomeCategoryId : expenseCategoryId,
        occurredAt: monthsAgo(index % 3),
      });
    }
    const otherUser = await registerUser('other-dashboard-user');
    await prisma.transaction.create({
      data: {
        userId: otherUser.user.id,
        categoryId: incomeCategoryId,
        type: 'INCOME',
        amount: '9999',
        currency: 'TRY',
        occurredAt: new Date(),
      },
    });
    const response = await request(application.getHttpServer())
      .get('/dashboard/summary')
      .query({ currency: 'TRY', period: 'last_3_months' })
      .set('Authorization', `Bearer ${user.accessToken}`);
    const body = response.body as DashboardResponse;

    expect(response.status).toBe(200);
    expect(body.recentTransactions).toHaveLength(5);
    expect(body.totalBalance).not.toBe('10011');
    expect(body.trend).toHaveLength(3);
    expect(body.trend.every((point) => /^\d{4}-\d{2}$/.test(point.period))).toBe(true);
  });

  it('returns null savings rate when the selected period has no income and validates query values', async () => {
    await createTransaction({
      type: 'EXPENSE',
      amount: '20',
      currency: 'TRY',
      categoryId: expenseCategoryId,
    });
    const summary = await request(application.getHttpServer())
      .get('/dashboard/summary')
      .query({ currency: 'TRY' })
      .set('Authorization', `Bearer ${user.accessToken}`);
    const invalidCurrency = await request(application.getHttpServer())
      .get('/dashboard/summary')
      .query({ currency: 'BTC' })
      .set('Authorization', `Bearer ${user.accessToken}`);
    const invalidPeriod = await request(application.getHttpServer())
      .get('/dashboard/summary')
      .query({ period: 'last_year' })
      .set('Authorization', `Bearer ${user.accessToken}`);

    expect((summary.body as DashboardResponse).savingsRate).toBeNull();
    expect(invalidCurrency.status).toBe(400);
    expect(invalidPeriod.status).toBe(400);
  });

  it('returns a weighted financial health score using the user default currency', async () => {
    await prisma.user.update({
      where: { id: user.user.id },
      data: { defaultCurrency: Currency.USD },
    });
    await createTransaction({
      type: 'INCOME',
      amount: '100',
      currency: 'USD',
      categoryId: incomeCategoryId,
    });
    await prisma.budget.create({
      data: {
        userId: user.user.id,
        categoryId: expenseCategoryId,
        amount: '100',
        currency: Currency.USD,
        period: BudgetPeriod.MONTHLY,
        periodStart: currentMonthStart(),
      },
    });
    await prisma.savingsGoal.create({
      data: {
        userId: user.user.id,
        name: 'Emergency fund',
        targetAmount: '100',
        currentAmount: '50',
        currency: Currency.USD,
      },
    });

    const response = await request(application.getHttpServer())
      .get('/dashboard/financial-health')
      .set('Authorization', `Bearer ${user.accessToken}`);
    const body = response.body as FinancialHealthResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      currency: 'USD',
      isReady: true,
      missingSignals: [],
      score: 88,
      level: 'Çok iyi',
    });
  });

  async function registerUser(emailPrefix: string): Promise<AuthenticationResponse> {
    const response = await request(application.getHttpServer())
      .post('/auth/register')
      .send({
        name: emailPrefix,
        email: `${emailPrefix}@example.com`,
        password: 'password123',
      });

    expect(response.status).toBe(201);
    return response.body as AuthenticationResponse;
  }

  async function createTransaction({
    amount,
    categoryId,
    currency,
    occurredAt = new Date(),
    type,
  }: {
    amount: string;
    categoryId: string;
    currency: 'TRY' | 'USD';
    occurredAt?: Date;
    type: 'INCOME' | 'EXPENSE';
  }): Promise<void> {
    await prisma.transaction.create({
      data: { userId: user.user.id, categoryId, type, amount, currency, occurredAt },
    });
  }
});

function monthsAgo(months: number): Date {
  const value = new Date();
  value.setMonth(value.getMonth() - months);

  return value;
}

function currentMonthStart(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  return new Date(Date.UTC(year, month - 1, 1));
}
