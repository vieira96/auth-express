import { createClient, type RedisClientType } from 'redis';

let redisClient: RedisClientType | undefined;
let connecting: Promise<void> | undefined;
let redisUrl: string | undefined;

async function getRedisClient(): Promise<RedisClientType> {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error('REDIS_URL nao foi definida.');
  }

  if (redisClient && redisUrl !== url) {
    await disconnectRedis();
  }

  if (!redisClient) {
    redisClient = createClient({ url });
    redisUrl = url;
    redisClient.on('error', (error) => {
      console.error('Erro na conexao com o Redis.', error);
    });
  }

  if (!redisClient.isOpen) {
    connecting ??= redisClient.connect().then(() => undefined).finally(() => {
      connecting = undefined;
    });

    await connecting;
  }

  return redisClient;
}

async function disconnectRedis(): Promise<void> {
  connecting = undefined;

  if (redisClient?.isOpen) {
    await redisClient.quit();
  }

  redisClient = undefined;
  redisUrl = undefined;
}

export { disconnectRedis, getRedisClient };
