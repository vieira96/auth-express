import type { RequestHandler } from 'express';

import { prisma } from '@/config/prisma.js';
import { AppError } from '@/errors/AppError.js';

function authorizeRoles(...allowedRoles: string[]): RequestHandler {
  return async (request, _response, next) => {
    if (!request.authenticatedUserId) {
      return next(new AppError(401, 'Token de autenticacao invalido.'));
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: request.authenticatedUserId },
        select: {
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
      });

      const hasAllowedRole = user?.roles.some(({ role }) => allowedRoles.includes(role.name));

      if (!hasAllowedRole) {
        return next(new AppError(403, 'Forbidden'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export { authorizeRoles };
