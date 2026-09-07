import type { NextFunction, Request, Response } from 'express';

import { UserService } from '@/services/user/UserService.js';

class UserController {
  private readonly userService = new UserService();

  list = async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.userService.list();

      response.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  };
}

export { UserController };
