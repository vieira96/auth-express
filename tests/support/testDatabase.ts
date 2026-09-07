import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { PostgreSqlContainer } from '@testcontainers/postgresql';

const execFileAsync = promisify(execFile);

async function startTestDatabase() {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('auth_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const databaseUrl = container.getConnectionUri();

  // Cada banco temporário começa vazio; as migrations deixam seu schema pronto para o teste.
  await execFileAsync('npx', ['prisma', 'migrate', 'deploy'], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  return { container, databaseUrl };
}

export { startTestDatabase };
