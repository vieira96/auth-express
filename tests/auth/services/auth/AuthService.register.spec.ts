import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
}));

vi.mock('@/config/prisma.js', () => ({
  prisma: { user: { findUnique: mocks.findUnique, create: mocks.create } },
}));

vi.mock('bcryptjs', () => ({
  default: { hash: mocks.hash },
}));

import { AuthService } from '@/services/auth/AuthService.js';

describe('AuthService.register', () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.create.mockReset();
    mocks.hash.mockReset();
  });

  it('cria o usuario com a senha em hash', async () => {
    const credentials = { email: 'ana@exemplo.com', password: 'Senha123!' };
    const passwordHash = 'senha-com-hash';
    const createdUser = {
      id: 'user-1',
      email: credentials.email,
      passwordHash,
      createdAt: new Date('2026-09-07T10:00:00.000Z'),
      updatedAt: new Date('2026-09-07T10:00:00.000Z'),
    };

    mocks.findUnique.mockResolvedValue(null);
    mocks.hash.mockResolvedValue(passwordHash);
    mocks.create.mockResolvedValue(createdUser);

    const result = await new AuthService().register(credentials);

    expect(result).toEqual({ user: { id: createdUser.id, email: createdUser.email } });
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { email: credentials.email } });
    expect(mocks.hash).toHaveBeenCalledWith(credentials.password, 12);
    expect(mocks.create).toHaveBeenCalledWith({
      data: { email: credentials.email, passwordHash },
    });
  });

  it('recusa o cadastro quando o e-mail ja existe', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(
      new AuthService().register({ email: 'ana@exemplo.com', password: 'Senha123!' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Este e-mail ja esta em uso.',
    });

    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
