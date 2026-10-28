import { type INestApplication, ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { ExchangeRateService } from '../src/dashboard/exchange-rate.service';
import { PasswordMailer } from '../src/auth/password-mailer.service';

const database =
  process.env.TEST_DATABASE_URL ??
  'postgresql://moneypilot:moneypilot_dev_password@localhost:5432/moneypilot_test?schema=public';
Object.assign(process.env, {
  DATABASE_URL: database,
  CORS_ORIGIN: 'http://localhost:3000',
  JWT_ACCESS_SECRET: 'test-jwt-access-secret-that-is-at-least-32-characters',
  REFRESH_TOKEN_HMAC_SECRET: 'test-refresh-hmac-secret-that-is-at-least-32-characters',
  NODE_ENV: 'test',
});
const { AppModule } = require('../src/app.module') as typeof import('../src/app.module');
const prisma = new PrismaClient({ datasources: { db: { url: database } } });
describe('Financial and recovery regressions (e2e)', () => {
  let app: INestApplication;
  let user: { accessToken: string; user: { id: string } };
  let category: string;
  let income: string;
  const convert = jest.fn();
  const send = jest.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ExchangeRateService)
      .useValue({ convert })
      .overrideProvider(PasswordMailer)
      .useValue({ assertConfigured: () => undefined, send })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "AuthSession", "Transaction", "Budget", "SavingsGoal", "Category", "User" CASCADE',
    );
    convert
      .mockReset()
      .mockImplementation(async (amount: Prisma.Decimal, from: string, to: string) =>
        from === to ? amount : from === 'USD' && to === 'TRY' ? amount.mul(40) : amount.div(40),
      );
    send.mockReset().mockResolvedValue(undefined);
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Regression User', email: 'regression@example.com', password: 'password123' });
    expect(response.status).toBe(201);
    user = response.body;
    category = (
      await prisma.category.create({ data: { name: 'Food', type: 'EXPENSE', isSystem: true } })
    ).id;
    income = (
      await prisma.category.create({ data: { name: 'Salary', type: 'INCOME', isSystem: true } })
    ).id;
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });
  function get(url: string) {
    return request(app.getHttpServer())
      .get(url)
      .set('Authorization', 'Bearer ' + user.accessToken);
  }
  it('counts mixed currencies in budgets and reports at Istanbul month boundaries', async () => {
    await prisma.budget.create({
      data: {
        userId: user.user.id,
        categoryId: category,
        amount: '1000',
        currency: 'TRY',
        period: 'MONTHLY',
        periodStart: new Date('2026-09-01T00:00:00Z'),
      },
    });
    await prisma.transaction.createMany({
      data: [
        {
          userId: user.user.id,
          categoryId: category,
          type: 'EXPENSE',
          amount: '10',
          currency: 'USD',
          occurredAt: new Date('2026-08-31T21:00:00Z'),
        },
        {
          userId: user.user.id,
          categoryId: category,
          type: 'EXPENSE',
          amount: '50',
          currency: 'TRY',
          occurredAt: new Date('2026-09-30T20:59:59Z'),
        },
        {
          userId: user.user.id,
          categoryId: category,
          type: 'EXPENSE',
          amount: '999',
          currency: 'TRY',
          occurredAt: new Date('2026-09-30T21:00:00Z'),
        },
      ],
    });
    const budgets = await get('/budgets').query({ date: '2026-09-15T12:00:00Z' });
    expect(budgets.status).toBe(200);
    expect(budgets.body[0]).toMatchObject({
      actualAmount: '450',
      remainingAmount: '550',
      progressPercent: '45',
    });
    const report = await get('/reports/monthly').query({ month: '2026-09', currency: 'TRY' });
    expect(report.status).toBe(200);
    expect(report.body.totalExpense).toBe('450');
  });
  it('returns 503 instead of incomplete budget and report totals', async () => {
    await prisma.budget.create({
      data: {
        userId: user.user.id,
        categoryId: category,
        amount: '1000',
        currency: 'TRY',
        period: 'MONTHLY',
        periodStart: new Date('2026-09-01T00:00:00Z'),
      },
    });
    await prisma.transaction.create({
      data: {
        userId: user.user.id,
        categoryId: category,
        type: 'EXPENSE',
        amount: '10',
        currency: 'USD',
        occurredAt: new Date('2026-09-15T12:00:00Z'),
      },
    });
    convert.mockRejectedValue(new ServiceUnavailableException('FX unavailable'));
    expect((await get('/budgets').query({ date: '2026-09-15T12:00:00Z' })).status).toBe(503);
    expect(
      (await get('/reports/monthly').query({ month: '2026-09', currency: 'TRY' })).status,
    ).toBe(503);
  });
  it('retains completed goals as a financial health signal', async () => {
    const now = new Date();
    const month = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now);
    const year = Number(month.find((p) => p.type === 'year')!.value),
      number = Number(month.find((p) => p.type === 'month')!.value);
    await prisma.budget.create({
      data: {
        userId: user.user.id,
        categoryId: category,
        amount: '1000',
        currency: 'TRY',
        period: 'MONTHLY',
        periodStart: new Date(Date.UTC(year, number - 1, 1)),
      },
    });
    await prisma.transaction.create({
      data: {
        userId: user.user.id,
        categoryId: income,
        type: 'INCOME',
        amount: '2000',
        currency: 'TRY',
        occurredAt: now,
      },
    });
    await prisma.savingsGoal.create({
      data: {
        userId: user.user.id,
        name: 'Completed',
        targetAmount: '100',
        currentAmount: '100',
        currency: 'TRY',
        status: 'COMPLETED',
        completedAt: now,
      },
    });
    const response = await get('/dashboard/financial-health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ isReady: true, missingSignals: [], score: 100 });
  });
  it('isolates budgets from other users', async () => {
    const other = (
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Other User', email: 'other@example.com', password: 'password123' })
    ).body;
    const budget = await prisma.budget.create({
      data: {
        userId: other.user.id,
        categoryId: category,
        amount: '1000',
        currency: 'TRY',
        period: 'MONTHLY',
        periodStart: new Date('2026-09-01T00:00:00Z'),
      },
    });
    expect((await get('/budgets/' + budget.id)).status).toBe(404);
    expect((await get('/budgets').query({ date: '2026-09-15T12:00:00Z' })).body).toEqual([]);
  });
  it('consumes a reset token once and revokes old sessions', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'regression@example.com' });
    expect(response.status).toBe(202);
    const token = send.mock.calls[0]![1] as string;
    const reset = () =>
      request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, password: 'new-password-123' });
    expect((await reset()).status).toBe(204);
    expect((await reset()).status).toBe(400);
    expect((await get('/auth/me')).status).toBe(401);
    expect(
      (
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'regression@example.com', password: 'new-password-123' })
      ).status,
    ).toBe(200);
  });
  it('rejects expired reset tokens and does not reveal account existence in responses', async () => {
    const known = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'regression@example.com' });
    const unknown = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'missing@example.com' });
    expect(known.body).toEqual(unknown.body);
    expect(unknown.status).toBe(202);
    const token = send.mock.calls[0]![1] as string;
    await prisma.passwordReset.updateMany({ data: { expiresAt: new Date(0) } });
    expect(
      (
        await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send({ token, password: 'new-password-123' })
      ).status,
    ).toBe(400);
  });
});
