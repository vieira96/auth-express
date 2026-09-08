import { GenericContainer } from 'testcontainers';

const redisPort = 6379;

async function startTestRedis() {
  const container = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(redisPort)
    .start();

  const url = `redis://${container.getHost()}:${container.getMappedPort(redisPort)}`;

  return { container, url };
}

export { startTestRedis };
