import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  compare: vi.fn(),
  sign: vi.fn(),
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

import { AuthService } from '@/services/auth/AuthService.js';

const jwtSecret = 'test-secret-for-auth-service';

describe('AuthService.login', () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.compare.mockReset();
    mocks.sign.mockReset();
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
    };

    mocks.findUnique.mockResolvedValue(user);
    mocks.compare.mockResolvedValue(true);
    mocks.sign.mockReturnValue('jwt-de-teste');

    const result = await new AuthService().login(credentials);

    expect(result).toEqual({
      token: 'jwt-de-teste',
      user: { id: user.id, email: user.email },
    });
    expect(mocks.compare).toHaveBeenCalledWith(credentials.password, user.passwordHash);
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
    });
    mocks.compare.mockResolvedValue(false);

    await expect(
      new AuthService().login({ email: 'ana@exemplo.com', password: 'SenhaErrada123!' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'E-mail e/ou senha invalidos.',
    });

    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it('recusa um e-mail nao cadastrado', async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(
      new AuthService().login({
        email: 'naoexiste@exemplo.com',
        password: 'Senha123!',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'E-mail e/ou senha invalidos.',
    });

    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
