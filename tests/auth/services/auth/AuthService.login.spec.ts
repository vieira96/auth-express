import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@/errors/AppError.js';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  compare: vi.fn(),
  sign: vi.fn(),
  ensureAllowed: vi.fn(),
  registerFailure: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('@/config/prisma.js', () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

vi.mock('bcryptjs', () => ({
  default: { compare: mocks.compare },
}));

vi.mock('jsonwebtoken', () => ({
  default: { sign: mocks.sign },
}));

vi.mock('@/services/auth/LoginAttemptService.js', () => ({
  LoginAttemptService: class {
    ensureAllowed = mocks.ensureAllowed;
    registerFailure = mocks.registerFailure;
    clear = mocks.clear;
  },
}));

import { AuthService } from '@/services/auth/AuthService.js';

const jwtSecret = 'test-secret-for-auth-service';

describe('AuthService.login', () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.compare.mockReset();
    mocks.sign.mockReset();
    mocks.ensureAllowed.mockReset();
    mocks.registerFailure.mockReset();
    mocks.clear.mockReset();
    process.env.JWT_SECRET = jwtSecret;
  });

  it('autentica credenciais validas e gera um JWT', async () => {
    const credentials = { email: 'ana@exemplo.com', password: 'Senha123!' };
    const user = {
      id: 'user-1',
      email: credentials.email,
      passwordHash: 'senha-com-hash',
      createdAt: new Date('2026-09-07T10:00:00.000Z'),
      updatedAt: new Date('2026-09-07T10:00:00.000Z'),
      roles: [{ role: { name: 'user' } }],
    };

    mocks.findUnique.mockResolvedValue(user);
    mocks.compare.mockResolvedValue(true);
    mocks.sign.mockReturnValue('jwt-de-teste');

    const result = await new AuthService().login(credentials, '127.0.0.1');

    expect(result).toEqual({
      token: 'jwt-de-teste',
      user: {
        id: user.id,
        email: user.email,
        roles: [{ name: 'user' }],
      },
    });
    expect(mocks.compare).toHaveBeenCalledWith(credentials.password, user.passwordHash);
    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: credentials.email },
        select: expect.objectContaining({ roles: expect.any(Object) }),
      }),
    );
    expect(mocks.sign).toHaveBeenCalledWith(
      { sub: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' },
    );
  });

  it('recusa uma senha invalida', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'ana@exemplo.com',
      passwordHash: 'senha-com-hash',
      roles: [],
    });
    mocks.compare.mockResolvedValue(false);

    await expect(
      new AuthService().login({ email: 'ana@exemplo.com', password: 'SenhaErrada123!' }, '127.0.0.1'),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'E-mail e/ou senha invalidos.',
    });

    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it('bloqueia a quarta tentativa de login com senha invalida', async () => {
    const credentials = { email: 'ana@exemplo.com', password: 'SenhaErrada123!' };
    const ip = '127.0.0.1';
    let failedAttempts = 0;

    mocks.findUnique.mockResolvedValue({
      id: 'user-1',
      email: credentials.email,
      passwordHash: 'senha-com-hash',
      roles: [],
    });
    mocks.compare.mockResolvedValue(false);
    mocks.ensureAllowed.mockImplementation(async () => {
      if (failedAttempts >= 3) {
        throw new AppError(429, 'Muitas tentativas de login. Tente novamente em 5 minutos e 0 segundos.');
      }
    });
    mocks.registerFailure.mockImplementation(async () => {
      failedAttempts += 1;
    });

    const authService = new AuthService();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(authService.login(credentials, ip)).rejects.toMatchObject({ statusCode: 401 });
    }

    await expect(authService.login(credentials, ip)).rejects.toMatchObject({
      statusCode: 429,
      message: 'Muitas tentativas de login. Tente novamente em 5 minutos e 0 segundos.',
    });

    expect(mocks.findUnique).toHaveBeenCalledTimes(3);
    expect(mocks.registerFailure).toHaveBeenCalledTimes(3);
  });

  it('recusa um e-mail nao cadastrado', async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(
      new AuthService().login(
        { email: 'naoexiste@exemplo.com', password: 'Senha123!' },
        '127.0.0.1',
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'E-mail e/ou senha invalidos.',
    });

    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
