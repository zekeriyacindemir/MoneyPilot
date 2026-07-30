import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { CategoryType, PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request = require('supertest');

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://moneypilot:moneypilot_dev_password@localhost:5432/moneypilot_test?schema=public';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-that-is-at-least-32-characters';
process.env.JWT_ACCESS_TOKEN_EXPIRES_IN = '15m';
process.env.NODE_ENV = 'test';
process.env.REFRESH_TOKEN_HMAC_SECRET = 'test-refresh-hmac-secret-that-is-at-least-32-characters';
const { AppModule } = require('../src/app.module') as typeof import('../src/app.module');
const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

interface AuthenticationResponse { accessToken: string; user: { id: string }; }

describe('Reports (e2e)', () => {
  let application: INestApplication;
  let user: AuthenticationResponse;
  let incomeCategoryId: string;
  let foodCategoryId: string;
  let travelCategoryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    application = moduleRef.createNestApplication();
    application.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await application.init();
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "AuthSession", "Transaction", "Budget", "SavingsGoal", "Category", "User" CASCADE');
    const [income, food, travel] = await Promise.all([
      prisma.category.create({ data: { name: 'Salary', type: CategoryType.INCOME, isSystem: true } }),
      prisma.category.create({ data: { name: 'Food', type: CategoryType.EXPENSE, isSystem: true, color: '#ff0000' } }),
      prisma.category.create({ data: { name: 'Travel', type: CategoryType.EXPENSE, isSystem: true, color: '#00ff00' } }),
    ]);
    incomeCategoryId = income.id; foodCategoryId = food.id; travelCategoryId = travel.id;
    user = await registerUser('reports-user');
  });
  afterAll(async () => { await application.close(); await prisma.$disconnect(); });

  it('protects the endpoint and validates month and currency', async () => {
    expect((await request(application.getHttpServer()).get('/reports/monthly')).status).toBe(401);
    const invalidMonth = await getReport({ month: '2026-13', currency: 'TRY' });
    const invalidCurrency = await getReport({ month: '2026-07', currency: 'BTC' });
    expect(invalidMonth.status).toBe(400); expect(invalidCurrency.status).toBe(400);
  });

  it('uses the default currency and calculates Istanbul month metrics, differences and category shares', async () => {
    await prisma.user.update({ where: { id: user.user.id }, data: { defaultCurrency: 'USD' } });
    await add({ type: 'INCOME', amount: '100', currency: 'USD', categoryId: incomeCategoryId, occurredAt: '2026-07-10T10:00:00Z' });
    await add({ type: 'EXPENSE', amount: '25', currency: 'USD', categoryId: foodCategoryId, occurredAt: '2026-07-31T20:59:59Z' });
    await add({ type: 'EXPENSE', amount: '50', currency: 'USD', categoryId: travelCategoryId, occurredAt: '2026-07-15T10:00:00Z' });
    await add({ type: 'INCOME', amount: '80', currency: 'USD', categoryId: incomeCategoryId, occurredAt: '2026-06-10T10:00:00Z' });
    await add({ type: 'EXPENSE', amount: '20', currency: 'USD', categoryId: foodCategoryId, occurredAt: '2026-06-10T10:00:00Z' });
    await add({ type: 'EXPENSE', amount: '999', currency: 'USD', categoryId: foodCategoryId, occurredAt: '2026-07-31T21:00:00Z' });
    const other = await registerUser('other-reports-user');
    await prisma.transaction.create({ data: { userId: other.user.id, categoryId: foodCategoryId, type: 'EXPENSE', amount: '999', currency: 'USD', occurredAt: new Date('2026-07-15T10:00:00Z') } });
    const response = await getReport({ month: '2026-07' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ month: '2026-07', currency: 'USD', totalIncome: '100', totalExpense: '75', net: '25', savingsRate: '25', previousMonth: { incomeDifference: '20', expenseDifference: '55', netDifference: '-35' } });
    expect(response.body.categories).toEqual([
      expect.objectContaining({ categoryId: travelCategoryId, totalExpense: '50', transactionCount: 1, percentage: '66.67' }),
      expect.objectContaining({ categoryId: foodCategoryId, totalExpense: '25', transactionCount: 1, percentage: '33.33' }),
    ]);
  });

  it('returns null savings rate and no categories without income or expenses', async () => {
    await add({ type: 'EXPENSE', amount: '15', currency: 'TRY', categoryId: foodCategoryId, occurredAt: '2026-07-10T10:00:00Z' });
    const response = await getReport({ month: '2026-07', currency: 'TRY' });
    expect(response.body.savingsRate).toBeNull();
    expect(response.body.categories).toHaveLength(1);
  });

  function getReport(query: Record<string, string>) { return request(application.getHttpServer()).get('/reports/monthly').query(query).set('Authorization', `Bearer ${user.accessToken}`); }
  async function registerUser(prefix: string): Promise<AuthenticationResponse> { const response = await request(application.getHttpServer()).post('/auth/register').send({ name: prefix, email: `${prefix}@example.com`, password: 'password123' }); expect(response.status).toBe(201); return response.body as AuthenticationResponse; }
  async function add(input: { amount: string; categoryId: string; currency: 'TRY' | 'USD'; occurredAt: string; type: 'INCOME' | 'EXPENSE' }) { await prisma.transaction.create({ data: { ...input, userId: user.user.id, occurredAt: new Date(input.occurredAt) } }); }
});
