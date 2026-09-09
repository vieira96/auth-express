import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, type TestApp } from '../support/setupTestApp.js';

const jwtSecret = 'test-secret-for-auth-api';

describe('POST /auth/login', () => {
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

  it('autentica credenciais validas e retorna um JWT', async () => {
    const password = 'Senha123!';
    const user = await testApp.prisma.user.create({
      data: {
        email: 'ana@exemplo.com',
        passwordHash: await bcrypt.hash(password, 12),
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

    const response = await request(testApp.app).post('/auth/login').send({
      email: user.email,
      password,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      token: expect.any(String),
      user: {
        id: user.id,
        email: user.email,
        roles: [{ name: userRole.name }],
      },
    });
    expect(jwt.verify(response.body.token, jwtSecret)).toMatchObject({
      sub: user.id,
      email: user.email,
    });
  });

  it('permite que um admin autenticado acesse a listagem de usuarios', async () => {
    const credentials = {
      // Conta exclusiva deste cenário de autorização.
      email: 'admin@admin.com',
      password: 'Senha123!',
    };
    const admin = await testApp.prisma.user.create({
      data: {
        email: credentials.email,
        passwordHash: await bcrypt.hash(credentials.password, 12),
        roles: {
          create: {
            role: {
              connect: { name: 'admin' },
            },
          },
        },
      },
    });

    const loginResponse = await request(testApp.app).post('/auth/login').send(credentials);

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user).toEqual({
      id: admin.id,
      email: admin.email,
      roles: [{ name: 'admin' }],
    });

    const usersResponse = await request(testApp.app)
      .get('/users')
      .set('Authorization', `Bearer ${loginResponse.body.token}`);

    expect(usersResponse.status).toBe(200);
  });

  it('recusa uma senha invalida', async () => {
    const password = 'Senha123!';
    const wrongPassword = 'SenhaErrada123!';
    const email = 'email@exemplo.com';

    const user = await testApp.prisma.user.create({
      data: {
        email: email,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });

    const response = await request(testApp.app).post('/auth/login').send({
      email: user.email,
      password: wrongPassword,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'E-mail e/ou senha invalidos.',
    });
  });

  it('bloqueia a quarta tentativa de login com senha invalida', async () => {
    const password = 'Senha123!';
    const credentials = { email: 'ana@exemplo.com', password: 'SenhaErrada123!' };

    await testApp.prisma.user.create({
      data: {
        email: credentials.email,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await request(testApp.app).post('/auth/login').send(credentials);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'E-mail e/ou senha invalidos.' });
    }

    const blockedResponse = await request(testApp.app).post('/auth/login').send(credentials);

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body).toEqual({
      error: expect.stringMatching(
        /^Muitas tentativas de login\. Tente novamente em \d+ minutos? e \d+ segundos?\.$/,
      ),
    });
  });

  it('recusa um email invalido', async () => {
    const password = 'Senha123!';
    const email = 'email@exemplo.com';
    const wrongEmail = 'emailerrado@exemplo.com';

    await testApp.prisma.user.create({
      data: {
        email: email,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });

    const response = await request(testApp.app).post('/auth/login').send({
      email: wrongEmail,
      password: password,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'E-mail e/ou senha invalidos.',
    });
  });

  it('recusa um email e senha invalidos', async () => {
    const password = 'Senha123!';
    const wrongPassword = 'SenhaErrada123!';
    const email = 'email@exemplo.com';
    const wrongEmail = 'emailerrado@exemplo.com';

    await testApp.prisma.user.create({
      data: {
        email: email,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });

    const response = await request(testApp.app).post('/auth/login').send({
      email: wrongEmail,
      password: wrongPassword,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'E-mail e/ou senha invalidos.',
    });
  });
});
