import { prisma } from '@/config/prisma.js';
import type {
  UserListPagination,
  UserListResponse,
} from '@/types/user/UserType.js';

class UserService {
  async list({ page, perPage }: UserListPagination): Promise<UserListResponse> {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      }),
      prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }
}

export { UserService };
