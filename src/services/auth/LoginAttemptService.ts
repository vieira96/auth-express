import { getRedisClient } from '@/config/redis.js';
import { AppError } from '@/errors/AppError.js';

const maxAttempts = 3;
const blockDurationMinutes = Number(process.env.LOGIN_BLOCK_DURATION_MINUTES ?? 5);

if (!Number.isInteger(blockDurationMinutes) || blockDurationMinutes <= 0) {
  throw new Error('LOGIN_BLOCK_DURATION_MINUTES deve ser um inteiro positivo.');
}

const blockDurationSeconds = blockDurationMinutes * 60;

function blockMessage(ttl: number): string {
  const remainingSeconds = Math.max(ttl, 0);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const minuteLabel = minutes === 1 ? 'minuto' : 'minutos';
  const secondLabel = seconds === 1 ? 'segundo' : 'segundos';

  return `Muitas tentativas de login. Tente novamente em ${minutes} ${minuteLabel} e ${seconds} ${secondLabel}.`;
}

const registerFailureScript = `
  if redis.call('EXISTS', KEYS[2]) == 1 then
    return { 1, redis.call('TTL', KEYS[2]) }
  end

  local attempts = redis.call('INCR', KEYS[1])

  if attempts == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end

  if attempts >= tonumber(ARGV[2]) then
    redis.call('SET', KEYS[2], '1', 'EX', ARGV[1])
    redis.call('DEL', KEYS[1])
    return { 0, 0 }
  end

  return { 0, 0 }
`;

class LoginAttemptService {
  async ensureAllowed(ip: string): Promise<void> {
    const redis = await getRedisClient();
    const ttl = await redis.ttl(this.blockKey(ip));

    if (ttl > 0) {
      throw new AppError(429, blockMessage(ttl));
    }
  }

  async registerFailure(ip: string): Promise<void> {
    const redis = await getRedisClient();
    const [blocked, ttl] = (await redis.eval(registerFailureScript, {
      keys: [this.attemptKey(ip), this.blockKey(ip)],
      arguments: [String(blockDurationSeconds), String(maxAttempts)],
    })) as [number, number];

    if (blocked === 1) {
      throw new AppError(429, blockMessage(ttl));
    }
  }

  async clear(ip: string): Promise<void> {
    const redis = await getRedisClient();
    await redis.del(this.attemptKey(ip));
  }

  private attemptKey(ip: string): string {
    return `auth:login:attempts:${encodeURIComponent(ip)}`;
  }

  private blockKey(ip: string): string {
    return `auth:login:block:${encodeURIComponent(ip)}`;
  }
}

export { LoginAttemptService };
