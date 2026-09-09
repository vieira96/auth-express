import { prisma } from '@/config/prisma.js';
import type { Pagination } from '@/types/global/PaginationType.js';
import type {
  UserListResponse,
} from '@/types/user/UserType.js';

class UserService {
  async list({ page, perPage }: Pagination): Promise<UserListResponse> {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      }),
      prisma.user.count(),
    ]);

    const formattedUsersResponse = users.map(({ roles: roleAssignments, ...user }) => ({
      ...user,
      roles: roleAssignments.map(({ role }) => role),
    }));

    return {
      users: formattedUsersResponse,
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
