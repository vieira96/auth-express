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
    const existingUsersCount = await testApp.prisma.user.count();
    const page = 1;
    const perPage = 10;

    const users = [
      { email: 'user1@exemplo.com', passwordHash: 'password-hash' },
      { email: 'user2@exemplo.com', passwordHash: 'password-hash' },
      { email: 'user3@exemplo.com', passwordHash: 'password-hash' },
      { email: 'user4@exemplo.com', passwordHash: 'password-hash' },
    ];

    const createdUsers: UserType[] = await Promise.all(
      users.map((user) => testApp.prisma.user.create({ data: user })),
    );
    const expectedTotal = existingUsersCount + createdUsers.length;

    const authenticatedUser = createdUsers[0];
    const userRole = await testApp.prisma.role.findUniqueOrThrow({
      where: { name: 'user' },
    });
    const adminRole = await testApp.prisma.role.findUniqueOrThrow({
      where: { name: 'admin' },
    });
    await testApp.prisma.userRole.createMany({
      data: [
        { userId: authenticatedUser.id, roleId: userRole.id },
        { userId: authenticatedUser.id, roleId: adminRole.id },
      ],
    });

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
        page,
        perPage,
        total: expectedTotal,
        totalPages: Math.ceil(expectedTotal / perPage),
      },
    });
    expect(response.body.users).toHaveLength(expectedTotal);
    expect(response.body.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: authenticatedUser.id,
          roles: expect.arrayContaining([
            { name: userRole.name },
            { name: adminRole.name },
          ]),
        }),
      ]),
    );
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
    const adminRole = await testApp.prisma.role.findUniqueOrThrow({
      where: { name: 'admin' },
    });
    await testApp.prisma.userRole.create({
      data: {
        userId: createdUsers[0].id,
        roleId: adminRole.id,
      },
    });

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

  it('recusa a listagem para um usuario sem a role admin', async () => {
    const user = await testApp.prisma.user.create({
      data: {
        email: 'usuario@exemplo.com',
        passwordHash: 'password-hash',
      },
    });
    const userRole = await testApp.prisma.role.findUniqueOrThrow({
      where: { name: 'user' },
    });
    await testApp.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: userRole.id,
      },
    });
    const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret);

    const response = await request(testApp.app)
      .get('/users')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'Forbidden',
    });
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
