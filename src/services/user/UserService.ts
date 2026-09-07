import { prisma } from '@/config/prisma.js';
import type { UserType } from '@/types/user/UserType.js';

class UserService {
  async list(): Promise<UserType[]> {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export { UserService };
