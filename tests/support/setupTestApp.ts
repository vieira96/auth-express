import type { Express } from 'express';

import type { PrismaClient } from '@/generated/prisma/client.js';
import { disconnectRedis, getRedisClient } from '@/config/redis.js';

import { startTestDatabase } from './testDatabase.js';
import { startTestRedis } from './testRedis.js';

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
  const [database, redis] = await Promise.all([startTestDatabase(), startTestRedis()]);
  process.env.DATABASE_URL = database.databaseUrl;
  process.env.REDIS_URL = redis.url;

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
      const redisClient = await getRedisClient();
      await redisClient.flushDb();
    },
    close: async () => {
      await prisma.$disconnect();
      await disconnectRedis();
      await database.container.stop();
      await redis.container.stop();
    },
  };
}

export { createTestApp };
export type { TestApp };
