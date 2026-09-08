import type { NextFunction, Request, Response } from 'express';

import { AuthService } from '@/services/auth/AuthService.js';

class AuthController {
  private readonly authService = new AuthService();

  register = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(request.body);

      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
      const result = await this.authService.login(request.body, ip);

      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export { AuthController };
