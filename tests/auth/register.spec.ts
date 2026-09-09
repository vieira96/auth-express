import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, type TestApp } from '../support/setupTestApp.js';

describe('POST /auth/register', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterEach(async () => {
    await testApp.clearDatabase();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('cria um usuario, retorna dados publicos e salva a senha com hash', async () => {
    const payload = {
      email: 'ana@exemplo.com',
      password: 'Senha123!',
    };

    const response = await request(testApp.app).post('/auth/register').send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      user: {
        id: expect.any(String),
        email: payload.email,
      },
    });
    expect(response.body).not.toHaveProperty('token');

    const user = await testApp.prisma.user.findUnique({
      where: { email: payload.email },
    });

    expect(user).not.toBeNull();
    expect(user?.passwordHash).not.toBe(payload.password);
    await expect(bcrypt.compare(payload.password, user!.passwordHash)).resolves.toBe(true);

    const defaultRole = await testApp.prisma.role.findUniqueOrThrow({
      where: { name: 'user' },
    });
    const userRole = await testApp.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: user!.id,
          roleId: defaultRole.id,
        },
      },
    });

    expect(userRole).not.toBeNull();
  });

  it('recusa cadastro com e-mail ja existente', async () => {
    const existingUser = await testApp.prisma.user.create({
      data: {
        email: 'testeexistente@teste.com',
        passwordHash: await bcrypt.hash('Senha123!', 12),
      },
    });

    const response = await request(testApp.app).post('/auth/register').send({
      email: existingUser.email,
      password: 'OutraSenha123!',
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'Este e-mail ja esta em uso.',
    });
  });
});
