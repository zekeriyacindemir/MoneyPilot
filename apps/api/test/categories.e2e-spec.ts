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
    expect(categories).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: secondUserCategoryId })]));
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
    expect((income.body as CategoryResponse[]).every((category) => category.type === 'INCOME')).toBe(true);
    expect((income.body as CategoryResponse[]).map((category) => category.name)).toEqual(['Freelance', 'Salary']);
    expect(expense.status).toBe(200);
    expect((expense.body as CategoryResponse[]).every((category) => category.type === 'EXPENSE')).toBe(true);
    expect((expense.body as CategoryResponse[]).map((category) => category.name)).toEqual(['Market']);
  });

  it('filters categories by case-insensitive name search', async () => {
    const response = await request(application.getHttpServer())
      .get('/categories')
      .query({ search: 'freE' })
      .set('Authorization', `Bearer ${firstUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([expect.objectContaining({ id: firstUserCategoryId, name: 'Freelance' })]);
  });

  it('rejects an invalid category type filter', async () => {
    const response = await request(application.getHttpServer())
      .get('/categories')
      .query({ type: 'TRANSFER' })
      .set('Authorization', `Bearer ${firstUser.accessToken}`);

    expect(response.status).toBe(400);
  });

  async function registerUser(prefix: string): Promise<AuthenticationResponse> {
    const response = await request(application.getHttpServer()).post('/auth/register').send({
      name: `${prefix} user`,
      email: `${prefix}@categories.example.com`,
      password: 'password123',
    });

    expect(response.status).toBe(201);
    return response.body as AuthenticationResponse;
  }
});
