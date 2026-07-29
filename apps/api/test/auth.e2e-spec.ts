import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
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
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

describe('Authentication (e2e)', () => {
  let application: INestApplication;
  let emailSequence = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  });

  afterAll(async () => {
    await application.close();
    await prisma.$disconnect();
  });

  it('registers a user with normalized email, secure response fields, and a refresh cookie', async () => {
    const response = await register('  Ada Lovelace  ', '  ADA@EXAMPLE.COM  ');
    const body = response.body as AuthenticationResponse;
    const refreshCookie = getRefreshCookie(response);

    expect(response.status).toBe(201);
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.user).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('refreshToken');
    expectRefreshCookieOptions(response);

    const user = await prisma.user.findUnique({ where: { email: 'ada@example.com' } });
    const session = await prisma.authSession.findFirst({ where: { userId: user?.id } });

    expect(user).not.toBeNull();
    expect(session).not.toBeNull();
    expect(session?.refreshTokenHash).toHaveLength(64);
    expect(session?.refreshTokenHash).not.toBe(refreshCookie.slice('refresh_token='.length));
  });

  it('rejects duplicate registrations and invalid register input', async () => {
    await register('Ada Lovelace', 'ada@example.com');

    const duplicate = await register('Another Ada', 'ADA@EXAMPLE.COM');
    const invalidEmail = await register('Ada Lovelace', 'not-an-email');
    const shortPassword = await request(application.getHttpServer()).post('/auth/register').send({
      name: 'Ada Lovelace',
      email: uniqueEmail(),
      password: 'short',
    });

    expect(duplicate.status).toBe(409);
    expect(invalidEmail.status).toBe(400);
    expect(shortPassword.status).toBe(400);
  });

  it('logs in with valid credentials and creates a new session', async () => {
    const registration = await register('Ada Lovelace', 'ada@example.com');
    const login = await request(application.getHttpServer()).post('/auth/login').send({
      email: '  ADA@EXAMPLE.COM  ',
      password: 'password123',
    });

    expect(login.status).toBe(200);
    expect((login.body as AuthenticationResponse).accessToken).toEqual(expect.any(String));
    expect((login.body as AuthenticationResponse).user).toEqual(
      expect.objectContaining({ id: (registration.body as AuthenticationResponse).user.id }),
    );
    expectRefreshCookieOptions(login);
    expect(await prisma.authSession.count()).toBe(2);
  });

  it('returns the same unauthorized message for missing users and invalid passwords', async () => {
    await register('Ada Lovelace', 'ada@example.com');

    const invalidPassword = await request(application.getHttpServer()).post('/auth/login').send({
      email: 'ada@example.com',
      password: 'wrongpass',
    });
    const missingUser = await request(application.getHttpServer()).post('/auth/login').send({
      email: 'missing@example.com',
      password: 'password123',
    });

    expect(invalidPassword.status).toBe(401);
    expect(missingUser.status).toBe(401);
    expect(invalidPassword.body.message).toBe(missingUser.body.message);
  });

  it('rotates refresh tokens while preserving the session and rejecting the old token', async () => {
    const registration = await register('Ada Lovelace', 'ada@example.com');
    const originalCookie = getRefreshCookie(registration);
    const originalSession = await prisma.authSession.findFirstOrThrow();

    const refresh = await request(application.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', originalCookie);
    const rotatedCookie = getRefreshCookie(refresh);
    const updatedSession = await prisma.authSession.findUniqueOrThrow({
      where: { id: originalSession.id },
    });
    const oldTokenReuse = await request(application.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', originalCookie);

    expect(refresh.status).toBe(200);
    expect(refresh.body).toEqual({ accessToken: expect.any(String) });
    expect(rotatedCookie).not.toBe(originalCookie);
    expect(await prisma.authSession.count()).toBe(1);
    expect(updatedSession.refreshTokenHash).not.toBe(originalSession.refreshTokenHash);
    expect(updatedSession.lastUsedAt).not.toBeNull();
    expect(oldTokenReuse.status).toBe(401);
  });

  it('rejects missing, revoked, and expired refresh sessions', async () => {
    const missingCookie = await request(application.getHttpServer()).post('/auth/refresh');
    expect(missingCookie.status).toBe(401);

    const revokedRegistration = await register('Ada Lovelace', 'revoked@example.com');
    const revokedSession = await prisma.authSession.findFirstOrThrow();
    await prisma.authSession.update({
      where: { id: revokedSession.id },
      data: { revokedAt: new Date() },
    });
    const revokedRefresh = await request(application.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', getRefreshCookie(revokedRegistration));
    expect(revokedRefresh.status).toBe(401);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "AuthSession", "Transaction", "Budget", "SavingsGoal", "Category", "User" CASCADE',
    );
    const expiredRegistration = await register('Ada Lovelace', 'expired@example.com');
    const expiredSession = await prisma.authSession.findFirstOrThrow();
    await prisma.authSession.update({
      where: { id: expiredSession.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expiredRefresh = await request(application.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', getRefreshCookie(expiredRegistration));
    expect(expiredRefresh.status).toBe(401);
  });

  it('logs out idempotently and clears the refresh cookie', async () => {
    const registration = await register('Ada Lovelace', 'ada@example.com');
    const refreshCookie = getRefreshCookie(registration);
    const session = await prisma.authSession.findFirstOrThrow();

    const firstLogout = await request(application.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', refreshCookie);
    const secondLogout = await request(application.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', refreshCookie);
    const noCookieLogout = await request(application.getHttpServer()).post('/auth/logout');
    const revokedSession = await prisma.authSession.findUniqueOrThrow({ where: { id: session.id } });

    expect(firstLogout.status).toBe(204);
    expect(secondLogout.status).toBe(204);
    expect(noCookieLogout.status).toBe(204);
    expect(revokedSession.revokedAt).not.toBeNull();
    expectClearedRefreshCookie(firstLogout);
  });

  it('returns only safe current-user data for a valid access token', async () => {
    const registration = await register('Ada Lovelace', 'ada@example.com');
    const accessToken = (registration.body as AuthenticationResponse).accessToken;

    const currentUser = await request(application.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    const noToken = await request(application.getHttpServer()).get('/auth/me');
    const invalidToken = await request(application.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(currentUser.status).toBe(200);
    expect(currentUser.body).toEqual(
      expect.objectContaining({ id: (registration.body as AuthenticationResponse).user.id }),
    );
    expect(currentUser.body).not.toHaveProperty('passwordHash');
    expect(currentUser.body).not.toHaveProperty('authSessions');
    expect(noToken.status).toBe(401);
    expect(invalidToken.status).toBe(401);
  });

  it('revokes only the authenticated user sessions during logout-all', async () => {
    const firstUser = await register('Ada Lovelace', 'ada@example.com');
    const firstUserToken = (firstUser.body as AuthenticationResponse).accessToken;
    await request(application.getHttpServer()).post('/auth/login').send({
      email: 'ada@example.com',
      password: 'password123',
    });
    const secondUser = await register('Grace Hopper', 'grace@example.com');
    const secondUserId = (secondUser.body as AuthenticationResponse).user.id;

    const firstLogoutAll = await request(application.getHttpServer())
      .post('/auth/logout-all')
      .set('Authorization', `Bearer ${firstUserToken}`);
    const secondLogoutAll = await request(application.getHttpServer())
      .post('/auth/logout-all')
      .set('Authorization', `Bearer ${firstUserToken}`);
    const firstUserSessions = await prisma.authSession.findMany({
      where: { userId: (firstUser.body as AuthenticationResponse).user.id },
    });
    const secondUserSession = await prisma.authSession.findFirstOrThrow({
      where: { userId: secondUserId },
    });

    expect(firstLogoutAll.status).toBe(204);
    expect(secondLogoutAll.status).toBe(401);
    expect(firstUserSessions).toHaveLength(2);
    expect(firstUserSessions.every((session) => session.revokedAt !== null)).toBe(true);
    expect(secondUserSession.revokedAt).toBeNull();
    expectClearedRefreshCookie(firstLogoutAll);
  });

  it('updates a profile and requires the current password only when the email changes', async () => {
    const registration = await register('Ada Lovelace', 'ada@example.com');
    const accessToken = (registration.body as AuthenticationResponse).accessToken;

    const nameUpdate = await request(application.getHttpServer())
      .patch('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Ada Byron' });
    const sameEmail = await request(application.getHttpServer())
      .patch('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'ada@example.com' });
    const rejectedEmailChange = await request(application.getHttpServer())
      .patch('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'ada-byron@example.com' });
    const emailUpdate = await request(application.getHttpServer())
      .patch('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: '  ADA-BYRON@EXAMPLE.COM ', currentPassword: 'password123' });

    expect(nameUpdate.status).toBe(200);
    expect(nameUpdate.body).toMatchObject({ name: 'Ada Byron', email: 'ada@example.com' });
    expect(sameEmail.status).toBe(200);
    expect(rejectedEmailChange.status).toBe(401);
    expect(emailUpdate.status).toBe(200);
    expect(emailUpdate.body).toMatchObject({ email: 'ada-byron@example.com' });
  });

  it('updates preferences only for the authenticated user', async () => {
    const firstUser = await register('Ada Lovelace', 'ada@example.com');
    const secondUser = await register('Grace Hopper', 'grace@example.com');
    const firstToken = (firstUser.body as AuthenticationResponse).accessToken;
    const secondUserId = (secondUser.body as AuthenticationResponse).user.id;

    const updated = await request(application.getHttpServer())
      .patch('/auth/preferences')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ defaultCurrency: 'EUR', budgetAlertsEnabled: false, weeklySummaryEnabled: true });
    const secondUserRecord = await prisma.user.findUniqueOrThrow({ where: { id: secondUserId } });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ defaultCurrency: 'EUR', budgetAlertsEnabled: false, weeklySummaryEnabled: true });
    expect(secondUserRecord).toMatchObject({ defaultCurrency: 'TRY', budgetAlertsEnabled: true, weeklySummaryEnabled: false });
  });

  it('changes the password, retains the current session, and revokes other sessions', async () => {
    const registration = await register('Ada Lovelace', 'ada@example.com');
    const accessToken = (registration.body as AuthenticationResponse).accessToken;
    const secondLogin = await request(application.getHttpServer()).post('/auth/login').send({ email: 'ada@example.com', password: 'password123' });
    const secondSessionToken = (secondLogin.body as AuthenticationResponse).accessToken;

    const changed = await request(application.getHttpServer())
      .patch('/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'password123', newPassword: 'new-password123' });
    const currentSession = await request(application.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);
    const revokedSession = await request(application.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${secondSessionToken}`);
    const oldLogin = await request(application.getHttpServer()).post('/auth/login').send({ email: 'ada@example.com', password: 'password123' });
    const newLogin = await request(application.getHttpServer()).post('/auth/login').send({ email: 'ada@example.com', password: 'new-password123' });

    expect(changed.status).toBe(204);
    expect(currentSession.status).toBe(200);
    expect(revokedSession.status).toBe(401);
    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });

  it('lists and revokes only the authenticated user sessions', async () => {
    const firstUser = await register('Ada Lovelace', 'ada@example.com');
    const firstToken = (firstUser.body as AuthenticationResponse).accessToken;
    const secondLogin = await request(application.getHttpServer()).post('/auth/login').send({ email: 'ada@example.com', password: 'password123' });
    const secondSession = await prisma.authSession.findFirstOrThrow({
      where: { userId: (firstUser.body as AuthenticationResponse).user.id },
      orderBy: { createdAt: 'desc' },
    });
    const otherUser = await register('Grace Hopper', 'grace@example.com');
    const otherSession = await prisma.authSession.findFirstOrThrow({ where: { userId: (otherUser.body as AuthenticationResponse).user.id } });

    const listed = await request(application.getHttpServer()).get('/auth/sessions').set('Authorization', `Bearer ${firstToken}`);
    const rejectedRevoke = await request(application.getHttpServer()).delete(`/auth/sessions/${otherSession.id}`).set('Authorization', `Bearer ${firstToken}`);
    const revoke = await request(application.getHttpServer()).delete(`/auth/sessions/${secondSession.id}`).set('Authorization', `Bearer ${firstToken}`);
    const secondSessionAccess = await request(application.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${(secondLogin.body as AuthenticationResponse).accessToken}`);

    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(2);
    expect(rejectedRevoke.status).toBe(404);
    expect(revoke.status).toBe(204);
    expect(secondSessionAccess.status).toBe(401);
  });

  it('exports only the authenticated user data and deletes their account', async () => {
    const firstUser = await register('Ada Lovelace', 'ada@example.com');
    const firstToken = (firstUser.body as AuthenticationResponse).accessToken;
    const secondUser = await register('Grace Hopper', 'grace@example.com');
    const firstUserId = (firstUser.body as AuthenticationResponse).user.id;
    const secondUserId = (secondUser.body as AuthenticationResponse).user.id;

    const exported = await request(application.getHttpServer()).get('/auth/export?format=json').set('Authorization', `Bearer ${firstToken}`);
    const csvExport = await request(application.getHttpServer()).get('/auth/export?format=csv').set('Authorization', `Bearer ${firstToken}`);
    const invalidExport = await request(application.getHttpServer()).get('/auth/export?format=xml').set('Authorization', `Bearer ${firstToken}`);
    const rejectedDelete = await request(application.getHttpServer()).delete('/auth/account').set('Authorization', `Bearer ${firstToken}`).send({ currentPassword: 'wrongpass' });
    const deleted = await request(application.getHttpServer()).delete('/auth/account').set('Authorization', `Bearer ${firstToken}`).send({ currentPassword: 'password123' });

    expect(exported.status).toBe(200);
    expect(exported.body).toMatchObject({ id: firstUserId, email: 'ada@example.com' });
    expect(exported.body).not.toMatchObject({ id: secondUserId });
    expect(csvExport.status).toBe(200);
    expect(csvExport.headers['content-type']).toContain('application/zip');
    expect(invalidExport.status).toBe(400);
    expect(rejectedDelete.status).toBe(401);
    expect(deleted.status).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: firstUserId } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: secondUserId } })).not.toBeNull();
  });

  async function register(name: string, email: string): Promise<Response> {
    return request(application.getHttpServer()).post('/auth/register').send({
      name,
      email,
      password: 'password123',
    });
  }

  function uniqueEmail(): string {
    emailSequence += 1;
    return `user-${emailSequence}@example.com`;
  }
});

function getRefreshCookie(response: Response): string {
  const cookies = getSetCookies(response);
  const refreshCookie = cookies.find((cookie) => cookie.startsWith('refresh_token='));

  if (!refreshCookie) {
    throw new Error('Expected refresh_token cookie.');
  }

  const [cookieValue] = refreshCookie.split(';');

  if (!cookieValue) {
    throw new Error('Expected refresh_token cookie value.');
  }

  return cookieValue;
}

function expectRefreshCookieOptions(response: Response): void {
  const cookie = getRefreshCookie(response);
  const setCookie = getSetCookies(response)[0];

  expect(cookie).toContain('refresh_token=');
  expect(setCookie).toContain('HttpOnly');
  expect(setCookie).toContain('SameSite=Lax');
}

function expectClearedRefreshCookie(response: Response): void {
  const cookie = getRefreshCookie(response);
  const setCookie = getSetCookies(response)[0];

  expect(cookie).toContain('refresh_token=');
  expect(setCookie).toContain('Max-Age=0');
}

function getSetCookies(response: Response): string[] {
  const setCookie = response.headers['set-cookie'];

  return typeof setCookie === 'string' ? [setCookie] : (setCookie ?? []);
}
