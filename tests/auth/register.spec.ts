import type { Express } from 'express';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { startTestDatabase } from '../support/testDatabase.js';

describe('POST /auth/register', () => {
  let app: Express;
  let prisma: PrismaClient;
  let stopDatabase: () => Promise<void>;

  beforeAll(async () => {
    const database = await startTestDatabase();
    process.env.DATABASE_URL = database.databaseUrl;

    stopDatabase = async (): Promise<void> => {
      await database.container.stop();
    };

    // A aplicação só é importada após apontar o Prisma para o banco de teste.
    ({ app } = await import('../../src/app.js'));
    ({ prisma } = await import('../../src/config/prisma.js'));
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await stopDatabase();
  });

  it('cria um usuario, retorna dados publicos e salva a senha com hash', async () => {
    const payload = {
      email: 'ana@exemplo.com',
      password: 'Senha123!',
    };

    const response = await request(app).post('/auth/register').send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      user: {
        id: expect.any(String),
        email: payload.email,
      },
    });
    expect(response.body).not.toHaveProperty('token');

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    expect(user).not.toBeNull();
    expect(user?.passwordHash).not.toBe(payload.password);
    await expect(bcrypt.compare(payload.password, user!.passwordHash)).resolves.toBe(true);
  });

  it('recusa cadastro com e-mail ja existente', async () => {
    const existingUser = await prisma.user.create({
      data: {
        email: 'testeexistente@teste.com',
        passwordHash: await bcrypt.hash('Senha123!', 12),
      },
    });

    const response = await request(app).post('/auth/register').send({
      email: existingUser.email,
      password: 'OutraSenha123!',
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'Este e-mail ja esta em uso.',
    });
  });
});
