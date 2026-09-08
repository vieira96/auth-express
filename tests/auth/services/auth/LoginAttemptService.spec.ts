import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRedisClient: vi.fn(),
  ttl: vi.fn(),
  eval: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@/config/redis.js', () => ({
  getRedisClient: mocks.getRedisClient,
}));

import { LoginAttemptService } from '@/services/auth/LoginAttemptService.js';

const ip = '2001:db8::1';
const attemptKey = 'auth:login:attempts:2001%3Adb8%3A%3A1';
const blockKey = 'auth:login:block:2001%3Adb8%3A%3A1';

describe('LoginAttemptService', () => {
  beforeEach(() => {
    mocks.ttl.mockReset();
    mocks.eval.mockReset();
    mocks.del.mockReset();
    mocks.getRedisClient.mockReset();
    mocks.getRedisClient.mockResolvedValue({
      ttl: mocks.ttl,
      eval: mocks.eval,
      del: mocks.del,
    });
  });

  it('permite o login quando o IP nao esta bloqueado', async () => {
    mocks.ttl.mockResolvedValue(-2);

    await expect(new LoginAttemptService().ensureAllowed(ip)).resolves.toBeUndefined();

    expect(mocks.ttl).toHaveBeenCalledWith(blockKey);
  });

  it('informa o tempo restante quando o IP esta bloqueado', async () => {
    mocks.ttl.mockResolvedValue(299);

    await expect(new LoginAttemptService().ensureAllowed(ip)).rejects.toMatchObject({
      statusCode: 429,
      message: 'Muitas tentativas de login. Tente novamente em 4 minutos e 59 segundos.',
    });
  });

  it('registra uma falha com o limite e o tempo configurados', async () => {
    mocks.eval.mockResolvedValue([0, 0]);

    await expect(new LoginAttemptService().registerFailure(ip)).resolves.toBeUndefined();

    expect(mocks.eval).toHaveBeenCalledWith(expect.stringContaining("redis.call('INCR'"), {
      keys: [attemptKey, blockKey],
      arguments: ['300', '3'],
    });
  });

  it('recusa uma falha concorrente quando o IP ja foi bloqueado', async () => {
    mocks.eval.mockResolvedValue([1, 120]);

    await expect(new LoginAttemptService().registerFailure(ip)).rejects.toMatchObject({
      statusCode: 429,
      message: 'Muitas tentativas de login. Tente novamente em 2 minutos e 0 segundos.',
    });
  });

  it('limpa as tentativas depois de um login valido', async () => {
    mocks.del.mockResolvedValue(1);

    await new LoginAttemptService().clear(ip);

    expect(mocks.del).toHaveBeenCalledWith(attemptKey);
  });
});
