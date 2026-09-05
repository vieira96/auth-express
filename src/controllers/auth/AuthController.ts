import type { NextFunction, Request, Response } from 'express';

import { AuthService } from '@/services/auth/AuthService.js';
import { loginSchema, registerSchema } from '@/validators/auth/auth.schema.js';

class AuthController {
  private readonly authService = new AuthService();

  register = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const credentials = registerSchema.parse(request.body);
      const result = await this.authService.register(credentials);

      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const credentials = loginSchema.parse(request.body);
      const result = await this.authService.login(credentials);

      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export { AuthController };
