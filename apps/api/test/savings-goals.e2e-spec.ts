import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import type { Response } from 'supertest';

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://moneypilot:moneypilot_dev_password@localhost:5432/moneypilot_test?schema=public';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-that-is-at-least-32-characters';
process.env.JWT_ACCESS_TOKEN_EXPIRES_IN = '15m';
process.env.NODE_ENV = 'test';
process.env.REFRESH_TOKEN_HMAC_SECRET = 'test-refresh-hmac-secret-that-is-at-least-32-characters';

const { AppModule } = require('../src/app.module') as typeof import('../src/app.module');
const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

interface AuthenticationResponse { accessToken: string; }
interface SavingsGoalResponse { id: string; name: string; targetAmount: string; currentAmount: string; remainingAmount: string; progressPercent: string; status: string; completedAt: string | null; }

describe('Savings goals (e2e)', () => {
  let application: INestApplication;
  let emailSequence = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    application = moduleRef.createNestApplication();
    application.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await application.init();
  });

  beforeEach(async () => {
    emailSequence = 0;
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "AuthSession", "Transaction", "Budget", "SavingsGoal", "Category", "User" CASCADE');
  });

  afterAll(async () => { await application.close(); await prisma.$disconnect(); });

  it('returns an empty list for a new user and rejects unauthenticated access', async () => {
    const user = await registerUser();
    const [empty, unauthorized] = await Promise.all([
      request(application.getHttpServer()).get('/savings-goals').set('Authorization', `Bearer ${user.accessToken}`),
      request(application.getHttpServer()).get('/savings-goals'),
    ]);
    expect(empty.status).toBe(200); expect(empty.body).toEqual([]); expect(unauthorized.status).toBe(401);
  });

  it('creates, reads, updates, and deletes an owned goal with decimal strings', async () => {
    const user = await registerUser();
    const created = await createGoal(user.accessToken, { name: 'Acil durum fonu', targetAmount: '1000.1250' });
    const goal = created.body as SavingsGoalResponse;
    expect(created.status).toBe(201);
    expect(goal).toMatchObject({ name: 'Acil durum fonu', targetAmount: '1000.125', currentAmount: '0', remainingAmount: '1000.125', progressPercent: '0', status: 'ACTIVE' });
    const read = await request(application.getHttpServer()).get(`/savings-goals/${goal.id}`).set('Authorization', `Bearer ${user.accessToken}`);
    const updated = await request(application.getHttpServer()).patch(`/savings-goals/${goal.id}`).set('Authorization', `Bearer ${user.accessToken}`).send({ name: 'Yeni ad', priority: 'HIGH' });
    const deleted = await request(application.getHttpServer()).delete(`/savings-goals/${goal.id}`).set('Authorization', `Bearer ${user.accessToken}`);
    expect(read.status).toBe(200); expect(updated.body).toMatchObject({ name: 'Yeni ad', priority: 'HIGH' }); expect(deleted.status).toBe(204);
    const missing = await request(application.getHttpServer()).get(`/savings-goals/${goal.id}`).set('Authorization', `Bearer ${user.accessToken}`);
    expect(missing.status).toBe(404);
  });

  it('isolates every goal operation to its owner', async () => {
    const owner = await registerUser(); const other = await registerUser();
    const goal = (await createGoal(owner.accessToken)).body as SavingsGoalResponse;
    const [read, update, amount, deletion] = await Promise.all([
      request(application.getHttpServer()).get(`/savings-goals/${goal.id}`).set('Authorization', `Bearer ${other.accessToken}`),
      request(application.getHttpServer()).patch(`/savings-goals/${goal.id}`).set('Authorization', `Bearer ${other.accessToken}`).send({ name: 'Not mine' }),
      request(application.getHttpServer()).patch(`/savings-goals/${goal.id}/current-amount`).set('Authorization', `Bearer ${other.accessToken}`).send({ currentAmount: '20' }),
      request(application.getHttpServer()).delete(`/savings-goals/${goal.id}`).set('Authorization', `Bearer ${other.accessToken}`),
    ]);
    expect([read.status, update.status, amount.status, deletion.status]).toEqual([404, 404, 404, 404]);
  });

  it('rejects non-positive targets and negative current amounts', async () => {
    const user = await registerUser();
    const [zeroTarget, negativeTarget] = await Promise.all([createGoal(user.accessToken, { targetAmount: '0' }), createGoal(user.accessToken, { targetAmount: '-1' })]);
    const goal = (await createGoal(user.accessToken)).body as SavingsGoalResponse;
    const [negativeCurrent, invalidPrecision] = await Promise.all([
      request(application.getHttpServer()).patch(`/savings-goals/${goal.id}/current-amount`).set('Authorization', `Bearer ${user.accessToken}`).send({ currentAmount: '-0.01' }),
      request(application.getHttpServer()).patch(`/savings-goals/${goal.id}/current-amount`).set('Authorization', `Bearer ${user.accessToken}`).send({ currentAmount: '1.12345' }),
    ]);
    expect([zeroTarget.status, negativeTarget.status, negativeCurrent.status, invalidPrecision.status]).toEqual([400, 400, 400, 400]);
  });

  it('automatically completes, reverses completion, and recalculates completion after a target change', async () => {
    const user = await registerUser(); const goal = (await createGoal(user.accessToken, { targetAmount: '100' })).body as SavingsGoalResponse;
    const completed = await request(application.getHttpServer()).patch(`/savings-goals/${goal.id}/current-amount`).set('Authorization', `Bearer ${user.accessToken}`).send({ currentAmount: '125.5' });
    expect(completed.status).toBe(200); expect(completed.body).toMatchObject({ currentAmount: '125.5', remainingAmount: '0', progressPercent: '125.5', status: 'COMPLETED' }); expect((completed.body as SavingsGoalResponse).completedAt).not.toBeNull();
    const reversed = await request(application.getHttpServer()).patch(`/savings-goals/${goal.id}/current-amount`).set('Authorization', `Bearer ${user.accessToken}`).send({ currentAmount: '99.99' });
    expect(reversed.body).toMatchObject({ currentAmount: '99.99', status: 'ACTIVE', completedAt: null });
    const recompleted = await request(application.getHttpServer()).patch(`/savings-goals/${goal.id}/current-amount`).set('Authorization', `Bearer ${user.accessToken}`).send({ currentAmount: '100' });
    expect(recompleted.body).toMatchObject({ status: 'COMPLETED' });
    const raisedTarget = await request(application.getHttpServer()).patch(`/savings-goals/${goal.id}`).set('Authorization', `Bearer ${user.accessToken}`).send({ targetAmount: '200' });
    expect(raisedTarget.body).toMatchObject({ targetAmount: '200', currentAmount: '100', remainingAmount: '100', progressPercent: '50', status: 'ACTIVE', completedAt: null });
  });

  async function registerUser(): Promise<AuthenticationResponse> { emailSequence += 1; const response = await request(application.getHttpServer()).post('/auth/register').send({ name: `Savings User ${emailSequence}`, email: `savings-user-${emailSequence}@example.com`, password: 'password123' }); expect(response.status).toBe(201); return response.body as AuthenticationResponse; }
  function createGoal(accessToken: string, overrides: Partial<{ name: string; targetAmount: string }> = {}): Promise<Response> { return request(application.getHttpServer()).post('/savings-goals').set('Authorization', `Bearer ${accessToken}`).send({ name: 'Tatil', targetAmount: '1000', currency: 'TRY', priority: 'MEDIUM', ...overrides }); }
});
