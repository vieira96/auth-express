import type { NextFunction, Request, Response } from 'express';

import { UserService } from '@/services/user/UserService.js';
import { paginationSchema } from '@/validators/global/pagination.schema.js';

class UserController {
  private readonly userService = new UserService();

  list = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const pagination = paginationSchema.parse(request.query);
      const result = await this.userService.list(pagination);

      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export { UserController };
