import type { Express } from 'express';

import type { PrismaClient } from '@/generated/prisma/client.js';

import { startTestDatabase } from './testDatabase.js';

type TestApp = {
  app: Express;
  prisma: PrismaClient;
  clearDatabase: () => Promise<void>;
  close: () => Promise<void>;
};

type CreateTestAppOptions = {
  jwtSecret?: string;
};

async function createTestApp({ jwtSecret }: CreateTestAppOptions = {}): Promise<TestApp> {
  const database = await startTestDatabase();
  process.env.DATABASE_URL = database.databaseUrl;

  if (jwtSecret) {
    process.env.JWT_SECRET = jwtSecret;
  }

  // Prisma reads DATABASE_URL during import, so the app must be loaded afterwards.
  const { app } = await import('@/app.js');
  const { prisma } = await import('@/config/prisma.js');

  return {
    app,
    prisma,
    clearDatabase: async () => {
      await prisma.user.deleteMany();
    },
    close: async () => {
      await prisma.$disconnect();
      await database.container.stop();
    },
  };
}

export { createTestApp };
export type { TestApp };
