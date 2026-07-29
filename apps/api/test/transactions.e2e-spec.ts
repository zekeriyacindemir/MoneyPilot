import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoryType, PrismaClient } from '@prisma/client';
import request = require('supertest');
import type { Response } from 'supertest';

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

const prisma = new PrismaClient({
  datasources: { db: { url: testDatabaseUrl } },
});

interface AuthenticationResponse {
  accessToken: string;
  user: { id: string };
}

interface TransactionResponse {
  id: string;
  categoryId: string;
  category: { id: string; name: string };
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  note: string | null;
  occurredAt: string;
}

describe('Transactions (e2e)', () => {
  let application: INestApplication;
  let expenseCategoryId: string;
  let incomeCategoryId: string;
  let emailSequence = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    application = moduleRef.createNestApplication();
    application.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await application.init();
  });

  beforeEach(async () => {
    emailSequence = 0;
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "AuthSession", "Transaction", "Budget", "SavingsGoal", "Category", "User" CASCADE',
    );
    const [expenseCategory, incomeCategory] = await Promise.all([
      prisma.category.create({
        data: { name: 'Market', type: CategoryType.EXPENSE, isSystem: true },
      }),
      prisma.category.create({
        data: { name: 'Salary', type: CategoryType.INCOME, isSystem: true },
      }),
    ]);
    expenseCategoryId = expenseCategory.id;
    incomeCategoryId = incomeCategory.id;
  });

  afterAll(async () => {
    await application.close();
    await prisma.$disconnect();
  });

  it('creates a transaction for the authenticated user', async () => {
    const user = await registerUser();
    const response = await createTransaction(user.accessToken, {
      amount: '125.5',
      note: 'Weekly grocery shopping',
    });
    const body = response.body as TransactionResponse;

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      categoryId: expenseCategoryId,
      type: 'EXPENSE',
      amount: '125.5',
      note: 'Weekly grocery shopping',
    });
    expect(body).not.toHaveProperty('userId');
    expect(body.category).toMatchObject({ id: expenseCategoryId, name: 'Market' });
  });

  it('lists only the authenticated user’s transactions', async () => {
    const user = await registerUser();
    const otherUser = await registerUser();
    await createTransaction(user.accessToken, { amount: '10.00', note: 'Mine' });
    await createTransaction(otherUser.accessToken, { amount: '20.00', note: 'Not mine' });

    const response = await request(application.getHttpServer())
      .get('/transactions')
      .set('Authorization', `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(response.body.items).toHaveLength(1);
    expect((response.body.items[0] as TransactionResponse).note).toBe('Mine');
  });

  it('updates a transaction owned by the authenticated user', async () => {
    const user = await registerUser();
    const transaction = await createTransaction(user.accessToken, { amount: '125.50' });

    const response = await request(application.getHttpServer())
      .patch(`/transactions/${(transaction.body as TransactionResponse).id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ amount: '150.75', note: 'Updated grocery shopping note' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: (transaction.body as TransactionResponse).id,
      amount: '150.75',
      note: 'Updated grocery shopping note',
    });
  });

  it('deletes a transaction owned by the authenticated user', async () => {
    const user = await registerUser();
    const transaction = await createTransaction(user.accessToken, { amount: '125.50' });
    const id = (transaction.body as TransactionResponse).id;

    const deletion = await request(application.getHttpServer())
      .delete(`/transactions/${id}`)
      .set('Authorization', `Bearer ${user.accessToken}`);
    const retrieval = await request(application.getHttpServer())
      .get(`/transactions/${id}`)
      .set('Authorization', `Bearer ${user.accessToken}`);

    expect(deletion.status).toBe(204);
    expect(retrieval.status).toBe(404);
  });

  it('does not allow another user to read, update, or delete a transaction', async () => {
    const owner = await registerUser();
    const otherUser = await registerUser();
    const transaction = await createTransaction(owner.accessToken, { amount: '125.50' });
    const id = (transaction.body as TransactionResponse).id;

    const [read, update, deletion] = await Promise.all([
      request(application.getHttpServer()).get(`/transactions/${id}`).set('Authorization', `Bearer ${otherUser.accessToken}`),
      request(application.getHttpServer()).patch(`/transactions/${id}`).set('Authorization', `Bearer ${otherUser.accessToken}`).send({ note: 'Attempted update' }),
      request(application.getHttpServer()).delete(`/transactions/${id}`).set('Authorization', `Bearer ${otherUser.accessToken}`),
    ]);

    expect(read.status).toBe(404);
    expect(update.status).toBe(404);
    expect(deletion.status).toBe(404);
  });

  it('rejects an unknown category and a category with the wrong transaction type', async () => {
    const user = await registerUser();
    const missingCategory = await createTransaction(user.accessToken, {
      categoryId: '11111111-1111-4111-8111-111111111111',
      amount: '20.00',
    });
    const wrongTypeCategory = await createTransaction(user.accessToken, {
      categoryId: incomeCategoryId,
      amount: '20.00',
    });

    expect(missingCategory.status).toBe(404);
    expect(wrongTypeCategory.status).toBe(400);
  });

  it('rejects invalid UUIDs and non-positive amounts', async () => {
    const user = await registerUser();
    const invalidId = await request(application.getHttpServer())
      .get('/transactions/not-a-uuid')
      .set('Authorization', `Bearer ${user.accessToken}`);
    const zeroAmount = await createTransaction(user.accessToken, { amount: '0' });
    const negativeAmount = await createTransaction(user.accessToken, { amount: '-1.00' });

    expect(invalidId.status).toBe(400);
    expect(zeroAmount.status).toBe(400);
    expect(negativeAmount.status).toBe(400);
  });

  it('paginates transactions using the requested page and limit', async () => {
    const user = await registerUser();
    await createTransaction(user.accessToken, { amount: '10.00', occurredAt: '2026-07-01T10:00:00.000Z' });
    await createTransaction(user.accessToken, { amount: '20.00', occurredAt: '2026-07-02T10:00:00.000Z' });
    await createTransaction(user.accessToken, { amount: '30.00', occurredAt: '2026-07-03T10:00:00.000Z' });

    const response = await request(application.getHttpServer())
      .get('/transactions')
      .query({ page: 2, limit: 1, sortBy: 'occurredAt', sortOrder: 'asc' })
      .set('Authorization', `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 2, limit: 1, total: 3, totalPages: 3 });
    expect(response.body.items).toHaveLength(1);
    expect((response.body.items[0] as TransactionResponse).amount).toBe('20');
  });

  it('filters by category and type, searches notes, and filters date ranges', async () => {
    const user = await registerUser();
    await createTransaction(user.accessToken, {
      amount: '10.00',
      note: 'Grocery market',
      occurredAt: '2026-07-10T10:00:00.000Z',
    });
    await createTransaction(user.accessToken, {
      categoryId: incomeCategoryId,
      type: 'INCOME',
      amount: '200.00',
      note: 'July salary',
      occurredAt: '2026-07-15T10:00:00.000Z',
    });
    await createTransaction(user.accessToken, {
      amount: '30.00',
      note: 'Grocery market',
      occurredAt: '2026-08-01T10:00:00.000Z',
    });

    const [categoryAndType, search, dateRange] = await Promise.all([
      request(application.getHttpServer())
        .get('/transactions')
        .query({ category: expenseCategoryId, type: 'EXPENSE' })
        .set('Authorization', `Bearer ${user.accessToken}`),
      request(application.getHttpServer())
        .get('/transactions')
        .query({ search: 'GROCERY' })
        .set('Authorization', `Bearer ${user.accessToken}`),
      request(application.getHttpServer())
        .get('/transactions')
        .query({ dateFrom: '2026-07-01T00:00:00.000Z', dateTo: '2026-07-31T23:59:59.999Z' })
        .set('Authorization', `Bearer ${user.accessToken}`),
    ]);

    expect(categoryAndType.body.total).toBe(2);
    expect(search.body.total).toBe(2);
    expect(dateRange.body.total).toBe(2);
    expect(dateRange.body.items.map((item: TransactionResponse) => item.note)).toEqual(
      expect.arrayContaining(['Grocery market', 'July salary']),
    );
  });

  it('sorts transactions by the requested supported field and direction', async () => {
    const user = await registerUser();
    await createTransaction(user.accessToken, { amount: '20.00', occurredAt: '2026-07-01T10:00:00.000Z' });
    await createTransaction(user.accessToken, { amount: '100.00', occurredAt: '2026-07-02T10:00:00.000Z' });
    await createTransaction(user.accessToken, { amount: '50.00', occurredAt: '2026-07-03T10:00:00.000Z' });

    const response = await request(application.getHttpServer())
      .get('/transactions')
      .query({ sortBy: 'amount', sortOrder: 'asc' })
      .set('Authorization', `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.map((item: TransactionResponse) => item.amount)).toEqual(['20', '50', '100']);
  });

  async function registerUser(): Promise<AuthenticationResponse> {
    emailSequence += 1;
    const response = await request(application.getHttpServer()).post('/auth/register').send({
      name: `Test User ${emailSequence}`,
      email: `transaction-user-${emailSequence}@example.com`,
      password: 'password123',
    });

    expect(response.status).toBe(201);
    return response.body as AuthenticationResponse;
  }

  function createTransaction(
    accessToken: string,
    overrides: Partial<{
      categoryId: string;
      type: 'INCOME' | 'EXPENSE';
      amount: string;
      note: string;
      occurredAt: string;
    }>,
  ): Promise<Response> {
    return request(application.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        amount: '125.50',
        currency: 'TRY',
        occurredAt: '2026-07-28T10:30:00.000Z',
        ...overrides,
      });
  }
});
