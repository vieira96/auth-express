import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock('@/config/prisma.js', () => ({
  prisma: {
    user: {
      findMany: mocks.findMany,
      count: mocks.count,
    },
  },
}));

import { UserService } from '@/services/user/UserService.js';

describe('UserService.list', () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.count.mockReset();
  });

  it('pagina usuarios e retorna as roles sem expor a tabela pivot e paginado', async () => {
    const role = { name: 'user' };
    const user = {
      id: 'user-1',
      email: 'ana@exemplo.com',
      createdAt: new Date('2026-09-09T10:00:00.000Z'),
      updatedAt: new Date('2026-09-09T10:00:00.000Z'),
      roles: [{ role }],
    };

    mocks.findMany.mockResolvedValue([user]);
    mocks.count.mockResolvedValue(11);

    const result = await new UserService().list({ page: 2, perPage: 5 });

    expect(result).toEqual({
      users: [
        {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roles: [role],
        },
      ],
      pagination: {
        page: 2,
        perPage: 5,
        total: 11,
        totalPages: 3,
      },
    });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        select: expect.objectContaining({
          roles: expect.any(Object),
        }),
      }),
    );
    expect(mocks.count).toHaveBeenCalledOnce();
  });
});
