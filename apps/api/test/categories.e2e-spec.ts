import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { CategoryType, PrismaClient } from '@prisma/client';
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

interface CategoryResponse {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string | null;
  icon: string | null;
  isSystem: boolean;
}

describe('Categories (e2e)', () => {
  let application: INestApplication;
  let firstUser: AuthenticationResponse;
  let secondUser: AuthenticationResponse;
  let firstUserCategoryId: string;
  let secondUserCategoryId: string;

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
    await Promise.all([
      prisma.category.create({
        data: {
          name: 'Salary',
          type: CategoryType.INCOME,
          isSystem: true,
          color: '#22C55E',
          icon: 'wallet',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Market',
          type: CategoryType.EXPENSE,
          isSystem: true,
          color: '#F97316',
          icon: 'shopping-cart',
        },
      }),
    ]);
    firstUser = await registerUser('first');
    secondUser = await registerUser('second');
    const [firstUserCategory, secondUserCategory] = await Promise.all([
      prisma.category.create({
        data: {
          userId: firstUser.user.id,
          name: 'Freelance',
          type: CategoryType.INCOME,
          isSystem: false,
          color: '#14B8A6',
          icon: 'briefcase',
        },
      }),
      prisma.category.create({
        data: {
          userId: secondUser.user.id,
          name: 'Private Secret',
          type: CategoryType.EXPENSE,
          isSystem: false,
          color: '#64748B',
          icon: 'lock',
        },
      }),
    ]);
    firstUserCategoryId = firstUserCategory.id;
    secondUserCategoryId = secondUserCategory.id;
  });

  afterAll(async () => {
    await application.close();
    await prisma.$disconnect();
  });

  it('rejects unauthenticated requests', async () => {
    const response = await request(application.getHttpServer()).get('/categories');

    expect(response.status).toBe(401);
  });

  it('lists system categories and only the authenticated user’s private categories', async () => {
    const response = await request(application.getHttpServer())
      .get('/categories')
      .set('Authorization', `Bearer ${firstUser.accessToken}`);
    const categories = response.body as CategoryResponse[];

    expect(response.status).toBe(200);
    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Salary', type: 'INCOME', isSystem: true }),
        expect.objectContaining({ name: 'Market', type: 'EXPENSE', isSystem: true }),
        expect.objectContaining({ id: firstUserCategoryId, name: 'Freelance', isSystem: false }),
      ]),
    );
    expect(categories).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: secondUserCategoryId })]),
    );
    expect(categories.every((category) => !('userId' in category))).toBe(true);
    expect(categories.map((category) => `${category.type}:${category.name}`)).toEqual([
      'INCOME:Freelance',
      'INCOME:Salary',
      'EXPENSE:Market',
    ]);
  });

  it('filters categories by INCOME and EXPENSE type', async () => {
    const [income, expense] = await Promise.all([
      request(application.getHttpServer())
        .get('/categories')
        .query({ type: 'INCOME' })
        .set('Authorization', `Bearer ${firstUser.accessToken}`),
      request(application.getHttpServer())
        .get('/categories')
        .query({ type: 'EXPENSE' })
        .set('Authorization', `Bearer ${firstUser.accessToken}`),
    ]);

    expect(income.status).toBe(200);
    expect(
      (income.body as CategoryResponse[]).every((category) => category.type === 'INCOME'),
    ).toBe(true);
    expect((income.body as CategoryResponse[]).map((category) => category.name)).toEqual([
      'Freelance',
      'Salary',
    ]);
    expect(expense.status).toBe(200);
    expect(
      (expense.body as CategoryResponse[]).every((category) => category.type === 'EXPENSE'),
    ).toBe(true);
    expect((expense.body as CategoryResponse[]).map((category) => category.name)).toEqual([
      'Market',
    ]);
  });

  it('filters categories by case-insensitive name search', async () => {
    const response = await request(application.getHttpServer())
      .get('/categories')
      .query({ search: 'freE' })
      .set('Authorization', `Bearer ${firstUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({ id: firstUserCategoryId, name: 'Freelance' }),
    ]);
  });

  it('rejects an invalid category type filter', async () => {
    const response = await request(application.getHttpServer())
      .get('/categories')
      .query({ type: 'TRANSFER' })
      .set('Authorization', `Bearer ${firstUser.accessToken}`);

    expect(response.status).toBe(400);
  });

  describe('managing private categories', () => {
    it('creates a private category visible only to its owner', async () => {
      const created = await request(application.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${firstUser.accessToken}`)
        .send({ name: '  Side Project  ', type: 'INCOME', color: '#0EA5E9', icon: 'rocket' });

      expect(created.status).toBe(201);
      expect(created.body).toEqual({
        id: expect.any(String) as string,
        name: 'Side Project',
        type: 'INCOME',
        color: '#0EA5E9',
        icon: 'rocket',
        isSystem: false,
      });
      const stored = await prisma.category.findUniqueOrThrow({
        where: { id: (created.body as CategoryResponse).id },
      });
      expect(stored.userId).toBe(firstUser.user.id);

      const otherUserList = await request(application.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${secondUser.accessToken}`);
      expect(otherUserList.body).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Side Project' })]),
      );
    });

    it('validates category input', async () => {
      const invalidBodies = [
        { name: '   ', type: 'EXPENSE' },
        { name: 'x'.repeat(51), type: 'EXPENSE' },
        { name: 'Pets', type: 'TRANSFER' },
        { name: 'Pets', type: 'EXPENSE', color: 'red' },
        { name: 'Pets', type: 'EXPENSE', icon: 'Not An Icon' },
        { name: 'Pets', type: 'EXPENSE', isSystem: true },
      ];

      for (const body of invalidBodies) {
        const response = await request(application.getHttpServer())
          .post('/categories')
          .set('Authorization', `Bearer ${firstUser.accessToken}`)
          .send(body);
        expect(response.status).toBe(400);
      }
    });

    it('rejects names that duplicate a system or own category of the same type', async () => {
      const [systemDuplicate, ownDuplicate, otherType, otherUsersName] = await Promise.all([
        createCategory(firstUser, { name: 'market', type: 'EXPENSE' }),
        createCategory(firstUser, { name: 'FREELANCE', type: 'INCOME' }),
        createCategory(firstUser, { name: 'Freelance', type: 'EXPENSE' }),
        createCategory(firstUser, { name: 'Private Secret', type: 'EXPENSE' }),
      ]);

      expect(systemDuplicate.status).toBe(409);
      expect(ownDuplicate.status).toBe(409);
      expect(otherType.status).toBe(201);
      expect(otherUsersName.status).toBe(201);
    });

    it('allows only one of two concurrent requests with the same name', async () => {
      const responses = await Promise.all([
        createCategory(firstUser, { name: 'Pets', type: 'EXPENSE' }),
        createCategory(firstUser, { name: 'pets', type: 'EXPENSE' }),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    });

    it('enforces the per-user category limit', async () => {
      await prisma.category.createMany({
        data: Array.from({ length: 99 }, (_, index) => ({
          userId: firstUser.user.id,
          name: `Bulk ${index}`,
          type: CategoryType.EXPENSE,
        })),
      });

      const overLimit = await createCategory(firstUser, { name: 'One too many', type: 'EXPENSE' });
      const otherUser = await createCategory(secondUser, { name: 'Still fine', type: 'EXPENSE' });

      expect(overLimit.status).toBe(400);
      expect(otherUser.status).toBe(201);
    });

    it('updates name, color and icon but not the type', async () => {
      const updated = await request(application.getHttpServer())
        .patch(`/categories/${firstUserCategoryId}`)
        .set('Authorization', `Bearer ${firstUser.accessToken}`)
        .send({ name: 'Consulting', color: '#000000', icon: 'briefcase-business' });
      const typeChange = await request(application.getHttpServer())
        .patch(`/categories/${firstUserCategoryId}`)
        .set('Authorization', `Bearer ${firstUser.accessToken}`)
        .send({ type: 'EXPENSE' });
      const caseOnlyRename = await request(application.getHttpServer())
        .patch(`/categories/${firstUserCategoryId}`)
        .set('Authorization', `Bearer ${firstUser.accessToken}`)
        .send({ name: 'consulting' });
      const systemNameRename = await request(application.getHttpServer())
        .patch(`/categories/${firstUserCategoryId}`)
        .set('Authorization', `Bearer ${firstUser.accessToken}`)
        .send({ name: 'Salary' });

      expect(updated.status).toBe(200);
      expect(updated.body).toEqual(
        expect.objectContaining({
          name: 'Consulting',
          type: 'INCOME',
          color: '#000000',
          icon: 'briefcase-business',
        }),
      );
      expect(typeChange.status).toBe(400);
      expect(caseOnlyRename.status).toBe(200);
      expect(systemNameRename.status).toBe(409);
    });

    it('hides other users’ categories and protects system categories', async () => {
      const systemCategory = await prisma.category.findFirstOrThrow({ where: { isSystem: true } });

      const [foreignUpdate, foreignDelete, systemUpdate, systemDelete, missing] = await Promise.all(
        [
          request(application.getHttpServer())
            .patch(`/categories/${secondUserCategoryId}`)
            .set('Authorization', `Bearer ${firstUser.accessToken}`)
            .send({ name: 'Hijacked' }),
          request(application.getHttpServer())
            .delete(`/categories/${secondUserCategoryId}`)
            .set('Authorization', `Bearer ${firstUser.accessToken}`),
          request(application.getHttpServer())
            .patch(`/categories/${systemCategory.id}`)
            .set('Authorization', `Bearer ${firstUser.accessToken}`)
            .send({ name: 'Renamed' }),
          request(application.getHttpServer())
            .delete(`/categories/${systemCategory.id}`)
            .set('Authorization', `Bearer ${firstUser.accessToken}`),
          request(application.getHttpServer())
            .delete('/categories/00000000-0000-4000-8000-000000000000')
            .set('Authorization', `Bearer ${firstUser.accessToken}`),
        ],
      );

      expect(foreignUpdate.status).toBe(404);
      expect(foreignDelete.status).toBe(404);
      expect(systemUpdate.status).toBe(403);
      expect(systemDelete.status).toBe(403);
      expect(missing.status).toBe(404);
      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: secondUserCategoryId } }),
      ).resolves.toEqual(expect.objectContaining({ name: 'Private Secret' }));
    });

    it('deletes an unused category and refuses one that is in use', async () => {
      const unused = await createCategory(firstUser, { name: 'Temporary', type: 'EXPENSE' });
      await prisma.transaction.create({
        data: {
          userId: firstUser.user.id,
          categoryId: firstUserCategoryId,
          type: 'INCOME',
          amount: '100.00',
          currency: 'TRY',
          occurredAt: new Date('2026-07-01T10:00:00.000Z'),
        },
      });

      const deleted = await request(application.getHttpServer())
        .delete(`/categories/${(unused.body as CategoryResponse).id}`)
        .set('Authorization', `Bearer ${firstUser.accessToken}`);
      const inUse = await request(application.getHttpServer())
        .delete(`/categories/${firstUserCategoryId}`)
        .set('Authorization', `Bearer ${firstUser.accessToken}`);

      expect(deleted.status).toBe(204);
      expect(inUse.status).toBe(409);
      expect(inUse.body).toEqual(expect.objectContaining({ transactionCount: 1, budgetCount: 0 }));
      await expect(
        prisma.category.findUnique({ where: { id: firstUserCategoryId } }),
      ).resolves.not.toBeNull();
    });

    it('lets a new category be used for transactions', async () => {
      const created = await createCategory(firstUser, { name: 'Pets', type: 'EXPENSE' });
      const transaction = await request(application.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${firstUser.accessToken}`)
        .send({
          categoryId: (created.body as CategoryResponse).id,
          type: 'EXPENSE',
          amount: '250.00',
          currency: 'TRY',
          occurredAt: '2026-07-02T10:00:00.000Z',
        });

      expect(transaction.status).toBe(201);
    });
  });

  function createCategory(
    user: AuthenticationResponse,
    body: { name: string; type: 'INCOME' | 'EXPENSE' },
  ) {
    return request(application.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send(body);
  }

  async function registerUser(prefix: string): Promise<AuthenticationResponse> {
    const response = await request(application.getHttpServer())
      .post('/auth/register')
      .send({
        name: `${prefix} user`,
        email: `${prefix}@categories.example.com`,
        password: 'password123',
      });

    expect(response.status).toBe(201);
    return response.body as AuthenticationResponse;
  }
});
