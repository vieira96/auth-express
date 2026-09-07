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
      },
    });
    expect(jwt.verify(response.body.token, jwtSecret)).toMatchObject({
      sub: user.id,
      email: user.email,
    });
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
