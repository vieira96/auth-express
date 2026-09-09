import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, type TestApp } from '../support/setupTestApp.js';
import type { UserType } from '@/types/user/UserType.js';

const jwtSecret = 'test-secret-for-user-routes';

describe('GET /users', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp({ jwtSecret });
  });

  afterEach(async () => {
    await testApp.clearDatabase();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('lista usuarios quando recebe um token valido', async () => {
    const users = [
      { email: 'user1@exemplo.com', passwordHash: 'password-hash' },
      { email: 'user2@exemplo.com', passwordHash: 'password-hash' },
      { email: 'user3@exemplo.com', passwordHash: 'password-hash' },
      { email: 'user4@exemplo.com', passwordHash: 'password-hash' },
    ];

    const createdUsers: UserType[] = await Promise.all(
      users.map((user) => testApp.prisma.user.create({ data: user })),
    );

    const authenticatedUser = createdUsers[0];
    
    const token = jwt.sign(
      { sub: authenticatedUser.id, email: authenticatedUser.email },
      jwtSecret,
    );

    const response = await request(testApp.app)
      .get('/users')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      users: expect.arrayContaining(
        createdUsers.map((user) =>
          expect.objectContaining({
            id: user.id,
            email: user.email,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        ),
      ),
      pagination: {
        page: 1,
        perPage: 10,
        total: createdUsers.length,
        totalPages: 1,
      },
    });
    expect(response.body.users).toHaveLength(createdUsers.length);
    response.body.users.forEach((user: Record<string, unknown>) => {
      expect(user).not.toHaveProperty('passwordHash');
    });
  });

  it('retorna paginas sem repetir usuarios', async () => {
    const createdUsers: UserType[] = await Promise.all(
      ['user1', 'user2', 'user3', 'user4'].map((name) =>
        testApp.prisma.user.create({
          data: {
            email: `${name}@exemplo.com`,
            passwordHash: 'password-hash',
          },
        }),
      ),
    );
    const token = jwt.sign(
      { sub: createdUsers[0].id, email: createdUsers[0].email },
      jwtSecret,
    );

    const firstPage = await request(testApp.app)
      .get('/users?page=1&perPage=2')
      .set('Authorization', `Bearer ${token}`);
    const secondPage = await request(testApp.app)
      .get('/users?page=2&perPage=2')
      .set('Authorization', `Bearer ${token}`);

    expect(firstPage.status).toBe(200);
    expect(secondPage.status).toBe(200);
    expect(firstPage.body.pagination).toEqual({ page: 1, perPage: 2, total: 4, totalPages: 2 });
    expect(secondPage.body.pagination).toEqual({ page: 2, perPage: 2, total: 4, totalPages: 2 });

    const returnedIds = [
      ...firstPage.body.users.map((user: { id: string }) => user.id),
      ...secondPage.body.users.map((user: { id: string }) => user.id),
    ];

    expect(new Set(returnedIds)).toHaveLength(4);
    expect(returnedIds).toEqual(expect.arrayContaining(createdUsers.map((user) => user.id)));
  });

  it('recusa a listagem sem token', async () => {
    const response = await request(testApp.app).get('/users');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Token de autenticacao nao informado.',
    });
  });

  it('recusa a listagem com token invalido', async () => {
    const response = await request(testApp.app)
      .get('/users')
      .set('Authorization', 'Bearer token-invalido');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Token de autenticacao invalido.',
    });
  });
});
